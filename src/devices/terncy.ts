import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz, Zh} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const XIAOYAN_MANUFACTURER_CODE = 0x1228;
const ADURO_SMART_CLUSTER = "manuSpecificClusterAduroSmart";
const TERNCY_DIMMER_POWER_CLUSTER = "terncyDimmerPower";
const TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER = "terncyDimmerLightEffect";
const terncyManufacturerOptions = {manufacturerCode: XIAOYAN_MANUFACTURER_CODE};

interface AduroSmart {
    attributes: {
        terncyRotation: number;
        cfgButtonLedPolarity: number;
        cfgButtonLedStatus: number;
        cfgDisabledRelayStatus: number;
        cfgLoopHasRelay: boolean;
    };
    commands: {
        cmd0: Record<string, never>;
        enableRelay: {value: number};
        configIndicatorLed: {value: boolean};
        setInputMode: {value: number};
        enablePureInput: {value: number};
        setSwitchPolarity: {value: number};
        setButtonLedStatus: {value: number};
    };
    commandResponses: never;
}

interface TerncyDimmerPower {
    attributes: Record<string, never>;
    commands: {
        powerCalibration: {mode: number; current: number; reserved: number};
    };
    commandResponses: never;
}

interface TerncyDimmerLightEffect {
    attributes: {
        xyPwmLowFrequency: number;
        xyRevertColorTempGpio: boolean;
        xyLightUpCurve: number;
        mappedXyLevel: number;
    };
    commands: {
        adjustStartLevel: {level: number};
        setColorTempRange: {min: number; max: number};
        setBezier: {type: number; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number};
    };
    commandResponses: never;
}

const WS07_ENDPOINTS = {l1: 1, l2: 2, l3: 3};
const WS07_WIRELESS_LED_STATUS = {
    off: 0,
    on: 1,
};
const WS07_LED_FEEDBACK_MODE = {
    positive: 0,
    negative: 1,
};
const WS07_CLICK_ACTIONS: Record<number, string> = {
    1: "single",
    2: "double",
    3: "triple",
    4: "quadruple",
    5: "5_click",
    6: "6_click",
    7: "7_click",
};

const DIM003_DEFAULT_MIN_KELVIN = 1600;
const DIM003_DEFAULT_MAX_KELVIN = 7000;
const DIM003_POWER_CALIBRATION_MODE_RATED_MAX_CURRENT = 0x00;
const DIM003_LIGHT_UP_CURVE = {
    fast_start: 0,
    uniform: 1,
    slow_start: 2,
};
const DIM003_LIGHT_UP_CURVE_BY_VALUE: Record<number, string> = {
    0: "fast_start",
    1: "uniform",
    2: "slow_start",
};

function lookupNumber<T extends Record<string, number>>(value: unknown, key: string, lookup: T): {name: keyof T & string; value: number} {
    const name = String(value);
    if (!Object.hasOwn(lookup, name)) {
        throw new Error(`${key} must be one of: ${Object.keys(lookup).join(", ")}`);
    }

    return {name: name as keyof T & string, value: lookup[name]};
}

function numberInRange(value: unknown, key: string, min: number, max: number): number {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
        throw new Error(`${key} must be a number from ${min} to ${max}`);
    }

    return Math.round(number);
}

function stateNumber(meta: Tz.Meta, key: string, fallback: number): number {
    const value = Number(meta.state?.[key]);
    return Number.isFinite(value) ? value : fallback;
}

function kelvinToMired(kelvin: number): number {
    return Math.round(1000000 / kelvin);
}

function booleanValue(value: unknown, key: string): boolean {
    if (typeof value === "boolean") {
        return value;
    }

    const normalized = String(value).toLowerCase();
    if (["true", "on", "1"].includes(normalized)) {
        return true;
    }
    if (["false", "off", "0"].includes(normalized)) {
        return false;
    }

    throw new Error(`${key} must be true or false`);
}

