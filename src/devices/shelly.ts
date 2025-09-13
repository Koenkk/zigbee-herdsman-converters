import {Zcl, ZSpec} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, ModernExtend, Tz, Zh} from "../lib/types";

const ea = exposes.access;

namespace ShellyZigbee {
    // Shelly's Gen 2+ Device API - Zigbee scope
    type Attributes = {[name: string]: {id: number; type: Zcl.DataType; access: number; description: string}};

    const Access = {
        ReadOnly: ea.STATE_GET,
        WriteOnly: ea.SET,
        ReadWrite: ea.ALL,
    };

    const rpcClusterName = "shellyRPCCluster";

    const rpcClusterAttributes: Attributes = {
        data: {id: 0x0000, type: Zcl.DataType.CHAR_STR, access: Access.ReadWrite, description: "Data"},
        txCtl: {id: 0x0001, type: Zcl.DataType.UINT32, access: Access.WriteOnly, description: "TxCtl"},
        rxCtl: {id: 0x0002, type: Zcl.DataType.UINT32, access: Access.WriteOnly, description: "RxCtl"},
    } as const;

    const wifiSetupClusterName = "shellyWiFiSetupCluster";

    const wifiSetupClusterAttributes: Attributes = {
        status: {id: 0x000, type: Zcl.DataType.CHAR_STR, access: Access.ReadOnly, description: "Status"},
        ip: {id: 0x001, type: Zcl.DataType.CHAR_STR, access: Access.ReadOnly, description: "IP"},
        // TODO: action name is reserved; temporary name used
        wifi_action: {id: 0x002, type: Zcl.DataType.UINT8, access: Access.WriteOnly, description: "Action"},
        dhcp: {id: 0x003, type: Zcl.DataType.BOOLEAN, access: Access.ReadOnly, description: "DHCP"},
        enable: {id: 0x004, type: Zcl.DataType.BOOLEAN, access: Access.ReadWrite, description: "Enable WiFi"},
        ssid: {id: 0x005, type: Zcl.DataType.CHAR_STR, access: Access.ReadWrite, description: "SSID"},
        password: {id: 0x006, type: Zcl.DataType.CHAR_STR, access: Access.WriteOnly, description: "Password"},

        /* TODO: Writing empty values to any string attribute results in error reponse from Shelly device.
         * No idea how to clear such attributes once set. Turned off for now. */

        /* static_ip: {id: 0x007, type: Zcl.DataType.CHAR_STR, access: Access.ReadWrite, description: "Static IP"},
        net_mask: {id: 0x008, type: Zcl.DataType.CHAR_STR, access: Access.ReadWrite, description: "NetMask"},
        gateway: {id: 0x009, type: Zcl.DataType.CHAR_STR, access: Access.ReadWrite, description: "Gateway"},
        name_server: {id: 0x00a, type: Zcl.DataType.CHAR_STR, access: Access.ReadWrite, description: "NameServer"}, */
    } as const;

