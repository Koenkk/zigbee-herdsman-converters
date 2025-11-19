import {Zcl, ZSpec} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {Configure, DefinitionWithExtend, Expose, Fz, KeyValue, ModernExtend, Tz, Zh} from "../lib/types";
import {assertObject, determineEndpoint, sleep} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const SHELLY_ENDPOINT_ID = 239;
const SHELLY_OPTIONS = {profileId: ZSpec.CUSTOM_SHELLY_PROFILE_ID};

const NS = "zhc:shelly";

interface ShellyRPC {
    attributes: {
        data: string;
        txCtl: number;
        rxCtl: number;
    };
    commands: never;
    commandResponses: never;
}

const shellyModernExtend = {
    shellyCustomClusters(): ModernExtend[] {
        return [
            m.deviceAddCustomCluster("shellyRPCCluster", {
                ID: 0xfc01,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    data: {ID: 0x0000, type: Zcl.DataType.CHAR_STR},
                    txCtl: {ID: 0x0001, type: Zcl.DataType.UINT32},
                    rxCtl: {ID: 0x0002, type: Zcl.DataType.UINT32},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("shellyWiFiSetupCluster", {
                ID: 0xfc02,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    status: {ID: 0x0000, type: Zcl.DataType.CHAR_STR},
                    ip: {ID: 0x0001, type: Zcl.DataType.CHAR_STR},
                    actionCode: {ID: 0x0002, type: Zcl.DataType.UINT8},
                    dhcp: {ID: 0x0003, type: Zcl.DataType.BOOLEAN},
                    enabled: {ID: 0x0004, type: Zcl.DataType.BOOLEAN},
                    ssid: {ID: 0x0005, type: Zcl.DataType.CHAR_STR},
                    password: {ID: 0x0006, type: Zcl.DataType.CHAR_STR},
                    staticIp: {ID: 0x0007, type: Zcl.DataType.CHAR_STR},
                    netMask: {ID: 0x0008, type: Zcl.DataType.CHAR_STR},
                    gateway: {ID: 0x0009, type: Zcl.DataType.CHAR_STR},
                    nameServer: {ID: 0x000a, type: Zcl.DataType.CHAR_STR},
                },
                commands: {},
                commandsResponse: {},
            }),
        ];
    },
    shellyRPCSetup(features: string[] = []): ModernExtend {
        // Set helper variables
        const shellyRPCBugFixed = false; // For firmware 20250819-150402/ga0def2d

        const featureDev = features.includes("Dev");
        const featurePowerstripUI = features.includes("PowerstripUI");

        // Generic helper functions
        const validateTime = (value: string) => {
            const hhmmRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
            if (value === undefined || !value.match(hhmmRegex)) {
                throw new Error(`Invalid time "${value}"`);
            }
        };

        // RPC helper functions
        let rpcSending = false;

        const rpcSendRaw = async (endpoint: Zh.Endpoint | Zh.Group, message: string) => {
            // Since RPC messages require multiple writes to complete, we have to make sure
            // we're not interleaving them accidentally. This is good enough for now, at least
            // until the RPC receive firmware bug is fixed by Shelly.
            while (rpcSending) {
                await sleep(200);
            }
            try {
                rpcSending = true;
                const splitBytes = 40;

                logger.debug(">>> shellyRPC write TxCtl", NS);
                const txCtl = message.length;
                await endpoint.write<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", {txCtl: txCtl}, SHELLY_OPTIONS);
                logger.debug(`>>> TxCtl: ${txCtl}`, NS);

                logger.debug(">>> shellyRPC write Data", NS);
                let dataToSend = message;
                while (dataToSend.length > 0) {
                    const data = dataToSend.substring(0, splitBytes);
                    dataToSend = dataToSend.substring(splitBytes);
                    await endpoint.write<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", {data: data}, SHELLY_OPTIONS);
                    logger.debug(`>>> Data: ${data}`, NS);
                }
            } finally {
                rpcSending = false;
            }
        };

        const rpcSend = async (endpoint: Zh.Endpoint | Zh.Group, method: string, params: object = undefined) => {
            const command = {
                id: 1, // We can't read replies anyway so don't care for now
                method: method,
                params: params,
            };
            return await rpcSendRaw(endpoint, JSON.stringify(command));
        };

        const rpcReceive = async (endpoint: Zh.Endpoint | Zh.Group, key: string) => {
            logger.debug(`||| shellyRPC rpcReceive(${key})`, NS);
            if (key === "rpc_rxctl") {
                logger.debug(">>> shellyRPC read RxCtl", NS);
                const result = await endpoint.read<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", ["rxCtl"], SHELLY_OPTIONS);
                logger.debug(`<<< RxCtl: ${JSON.stringify(result)}`, NS);
            } else if (key === "rpc_data") {
                logger.debug(">>> shellyRPC read Data", NS);
                const result = await endpoint.read<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", ["data"], {...SHELLY_OPTIONS, timeout: 1000});
                logger.debug(`<<< Data: ${JSON.stringify(result)}`, NS);
            }
        };

        // Features for exposes
        const featurePercentage = (name: string, label: string) => {
            return e.numeric(name, ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(1).withLabel(label).withUnit("%");
        };

        const featureButtonEnabled = (id: number) => {
            return e.binary(`switch_${id}`, ea.STATE_SET, "momentary", "detached").withLabel(`Endpoint: ${id + 1}`);
        };

        const exposes: Expose[] = [];
        const exposesDev: Expose[] = [
            e
                .text("rpc_tx", ea.STATE_SET)
                .withLabel("TX Data")
                .withDescription("See https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen4/ShellyPowerStripG4"),
            e.text("rpc_rxctl", ea.STATE_GET).withLabel("RxCtl").withDescription("RX bytes available").withCategory("diagnostic"),
            e.text("rpc_data", ea.STATE_GET).withLabel("Data").withDescription("RX Data").withCategory("diagnostic"),
        ];
        const exposesPowerstripUI: Expose[] = [
            e
                .enum("led_mode", ea.STATE_SET, ["off", "switch", "power"])
                .withLabel("LED Mode")
                .withDescription("Controls the behaviour of the LED rings around the sockets")
                .withCategory("config"),
            e
                .composite("led_colors", "led_colors", ea.ALL)
                .withFeature(featurePercentage("on_r", "Red (on)"))
                .withFeature(featurePercentage("on_g", "Green (on)"))
                .withFeature(featurePercentage("on_b", "Blue (on)"))
                .withFeature(featurePercentage("on_brightness", "Brightness (on)"))
                .withFeature(featurePercentage("off_r", "Red (off)"))
                .withFeature(featurePercentage("off_g", "Green (off)"))
                .withFeature(featurePercentage("off_b", "Blue (off)"))
                .withFeature(featurePercentage("off_brightness", "Brightness (off)"))
                .withLabel("LED colors in 'switch' mode")
                .withCategory("config"),
            featurePercentage("led_power_brightness", "LED brightness in 'power' mode").withCategory("config"),
            e
                .composite("led_night_mode", "led_night_mode", ea.ALL)
                .withFeature(e.binary("enable", ea.STATE_SET, true, false))
                .withFeature(featurePercentage("brightness", "Brightness"))
                .withFeature(e.text("from", ea.STATE_SET).withLabel("Active from").withDescription("hh:mm"))
                .withFeature(e.text("until", ea.STATE_SET).withLabel("Active until").withDescription("hh:mm"))
                .withLabel("LED night mode")
                .withDescription("Adjust LED brightness during night time")
                .withCategory("config"),
            e
                .composite("buttons_enabled", "buttons_enabled", ea.ALL)
                .withFeature(featureButtonEnabled(0))
                .withFeature(featureButtonEnabled(1))
                .withFeature(featureButtonEnabled(2))
                .withFeature(featureButtonEnabled(3))
                .withLabel("Buttons enabled")
                .withCategory("config"),
        ];

        const fromZigbee: Fz.Converter<"shellyRPCCluster", ShellyRPC, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "shellyRPCCluster",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const state: KeyValue = {};

                    // Diagnostic data
                    if (msg.data.rxCtl !== undefined) {
                        state.rpc_rxctl = msg.data.rxCtl;
                        state.rpc_data = "";
                    }
                    if (msg.data.data !== undefined) state.rpc_data = meta.state.rpc_data + msg.data.data;

                    return state;
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [];
        const toZigbeeDev: Tz.Converter[] = [
            {
                key: ["rpc_rxctl", "rpc_data"],
                convertGet: async (entity, key, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcReceive(ep, key);
                },
            },
            {
                key: ["rpc_tx"],
                convertSet: async (entity, key, value, meta) => {
                    logger.debug(`>>> toZigbee.convertSet(${key}): ${value}`, NS);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSendRaw(ep, value as string);
                    await rpcReceive(ep, "rpc_rxctl");
                    if (shellyRPCBugFixed) {
                        await rpcReceive(ep, "rpc_data");
                    } else {
                        return {state: {rpc_data: "[Refresh for response]"}};
                    }
                },
            },
        ];
        const toZigbeePowerstripUI: Tz.Converter[] = [
            {
                key: ["led_mode"],
                convertSet: async (entity, key, value, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                mode: value,
                            },
                        },
                    });
                },
            },
            {
                key: ["led_colors"],
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                colors: {
                                    "switch:0": {
                                        on: {
                                            rgb: [value.on_r ?? 0, value.on_g ?? 0, value.on_b ?? 0],
                                            brightness: value.on_brightness ?? 0,
                                        },
                                        off: {
                                            rgb: [value.off_r ?? 0, value.off_g ?? 0, value.off_b ?? 0],
                                            brightness: value.off_brightness ?? 0,
                                        },
                                    },
                                },
                            },
                        },
                    });
                },
            },
            {
                key: ["led_power_brightness"],
                convertSet: async (entity, key, value, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                colors: {
                                    power: {
                                        brightness: (value as number) ?? 0,
                                    },
                                },
                            },
                        },
                    });
                },
            },
            {
                key: ["led_night_mode"],
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    validateTime(value.from as string);
                    validateTime(value.until as string);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                night_mode: {
                                    enable: value.enable,
                                    brightness: value.brightness,
                                    active_between: [value.from, value.until],
                                },
                            },
                        },
                    });
                },
            },
            {
                key: ["buttons_enabled"],
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            controls: {
                                "switch:0": {
                                    in_mode: value.switch_0,
                                },
                                "switch:1": {
                                    in_mode: value.switch_1,
                                },
                                "switch:2": {
                                    in_mode: value.switch_2,
                                },
                                "switch:3": {
                                    in_mode: value.switch_3,
                                },
                            },
                        },
                    });
                },
            },
        ];

        if (featureDev) {
            exposes.push(...exposesDev);
            toZigbee.push(...toZigbeeDev);
        }
        if (featurePowerstripUI) {
            exposes.push(...exposesPowerstripUI);
            toZigbee.push(...toZigbeePowerstripUI);
        }
        return {exposes, fromZigbee, toZigbee, isModernExtend: true};
    },
    shellyWiFiSetup(): ModernExtend {
        // biome-ignore lint/suspicious/noExplicitAny: generic
        const refresh = async (endpoint: any) => {
            await endpoint.write("shellyWiFiSetupCluster", {actionCode: 0}, SHELLY_OPTIONS);
            await endpoint.read("shellyWiFiSetupCluster", ["status", "ip", "enabled", "dhcp", "ssid"], SHELLY_OPTIONS);
            await endpoint.read("shellyWiFiSetupCluster", ["staticIp", "netMask"], SHELLY_OPTIONS);
            await endpoint.read("shellyWiFiSetupCluster", ["gateway", "nameServer"], SHELLY_OPTIONS);
        };

        const exposes: Expose[] = [
            e.text("wifi_status", ea.STATE_GET).withLabel("Wi-Fi status").withDescription("Current connection status").withCategory("diagnostic"),
            e
                .text("ip_address", ea.STATE_GET)
                .withLabel("IP address")
                .withDescription("IP address currently assigned to the device")
                .withCategory("diagnostic"),
            e
                .binary("dhcp_enabled", ea.STATE_GET, true, false)
                .withLabel("DHCP enabled")
                .withDescription("Indicates whether DHCP is used to automatically assign network settings")
                .withCategory("diagnostic"),
            e
                .composite("wifi_config", "wifi_config", ea.ALL)
                .withFeature(
                    e.binary("enabled", ea.STATE_SET, true, false).withLabel("Wi-Fi enabled").withDescription("Enable/disable Wi-Fi connectivity"),
                )
                .withFeature(e.text("ssid", ea.STATE_SET).withLabel("Network").withDescription("Name (SSID) of the Wi-Fi network to connect to"))
                .withFeature(e.text("password", ea.SET).withLabel("Password").withDescription("Password for the selected Wi-Fi network"))
                .withFeature(
                    e
                        .text("static_ip", ea.STATE_SET)
                        .withLabel("IPv4 address")
                        .withDescription("Manually assigned IP address (used when DHCP is disabled)"),
                )
                .withFeature(
                    e.text("net_mask", ea.STATE_SET).withLabel("Network mask").withDescription("Subnet mask for the static IP configuration"),
                )
                .withFeature(
                    e.text("gateway", ea.STATE_SET).withLabel("Gateway").withDescription("Default gateway address for static IP configuration"),
                )
                .withFeature(e.text("name_server", ea.STATE_SET).withLabel("DNS").withDescription("Name server address for static IP configuration"))
                .withLabel("Wi-Fi Configuration")
                .withCategory("config"),
        ];

        // biome-ignore lint/suspicious/noExplicitAny: generic
        const fromZigbee: Fz.Converter<any, any, any>[] = [
            {
                cluster: "shellyWiFiSetupCluster",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const wifi_config: KeyValue = {};
                    const state: KeyValue = {wifi_config};

                    // Diagnostic data
                    if (msg.data.status !== undefined) state.wifi_status = msg.data.status;
                    if (msg.data.ip !== undefined) state.ip_address = msg.data.ip;
                    if (msg.data.dhcp !== undefined) state.dhcp_enabled = msg.data.dhcp === 1;

                    // Wi-Fi config
                    if (msg.data.enabled !== undefined) wifi_config.enabled = msg.data.enabled === 1;
                    if (msg.data.ssid !== undefined) wifi_config.ssid = msg.data.ssid;
                    if (msg.data.staticIp !== undefined) wifi_config.static_ip = msg.data.staticIp;
                    if (msg.data.netMask !== undefined) wifi_config.net_mask = msg.data.netMask;
                    if (msg.data.gateway !== undefined) wifi_config.gateway = msg.data.gateway;
                    if (msg.data.nameServer !== undefined) wifi_config.name_server = msg.data.nameServer;

                    // Cleanup empty keys
                    for (const key in wifi_config) {
                        if (wifi_config[key] === "") {
                            wifi_config[key] = undefined;
                        }
                    }

                    return state;
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["wifi_status", "ip_address", "dhcp_enabled"],
                convertGet: async (entity, key, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyWiFiSetupCluster");
                    await refresh(ep);
                },
            },
            {
                key: ["wifi_config"],
                convertGet: async (entity, key, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyWiFiSetupCluster");
                    await refresh(ep);
                },
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    const ep = determineEndpoint(entity, meta, "shellyWiFiSetupCluster");

                    const attr1 = {
                        enabled: value.enabled === true,
                        ssid: value.ssid || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr1, SHELLY_OPTIONS);

                    const attr2 = {
                        password: value.password || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr2, SHELLY_OPTIONS);

                    const attr3 = {
                        staticIp: value.static_ip || "",
                        netMask: value.net_mask || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr3, SHELLY_OPTIONS);

                    const attr4 = {
                        gateway: value.gateway || "",
                        nameServer: value.name_server || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr4, SHELLY_OPTIONS);

                    const attr5 = {
                        actionCode: 1,
                    };
                    await ep.write("shellyWiFiSetupCluster", attr5, SHELLY_OPTIONS);

                    return {
                        state: {
                            wifi_config: {
                                enabled: attr1.enabled,
                                ssid: attr1.ssid === "" ? undefined : attr1.ssid,
                                static_ip: attr3.staticIp === "" ? undefined : attr3.staticIp,
                                net_mask: attr3.netMask === "" ? undefined : attr3.netMask,
                                gateway: attr4.gateway === "" ? undefined : attr4.gateway,
                                name_server: attr4.nameServer === "" ? undefined : attr4.nameServer,
                            },
                        },
                    };
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const ep = device.getEndpoint(SHELLY_ENDPOINT_ID);
                await refresh(ep);
            },
        ];

        return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mini1", "1 Mini"],
        model: "S4SW-001X8EU",
        vendor: "Shelly",
        description: "1 Mini Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), ...shellyModernExtend.shellyCustomClusters(), shellyModernExtend.shellyWiFiSetup()],
    },
    {
        fingerprint: [{modelID: "1", manufacturerName: "Shelly"}],
        model: "S4SW-001X16EU",
        vendor: "Shelly",
        description: "1 Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), ...shellyModernExtend.shellyCustomClusters(), shellyModernExtend.shellyWiFiSetup()],
    },
    {
        zigbeeModel: ["Mini1PM", "1PM Mini"],
        model: "S4SW-001P8EU",
        vendor: "Shelly",
        description: "1PM Mini Gen 4",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        zigbeeModel: ["1PM"],
        model: "S4SW-001P16EU",
        vendor: "Shelly",
        description: "1PM Gen 4",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        zigbeeModel: ["EM Mini"],
        model: "S4EM-001PXCEU16",
        vendor: "Shelly",
        description: "EM Mini Gen4",
        extend: [
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "Shelly",
                modelID: "2PM",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 514, inputClusters: [0, 3, 4, 5, 258], outputClusters: []},
                    {ID: 239, profileID: 49153, deviceID: 8193, inputClusters: [64513, 64514], outputClusters: []},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
        ],
        model: "S4SW-002P16EU-COVER",
        vendor: "Shelly",
        description: "2PM Gen4 (Cover mode)",
        extend: [m.windowCovering({controls: ["lift", "tilt"]}), ...shellyModernExtend.shellyCustomClusters(), shellyModernExtend.shellyWiFiSetup()],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "Shelly",
                modelID: "2PM",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 266, inputClusters: [0, 3, 4, 5, 6, 2820, 1794], outputClusters: []},
                    {ID: 2, profileID: 260, deviceID: 266, inputClusters: [4, 5, 6, 2820, 1794], outputClusters: []},
                    {ID: 239, profileID: 49153, deviceID: 8193, inputClusters: [64513, 64514], outputClusters: []},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
        ],
        model: "S4SW-002P16EU-SWITCH",
        vendor: "Shelly",
        description: "2PM Gen4 (Switch mode)",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["l1", "l2"]}),
            m.electricityMeter({producedEnergy: true, acFrequency: true, endpointNames: ["l1", "l2"]}),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "Power Strip", manufacturerName: "Shelly"}],
        model: "S4PL-00416EU",
        vendor: "Shelly",
        description: "Power strip 4 Gen4",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2", "3", "4"]}),
            m.electricityMeter({endpointNames: ["1", "2", "3", "4"]}),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyRPCSetup(["PowerstripUI"]),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "Flood", manufacturerName: "Shelly"}],
        model: "S4SN-0071A",
        vendor: "Shelly",
        description: "Flood Gen 4",
        extend: [
            m.battery(),
            m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "Ecowitt WS90", manufacturerName: "Shelly"}],
        model: "WS90",
        vendor: "Shelly",
        description: "Weather station",
        extend: [
            m.battery(),
            m.illuminance(),
            m.temperature(),
            m.pressure(),
            m.humidity(),
            m.deviceAddCustomCluster("shellyWS90Wind", {
                ID: 0xfc01,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {},
                commands: {},
                commandsResponse: {},
            }),
            m.numeric({
                name: "wind_speed",
                cluster: "shellyWS90Wind",
                attribute: {ID: 0x0000, type: Zcl.DataType.UINT16},
                valueMin: 0,
                valueMax: 140,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Wind speed in m/s",
                scale: 10,
                unit: "m/s",
                access: "STATE_GET",
            }),
            m.numeric({
                name: "wind_direction",
                cluster: "shellyWS90Wind",
                attribute: {ID: 0x0004, type: Zcl.DataType.UINT16},
                valueMin: 0,
                valueMax: 360,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Wind direction in degrees",
                scale: 10,
                unit: "°",
                access: "STATE_GET",
            }),
            m.numeric({
                name: "gust_speed",
                cluster: "shellyWS90Wind",
                attribute: {ID: 0x0007, type: Zcl.DataType.UINT16},
                valueMin: 0,
                valueMax: 140,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Gust speed in m/s",
                scale: 10,
                unit: "m/s",
                access: "STATE_GET",
            }),
            m.deviceAddCustomCluster("shellyWS90UV", {
                ID: 0xfc02,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {},
                commands: {},
                commandsResponse: {},
            }),
            m.numeric({
                name: "uv_index",
                cluster: "shellyWS90UV",
                attribute: {ID: 0x0000, type: Zcl.DataType.UINT8},
                valueMin: 0,
                valueMax: 11,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "UV index",
                scale: 10,
                access: "STATE_GET",
            }),
            m.deviceAddCustomCluster("shellyWS90Rain", {
                ID: 0xfc03,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {},
                commands: {},
                commandsResponse: {},
            }),
            m.binary({
                name: "rain_status",
                cluster: "shellyWS90Rain",
                attribute: {ID: 0x0000, type: Zcl.DataType.BOOLEAN},
                valueOn: [true, 1],
                valueOff: [false, 0],
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Rain status",
                access: "STATE_GET",
            }),
            m.numeric({
                name: "precipitation",
                cluster: "shellyWS90Rain",
                attribute: {ID: 0x0001, type: Zcl.DataType.UINT24},
                valueMin: 0,
                valueMax: 100000,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Precipitation",
                unit: "mm",
                scale: 10,
                access: "STATE_GET",
            }),
        ],
    },
];