function ws07EndpointName(msg: Fz.Message<typeof ADURO_SMART_CLUSTER, AduroSmart, "raw">): string | undefined {
    return Object.entries(WS07_ENDPOINTS).find(([, Id]) => Id === msg.endpoint.ID)?.[0];
}

function ws07EndpointActions(): string[] {
    const baseActions = [...Object.values(WS07_CLICK_ACTIONS), "hold", "release"];
    return Object.keys(WS07_ENDPOINTS).flatMap((ep) => baseActions.map((action) => `${action}_${ep}`));
}

async function sendWs07SwitchConfig(entity: Zh.Endpoint | Zh.Group, command: "enablePureInput" | "setButtonLedStatus", value: number): Promise<void> {
    await entity.command<typeof ADURO_SMART_CLUSTER, typeof command, AduroSmart>(
        ADURO_SMART_CLUSTER,
        command,
        {value},
        {...terncyManufacturerOptions, disableDefaultResponse: false},
    );
}

async function sendDim003PowerCommand(entity: Zh.Endpoint | Zh.Group, payload: TerncyDimmerPower["commands"]["powerCalibration"]): Promise<void> {
    await entity.command<typeof TERNCY_DIMMER_POWER_CLUSTER, "powerCalibration", TerncyDimmerPower>(
        TERNCY_DIMMER_POWER_CLUSTER,
        "powerCalibration",
        payload,
        {...terncyManufacturerOptions, disableDefaultResponse: false},
    );
}

async function sendDim003AdjustStartLevel(
    entity: Zh.Endpoint | Zh.Group,
    payload: TerncyDimmerLightEffect["commands"]["adjustStartLevel"],
): Promise<void> {
    await entity.command<typeof TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER, "adjustStartLevel", TerncyDimmerLightEffect>(
        TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER,
        "adjustStartLevel",
        payload,
        {...terncyManufacturerOptions, disableDefaultResponse: false},
    );
}

async function sendDim003ColorTempRange(
    entity: Zh.Endpoint | Zh.Group,
    payload: TerncyDimmerLightEffect["commands"]["setColorTempRange"],
): Promise<void> {
    await entity.command<typeof TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER, "setColorTempRange", TerncyDimmerLightEffect>(
        TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER,
        "setColorTempRange",
        payload,
        {...terncyManufacturerOptions, disableDefaultResponse: false},
    );
}

