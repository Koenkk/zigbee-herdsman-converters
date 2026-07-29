import {Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, ModernExtend, Zh} from "../lib/types";

const MFR = 0x1994; // Gewiss S.p.A.

const gewissShutterConfigure: ModernExtend = {
    configure: [
        async (device: Zh.Device, coordinatorEndpoint: Zh.Endpoint) => {
            const endpoint = device.getEndpoint(1);
            if (endpoint) {
                try {
                    await endpoint.bind("closuresWindowCovering", coordinatorEndpoint);
                    await endpoint.configureReporting("closuresWindowCovering", [
                        {
                            attribute: "currentPositionLiftPercentage",
                            minimumReportInterval: 1,
                            maximumReportInterval: 600,
                            reportableChange: 1,
                        },
                    ]);
                } catch {
                    // Silently catch errors if device rejects other reporting parameters
                }
            }
        },
    ],
    isModernExtend: true,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["GWA1201_TWO_WAY_SWITCH"],
        model: "GWA1201",
        vendor: "Gewiss",
        description: "Chorus on/off switch",
        extend: [
            m.onOff({powerOnBehavior: true}),
            m.identify(),
            m.deviceAddCustomCluster("gewissLed", {
                ID: 0xfd79,
                name: "gewissLed",
                manufacturerCode: MFR,
                attributes: {
                    ledStandby: {ID: 0x0001, type: Zcl.DataType.UINT8, name: "ledStandby"},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.numeric({
                name: "led_standby_brightness",
                cluster: "gewissLed",
                attribute: {ID: 0x0001, type: Zcl.DataType.UINT8},
                description: "LED standby brightness",
                valueMin: 0,
                valueMax: 100,
                valueStep: 1,
                unit: "%",
                scale: 255 / 100,
                access: "ALL",
                zigbeeCommandOptions: {manufacturerCode: MFR},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["GWA1521_Actuator_1_CH_PF"],
        model: "GWA1521",
        description: "Switch actuator 1 channel with input",
        vendor: "Gewiss",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["GWA1522_Actuator_2_CH"],
        model: "GWA1522",
        description: "Switch actuator 2 channels with input",
        vendor: "Gewiss",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        zigbeeModel: ["GWA1531_Shutter", "GWA1231_SHUTTER"],
        model: "GWA1231",
        vendor: "Gewiss",
        description: "Chorus roller shutter module",
        whiteLabel: [{model: "GWA1531", fingerprint: [{modelID: "GWA1531_Shutter"}]}],
        extend: [
            m.windowCovering({controls: ["lift"], coverInverted: true, configureReporting: false}),
            m.deviceAddCustomCluster("gewissLed", {
                ID: 0xfd79,
                name: "gewissLed",
                manufacturerCode: MFR,
                attributes: {
                    ledStandby: {ID: 0x0001, type: Zcl.DataType.UINT8, name: "ledStandby"},
                    ledMovimento: {ID: 0x0003, type: Zcl.DataType.UINT8, name: "ledMovimento"},
                },
                commands: {},
                commandsResponse: {},
            }),
            gewissShutterConfigure,
            m.numeric({
                name: "opening_time",
                cluster: "closuresWindowCovering",
                attribute: {ID: 0x0101, type: Zcl.DataType.UINT16},
                description: "Opening/ascent time in seconds",
                valueMin: 0,
                valueMax: 300,
                valueStep: 1,
                unit: "s",
                access: "ALL",
                zigbeeCommandOptions: {manufacturerCode: MFR},
            }),
            m.numeric({
                name: "closing_time",
                cluster: "closuresWindowCovering",
                attribute: {ID: 0x0102, type: Zcl.DataType.UINT16},
                description: "Closing/descent time in seconds",
                valueMin: 0,
                valueMax: 300,
                valueStep: 1,
                unit: "s",
                access: "ALL",
                zigbeeCommandOptions: {manufacturerCode: MFR},
            }),
            m.numeric({
                name: "led_standby_brightness",
                cluster: "gewissLed",
                attribute: {ID: 0x0001, type: Zcl.DataType.UINT8},
                description: "LED standby brightness",
                valueMin: 0,
                valueMax: 100,
                valueStep: 1,
                unit: "%",
                scale: 255 / 100,
                access: "ALL",
                zigbeeCommandOptions: {manufacturerCode: MFR},
            }),
            m.numeric({
                name: "led_moving_brightness",
                cluster: "gewissLed",
                attribute: {ID: 0x0003, type: Zcl.DataType.UINT8},
                description: "LED brightness while moving",
                valueMin: 0,
                valueMax: 100,
                valueStep: 1,
                unit: "%",
                scale: 255 / 100,
                access: "ALL",
                zigbeeCommandOptions: {manufacturerCode: MFR},
            }),
        ],
    },
    {
        zigbeeModel: ["GWA1502_BinaryInput230V"],
        model: "GWA1502",
        vendor: "Gewiss",
        description: "Contact interface - 2 channels - 230V",
        meta: {multiEndpoint: true},
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.binary({
                name: "input",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                reporting: {min: "MIN", max: "1_HOUR", change: 1},
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "State of input I1",
                access: "STATE_GET",
                endpointName: "1",
            }),
            m.binary({
                name: "input",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                reporting: {min: "MIN", max: "1_HOUR", change: 1},
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "State of input I2",
                access: "STATE_GET",
                endpointName: "2",
            }),
        ],
    },
    {
        zigbeeModel: ["GWA1501_BinaryInput_FC"],
        model: "GWA1501",
        vendor: "Gewiss",
        description: "Contact interface - 2 channels",
        meta: {multiEndpoint: true},
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.battery(),
            m.binary({
                name: "input",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                reporting: {min: "MIN", max: "MAX", change: 1},
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "State of input I1",
                access: "STATE_GET",
                endpointName: "1",
            }),
            m.binary({
                name: "input",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                reporting: {min: "MIN", max: "MAX", change: 1},
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "State of input I2",
                access: "STATE_GET",
                endpointName: "2",
            }),
        ],
    },
];
