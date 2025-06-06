import {Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";
import {assertString} from "../lib/utils";

function addCustomClusterShellyRPC() {
    return [
        m.deviceAddCustomCluster("shellyRPCCluster", {
            ID: 0xfc01,
            manufacturerCode: Zcl.ManufacturerCode.SHELLY,
            attributes: {
                Data: {ID: 0x0000, type: Zcl.DataType.CHAR_STR},
                TxCtl: {ID: 0x0001, type: Zcl.DataType.UINT32},
                RxCtl: {ID: 0x0002, type: Zcl.DataType.UINT32},
            },
            commands: {},
            commandsResponse: {},
        }),
    ];
}

function addCustomClusterShellyWifiSetup() {
    return [
        m.deviceAddCustomCluster("shellyWiFiSetupCluster", {
            ID: 0xfc02,
            manufacturerCode: Zcl.ManufacturerCode.SHELLY,
            attributes: {
                Status: {ID: 0x0000, type: Zcl.DataType.CHAR_STR},
                IP: {ID: 0x0001, type: Zcl.DataType.CHAR_STR},
                Action: {ID: 0x0002, type: Zcl.DataType.UINT8},
                DHCP: {ID: 0x0003, type: Zcl.DataType.BOOLEAN},
                Enable: {ID: 0x0004, type: Zcl.DataType.BOOLEAN},
                SSID: {ID: 0x0005, type: Zcl.DataType.CHAR_STR},
                Password: {ID: 0x0006, type: Zcl.DataType.CHAR_STR},
                StaticIP: {ID: 0x0007, type: Zcl.DataType.CHAR_STR},
                NetMask: {ID: 0x0008, type: Zcl.DataType.CHAR_STR},
                Gateway: {ID: 0x0009, type: Zcl.DataType.CHAR_STR},
                NameServer: {ID: 0x000a, type: Zcl.DataType.CHAR_STR},
            },
            commands: {},
            commandsResponse: {},
        }),
        m.text({
            cluster: "shellyWiFiSetupCluster",
            access: "STATE_GET",
            description: "Wifi Status",
            name: "Wifi_Status",
            attribute: "Status",
            entityCategory: "diagnostic",
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
        m.text({
            cluster: "shellyWiFiSetupCluster",
            access: "STATE_GET",
            description: "IP of the device",
            name: "IP",
            attribute: "IP",
            entityCategory: "diagnostic",
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
        m.enumLookup({
            cluster: "shellyWiFiSetupCluster",
            access: "SET",
            description:
                "Action to perform. Reset resets all attributes to current device configuration, Apply applies the current configuration to the device",
            name: "Action",
            attribute: "Action",
            entityCategory: "config",
            lookup: {
                Reset: 0,
                Apply: 1,
            },
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
        m.binary({
            cluster: "shellyWiFiSetupCluster",
            access: "STATE_GET",
            description: "DHCP",
            name: "DHCP",
            attribute: "DHCP",
            entityCategory: "diagnostic",
            valueOn: [true, 1],
            valueOff: [false, 0],
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
        m.binary({
            cluster: "shellyWiFiSetupCluster",
            access: "ALL",
            description: "Enable/Disable Wifi",
            name: "Enable",
            attribute: "Enable",
            entityCategory: "config",
            valueOn: [true, 1],
            valueOff: [false, 0],
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
        m.text({
            cluster: "shellyWiFiSetupCluster",
            access: "ALL",
            description: "SSID",
            name: "SSID",
            attribute: "SSID",
            entityCategory: "config",
            validate(value: unknown) {
                assertString(value);
            },
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
        m.text({
            cluster: "shellyWiFiSetupCluster",
            access: "SET",
            description: "Wifi Password",
            name: "Password",
            attribute: "Password",
            entityCategory: "config",
            validate(value: unknown) {
                assertString(value);
            },
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
        m.text({
            cluster: "shellyWiFiSetupCluster",
            access: "ALL",
            description: "StaticIP",
            name: "StaticIP",
            attribute: "StaticIP",
            entityCategory: "config",
            validate(value: unknown) {
                assertString(value);
            },
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
        m.text({
            cluster: "shellyWiFiSetupCluster",
            access: "ALL",
            description: "NetMask",
            name: "NetMask",
            attribute: "NetMask",
            entityCategory: "config",
            validate(value: unknown) {
                assertString(value);
            },
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
        m.text({
            cluster: "shellyWiFiSetupCluster",
            access: "ALL",
            description: "Gateway",
            name: "Gateway",
            attribute: "Gateway",
            entityCategory: "config",
            validate(value: unknown) {
                assertString(value);
            },
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
        m.text({
            cluster: "shellyWiFiSetupCluster",
            access: "ALL",
            description: "NameServer",
            name: "NameServer",
            attribute: "NameServer",
            entityCategory: "config",
            validate(value: unknown) {
                assertString(value);
            },
            zigbeeCommandOptions: {
                profileId: 0xc001,
            },
        }),
    ];
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mini1"],
        model: "S4SW-001X8EU",
        vendor: "Shelly",
        description: "1 Mini Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), ...addCustomClusterShellyRPC(), ...addCustomClusterShellyWifiSetup()],
    },
    {
        fingerprint: [{modelID: "1", manufacturerName: "Shelly"}],
        model: "S4SW-001X16EU",
        vendor: "Shelly",
        description: "1 Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), ...addCustomClusterShellyRPC(), ...addCustomClusterShellyWifiSetup()],
    },
    {
        zigbeeModel: ["Mini1PM"],
        model: "S4SW-001P8EU",
        vendor: "Shelly",
        description: "1PM Mini Gen 4",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            ...addCustomClusterShellyRPC(),
            ...addCustomClusterShellyWifiSetup(),
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
            ...addCustomClusterShellyRPC(),
            ...addCustomClusterShellyWifiSetup(),
        ],
    },
];