    // custom clusters based on specification above
    export function shellyCustomClusters(): ModernExtend[] {
        return [
            m.deviceAddCustomCluster(rpcClusterName, {
                ID: 0xfc01,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: Object.fromEntries(
                    Object.entries(rpcClusterAttributes).map(([name, values]) => [name, {ID: values.id, type: values.type}]),
                ),
                commands: {
                    // TODO - implement high-level RPC logic
                },
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster(wifiSetupClusterName, {
                ID: 0xfc02,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: Object.fromEntries(
                    Object.entries(wifiSetupClusterAttributes).map(([name, values]) => [name, {ID: values.id, type: values.type}]),
                ),
                commands: {
                    wifiCustomModel: {
                        ID: 0x01,
                        response: 0,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
        ];
    }

    enum Actions {
        Reset = "Re-read",
        Apply = "Apply",
    }

    // create exposed view model for WiFi cluster
    function prepareWiFiViewModel() {
        const description =
            "WiFi state and configuration. Static IP configuration is disabled, until problems with clearing " +
            "related attributes to empty values is solved.";

        const exposes_wifi = exposes.presets.composite("WiFi cluster", "wifi", ea.GET).withDescription(description);

        for (const [name, properties] of Object.entries(wifiSetupClusterAttributes)) {
            if (name === "wifi_action") continue;

            if (properties.type === Zcl.DataType.CHAR_STR)
                exposes_wifi.withFeature(new exposes.Text(name, properties.access).withLabel(properties.description));
            else if (properties.type === Zcl.DataType.BOOLEAN)
                exposes_wifi.withFeature(new exposes.Binary(name, properties.access, true, false).withLabel(properties.description));
        }

        exposes_wifi.withFeature(
            new exposes.Enum("action_type", ea.SET, Object.values(Actions))
                .withLabel("Apply action")
                .withDescription(
                    "No selection - send settings to device without applying to WiFi config. " +
                        "Apply - send settings and activate it. Reset - re-read settings from WiFi config.",
                ),
        );

        return exposes_wifi;
    }

    async function wifiWrite(endpoint: Zh.Endpoint | Zh.Group, attributes: {[name: string]: string | number | boolean}) {
        const payloadEntries = Object.entries(attributes)
            .filter(
                ([name, value]) =>
                    name in wifiSetupClusterAttributes &&
                    wifiSetupClusterAttributes[name].access !== Access.ReadOnly &&
                    // don't overwrite password with empty string
                    !(name === "password" && value === "") &&
                    // TODO: can't write empty values
                    value !== "",
            )
            .map(([name, value]) => [wifiSetupClusterAttributes[name].id, {value: value, type: wifiSetupClusterAttributes[name].type}]);

        const options = {
            profileId: ZSpec.CUSTOM_SHELLY_PROFILE_ID,
            manufacturerCode: Zcl.ManufacturerCode.SHELLY,
        };

        // TODO: doing arbitrary split (seems to work) for now, to match Zigbee payload length constraints
        while (payloadEntries.length > 0) {
            const payload = Object.fromEntries(payloadEntries.splice(0, 3));
            await endpoint.write(wifiSetupClusterName, payload, options);
        }
    }

    async function wifiRead(endpoint: Zh.Endpoint | Zh.Group, attributeNames: string[]) {
        const names = attributeNames.filter(
            (name) => name in wifiSetupClusterAttributes && wifiSetupClusterAttributes[name].access !== Access.WriteOnly,
        );

        const ids = names.map((name) => wifiSetupClusterAttributes[name].id);

        const options = {
            profileId: ZSpec.CUSTOM_SHELLY_PROFILE_ID,
            manufacturerCode: Zcl.ManufacturerCode.SHELLY,
        };

        // TODO: doing arbitrary split (seems to work) for now, to match Zigbee payload length constraints
        while (ids.length > 0) {
            const someIds = ids.splice(0, 5);
            await endpoint.read(wifiSetupClusterName, someIds, options);
        }
    }

    export function wifiCustomModel(): ModernExtend {
        const exposes_wifi = prepareWiFiViewModel();

        const toZigbee: Tz.Converter[] = [
            {
                key: ["wifi"],
                convertSet: async (entity, key, value, meta) => {
                    const attributes = value as {[name: string]: string | boolean | number};

                    const endpoint = m.determineEndpoint(entity, meta, wifiSetupClusterName);

                    if (attributes["action_type"] === Actions.Reset) {
                        await wifiWrite(endpoint, {wifi_action: 0x00});

                        await wifiRead(endpoint, Object.keys(wifiSetupClusterAttributes));

                        return;
                    }

                    await wifiWrite(endpoint, attributes);

                    // Apply written attributes to device's WiFi config
                    // if "wifi_action" was provided, it means it was already written by wifiWrite, no need to do it twice
                    if (!("wifi_action" in attributes) && attributes["action_type"] === Actions.Apply) await wifiWrite(endpoint, {wifi_action: 0x01});

                    const return_attributes = Object.fromEntries(
                        Object.entries(attributes).filter(
                            ([name, properties]) =>
                                name in wifiSetupClusterAttributes && wifiSetupClusterAttributes[name].access === Access.ReadWrite,
                        ),
                    );

                    return {state: {wifi: return_attributes}};
                },
                convertGet: async (entity, key, meta) => {
                    const queryScope = meta.message[key];

                    // query all readable attributes if query is empty (composite level query)
                    const names = queryScope === "" ? Object.keys(wifiSetupClusterAttributes) : Object.keys(queryScope);

                    const endpoint = m.determineEndpoint(entity, meta, wifiSetupClusterName);

                    await wifiRead(endpoint, names);
                },
            },
        ];

        const fromZigbee = [
            {
                cluster: wifiSetupClusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const attributes = msg.data as {[name: string]: string};

                    const return_attributes: {[key: string]: string | boolean} = {};

                    for (const [name, value] of Object.entries(attributes)) {
                        if (wifiSetupClusterAttributes[name].type === Zcl.DataType.BOOLEAN) return_attributes[name] = value !== "0";
                        else return_attributes[name] = value;
                    }

                    return {wifi: return_attributes};
                },
            } satisfies Fz.Converter<string, undefined, ["attributeReport", "readResponse"]>,
        ];

        return {exposes: [exposes_wifi], fromZigbee, toZigbee, isModernExtend: true};
    }
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mini1", "1 Mini"],
        model: "S4SW-001X8EU",
        vendor: "Shelly",
        description: "1 Mini Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), ...ShellyZigbee.shellyCustomClusters(), ShellyZigbee.wifiCustomModel()],
    },
    {
        fingerprint: [{modelID: "1", manufacturerName: "Shelly"}],
        model: "S4SW-001X16EU",
        vendor: "Shelly",
        description: "1 Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), ...ShellyZigbee.shellyCustomClusters(), ShellyZigbee.wifiCustomModel()],
    },
    {
        zigbeeModel: ["Mini1PM", "1PM Mini"],
        model: "S4SW-001P8EU",
        vendor: "Shelly",
        description: "1PM Mini Gen 4",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            ...ShellyZigbee.shellyCustomClusters(),
            ShellyZigbee.wifiCustomModel(),
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
            ...ShellyZigbee.shellyCustomClusters(),
            ShellyZigbee.wifiCustomModel(),
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
        extend: [m.windowCovering({controls: ["lift", "tilt"]})],
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
        ],
    },
];