const terncyExtend = {
    addClusterAduroSmart: () =>
        m.deviceAddCustomCluster("manuSpecificClusterAduroSmart", {
            name: "manuSpecificClusterAduroSmart",
            ID: 0xfccc,
            manufacturerCode: XIAOYAN_MANUFACTURER_CODE,
            attributes: {
                terncyRotation: {name: "terncyRotation", ID: 0x001b, type: Zcl.DataType.UINT16},
                cfgButtonLedPolarity: {name: "cfgButtonLedPolarity", ID: 0x001f, type: Zcl.DataType.UINT8, write: true},
                cfgButtonLedStatus: {name: "cfgButtonLedStatus", ID: 0x0020, type: Zcl.DataType.UINT8},
                cfgDisabledRelayStatus: {name: "cfgDisabledRelayStatus", ID: 0x0021, type: Zcl.DataType.UINT8},
                cfgLoopHasRelay: {name: "cfgLoopHasRelay", ID: 0x0026, type: Zcl.DataType.BOOLEAN},
            },
            commands: {
                cmd0: {name: "cmd0", ID: 0x00, parameters: []},
                enableRelay: {name: "enableRelay", ID: 0x13, parameters: [{name: "value", type: Zcl.DataType.UINT8}]},
                configIndicatorLed: {name: "configIndicatorLed", ID: 0x16, parameters: [{name: "value", type: Zcl.DataType.BOOLEAN}]},
                setInputMode: {name: "setInputMode", ID: 0x1c, parameters: [{name: "value", type: Zcl.DataType.UINT8}]},
                enablePureInput: {name: "enablePureInput", ID: 0x1d, parameters: [{name: "value", type: Zcl.DataType.UINT8}]},
                setSwitchPolarity: {name: "setSwitchPolarity", ID: 0x1e, parameters: [{name: "value", type: Zcl.DataType.UINT8}]},
                setButtonLedStatus: {name: "setButtonLedStatus", ID: 0x1f, parameters: [{name: "value", type: Zcl.DataType.UINT8}]},
            },
            commandsResponse: {},
        }),
    addDimmerPowerCluster: () =>
        m.deviceAddCustomCluster(TERNCY_DIMMER_POWER_CLUSTER, {
            name: TERNCY_DIMMER_POWER_CLUSTER,
            ID: 0xfccc,
            manufacturerCode: XIAOYAN_MANUFACTURER_CODE,
            attributes: {},
            commands: {
                powerCalibration: {
                    name: "powerCalibration",
                    ID: 0x08,
                    parameters: [
                        {name: "mode", type: Zcl.DataType.UINT8},
                        {name: "current", type: Zcl.DataType.UINT32},
                        {name: "reserved", type: Zcl.DataType.UINT32},
                    ],
                },
            },
            commandsResponse: {},
        }),
    addDimmerLightEffectCluster: () =>
        m.deviceAddCustomCluster(TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER, {
            name: TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER,
            ID: 0xfccd,
            manufacturerCode: XIAOYAN_MANUFACTURER_CODE,
            attributes: {
                xyPwmLowFrequency: {name: "xyPwmLowFrequency", ID: 0x0002, type: Zcl.DataType.UINT16},
                xyRevertColorTempGpio: {name: "xyRevertColorTempGpio", ID: 0x0005, type: Zcl.DataType.BOOLEAN, write: true},
                xyLightUpCurve: {name: "xyLightUpCurve", ID: 0x0007, type: Zcl.DataType.UINT8, write: true},
                mappedXyLevel: {name: "mappedXyLevel", ID: 0x0009, type: Zcl.DataType.UINT16},
            },
            commands: {
                adjustStartLevel: {name: "adjustStartLevel", ID: 0x00, parameters: [{name: "level", type: Zcl.DataType.UINT32}]},
                setColorTempRange: {
                    name: "setColorTempRange",
                    ID: 0x03,
                    parameters: [
                        {name: "min", type: Zcl.DataType.UINT16},
                        {name: "max", type: Zcl.DataType.UINT16},
                    ],
                },
                setBezier: {
                    name: "setBezier",
                    ID: 0x05,
                    parameters: [
                        {name: "type", type: Zcl.DataType.UINT8},
                        {name: "x1", type: Zcl.DataType.UINT16},
                        {name: "y1", type: Zcl.DataType.UINT16},
                        {name: "x2", type: Zcl.DataType.UINT16},
                        {name: "y2", type: Zcl.DataType.UINT16},
                        {name: "x3", type: Zcl.DataType.UINT16},
                        {name: "y3", type: Zcl.DataType.UINT16},
                    ],
                },
            },
            commandsResponse: {},
        }),
    contact: () =>
        m.binary<"genBinaryInput", undefined>({
            name: "contact",
            cluster: "genBinaryInput",
            attribute: "presentValue",
            valueOn: [true, 1],
            valueOff: [false, 0],
            description: "Indicates if the contact is closed (= true) or open (= false)",
        }),
};

