import {ZSpec, Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, ModernExtend} from "../lib/types";
import {assertString} from "../lib/utils";

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
                    action: {ID: 0x0002, type: Zcl.DataType.UINT8},
                    dhcp: {ID: 0x0003, type: Zcl.DataType.BOOLEAN},
                    enable: {ID: 0x0004, type: Zcl.DataType.BOOLEAN},
                    ssid: {ID: 0x0005, type: Zcl.DataType.CHAR_STR},
                    password: {ID: 0x0006, type: Zcl.DataType.CHAR_STR},
                    staticIP: {ID: 0x0007, type: Zcl.DataType.CHAR_STR},
                    netMask: {ID: 0x0008, type: Zcl.DataType.CHAR_STR},
                    gateway: {ID: 0x0009, type: Zcl.DataType.CHAR_STR},
                    nameServer: {ID: 0x000a, type: Zcl.DataType.CHAR_STR},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.text({
                cluster: "shellyWiFiSetupCluster",
                access: "STATE_GET",
                description: "Wifi Status",
                name: "Wifi_Status",
                attribute: "status",
                entityCategory: "diagnostic",
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
            m.text({
                cluster: "shellyWiFiSetupCluster",
                access: "STATE_GET",
                description: "IP of the device",
                name: "IP",
                attribute: "ip",
                entityCategory: "diagnostic",
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
            m.enumLookup({
                cluster: "shellyWiFiSetupCluster",
                access: "SET",
                description:
                    "Action to perform. Reset resets all attributes to current device configuration, Apply applies the current configuration to the device",
                name: "Action",
                attribute: "action",
                entityCategory: "config",
                lookup: {
                    Reset: 0,
                    Apply: 1,
                },
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
            m.binary({
                cluster: "shellyWiFiSetupCluster",
                access: "STATE_GET",
                description: "DHCP",
                name: "DHCP",
                attribute: "dhcp",
                entityCategory: "diagnostic",
                valueOn: [true, 1],
                valueOff: [false, 0],
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
            m.binary({
                cluster: "shellyWiFiSetupCluster",
                access: "ALL",
                description: "Enable/Disable Wifi",
                name: "Enable",
                attribute: "enable",
                entityCategory: "config",
                valueOn: [true, 1],
                valueOff: [false, 0],
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
            m.text({
                cluster: "shellyWiFiSetupCluster",
                access: "ALL",
                description: "SSID",
                name: "SSID",
                attribute: "ssid",
                entityCategory: "config",
                validate(value: unknown) {
                    assertString(value);
                },
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
            m.text({
                cluster: "shellyWiFiSetupCluster",
                access: "SET",
                description: "Wifi Password",
                name: "Password",
                attribute: "password",
                entityCategory: "config",
                validate(value: unknown) {
                    assertString(value);
                },
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
            m.text({
                cluster: "shellyWiFiSetupCluster",
                access: "ALL",
                description: "StaticIP",
                name: "StaticIP",
                attribute: "staticIP",
                entityCategory: "config",
                validate(value: unknown) {
                    assertString(value);
                },
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
            m.text({
                cluster: "shellyWiFiSetupCluster",
                access: "ALL",
                description: "NetMask",
                name: "NetMask",
                attribute: "netMask",
                entityCategory: "config",
                validate(value: unknown) {
                    assertString(value);
                },
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
            m.text({
                cluster: "shellyWiFiSetupCluster",
                access: "ALL",
                description: "Gateway",
                name: "Gateway",
                attribute: "gateway",
                entityCategory: "config",
                validate(value: unknown) {
                    assertString(value);
                },
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
            m.text({
                cluster: "shellyWiFiSetupCluster",
                access: "ALL",
                description: "NameServer",
                name: "NameServer",
                attribute: "nameServer",
                entityCategory: "config",
                validate(value: unknown) {
                    assertString(value);
                },
                zigbeeCommandOptions: {
                    profileId: ZSpec.SHELLY_PROFILE_ID,
                },
            }),
        ];
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mini1"],
        model: "S4SW-001X8EU",
        vendor: "Shelly",
        description: "1 Mini Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), ...shellyModernExtend.shellyCustomClusters()],
    },
    {
        fingerprint: [{modelID: "1", manufacturerName: "Shelly"}],
        model: "S4SW-001X16EU",
        vendor: "Shelly",
        description: "1 Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), ...shellyModernExtend.shellyCustomClusters()],
    },
    {
        zigbeeModel: ["Mini1PM"],
        model: "S4SW-001P8EU",
        vendor: "Shelly",
        description: "1PM Mini Gen 4",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            ...shellyModernExtend.shellyCustomClusters(),
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
        ],
    },
];
