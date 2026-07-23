import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, ModernExtend, Tz, Zh} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const MFR = 0x1994; // Gewiss S.p.A.
const opts = {manufacturerCode: MFR};
const U16 = Zcl.DataType.UINT16;
const U8 = Zcl.DataType.UINT8;

const pctToByte = (v: number) => Math.max(0, Math.min(255, Math.round((Number(v) * 255) / 100)));
const byteToPct = (v: number) => Math.round((Number(v) * 100) / 255);

// Map for calibration and LED parameters
const MAP = {
    opening_time: {cluster: "closuresWindowCovering", id: 0x0101, type: U16, pct: false},
    closing_time: {cluster: "closuresWindowCovering", id: 0x0102, type: U16, pct: false},
    param_111: {cluster: "closuresWindowCovering", id: 0x0111, type: U8, pct: false},
    led_standby_brightness: {cluster: "gewissLed", id: 0x0001, type: U8, pct: true},
    led_moving_brightness: {cluster: "gewissLed", id: 0x0003, type: U8, pct: true},
};

const tzGewiss: Tz.Converter = {
    key: Object.keys(MAP),
    convertSet: async (entity, key, value) => {
        const item = (MAP as Record<string, {cluster: string; id: number; type: Zcl.DataType; pct: boolean}>)[key];
        if (!item) return;
        const {cluster, id, type, pct} = item;
        const raw = pct ? pctToByte(Number(value)) : Number.parseInt(String(value), 10);
        await entity.write(cluster, {[id]: {value: raw, type}}, opts);
        return {state: {[key]: pct ? Number(value) : Number.parseInt(String(value), 10)}};
    },
    convertGet: async (entity, key) => {
        const item = (MAP as Record<string, {cluster: string; id: number}>)[key];
        if (!item) return;
        const {cluster, id} = item;
        await entity.read(cluster, [id], opts);
    },
};

const fzWc = {
    cluster: "closuresWindowCovering",
    type: ["attributeReport", "readResponse"],
    convert: (model: unknown, msg: Fz.Message<string>) => {
        const r: Record<string, unknown> = {};
        if (msg.data[0x0101] !== undefined) r.opening_time = msg.data[0x0101];
        if (msg.data[0x0102] !== undefined) r.closing_time = msg.data[0x0102];
        if (msg.data[0x0111] !== undefined) r.param_111 = msg.data[0x0111];
        return r;
    },
};

const fzLed = {
    cluster: "gewissLed",
    type: ["attributeReport", "readResponse"],
    convert: (model: unknown, msg: Fz.Message<string>) => {
        const r: Record<string, unknown> = {};
        if (msg.data[0x0001] !== undefined) r.led_standby_brightness = byteToPct(msg.data[0x0001]);
        if (msg.data[0x0003] !== undefined) r.led_moving_brightness = byteToPct(msg.data[0x0003]);
        return r;
    },
};

const gewissShutterFeatures: ModernExtend = {
    fromZigbee: [fzWc, fzLed],
    toZigbee: [tzGewiss],
    exposes: [
        e
            .numeric("opening_time", ea.ALL)
            .withUnit("s")
            .withValueMin(0)
            .withValueMax(300)
            .withValueStep(1)
            .withDescription("Opening/ascent time in seconds (attr 0x0101)"),
        e
            .numeric("closing_time", ea.ALL)
            .withUnit("s")
            .withValueMin(0)
            .withValueMax(300)
            .withValueStep(1)
            .withDescription("Closing/descent time in seconds (attr 0x0102)"),
        e
            .numeric("led_standby_brightness", ea.ALL)
            .withUnit("%")
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1)
            .withDescription("LED standby brightness (attr 0xfd79/0x0001)"),
        e
            .numeric("led_moving_brightness", ea.ALL)
            .withUnit("%")
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1)
            .withDescription("LED brightness while moving (attr 0xfd79/0x0003)"),
    ],
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

const gewissSwitchLedFeature: ModernExtend = {
    fromZigbee: [fzLed],
    toZigbee: [tzGewiss],
    exposes: [
        e
            .numeric("led_standby_brightness", ea.ALL)
            .withUnit("%")
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1)
            .withDescription("LED standby brightness (attr 0xfd79/0x0001)"),
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
                    ledStandby: {ID: 0x0001, type: U8, name: "ledStandby"},
                },
                commands: {},
                commandsResponse: {},
            }),
            gewissSwitchLedFeature,
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
                    ledStandby: {ID: 0x0001, type: U8, name: "ledStandby"},
                    ledMovimento: {ID: 0x0003, type: U8, name: "ledMovimento"},
                },
                commands: {},
                commandsResponse: {},
            }),
            gewissShutterFeatures,
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