const fzLocal = {
    terncy_knob: {
        cluster: "manuSpecificClusterAduroSmart",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (typeof msg.data.terncyRotation === "number") {
                const direction = msg.data.terncyRotation > 0 ? "clockwise" : "counterclockwise";
                const number = Math.abs(msg.data.terncyRotation) / 12;
                return {action: "rotate", action_direction: direction, action_number: number};
            }
        },
    } satisfies Fz.Converter<"manuSpecificClusterAduroSmart", AduroSmart, ["attributeReport", "readResponse"]>,
    terncy_raw: {
        cluster: "manuSpecificClusterAduroSmart",
        type: "raw",
        convert: (model, msg, publish, options, meta) => {
            // 13,40,18,104, 0,8,1 - single
            // 13,40,18,22,  0,17,1
            // 13,40,18,32,  0,18,1
            // 13,40,18,6,   0,16,1
            // 13,40,18,111, 0,4,2 - double
            // 13,40,18,58,  0,7,2
            // 13,40,18,6,   0,2,3 - triple
            // motion messages:
            // 13,40,18,105, 4,167,0,7 - motion on right side
            // 13,40,18,96,  4,27,0,5
            // 13,40,18,101, 4,27,0,7
            // 13,40,18,125, 4,28,0,5
            // 13,40,18,85,  4,28,0,7
            // 13,40,18,3,   4,24,0,5
            // 13,40,18,81,  4,10,1,7
            // 13,40,18,72,  4,30,1,5
            // 13,40,18,24,  4,25,0,40 - motion on left side
            // 13,40,18,47,  4,28,0,56
            // 13,40,18,8,   4,32,0,40
            let value = null;
            if (msg.data[4] === 0) {
                value = msg.data[6];
                if (1 <= value && value <= 3) {
                    const actionLookup: KeyValueAny = {1: "single", 2: "double", 3: "triple", 4: "quadruple"};
                    return {action: actionLookup[value]};
                }
            } else if (msg.data[4] === 4) {
                value = msg.data[7];
                const sidelookup: KeyValueAny = {5: "right", 7: "right", 40: "left", 56: "left"};
                if (sidelookup[value]) {
                    const newMsg = {...msg, type: "attributeReport" as const, data: {occupancy: 1}};
                    const payload = fz.occupancy_with_timeout.convert(model, newMsg, publish, options, meta) as KeyValueAny;
                    if (payload) {
                        payload.action_side = sidelookup[value];
                        payload.side = sidelookup[value]; /* legacy: remove this line (replaced by action_side) */
                    }

                    return payload;
                }
            }
        },
    } satisfies Fz.Converter<"manuSpecificClusterAduroSmart", AduroSmart, "raw">,
    ws07_action: {
        cluster: ADURO_SMART_CLUSTER,
        type: "raw",
        convert: (model, msg, publish, options, meta) => {
            const data = [...msg.data];
            const ep = ws07EndpointName(msg);

            if (!ep || data[0] !== 0x0d || data[1] !== 0x28 || data[2] !== 0x12) {
                return;
            }

            if (data[4] === 0x00) {
                const clickAction = WS07_CLICK_ACTIONS[data[6]];
                if (clickAction) {
                    return {action: `${clickAction}_${ep}`};
                }
            }

            if (data[4] === 0x29 && (data[5] === 0x02 || data[5] === 0x08)) {
                return {
                    action: `${data[5] === 0x02 ? "hold" : "release"}_${ep}`,
                    action_duration: data[7] + (data[8] << 8),
                };
            }
        },
    } satisfies Fz.Converter<typeof ADURO_SMART_CLUSTER, AduroSmart, "raw">,
    dim003_light_effect_attributes: {
        cluster: TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER,
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const curve = DIM003_LIGHT_UP_CURVE_BY_VALUE[msg.data.xyLightUpCurve];
            if (curve === undefined) {
                return;
            }

            return {light_up_curve: curve};
        },
    } satisfies Fz.Converter<typeof TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER, TerncyDimmerLightEffect, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    ws07_operation_mode: {
        key: ["operation_mode"],
        convertSet: async (entity, key, value, meta) => {
            const mode = lookupNumber(value, key, {control_relay: 0, wireless: 1});
            await sendWs07SwitchConfig(entity, "enablePureInput", mode.value);
            return {state: {[key]: mode.name}};
        },
    } satisfies Tz.Converter,
    ws07_wireless_led_status: {
        key: ["wireless_led_status"],
        convertSet: async (entity, key, value, meta) => {
            const status = lookupNumber(value, key, WS07_WIRELESS_LED_STATUS);
            await sendWs07SwitchConfig(entity, "setButtonLedStatus", status.value);
            return {state: {[key]: status.name}};
        },
    } satisfies Tz.Converter,
    ws07_led_feedback_mode: {
        key: ["led_feedback_mode"],
        convertSet: async (entity, key, value, meta) => {
            const mode = lookupNumber(value, key, WS07_LED_FEEDBACK_MODE);
            await entity.write<typeof ADURO_SMART_CLUSTER, AduroSmart>(
                ADURO_SMART_CLUSTER,
                {cfgButtonLedPolarity: mode.value},
                {...terncyManufacturerOptions, disableDefaultResponse: false, srcEndpoint: 110},
            );
            return {state: {[key]: mode.name}};
        },
    } satisfies Tz.Converter,
    dim003_rated_max_current: {
        key: ["rated_max_current_ma"],
        convertSet: async (entity, key, value, meta) => {
            const current = numberInRange(value, key, 120, 4950);
            await sendDim003PowerCommand(entity, {
                mode: DIM003_POWER_CALIBRATION_MODE_RATED_MAX_CURRENT,
                current,
                reserved: 0,
            });
            return {state: {[key]: current}};
        },
    } satisfies Tz.Converter,
    dim003_startup_depth_calibration: {
        key: ["startup_depth_calibration"],
        convertSet: async (entity, key, value, meta) => {
            const level = numberInRange(value, key, 0, 5000);
            await sendDim003AdjustStartLevel(entity, {level});
            return {state: {[key]: level}};
        },
    } satisfies Tz.Converter,
    dim003_color_temperature_range: {
        key: ["color_temperature_range_min_kelvin", "color_temperature_range_max_kelvin"],
        convertSet: async (entity, key, value, meta) => {
            const nextValue = numberInRange(value, key, 1000, 10000);
            const minKelvin =
                key === "color_temperature_range_min_kelvin"
                    ? nextValue
                    : stateNumber(meta, "color_temperature_range_min_kelvin", DIM003_DEFAULT_MIN_KELVIN);
            const maxKelvin =
                key === "color_temperature_range_max_kelvin"
                    ? nextValue
                    : stateNumber(meta, "color_temperature_range_max_kelvin", DIM003_DEFAULT_MAX_KELVIN);

            if (minKelvin >= maxKelvin) {
                throw new Error("color_temperature_range_min_kelvin must be lower than color_temperature_range_max_kelvin");
            }

            await sendDim003ColorTempRange(entity, {
                min: kelvinToMired(maxKelvin),
                max: kelvinToMired(minKelvin),
            });

            return {
                state: {
                    color_temperature_range_min_kelvin: minKelvin,
                    color_temperature_range_max_kelvin: maxKelvin,
                },
            };
        },
    } satisfies Tz.Converter,
    dim003_color_temperature_io_reversed: {
        key: ["color_temperature_io_reversed"],
        convertSet: async (entity, key, value, meta) => {
            const reversed = booleanValue(value, key);
            await entity.write<typeof TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER, TerncyDimmerLightEffect>(
                TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER,
                {xyRevertColorTempGpio: reversed},
                {...terncyManufacturerOptions, disableDefaultResponse: false},
            );
            return {state: {[key]: reversed}};
        },
    } satisfies Tz.Converter,
    dim003_light_up_curve: {
        key: ["light_up_curve"],
        convertSet: async (entity, key, value, meta) => {
            const curve = lookupNumber(value, key, DIM003_LIGHT_UP_CURVE);
            await entity.write<typeof TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER, TerncyDimmerLightEffect>(
                TERNCY_DIMMER_LIGHT_EFFECT_CLUSTER,
                {xyLightUpCurve: curve.value},
                {...terncyManufacturerOptions, disableDefaultResponse: false},
            );
            return {state: {[key]: curve.name}};
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["TERNCY-WS01-S4"],
        model: "TERNCY-WS01",
        vendor: "TERNCY",
        description: "Smart light switch - 4 gang without neutral wire",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4}}), m.onOff({endpointNames: ["l1", "l2", "l3", "l4"]})],
    },
    {
        zigbeeModel: ["DL001"],
        model: "DL001",
        vendor: "TERNCY",
        description: "Two color temperature intelligent downlight",
        extend: [m.light({colorTemp: {range: [156, 476]}})],
    },
    {
        fingerprint: [{modelID: "DIM003", manufacturerName: "Xiaoyan"}],
        model: "DIM003",
        vendor: "TERNCY",
        description: "Color temperature dimmer",
        fromZigbee: [fzLocal.dim003_light_effect_attributes],
        toZigbee: [
            tzLocal.dim003_rated_max_current,
            tzLocal.dim003_startup_depth_calibration,
            tzLocal.dim003_color_temperature_range,
            tzLocal.dim003_color_temperature_io_reversed,
            tzLocal.dim003_light_up_curve,
        ],
        exposes: [
            e
                .numeric("rated_max_current_ma", ea.STATE_SET)
                .withUnit("mA")
                .withDescription("Rated maximum current limit; setting may apply after a short delay")
                .withValueMin(120)
                .withValueMax(4950)
                .withValueStep(1)
                .withCategory("config"),
            e
                .numeric("startup_depth_calibration", ea.STATE_SET)
                .withDescription("Xiaoyan startup depth calibration")
                .withValueMin(0)
                .withValueMax(5000)
                .withValueStep(1)
                .withCategory("config"),
            e
                .numeric("color_temperature_range_min_kelvin", ea.STATE_SET)
                .withUnit("K")
                .withDescription("Warmest color temperature limit")
                .withValueMin(1000)
                .withValueMax(10000)
                .withValueStep(1)
                .withCategory("config"),
            e
                .numeric("color_temperature_range_max_kelvin", ea.STATE_SET)
                .withUnit("K")
                .withDescription("Coolest color temperature limit")
                .withValueMin(1000)
                .withValueMax(10000)
                .withValueStep(1)
                .withCategory("config"),
            e
                .binary("color_temperature_io_reversed", ea.STATE_SET, true, false)
                .withDescription("Reverse the cool and warm white output IO mapping")
                .withCategory("config"),
            exposes.enum("light_up_curve", ea.STATE_SET, Object.keys(DIM003_LIGHT_UP_CURVE)).withDescription("Light-up curve").withCategory("config"),
        ],
        extend: [
            terncyExtend.addDimmerPowerCluster(),
            terncyExtend.addDimmerLightEffectCluster(),
            m.light({
                colorTemp: {range: [142, 625], startup: false},
                configureReporting: true,
                effect: false,
                powerOnBehavior: false,
            }),
        ],
    },
    {
        zigbeeModel: ["TERNCY-DC01"],
        model: "TERNCY-DC01",
        vendor: "TERNCY",
        description: "Temperature & contact sensor ",
        extend: [m.temperature({scale: 10}), terncyExtend.contact(), m.battery({dontDividePercentage: true})],
    },
    {
        zigbeeModel: ["TERNCY-PP01"],
        model: "TERNCY-PP01",
        vendor: "TERNCY",
        description: "Awareness switch",
        fromZigbee: [fz.occupancy_with_timeout, fzLocal.terncy_raw, fz.battery],
        exposes: [e.occupancy(), e.action(["single", "double", "triple", "quadruple"])],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        extend: [terncyExtend.addClusterAduroSmart(), m.temperature({scale: 10}), m.illuminance()],
    },
    {
        zigbeeModel: ["TERNCY-SD01"],
        model: "TERNCY-SD01",
        vendor: "TERNCY",
        description: "Knob smart dimmer",
        fromZigbee: [fzLocal.terncy_raw, fzLocal.terncy_knob, fz.battery],
        toZigbee: [],
        extend: [terncyExtend.addClusterAduroSmart()],
        ota: true,
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.battery(), e.action(["single", "double", "triple", "quadruple", "rotate"]), e.text("direction", ea.STATE)],
    },
    {
        zigbeeModel: ["TERNCY-LS01"],
        model: "TERNCY-LS01",
        vendor: "TERNCY",
        description: "Smart light socket",
        exposes: [e.switch(), e.action(["single"])],
        fromZigbee: [fz.on_off, fzLocal.terncy_raw],
        toZigbee: [tz.on_off],
        extend: [terncyExtend.addClusterAduroSmart()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        fingerprint: [{modelID: "TERNCY-WS07-D3", manufacturerName: "Xiaoyan"}],
        model: "TERNCY-WS07-D3",
        vendor: "TERNCY",
        description: "3-gang neutral wall switch",
        fromZigbee: [fzLocal.ws07_action],
        toZigbee: [tzLocal.ws07_operation_mode, tzLocal.ws07_wireless_led_status, tzLocal.ws07_led_feedback_mode],
        exposes: [
            exposes
                .enum("operation_mode", ea.STATE_SET, ["control_relay", "wireless"])
                .withEndpoint("l1")
                .withDescription("Control relay or act as wireless switch")
                .withCategory("config"),
            exposes
                .enum("operation_mode", ea.STATE_SET, ["control_relay", "wireless"])
                .withEndpoint("l2")
                .withDescription("Control relay or act as wireless switch")
                .withCategory("config"),
            exposes
                .enum("operation_mode", ea.STATE_SET, ["control_relay", "wireless"])
                .withEndpoint("l3")
                .withDescription("Control relay or act as wireless switch")
                .withCategory("config"),
            exposes
                .enum("wireless_led_status", ea.STATE_SET, Object.keys(WS07_WIRELESS_LED_STATUS))
                .withEndpoint("l1")
                .withDescription("LED state while in wireless switch mode")
                .withCategory("config"),
            exposes
                .enum("wireless_led_status", ea.STATE_SET, Object.keys(WS07_WIRELESS_LED_STATUS))
                .withEndpoint("l2")
                .withDescription("LED state while in wireless switch mode")
                .withCategory("config"),
            exposes
                .enum("wireless_led_status", ea.STATE_SET, Object.keys(WS07_WIRELESS_LED_STATUS))
                .withEndpoint("l3")
                .withDescription("LED state while in wireless switch mode")
                .withCategory("config"),
            exposes
                .enum("led_feedback_mode", ea.STATE_SET, Object.keys(WS07_LED_FEEDBACK_MODE))
                .withEndpoint("l1")
                .withDescription("Relay-mode LED feedback relation")
                .withCategory("config"),
            exposes
                .enum("led_feedback_mode", ea.STATE_SET, Object.keys(WS07_LED_FEEDBACK_MODE))
                .withEndpoint("l2")
                .withDescription("Relay-mode LED feedback relation")
                .withCategory("config"),
            exposes
                .enum("led_feedback_mode", ea.STATE_SET, Object.keys(WS07_LED_FEEDBACK_MODE))
                .withEndpoint("l3")
                .withDescription("Relay-mode LED feedback relation")
                .withCategory("config"),
            e.action(ws07EndpointActions()),
            e.action_duration(),
        ],
        extend: [terncyExtend.addClusterAduroSmart(), m.deviceEndpoints({endpoints: WS07_ENDPOINTS}), m.onOff({endpointNames: ["l1", "l2", "l3"]})],
    },
    {
        zigbeeModel: ["CL001"],
        model: "CL001",
        vendor: "TERNCY",
        description: "Beevon ceiling light",
        ota: true,
        extend: [m.light({colorTemp: {range: [50, 500]}, powerOnBehavior: false, effect: false})],
    },
];
