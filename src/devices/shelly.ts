import {Zcl, ZSpec} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {Configure, DefinitionWithExtend, Expose, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";
import {assertObject, determineEndpoint} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const SHELLY_ENDPOINT_ID = 239;
const SHELLY_OPTIONS = {profileId: ZSpec.CUSTOM_SHELLY_PROFILE_ID};

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
        extend: [m.battery(), m.illuminance(), m.temperature(), m.pressure(), m.humidity()],
    },
];
