import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Expose, Fz, KeyValue, KeyValueAny, ModernExtend, OnEvent, Option, Tz} from "../lib/types";
import {addActionGroup, hasAlreadyProcessedMessage, postfixWithEndpointName} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;
const NS = "zhc:orvibo";

interface Orvibo {
    attributes: never;
    commands: {
        setSwitchRelay: {data: Buffer};
        clearSwitchAction: {data: Buffer};
        setSwitchScene: {data: Buffer};
    };
    commandResponses: never;
}

interface Orvibo2 {
    attributes: {
        powerOnBehavior: number;
    };
    commands: never;
    commandResponses: never;
}

const tzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    DD10Z_brightness: {
        key: ["brightness"],
        options: [exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            // Device doesn't support moveToLevelWithOnOff therefore this converter is needed.
            await entity.command(
                "genLevelCtrl",
                "moveToLevel",
                {level: Number(value), transtime: 0, optionsMask: 0, optionsOverride: 0},
                {disableDefaultResponse: true},
            );
            return {state: {brightness: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genLevelCtrl", ["currentLevel"]);
        },
    } satisfies Tz.Converter,
};

const distinct = <T>(input: T[], toKey: (input: T) => string): T[] => {
    const seen = new Set<string>();
    return input.filter((item) => {
        const key = toKey(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};
const hexToBytes = (hex: string): number[] => {
    // Remove '0x' prefix if present
    if (hex.startsWith("0x")) {
        hex = hex.slice(2);
    }

    // Ensure even length
    if (hex.length % 2 !== 0) {
        hex = `0${hex}`;
    }

    // Convert to byte array
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(Number.parseInt(hex.substring(i, i + 2), 16));
    }

    return bytes;
};
const clusterManuSpecifcOrviboSwitchRewiring = () => {
    return m.deviceAddCustomCluster("manuSpecificOrvibo", {
        ID: 0x0017,
        attributes: {},
        commands: {
            setSwitchRelay: {
                // This command can be used to set switch to ON, OFF or TOGGLE particular relay.
                // Payload: {"data":[<SWITCH_ID>,0,0,<IEEE_REVERSED_ADDRESS>,<RELAY_ID>,4,1,6,0,1,<ACTION>]}
                // Where <SWITCH_ID> is integer 1-6
                // Where <IEEE_REVERSED_ADDRESS> is 8 bytes reversed device IEEE address
                // Where <RELAY_ID> is integer 1-4
                // Where <ACTION> is 0 for OFF, 1 for ON, and 2 for TOGGLE
                // Example for switch 3 toggling relay 2 for device with IEEE address 0x0131000029042388: {"data":[3,0,0,136,35,4,41,0,0,49,1,2,4,1,6,0,1,2]}
                ID: 0x00,
                parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
            },
            clearSwitchAction: {
                // This command can be used to clear any action particular switch was configured to execute
                // Payload {"data":[<SWITCH_ID>,0,0]}
                ID: 0x02,
                parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
            },
            setSwitchScene: {
                // This command can be used to set switch to recall a scene
                // Payload {"data":[<SWITCH_ID>,0,0,0,0,<SCENE_ID>]}

                // ADDING/REMOVING RELAYS FROM SCENE
                // Scene can be used to change state of any or all relays in this switch.
                // To ADD relay to a scene execute on relay endpoint (1-4) cluster 5 command 0 with payload { "groupid": 0, "sceneid": <SCENE_ID>, "transtime": 0, "scenename": "todo", "extensionfieldsets": [{"clstId": 6, "len": 1, "extField":[<ACTION>]}] }
                // Where <ACTION> is 0 for OFF and 1 for ON (TOGGLE not supported)
                // To REMOVE relay from a scene execute on relay endpoint (1-4) cluster 5 command 2 with payload { "groupid":0,"sceneid":<SCENE_ID> }

                // COMMANDING RELAY AND RECALLING A SCENE
                // It is possible to configure a switch to command a relay (see setSwitchRelay command) and recall a scene (this command). It is important to execute commands in the following order - clearSwitchAction, then setSwitchRelay and then setSwitchScene.
                // This can be useful for a scenario where you have blinds motor set-up on relay 1 and 2, and would like to have switch 1 toggle relay 1, but turn off relay 2. You would command relay 1 with TOGGLE action and recall scene set-up for relay 2 to turn it off.
                ID: 0x04,
                parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
            },
        },
        commandsResponse: {},
    });
};

const clusterManuSpecificOrviboPowerOnBehavior = () => {
    return m.deviceAddCustomCluster("manuSpecificOrvibo2", {
        ID: 0xff00,
        attributes: {
            powerOnBehavior: {ID: 0x0001, type: Zcl.DataType.UINT8, write: true, max: 0xff},
        },
        commands: {},
        commandsResponse: {},
    });
};
export interface OrviboSwitchRewiringArgs {
    endpointNames: string[];
    endpoints: {[n: string]: number};
    endpointIds: {[n: number]: string};
}
const orviboSwitchRewiring = (args: OrviboSwitchRewiringArgs): ModernExtend => {
    const composite = e.composite("switch_actions", "switch_actions", ea.SET).withDescription("Switch actions");
    for (const endpointName of args.endpointNames) {
        composite.withFeature(
            e
                .composite(endpointName, endpointName, ea.SET)
                .withDescription("Set which scene and/or relay switch press should execute")
                .withFeature(
                    e.numeric("sceneid", ea.SET).withValueMin(0).withValueMax(255).withDescription("Scene id to recall. Set to 0 to recall none."),
                )
                .withFeature(
                    e
                        .numeric("sceneturnoffrelay", ea.SET)
                        .withValueMin(0)
                        .withValueMax(4)
                        .withDescription(
                            "Relay id which set sceneid will change to off when scene is recalled. Set to 0 if no relay is affected by the scene.",
                        ),
                ) // TODO: We should just use scenes, however we can not set them up yet via front-end as it does not support endpoints. [See feature request](https://github.com/nurikk/zigbee2mqtt-frontend/issues/2393).
                .withFeature(
                    e
                        .numeric("relaynumber", ea.SET)
                        .withValueMin(0)
                        .withValueMax(4)
                        .withDescription("Relay number to act on. Set to 0 to act on none."),
                )
                .withFeature(
                    e
                        .numeric("relayaction", ea.SET)
                        .withValueMin(0)
                        .withValueMax(2)
                        .withDescription("Relay operation to execute. 0 = OFF, 1 = ON, 2 = TOGGLE."),
                ),
        );
    }
    composite.withFeature(
        e
            .binary("forceupdate", ea.SET, true, false)
            .withDescription("Force of all switches update when applying changes. When turned off only changed switches will be affected."),
    );
    const options: Option[] = [composite];

    const fromZigbee = [
        {
            cluster: "genScenes",
            type: "commandRecall",
            options,
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const payload: KeyValueAny = {action: postfixWithEndpointName(`recall_${msg.data.sceneid}`, msg, model, meta)};
                addActionGroup(payload, msg, model);

                // Orvibo switch can be configured to both recall a scene and act on a relay. In this situation it does not publish new state (when scene is recalled), so here we are updating state accordingly.
                const switch_actions = options.switch_actions as KeyValueAny;
                if (!switch_actions) {
                    return;
                }
                const affectedEndpointNames = args.endpointNames.filter((en) => switch_actions[en]?.sceneid === msg.data.sceneid);
                const affectedRelays = affectedEndpointNames.map((en) => ({
                    relaynumber: switch_actions[en]?.relaynumber,
                    relayaction: switch_actions[en]?.relayaction,
                }));
                const distinctAffectedRelays = distinct(affectedRelays, (relay) => `${relay.relaynumber}_${relay.relayaction}`);
                if (distinctAffectedRelays.length > 1) {
                    logger.warning(
                        "Switch has multiple endpoints set-up to recall same scene with different relay configurations. We are unable to figure out which relay state might have changed.",
                        NS,
                    );
                } else if (distinctAffectedRelays.length === 0) {
                    // Nothing to do...
                } else {
                    const {relaynumber, relayaction} = distinctAffectedRelays[0];
                    const endpointName = args.endpointIds[relaynumber];
                    payload[`state_${endpointName}`] =
                        relayaction === 0 ? "OFF" : relayaction === 1 ? "ON" : meta.state[`state_${endpointName}`] === "ON" ? "OFF" : "ON";
                }
                const turnOffRelay = affectedEndpointNames[0] ? switch_actions[affectedEndpointNames[0]]?.sceneturnoffrelay : undefined;
                if (typeof turnOffRelay === "number") {
                    // Update relay state
                    payload[`state_${args.endpointIds[turnOffRelay]}`] = "OFF";
                }
                return payload;
            },
        } satisfies Fz.Converter<"genScenes", undefined, "commandRecall">,
    ];

    const onEvent: OnEvent.Handler[] = [
        async (event) => {
            if (event.type !== "deviceOptionsChanged") {
                return;
            }
            const device = event.data.device;
            const endpointsOptionsFrom = event.data.from.switch_actions as KeyValueAny;
            const endpointsOptionsTo = event.data.to.switch_actions as KeyValueAny;
            if (!endpointsOptionsTo) {
                return;
            }
            const forceUpdate = endpointsOptionsTo.forceupdate;
            for (const endpointName of args.endpointNames) {
                let from = endpointsOptionsFrom[endpointName];
                let to = endpointsOptionsTo[endpointName];
                if (!to && !from && !forceUpdate) {
                    return;
                }

                to = to ?? {};
                to.sceneid = to.sceneid ? to.sceneid : 0;
                to.relaynumber = to.relaynumber ? to.relaynumber : 0;
                to.relayaction = to.relayaction ? to.relayaction : 0;
                from = from ?? {};
                if (from.sceneid !== to.sceneid || from.relaynumber !== to.relaynumber || from.relayaction !== to.relayaction || forceUpdate) {
                    const switchId = args.endpoints[endpointName];
                    await device
                        .getEndpoint(7)
                        .command<"manuSpecificOrvibo", "clearSwitchAction", Orvibo>("manuSpecificOrvibo", "clearSwitchAction", {
                            data: Buffer.from([switchId, 0, 0]),
                        });
                    const {sceneid, relaynumber, relayaction} = to;
                    if (sceneid) {
                        await device.getEndpoint(7).command<"manuSpecificOrvibo", "setSwitchScene", Orvibo>("manuSpecificOrvibo", "setSwitchScene", {
                            data: Buffer.from([switchId, 0, 0, 0, 0, sceneid]),
                        });
                    }
                    if (relaynumber && device.ieeeAddr.length > 3) {
                        const invertedAddress = hexToBytes(device.ieeeAddr).reverse();
                        await device.getEndpoint(7).command<"manuSpecificOrvibo", "setSwitchRelay", Orvibo>("manuSpecificOrvibo", "setSwitchRelay", {
                            data: Buffer.from([switchId, 0, 0, ...invertedAddress, relaynumber, 4, 1, 6, 0, 1, relayaction]),
                        });
                    }
                }
            }
        },
    ];

    return {
        onEvent,
        fromZigbee,
        isModernExtend: true,
    };
};
const orviboSwitchPowerOnBehavior = (): ModernExtend => {
    const powerOnLookup: {[k: number]: string} = {1: "off", 2: "previous"};
    const powerOnLookup2: {[k: string]: number} = {off: 1, previous: 2};
    const exposes: Expose[] = [e.power_on_behavior(["off", "previous"])];
    const fromZigbee = [
        {
            cluster: "manuSpecificOrvibo2",
            type: ["readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (typeof msg.data.powerOnBehavior === "number") {
                    result.power_on_behavior = powerOnLookup[msg.data.powerOnBehavior as number];
                }
                return result;
            },
        } satisfies Fz.Converter<"manuSpecificOrvibo2", Orvibo2, ["readResponse"]>,
    ];
    const toZigbee: Tz.Converter[] = [
        {
            key: ["power_on_behavior"],
            convertSet: async (entity, key, value, meta) => {
                if (key === "power_on_behavior") {
                    await entity.write<"manuSpecificOrvibo2", Orvibo2>("manuSpecificOrvibo2", {powerOnBehavior: powerOnLookup2[value as string]});
                }
            },
            convertGet: async (entity, key, meta) => {
                if (key === "power_on_behavior") {
                    await entity.read<"manuSpecificOrvibo2", Orvibo2>("manuSpecificOrvibo2", ["powerOnBehavior"]);
                }
            },
        },
    ];
    return {
        exposes,
        fromZigbee,
        toZigbee,
        isModernExtend: true,
    };
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ccb9f56837ab41dcad366fb1452096b6", "250bccf66c41421b91b5e3242942c164", "af22cef59b2543d1be1dfab4f1c9c920"],
        model: "DD10Z",
        vendor: "ORVIBO",
        description: "Smart spotlight",
        // https://github.com/Koenkk/zigbee2mqtt/issues/13123#issuecomment-1198793749
        meta: {disableDefaultResponse: true},
        toZigbee: [tzLocal.DD10Z_brightness],
        extend: [m.light({powerOnBehavior: false, colorTemp: {range: [153, 370], startup: false}})],
    },
    {
        zigbeeModel: ["9ff5a780c5a4470d9087175c71d50f92"],
        model: "DSZ12060",
        vendor: "ORVIBO",
        description: "Spot light S10",
        extend: [m.identify(), m.light({effect: false, colorTemp: {range: [166, 370]}})],
    },
    {
        zigbeeModel: ["4a33f5ea766a4c96a962b371ffde9943"],
        model: "DS20Z07B",
        vendor: "ORVIBO",
        description: "Downlight (S series)",
        extend: [m.light({colorTemp: {range: [166, 370]}})],
    },
    {
        zigbeeModel: ["ORVIBO Socket", "93e29b89b2ee45bea5bdbb7679d75d24"],
        model: "OR-ZB-S010-3C",
        vendor: "ORVIBO",
        description: "Smart socket",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["3c4e4fc81ed442efaf69353effcdfc5f", "51725b7bcba945c8a595b325127461e9"],
        model: "CR11S8UZ",
        vendor: "ORVIBO",
        description: "Smart sticker switch",
        fromZigbee: [fz.orvibo_raw_1],
        exposes: [
            e.action([
                "button_1_click",
                "button_1_hold",
                "button_1_release",
                "button_2_click",
                "button_2_hold",
                "button_2_release",
                "button_3_click",
                "button_3_hold",
                "button_3_release",
                "button_4_click",
                "button_4_hold",
                "button_4_release",
            ]),
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ["31c989b65ebb45beaf3b67b1361d3965"],
        model: "T18W3Z",
        vendor: "ORVIBO",
        description: "Neutral smart switch 3 gang",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}),
            m.onOff({configureReporting: false, powerOnBehavior: false, endpointNames: ["l1", "l2", "l3"]}),
        ],
    },
    {
        zigbeeModel: ["fdd76effa0e146b4bdafa0c203a37192", "c670e231d1374dbc9e3c6a9fffbd0ae6", "75a4bfe8ef9c4350830a25d13e3ab068"],
        model: "SM10ZW",
        vendor: "ORVIBO",
        description: "Door or window contact switch",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["8643db61de35494d93e72c1289b526a3"],
        model: "RL804CZB",
        vendor: "ORVIBO",
        description: "Zigbee LED controller RGB + CCT or RGBW",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["82c167c95ed746cdbd21d6817f72c593", "8762413da99140cbb809195ff40f8c51"],
        model: "RL804QZB",
        vendor: "ORVIBO",
        description: "Multi-functional 3 gang relay",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}), m.onOff({endpointNames: ["l1", "l2", "l3"], configureReporting: false})],
    },
    {
        zigbeeModel: ["396483ce8b3f4e0d8e9d79079a35a420"],
        model: "CM10ZW",
        vendor: "ORVIBO",
        description: "Multi-functional 3 gang relay",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}), m.onOff({endpointNames: ["l1", "l2", "l3"]})],
    },
    {
        zigbeeModel: ["b467083cfc864f5e826459e5d8ea6079"],
        model: "ST20",
        vendor: "ORVIBO",
        description: "Temperature & humidity sensor",
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["msTemperatureMeasurement"]);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msRelativeHumidity", "genPowerCfg"]);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ["888a434f3cfc47f29ec4a3a03e9fc442"],
        model: "ST21",
        vendor: "ORVIBO",
        description: "Temperature & humidity Sensor",
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["msTemperatureMeasurement"]);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msRelativeHumidity", "genPowerCfg"]);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        zigbeeModel: ["898ca74409a740b28d5841661e72268d", "50938c4c3c0b4049923cd5afbc151bde"],
        model: "ST30",
        vendor: "ORVIBO",
        description: "Temperature & humidity sensor",
        extend: [m.battery(), m.humidity(), m.temperature()],
    },
    {
        zigbeeModel: ["9f76c9f31b4c4a499e3aca0977ac4494", "6fd24c0f58a04c848fea837aaa7d6e0f"],
        model: "T30W3Z",
        vendor: "ORVIBO",
        description: "Smart light switch - 3 gang",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.deviceEndpoints({endpoints: {top: 1, center: 2, bottom: 3}}),
            m.onOff({configureReporting: false, powerOnBehavior: false, endpointNames: ["top", "center", "bottom"]}),
        ],
    },
    {
        zigbeeModel: ["074b3ffba5a045b7afd94c47079dd553"],
        model: "T21W2Z",
        vendor: "ORVIBO",
        description: "Smart light switch - 2 gang",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.deviceEndpoints({endpoints: {top: 1, bottom: 2}}),
            m.onOff({configureReporting: false, powerOnBehavior: false, endpointNames: ["top", "bottom"]}),
        ],
    },
    {
        zigbeeModel: ["095db3379e414477ba6c2f7e0c6aa026"],
        model: "T21W1Z",
        vendor: "ORVIBO",
        description: "Smart light switch - 1 gang",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.onOff({configureReporting: false, powerOnBehavior: false}),
        ],
    },
    {
        zigbeeModel: ["093199ff04984948b4c78167c8e7f47e", "c8daea86aa9c415aa524365775b1218c", "c8daea86aa9c415aa524365775b1218"],
        model: "W40CZ",
        vendor: "ORVIBO",
        description: "Smart curtain motor",
        fromZigbee: [fz.curtain_position_analog_output, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ["428f8caf93574815be1a98fa6732c3ea"],
        model: "W45CZ",
        vendor: "ORVIBO",
        description: "Smart curtain motor",
        fromZigbee: [fz.curtain_position_analog_output, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ["e0fc98cc88df4857847dc4ae73d80b9e"],
        model: "R11W2Z",
        vendor: "ORVIBO",
        description: "In wall switch - 2 gang",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.onOff({configureReporting: false, powerOnBehavior: false, endpointNames: ["l1", "l2"]}),
        ],
    },
    {
        zigbeeModel: ["9ea4d5d8778d4f7089ac06a3969e784b", "83b9b27d5ffb4830bf35be5b1023623e", "2810c2403b9c4a5db62cc62d1030d95e"],
        model: "R20W2Z",
        vendor: "ORVIBO",
        description: "In wall switch - 2 gang",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        zigbeeModel: ["131c854783bc45c9b2ac58088d09571c", "b2e57a0f606546cd879a1a54790827d6", "585fdfb8c2304119a2432e9845cf2623"],
        model: "SN10ZW",
        vendor: "ORVIBO",
        description: "Occupancy sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["da2edf1ded0d44e1815d06f45ce02029"],
        model: "SW21",
        vendor: "ORVIBO",
        description: "Water leakage sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["b7e305eb329f497384e966fe3fb0ac69", "52debf035a1b4a66af56415474646c02", "MultIR", "ZL1-EN"],
        model: "SW30",
        vendor: "ORVIBO",
        description: "Water leakage sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["987b1869e4944218aa0034750d4ac585"],
        model: "SE20-O",
        vendor: "ORVIBO",
        description: "Smart emergency button",
        fromZigbee: [fz.command_status_change_notification_action],
        exposes: [e.action(["single"])],
        toZigbee: [],
    },
    {
        zigbeeModel: ["72bd56c539ca4c7fba73a9be0ae0d19f"],
        model: "SE21",
        vendor: "ORVIBO",
        description: "Smart emergency button",
        fromZigbee: [fz.command_status_change_notification_action],
        exposes: [e.action(["off", "single", "double", "hold"])],
        toZigbee: [],
    },
    {
        zigbeeModel: ["2a103244da0b406fa51410c692f79ead"],
        model: "AM25",
        vendor: "ORVIBO",
        description: "Smart blind controller",
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "closuresWindowCovering"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
            device.powerSource = "Battery";
            device.save();
        },
        exposes: [e.cover_position(), e.battery()],
    },
    {
        zigbeeModel: ["2ae011fb6d0542f58705d6861064eb5f", "71a0b275d9ba4895afdaf400bc7e3a0d", "b7313321dbe74da384d136a2a3fa2005"],
        model: "T40W1Z",
        vendor: "ORVIBO",
        description: "MixSwitch 1 gang",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.onOff({configureReporting: false, powerOnBehavior: false}),
        ],
    },
    {
        zigbeeModel: ["2e13af8e17434961be98f055d68c2166"],
        model: "T40W2Z",
        vendor: "ORVIBO",
        description: "MixSwitch 2 gangs",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.deviceEndpoints({endpoints: {left: 1, right: 2}}),
            m.onOff({configureReporting: false, powerOnBehavior: false, endpointNames: ["left", "right"]}),
        ],
    },
    {
        zigbeeModel: ["e8d667cb184b4a2880dd886c23d00976"],
        model: "T40W3Z_v1",
        vendor: "ORVIBO",
        description: "MixSwitch 3 gangs",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.deviceEndpoints({endpoints: {left: 1, center: 2, right: 3}}),
            m.onOff({configureReporting: false, powerOnBehavior: false, endpointNames: ["left", "center", "right"]}),
        ],
    },
    {
        zigbeeModel: ["f3be30b8c43c44da85aac622e5b56111", "f58591161f344ccea242688a6de7d25d"],
        model: "T40W3Z_v2",
        vendor: "ORVIBO",
        description: "MixSwitch 3 gangs",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.deviceEndpoints({endpoints: {right: 1, center: 2, left: 3}}),
            m.onOff({configureReporting: false, powerOnBehavior: false, endpointNames: ["right", "center", "left"]}),
        ],
    },
    {
        zigbeeModel: ["20513b10079f4cc68cffb8b0dc6d3277", "c2ea8c76f9fe40e5a7de5e8fb8dfb765"],
        model: "T40W4Z",
        vendor: "ORVIBO",
        description: "MixSwitch 4 gangs",
        extend: [
            clusterManuSpecifcOrviboSwitchRewiring(),
            m.deviceEndpoints({endpoints: {left_up: 1, left_down: 2, center_up: 3, center_down: 4, right_up: 5, right_down: 6}}),
            m.onOff({
                powerOnBehavior: false,
                configureReporting: false,
                endpointNames: ["left_up", "left_down", "center_up", "center_down", "right_up", "right_down"],
            }),
            orviboSwitchRewiring({
                endpointNames: ["left_up", "left_down", "center_up", "center_down", "right_up", "right_down"],
                endpoints: {left_up: 1, left_down: 2, center_up: 3, center_down: 4, right_up: 5, right_down: 6},
                endpointIds: {1: "left_up", 2: "left_down", 3: "center_up", 4: "center_down", 5: "right_up", 6: "right_down"},
            }),
            m.commandsScenes(),
        ],
    },
    {
        zigbeeModel: ["bcb949e87e8c4ea6bc2803052dd8fbf5"],
        model: "T40S6Z",
        vendor: "ORVIBO",
        description: "MixSwitch 6 gangs",
        fromZigbee: [fz.orvibo_raw_2],
        toZigbee: [],
        exposes: [e.action(["button_1_click", "button_2_click", "button_3_click", "button_4_click", "button_5_click", "button_6_click"])],
    },
    {
        zigbeeModel: ["ba8120ad03f744ecb6a973672369e80d"],
        model: "T41W1Z",
        vendor: "ORVIBO",
        description: "MixSwitch 1 gang (without neutral wire)",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.onOff({configureReporting: false, powerOnBehavior: false}),
        ],
    },
    {
        zigbeeModel: ["7c8f476a0f764cd4b994bc73d07c906d"],
        model: "T41W2Z",
        vendor: "ORVIBO",
        description: "MixSwitch 2 gang (without neutral wire)",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.deviceEndpoints({endpoints: {left: 1, right: 2}}),
            m.onOff({configureReporting: false, powerOnBehavior: false, endpointNames: ["left", "right"]}),
        ],
    },
    {
        zigbeeModel: ["cb7ce9fe2cb147e69c5ea700b39b3d5b"],
        model: "DM10ZW",
        vendor: "ORVIBO",
        description: "0-10v dimmer",
        extend: [m.light({colorTemp: {range: [153, 371]}})],
    },
    {
        zigbeeModel: ["1a20628504bf48c88ed698fe96b7867c"],
        model: "DTZ09039",
        vendor: "ORVIBO",
        description: "Downlight (Q series)",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["bbfed49c738948b989911f9f9f73d759"],
        model: "R30W3Z",
        vendor: "ORVIBO",
        description: "In-wall switch 3 gang",
        extend: [
            clusterManuSpecificOrviboPowerOnBehavior(),
            orviboSwitchPowerOnBehavior(),
            m.deviceEndpoints({endpoints: {left: 1, center: 2, right: 3}}),
            m.onOff({configureReporting: false, powerOnBehavior: false, endpointNames: ["left", "center", "right"]}),
        ],
    },
    {
        zigbeeModel: ["0e93fa9c36bb417a90ad5d8a184b683a"],
        model: "SM20",
        vendor: "ORVIBO",
        description: "Door or window contact switch",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
];
