import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValue, KeyValueAny, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const NS = "zhc:sber";

const {tuyaMagicPacket, tuyaOnOffActionLegacy} = tuya.modernExtend;
const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD};
const defaultResponseOptions = {disableDefaultResponse: false};

const sdevices = {
    fz: {
        emergency_shutoff_state: {
            cluster: "manuSpecificSDevices",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.emergencyShutoffState !== undefined) {
                    const stateBitmap = msg.data.emergencyShutoffState;
                    const emergencyOvervoltage = stateBitmap & 0x01;
                    const emergencyUndervoltage = (stateBitmap & 0x02) >> 1;
                    const emergencyOvercurrent = (stateBitmap & 0x04) >> 2;
                    const emergencyOverheat = (stateBitmap & 0x08) >> 3;
                    return {
                        emergency_overvoltage: !!emergencyOvervoltage,
                        emergency_undervoltage: !!emergencyUndervoltage,
                        emergency_overcurrent: !!emergencyOvercurrent,
                        emergency_overheat: !!emergencyOverheat,
                    };
                }
            },
        } satisfies Fz.Converter<"manuSpecificSDevices", SberDevices, ["attributeReport", "readResponse"]>,
        led_indicator_settings: {
            cluster: "manuSpecificSDevices",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.ledIndicatorOnEnable !== undefined) {
                    result[utils.postfixWithEndpointName("led_indicator_on_enable", msg, model, meta)] = msg.data.ledIndicatorOnEnable ? "ON" : "OFF";
                }
                if (msg.data.ledIndicatorOnH !== undefined) {
                    result[utils.postfixWithEndpointName("led_indicator_on_h", msg, model, meta)] = msg.data.ledIndicatorOnH;
                }
                if (msg.data.ledIndicatorOnS !== undefined) {
                    result[utils.postfixWithEndpointName("led_indicator_on_s", msg, model, meta)] = msg.data.ledIndicatorOnS;
                }
                if (msg.data.ledIndicatorOnB !== undefined) {
                    result[utils.postfixWithEndpointName("led_indicator_on_b", msg, model, meta)] = msg.data.ledIndicatorOnB;
                }
                if (msg.data.ledIndicatorOffEnable !== undefined) {
                    result[utils.postfixWithEndpointName("led_indicator_off_enable", msg, model, meta)] = msg.data.ledIndicatorOffEnable
                        ? "ON"
                        : "OFF";
                }
                if (msg.data.ledIndicatorOffH !== undefined) {
                    result[utils.postfixWithEndpointName("led_indicator_off_h", msg, model, meta)] = msg.data.ledIndicatorOffH;
                }
                if (msg.data.ledIndicatorOffS !== undefined) {
                    result[utils.postfixWithEndpointName("led_indicator_off_s", msg, model, meta)] = msg.data.ledIndicatorOffS;
                }
                if (msg.data.ledIndicatorOffB !== undefined) {
                    result[utils.postfixWithEndpointName("led_indicator_off_b", msg, model, meta)] = msg.data.ledIndicatorOffB;
                }
                return result;
            },
        } satisfies Fz.Converter<"manuSpecificSDevices", SberDevices, ["attributeReport", "readResponse"]>,
        multistate_input: {
            cluster: "genMultistateInput",
            type: ["attributeReport"],
            convert: (model, msg, publish, options, meta) => {
                const actionLookup: KeyValueAny = {0: "hold", 1: "single", 2: "double"};
                const value = msg.data.presentValue;
                const action = actionLookup[value];
                return {action: utils.postfixWithEndpointName(action, msg, model, meta)};
            },
        } satisfies Fz.Converter<"genMultistateInput", undefined, ["attributeReport"]>,
        decouple_relay: {
            cluster: "genOnOff",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValueAny = {};
                if (msg.data.sdevicesRelayDecouple !== undefined) {
                    const relayDecoupleLookup = {0: "control_relay", 1: "decoupled"};
                    state[utils.postfixWithEndpointName("relay_mode", msg, model, meta)] = utils.getFromLookup(
                        msg.data.sdevicesRelayDecouple,
                        relayDecoupleLookup,
                    );
                }
                return state;
            },
        } satisfies Fz.Converter<"genOnOff", SberGenOnOff, ["attributeReport", "readResponse"]>,
        allow_double_click: {
            cluster: "manuSpecificSDevices",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValueAny = {};
                if (msg.data.buttonEnableMultiClick !== undefined) {
                    result[utils.postfixWithEndpointName("allow_double_click", msg, model, meta)] = msg.data.buttonEnableMultiClick ? "ON" : "OFF";
                }
                return result;
            },
        } satisfies Fz.Converter<"manuSpecificSDevices", SberDevices, ["attributeReport", "readResponse"]>,
        cover_position_tilt: {
            cluster: "closuresWindowCovering",
            type: ["attributeReport", "readResponse"],
            options: [exposes.options.invert_cover()],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValueAny = {};
                // Zigbee officially expects 'open' to be 0 and 'closed' to be 100 whereas
                // HomeAssistant etc. work the other way round.
                // For zigbee-herdsman-converters: open = 100, close = 0
                const metaInvert = model.meta?.coverInverted;
                const invert = metaInvert ? !options.invert_cover : options.invert_cover;
                if (msg.data.currentPositionLiftPercentage !== undefined && msg.data.currentPositionLiftPercentage <= 100) {
                    const value = msg.data.currentPositionLiftPercentage;
                    result[utils.postfixWithEndpointName("position", msg, model, meta)] = invert ? value : 100 - value;
                    result[utils.postfixWithEndpointName("current_state", msg, model, meta)] = metaInvert
                        ? value === 0
                            ? "CLOSE"
                            : "OPEN"
                        : value === 100
                          ? "CLOSE"
                          : "OPEN";
                }
                if (msg.data.windowCoveringMode !== undefined) {
                    result[utils.postfixWithEndpointName("cover_mode", msg, model, meta)] = {
                        reversed_cover: (msg.data.windowCoveringMode & (1 << 0)) > 0,
                    };
                }
                return result;
            },
        } satisfies Fz.Converter<"closuresWindowCovering", undefined, ["attributeReport", "readResponse"]>,
        closures: {
            cluster: "closuresWindowCovering",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValueAny = {};
                if (msg.data.sdevicesCalibrationTime !== undefined) {
                    result[utils.postfixWithEndpointName("calibration_time", msg, model, meta)] = msg.data.sdevicesCalibrationTime * 0.1;
                }
                if (msg.data.sdevicesButtonsMode !== undefined) {
                    result[utils.postfixWithEndpointName("buttons_mode", msg, model, meta)] = msg.data.sdevicesButtonsMode ? "inverted" : "normal";
                }
                if (msg.data.sdevicesMotorTimeout !== undefined) {
                    result[utils.postfixWithEndpointName("motor_timeout", msg, model, meta)] = msg.data.sdevicesMotorTimeout;
                }
                return result;
            },
        } satisfies Fz.Converter<"closuresWindowCovering", SberClosures, ["attributeReport", "readResponse"]>,
    },
    tz: {
        custom_on_off: {
            key: ["state"],
            convertSet: async (entity, key, value, meta) => {
                const state = utils.isString(meta.message.state) ? meta.message.state.toLowerCase() : null;
                utils.validateValue(state, ["toggle", "off", "on"]);
                await entity.command("genOnOff", state as "toggle" | "off" | "on", {}, utils.getOptions(meta.mapped, entity));
                if (state === "toggle") {
                    const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ""}`];
                    return currentState ? {state: {state: currentState === "OFF" ? "ON" : "OFF"}} : {};
                }
                return {state: {state: state.toUpperCase()}};
            },
            convertGet: async (entity, key, meta) => {
                // Allow reading only if endpoint is explicitly stated.
                // Workaround to prevent reading from non-existing genOnOff cluster at EP3 during availability check.
                if (meta.endpoint_name) {
                    await entity.read("genOnOff", ["onOff"]);
                }
            },
        } satisfies Tz.Converter,
        led_indicator_on_settings: {
            key: ["led_indicator_on_enable", "led_indicator_on_h", "led_indicator_on_s", "led_indicator_on_b"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertString(key);
                const payload: KeyValueAny = {};
                switch (key) {
                    case "led_indicator_on_enable":
                        utils.assertString(value);
                        payload.ledIndicatorOnEnable = value.toUpperCase() === "ON" ? 1 : 0;
                        break;
                    case "led_indicator_on_h":
                        payload.ledIndicatorOnH = value;
                        break;
                    case "led_indicator_on_s":
                        payload.ledIndicatorOnS = value;
                        break;
                    case "led_indicator_on_b":
                        payload.ledIndicatorOnB = value;
                        break;
                }
                await m.determineEndpoint(entity, meta, "manuSpecificSDevices").write("manuSpecificSDevices", payload, defaultResponseOptions);
                return {state: {[key]: value}};
            },
            convertGet: async (entity, key, meta) => {
                await m
                    .determineEndpoint(entity, meta, "manuSpecificSDevices")
                    .read<"manuSpecificSDevices", SberDevices>(
                        "manuSpecificSDevices",
                        ["ledIndicatorOnEnable", "ledIndicatorOnH", "ledIndicatorOnS", "ledIndicatorOnB"],
                        defaultResponseOptions,
                    );
            },
        } satisfies Tz.Converter,
        led_indicator_off_settings: {
            key: ["led_indicator_off_enable", "led_indicator_off_h", "led_indicator_off_s", "led_indicator_off_b"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertString(key);
                const payload: KeyValueAny = {};
                switch (key) {
                    case "led_indicator_off_enable":
                        utils.assertString(value);
                        payload.ledIndicatorOffEnable = value.toUpperCase() === "ON" ? 1 : 0;
                        break;
                    case "led_indicator_off_h":
                        payload.ledIndicatorOffH = value;
                        break;
                    case "led_indicator_off_s":
                        payload.ledIndicatorOffS = value;
                        break;
                    case "led_indicator_off_b":
                        payload.ledIndicatorOffB = value;
                        break;
                }
                await m.determineEndpoint(entity, meta, "manuSpecificSDevices").write("manuSpecificSDevices", payload, defaultResponseOptions);
                return {state: {[key]: value}};
            },
            convertGet: async (entity, key, meta) => {
                await m
                    .determineEndpoint(entity, meta, "manuSpecificSDevices")
                    .read<"manuSpecificSDevices", SberDevices>(
                        "manuSpecificSDevices",
                        ["ledIndicatorOffEnable", "ledIndicatorOffH", "ledIndicatorOffS", "ledIndicatorOffB"],
                        defaultResponseOptions,
                    );
            },
        } satisfies Tz.Converter,
        identify: {
            key: ["identify"],
            options: [
                e
                    .numeric("identify_timeout", ea.SET)
                    .withDescription(
                        "Sets the duration of the identification procedure in seconds (i.e., how long the device would flash)." +
                            "The value ranges from 1 to 60 seconds (default: 30).",
                    )
                    .withValueMin(1)
                    .withValueMax(60),
            ],
            convertSet: async (entity, key, value, meta) => {
                const identifyTimeout = (meta.options.identify_timeout as number) ?? 30;
                await entity.command("genIdentify", "identify", {identifytime: identifyTimeout}, utils.getOptions(meta.mapped, entity));
            },
        } satisfies Tz.Converter,
        decouple_relay: {
            key: ["relay_mode"],
            convertSet: async (entity, key, value, meta) => {
                if (typeof value !== "string") {
                    return;
                }
                const relayDecoupleLookup = {control_relay: 0, decoupled: 1};
                utils.assertEndpoint(entity);
                await utils.enforceEndpoint(entity, key, meta).write<"genOnOff", SberGenOnOff>(
                    "genOnOff",
                    {
                        sdevicesRelayDecouple: utils.getFromLookup(value, relayDecoupleLookup),
                    },
                    manufacturerOptions,
                );
                return {state: {relay_mode: value.toLowerCase()}};
            },
            convertGet: async (entity, key, meta) => {
                utils.assertEndpoint(entity);
                await utils
                    .enforceEndpoint(entity, key, meta)
                    .read<"genOnOff", SberGenOnOff>("genOnOff", ["sdevicesRelayDecouple"], manufacturerOptions);
            },
        } satisfies Tz.Converter,
        allow_double_click: {
            key: ["allow_double_click"],
            convertSet: async (entity, key, value, meta) => {
                if (typeof value !== "string") {
                    return;
                }
                const payload: KeyValueAny = {};
                payload.buttonEnableMultiClick = value.toUpperCase() === "ON" ? 1 : 0;
                await m.determineEndpoint(entity, meta, "manuSpecificSDevices").write("manuSpecificSDevices", payload, defaultResponseOptions);
                return {state: {[key]: value}};
            },
            convertGet: async (entity, key, meta) => {
                await m
                    .determineEndpoint(entity, meta, "manuSpecificSDevices")
                    .read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", ["buttonEnableMultiClick"], defaultResponseOptions);
            },
        } satisfies Tz.Converter,
        cover_mode: {
            key: ["cover_mode"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertObject(value, key);
                const old_value = meta.state.cover_mode_cover as number;
                const combined_value = Object.assign(old_value, value);
                const windowCoveringMode = old_value | ((combined_value.reversed_cover ? 1 : 0) << 0);
                await entity.write("closuresWindowCovering", {windowCoveringMode}, utils.getOptions(meta.mapped, entity));
                return {state: {cover_mode: combined_value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read("closuresWindowCovering", ["windowCoveringMode"]);
            },
        } satisfies Tz.Converter,
        cover_state: {
            key: ["current_state"],
            convertSet: async (entity, key, value, meta) => {
                const lookup = {
                    open: "upOpen" as const,
                    close: "downClose" as const,
                    stop: "stop" as const,
                    on: "upOpen" as const,
                    off: "downClose" as const,
                };
                utils.assertString(value, key);
                // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
                value = value.toLowerCase();
                await entity.command("closuresWindowCovering", utils.getFromLookup(value, lookup), {}, utils.getOptions(meta.mapped, entity));
            },
        } satisfies Tz.Converter,
        closures_custom: {
            key: ["calibration_time", "buttons_mode", "motor_timeout"],
            convertSet: async (entity, key, value, meta) => {
                if (key === "calibration_time") {
                    utils.assertNumber(value);
                    const calibration = value * 10;
                    await entity.write<"closuresWindowCovering", SberClosures>(
                        "closuresWindowCovering",
                        {sdevicesCalibrationTime: calibration},
                        manufacturerOptions,
                    );
                    return {state: {calibration_time: value}};
                }
                if (key === "buttons_mode") {
                    utils.assertString(value, key);
                    // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
                    value = value.toLowerCase();
                    const lookup = {normal: 0, inverted: 1};
                    await entity.write<"closuresWindowCovering", SberClosures>(
                        "closuresWindowCovering",
                        {sdevicesButtonsMode: utils.getFromLookup(value, lookup)},
                        manufacturerOptions,
                    );
                    return {state: {buttons_mode: value}};
                }
                if (key === "motor_timeout") {
                    utils.assertNumber(value);
                    await entity.write<"closuresWindowCovering", SberClosures>(
                        "closuresWindowCovering",
                        {sdevicesMotorTimeout: value},
                        manufacturerOptions,
                    );
                    return {state: {motor_timeout: value}};
                }
            },
            convertGet: async (entity, key, meta) => {
                switch (key) {
                    case "calibration_time":
                        await entity.read<"closuresWindowCovering", SberClosures>(
                            "closuresWindowCovering",
                            ["sdevicesCalibrationTime"],
                            manufacturerOptions,
                        );
                        break;
                    case "buttons_mode":
                        await entity.read<"closuresWindowCovering", SberClosures>(
                            "closuresWindowCovering",
                            ["sdevicesButtonsMode"],
                            manufacturerOptions,
                        );
                        break;
                    case "motor_timeout":
                        await entity.read<"closuresWindowCovering", SberClosures>(
                            "closuresWindowCovering",
                            ["sdevicesMotorTimeout"],
                            manufacturerOptions,
                        );
                        break;
                }
            },
        } satisfies Tz.Converter,
    },
};

const sdevicesCustomClusterDefinition = {
    ID: 0xfccf,
    manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD,
    attributes: {
        buttonEnableMultiClick: {ID: 0x1002, type: Zcl.DataType.BOOLEAN},
        childLock: {ID: 0x1003, type: Zcl.DataType.BOOLEAN},
        ledIndicatorOnEnable: {ID: 0x2001, type: Zcl.DataType.BOOLEAN},
        ledIndicatorOnH: {ID: 0x2002, type: Zcl.DataType.UINT16},
        ledIndicatorOnS: {ID: 0x2003, type: Zcl.DataType.UINT8},
        ledIndicatorOnB: {ID: 0x2004, type: Zcl.DataType.UINT8},
        ledIndicatorOffEnable: {ID: 0x2005, type: Zcl.DataType.BOOLEAN},
        ledIndicatorOffH: {ID: 0x2006, type: Zcl.DataType.UINT16},
        ledIndicatorOffS: {ID: 0x2007, type: Zcl.DataType.UINT8},
        ledIndicatorOffB: {ID: 0x2008, type: Zcl.DataType.UINT8},
        emergencyShutoffState: {ID: 0x3001, type: Zcl.DataType.BITMAP16},
        emergencyShutoffRecovery: {ID: 0x3002, type: Zcl.DataType.BITMAP16},
        upperVoltageThreshold: {ID: 0x3011, type: Zcl.DataType.UINT32},
        lowerVoltageThreshold: {ID: 0x3012, type: Zcl.DataType.UINT32},
        upperCurrentThreshold: {ID: 0x3013, type: Zcl.DataType.UINT32},
        upperTempThreshold: {ID: 0x3014, type: Zcl.DataType.INT16},
        rmsVoltageMv: {ID: 0x4001, type: Zcl.DataType.UINT32},
        rmsCurrentMa: {ID: 0x4002, type: Zcl.DataType.UINT32},
        activePowerMw: {ID: 0x4003, type: Zcl.DataType.INT32},
    },
    commands: {},
    commandsResponse: {},
};

interface SberDevices {
    attributes: {
        buttonEnableMultiClick: number;
        childLock: number;
        ledIndicatorOnEnable: number;
        ledIndicatorOnH: number;
        ledIndicatorOnS: number;
        ledIndicatorOnB: number;
        ledIndicatorOffEnable: number;
        ledIndicatorOffH: number;
        ledIndicatorOffS: number;
        ledIndicatorOffB: number;
        emergencyShutoffState: number;
        emergencyShutoffRecovery: number;
        upperVoltageThreshold: number;
        lowerVoltageThreshold: number;
        upperCurrentThreshold: number;
        upperTempThreshold: number;
        rmsVoltageMv: number;
        rmsCurrentMa: number;
        activePowerMw: number;
    };
    commands: never;
    commandResponses: never;
}

interface SberGenOnOff {
    attributes: {sdevicesRelayDecouple: number};
    commands: never;
    commandResponses: never;
}

interface SberDiagnostics {
    attributes: {
        sdevicesUptimeS: number;
        sdevicesButton1Clicks: number;
        sdevicesButton2Clicks: number;
        sdevicesButton3Clicks: number;
        sdevicesRelay1Switches: number;
        sdevicesRelay2Switches: number;
    };
    commands: never;
    commandResponses: never;
}

interface SberClosures {
    attributes: {
        sdevicesCalibrationTime: number;
        sdevicesButtonsMode: number;
        sdevicesMotorTimeout: number;
    };
    commands: never;
    commandResponses: never;
}

const sdevicesExtend = {
    sdevicesCustomCluster: () => m.deviceAddCustomCluster("manuSpecificSDevices", sdevicesCustomClusterDefinition),
    haDiagnosticCluster: () =>
        m.deviceAddCustomCluster("haDiagnostic", {
            ID: Zcl.Clusters.haDiagnostic.ID,
            attributes: {
                sdevicesUptimeS: {ID: 0x1001, type: Zcl.DataType.UINT32, manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD},
                sdevicesButton1Clicks: {ID: 0x1002, type: Zcl.DataType.UINT32, manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD},
                sdevicesButton2Clicks: {ID: 0x1003, type: Zcl.DataType.UINT32, manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD},
                sdevicesButton3Clicks: {ID: 0x1004, type: Zcl.DataType.UINT32, manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD},
                sdevicesRelay1Switches: {ID: 0x1005, type: Zcl.DataType.UINT32, manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD},
                sdevicesRelay2Switches: {ID: 0x1006, type: Zcl.DataType.UINT32, manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD},
            },
            commands: {},
            commandsResponse: {},
        }),
    closuresWindowCoveringCluster: () =>
        m.deviceAddCustomCluster("closuresWindowCovering", {
            ID: Zcl.Clusters.closuresWindowCovering.ID,
            attributes: {
                sdevicesCalibrationTime: {ID: 0x1001, type: Zcl.DataType.UINT16, manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD},
                sdevicesButtonsMode: {ID: 0x1002, type: Zcl.DataType.ENUM8, manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD},
                sdevicesMotorTimeout: {ID: 0x1003, type: Zcl.DataType.UINT16, manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD},
            },
            commands: {},
            commandsResponse: {},
        }),
    genOnOffCluster: () =>
        m.deviceAddCustomCluster("genOnOff", {
            ID: Zcl.Clusters.genOnOff.ID,
            attributes: {
                sdevicesRelayDecouple: {ID: 0x10dc, type: Zcl.DataType.BOOLEAN, manufacturerCode: Zcl.ManufacturerCode.SBERDEVICES_LTD},
            },
            commands: {},
            commandsResponse: {},
        }),
    deviceInfo: (): ModernExtend => {
        const toZigbee: Tz.Converter[] = [
            {
                key: ["serial_number"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("genBasic", ["serialNumber"]);
                },
            },
        ];
        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.serialNumber !== undefined) {
                        result.serial_number = msg.data.serialNumber.toString();
                    }
                    return result;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];
        const exposes = [e.text("serial_number", ea.STATE_GET).withLabel("Serial Number").withCategory("diagnostic")];
        return {exposes, fromZigbee, toZigbee, isModernExtend: true};
    },
    onOffRelayDecouple: (args?: Partial<m.EnumLookupArgs<"genOnOff", SberGenOnOff>>) =>
        m.enumLookup<"genOnOff", SberGenOnOff>({
            name: "relay_mode",
            description: "Decoupled mode for button",
            cluster: "genOnOff",
            attribute: "sdevicesRelayDecouple",
            lookup: {control_relay: 0, decoupled: 1},
            zigbeeCommandOptions: manufacturerOptions,
            ...args,
        }),
    ledIndicatorSettings: (): ModernExtend => {
        const fromZigbee = [
            {
                cluster: "manuSpecificSDevices",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.ledIndicatorOnEnable !== undefined) {
                        result.led_indicator_on_enable = msg.data.ledIndicatorOnEnable ? "ON" : "OFF";
                    }
                    if (msg.data.ledIndicatorOnH !== undefined) {
                        result.led_indicator_on_h = msg.data.ledIndicatorOnH;
                    }
                    if (msg.data.ledIndicatorOnS !== undefined) {
                        result.led_indicator_on_s = msg.data.ledIndicatorOnS;
                    }
                    if (msg.data.ledIndicatorOnB !== undefined) {
                        result.led_indicator_on_b = msg.data.ledIndicatorOnB;
                    }
                    if (msg.data.ledIndicatorOffEnable !== undefined) {
                        result.led_indicator_off_enable = msg.data.ledIndicatorOffEnable ? "ON" : "OFF";
                    }
                    if (msg.data.ledIndicatorOffH !== undefined) {
                        result.led_indicator_off_h = msg.data.ledIndicatorOffH;
                    }
                    if (msg.data.ledIndicatorOffS !== undefined) {
                        result.led_indicator_off_s = msg.data.ledIndicatorOffS;
                    }
                    if (msg.data.ledIndicatorOffB !== undefined) {
                        result.led_indicator_off_b = msg.data.ledIndicatorOffB;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"manuSpecificSDevices", SberDevices, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["led_indicator_on_enable", "led_indicator_on_h", "led_indicator_on_s", "led_indicator_on_b"],
                convertSet: async (entity, key, value: KeyValueAny, meta) => {
                    const payload: KeyValueAny = {};
                    switch (key) {
                        case "led_indicator_on_enable":
                            utils.assertString(value);
                            payload.ledIndicatorOnEnable = value.toUpperCase() === "ON" ? 1 : 0;
                            break;
                        case "led_indicator_on_h":
                            payload.ledIndicatorOnH = value;
                            break;
                        case "led_indicator_on_s":
                            payload.ledIndicatorOnS = value;
                            break;
                        case "led_indicator_on_b":
                            payload.ledIndicatorOnB = value;
                            break;
                    }
                    await entity.write("manuSpecificSDevices", payload, defaultResponseOptions);
                    return {state: {[key]: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<"manuSpecificSDevices", SberDevices>(
                        "manuSpecificSDevices",
                        ["ledIndicatorOnEnable", "ledIndicatorOnH", "ledIndicatorOnS", "ledIndicatorOnB"],
                        defaultResponseOptions,
                    );
                },
            },
            {
                key: ["led_indicator_off_enable", "led_indicator_off_h", "led_indicator_off_s", "led_indicator_off_b"],
                convertSet: async (entity, key, value: KeyValueAny, meta) => {
                    const payload: KeyValueAny = {};
                    switch (key) {
                        case "led_indicator_off_enable":
                            utils.assertString(value);
                            payload.ledIndicatorOffEnable = value.toUpperCase() === "ON" ? 1 : 0;
                            break;
                        case "led_indicator_off_h":
                            payload.ledIndicatorOffH = value;
                            break;
                        case "led_indicator_off_s":
                            payload.ledIndicatorOffS = value;
                            break;
                        case "led_indicator_off_b":
                            payload.ledIndicatorOffB = value;
                            break;
                    }
                    await entity.write("manuSpecificSDevices", payload, defaultResponseOptions);
                    return {state: {[key]: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<"manuSpecificSDevices", SberDevices>(
                        "manuSpecificSDevices",
                        ["ledIndicatorOffEnable", "ledIndicatorOffH", "ledIndicatorOffS", "ledIndicatorOffB"],
                        defaultResponseOptions,
                    );
                },
            },
        ];
        const exposes = [
            e
                .binary("led_indicator_on_enable", ea.ALL, "ON", "OFF")
                .withLabel("LED indication")
                .withDescription("Is LED indicator enabled in ON state"),
            e
                .numeric("led_indicator_on_h", ea.ALL)
                .withUnit("°")
                .withValueMin(0)
                .withValueMax(359)
                .withLabel("Hue")
                .withDescription("Hue of LED in ON state"),
            e
                .numeric("led_indicator_on_s", ea.ALL)
                .withValueMin(0)
                .withValueMax(0xfe)
                .withLabel("Saturation")
                .withDescription("Saturation of LED in ON state"),
            e
                .numeric("led_indicator_on_b", ea.ALL)
                .withValueMin(1)
                .withValueMax(0xfe)
                .withLabel("Brightness")
                .withDescription("Brightness of LED in ON state"),
            e
                .binary("led_indicator_off_enable", ea.ALL, "ON", "OFF")
                .withLabel("LED indication")
                .withDescription("Is LED indicator enabled in OFF state"),
            e
                .numeric("led_indicator_off_h", ea.ALL)
                .withUnit("°")
                .withValueMin(0)
                .withValueMax(359)
                .withLabel("Hue")
                .withDescription("Hue of LED in OFF state"),
            e
                .numeric("led_indicator_off_s", ea.ALL)
                .withValueMin(0)
                .withValueMax(0xfe)
                .withLabel("Saturation")
                .withDescription("Saturation of LED in OFF state"),
            e
                .numeric("led_indicator_off_b", ea.ALL)
                .withValueMin(1)
                .withValueMax(0xfe)
                .withLabel("Brightness")
                .withDescription("Brightness of LED in OFF state"),
        ];
        return {exposes, fromZigbee, toZigbee, isModernExtend: true};
    },
    electricityMeter: (): ModernExtend => {
        const exposes = [e.voltage().withAccess(ea.STATE_GET), e.current().withAccess(ea.STATE_GET), e.power().withAccess(ea.STATE_GET)];
        const fromZigbee = [
            {
                cluster: "manuSpecificSDevices",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (utils.hasAlreadyProcessedMessage(msg, model)) return;
                    const lookup = [
                        {key: "rmsVoltageMv", name: "voltage", multiplier: 0.001},
                        {key: "rmsCurrentMa", name: "current", multiplier: 0.001},
                        {key: "activePowerMw", name: "power", multiplier: 0.001},
                    ];
                    const payload: KeyValue = {};
                    for (const entry of lookup) {
                        if (msg.data[entry.key] !== undefined) {
                            const value = msg.data[entry.key] * entry.multiplier;
                            payload[entry.name] = value;
                        }
                    }
                    return payload;
                },
            } satisfies Fz.Converter<"manuSpecificSDevices", undefined, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["voltage"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", ["rmsVoltageMv"]);
                },
            },
            {
                key: ["current"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", ["rmsCurrentMa"]);
                },
            },
            {
                key: ["power"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", ["activePowerMw"]);
                },
            },
        ];
        return {exposes, fromZigbee, toZigbee, isModernExtend: true};
    },
    childLock: () =>
        m.binary<"manuSpecificSDevices", SberDevices>({
            name: "child_lock",
            cluster: "manuSpecificSDevices",
            attribute: "childLock",
            description: "Enable child lock to prevent manual button operation",
            valueOn: ["ON", 0x01],
            valueOff: ["OFF", 0x00],
            zigbeeCommandOptions: manufacturerOptions,
        }),
    deviceTemperature: () =>
        m.numeric({
            name: "device_temperature",
            cluster: "genDeviceTempCfg",
            attribute: "currentTemperature",
            description: "Temperature of the device",
            unit: "°C",
            access: "STATE_GET",
            entityCategory: "diagnostic",
        }),
    emergencyShutoffRecovery: () =>
        m.enumLookup<"manuSpecificSDevices", SberDevices>({
            name: "emergency_shutoff_recovery",
            cluster: "manuSpecificSDevices",
            attribute: "emergencyShutoffRecovery",
            description: "Condition of automatic recovery after emergency shutoff",
            lookup: {disabled: 0, voltage_is_good: 1},
            zigbeeCommandOptions: manufacturerOptions,
        }),
    upperVoltageThreshold: () =>
        m.numeric<"manuSpecificSDevices", SberDevices>({
            name: "upper_voltage_threshold",
            cluster: "manuSpecificSDevices",
            attribute: "upperVoltageThreshold",
            description: "Upper voltage threshold",
            valueMin: 230000,
            valueMax: 260000,
            valueStep: 1000,
            unit: "mV",
            zigbeeCommandOptions: manufacturerOptions,
        }),
    lowerVoltageThreshold: () =>
        m.numeric<"manuSpecificSDevices", SberDevices>({
            name: "lower_voltage_threshold",
            cluster: "manuSpecificSDevices",
            attribute: "lowerVoltageThreshold",
            description: "Lower voltage threshold (use with caution)",
            valueMin: 100000,
            valueMax: 230000,
            valueStep: 1000,
            unit: "mV",
            zigbeeCommandOptions: manufacturerOptions,
        }),
    upperCurrentThreshold: () =>
        m.numeric<"manuSpecificSDevices", SberDevices>({
            name: "upper_current_threshold",
            cluster: "manuSpecificSDevices",
            attribute: "upperCurrentThreshold",
            description: "Upper current threshold",
            valueMin: 100,
            valueMax: 16000,
            valueStep: 100,
            unit: "mA",
            zigbeeCommandOptions: manufacturerOptions,
        }),
    temperatureThreshold: () =>
        m.numeric<"manuSpecificSDevices", SberDevices>({
            name: "temperature_threshold",
            cluster: "manuSpecificSDevices",
            attribute: "upperTempThreshold",
            description: "Overtemperature threshold (use with caution)",
            valueMin: -200,
            valueMax: 200,
            valueStep: 1,
            unit: "°C",
            zigbeeCommandOptions: manufacturerOptions,
        }),
    deviceCustomDiagnostic: (buttonsCount: number, relaysCount: number): ModernExtend => {
        const extend = m.numeric({
            name: "resets_count",
            cluster: "haDiagnostic",
            attribute: "numberOfResets",
            description: "(telemetry) Number of resets",
            entityCategory: "diagnostic",
            access: "STATE_GET",
        });
        // Custom diagnostics attributes should not be configured automatically
        extend.configure = [];
        const uptime = m.numeric<"haDiagnostic", SberDiagnostics>({
            name: "uptime",
            cluster: "haDiagnostic",
            attribute: "sdevicesUptimeS",
            description: "(telemetry) Device uptime, in seconds",
            entityCategory: "diagnostic",
            unit: "s",
            access: "STATE_GET",
            zigbeeCommandOptions: manufacturerOptions,
        });
        extend.fromZigbee.push(...uptime.fromZigbee);
        extend.toZigbee.push(...uptime.toZigbee);
        extend.exposes.push(...uptime.exposes);
        for (let i = 1; i <= Math.min(buttonsCount, 3); i++) {
            type SDevicesButtonClicks = "sdevicesButton1Clicks" | "sdevicesButton2Clicks" | "sdevicesButton3Clicks";
            const attrNames = ["sdevicesButton1Clicks", "sdevicesButton2Clicks", "sdevicesButton3Clicks"];
            const buttonClicks = m.numeric<"haDiagnostic", SberDiagnostics>({
                name: `button_clicks_count_${i}`,
                cluster: "haDiagnostic",
                attribute: attrNames[i - 1] as SDevicesButtonClicks,
                description: `(telemetry) Total clicks count of button ${i}`,
                entityCategory: "diagnostic",
                access: "STATE_GET",
                zigbeeCommandOptions: manufacturerOptions,
            });
            extend.fromZigbee.push(...buttonClicks.fromZigbee);
            extend.toZigbee.push(...buttonClicks.toZigbee);
            extend.exposes.push(...buttonClicks.exposes);
        }
        for (let i = 1; i <= Math.min(relaysCount, 2); i++) {
            type SDevicesRelaySwitches = "sdevicesRelay1Switches" | "sdevicesRelay2Switches";
            const attrNames = ["sdevicesRelay1Switches", "sdevicesRelay2Switches"];
            const relayToggles = m.numeric<"haDiagnostic", SberDiagnostics>({
                name: `relay_switches_count_${i}`,
                cluster: "haDiagnostic",
                attribute: attrNames[i - 1] as SDevicesRelaySwitches,
                description: `(telemetry) Total toggle count of relay ${i}`,
                entityCategory: "diagnostic",
                access: "STATE_GET",
                zigbeeCommandOptions: manufacturerOptions,
                reporting: false,
            });
            extend.fromZigbee.push(...relayToggles.fromZigbee);
            extend.toZigbee.push(...relayToggles.toZigbee);
            extend.exposes.push(...relayToggles.exposes);
        }
        return extend;
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("SM0202", ["_TYZB01_2jzbhomb"]),
        model: "SBDV-00029",
        vendor: "Sber",
        description: "Smart motion sensor",
        extend: [
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "tamper", "battery_low"], alarmTimeout: true}),
            m.battery({voltage: true, voltageReporting: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0203", ["_TYZB01_epni2jgy"]),
        model: "SBDV-00030",
        vendor: "Sber",
        description: "Smart opening sensor",
        extend: [
            m.ignoreClusterReport({cluster: "genBasic"}),
            m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}),
            m.battery({voltage: true, voltageReporting: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0041A", ["_TYZB01_ub7urdza"]),
        model: "SBDV-00032",
        vendor: "Sber",
        description: "Smart button",
        extend: [
            tuyaMagicPacket(),
            tuyaOnOffActionLegacy({actions: ["single", "double", "hold"]}),
            m.battery({percentageReporting: false}),
            /*
             * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
             * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
             * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
             * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
             */
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0201", ["_TZ3000_zfirri2d"]),
        model: "SBDV-00079",
        vendor: "Sber",
        description: "Smart temperature and humidity sensor",
        extend: [m.temperature(), m.humidity(), m.battery({voltage: true, voltageReporting: true})],
    },
    {
        fingerprint: tuya.fingerprint("TS0207", ["_TZ3000_c8bqthpo"]),
        model: "SBDV-00154",
        vendor: "Sber",
        description: "Smart water leak sensor",
        extend: [
            m.ignoreClusterReport({cluster: "genBasic"}),
            m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "battery_low"]}),
            m.battery(),
        ],
    },
    {
        fingerprint: [{modelID: "SBDV-00196", manufacturerName: "SDevices"}],
        model: "SBDV-00196",
        vendor: "Sber",
        description: "Smart Wall Switch (with neutral, single button)",
        fromZigbee: [],
        toZigbee: [],
        extend: [
            sdevicesExtend.sdevicesCustomCluster(),
            sdevicesExtend.haDiagnosticCluster(),
            sdevicesExtend.genOnOffCluster(),
            m.binary<"manuSpecificSDevices", SberDevices>({
                name: "allow_double_click",
                cluster: "manuSpecificSDevices",
                attribute: "buttonEnableMultiClick",
                description: "Allow detection of double clicks, may introduce delay in reaction when enabled",
                valueOn: ["ON", 0x01],
                valueOff: ["OFF", 0x00],
                zigbeeCommandOptions: manufacturerOptions,
            }),
            sdevicesExtend.ledIndicatorSettings(),
            m.identify(),
            m.onOff({
                powerOnBehavior: true,
                configureReporting: false,
            }),
            sdevicesExtend.onOffRelayDecouple({
                name: "relay_mode",
                description: "Decoupled mode for button",
            }),
            m.actionEnumLookup({
                cluster: "genMultistateInput",
                attribute: "presentValue",
                actionLookup: {hold: 0, single: 1, double: 2},
            }),
            sdevicesExtend.childLock(),
            sdevicesExtend.deviceInfo(),
            sdevicesExtend.deviceCustomDiagnostic(2, 1),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).read("genOnOff", ["onOff", "startUpOnOff"]);
            await device.getEndpoint(1).read("genBasic", ["serialNumber"]);
            await device
                .getEndpoint(1)
                .read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", [
                    "ledIndicatorOnEnable",
                    "ledIndicatorOnH",
                    "ledIndicatorOnS",
                    "ledIndicatorOnB",
                    "ledIndicatorOffEnable",
                    "ledIndicatorOffH",
                    "ledIndicatorOffS",
                    "ledIndicatorOffB",
                ]);
            await device.getEndpoint(1).read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", ["buttonEnableMultiClick"]);
            try {
                await device.getEndpoint(1).read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", ["childLock"]);
            } catch (error) {
                if ((error as Error).message.includes("UNSUPPORTED_ATTRIBUTE")) {
                    // ignore: attribute is not supported in early versions
                } else {
                    logger.warning(`Configure failed: ${error}`, NS);
                }
            }
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff", "genMultistateInput"]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["haDiagnostic"]);
        },
    },
    {
        fingerprint: [{modelID: "SBDV-00199", manufacturerName: "SDevices"}],
        model: "SBDV-00199",
        vendor: "Sber",
        description: "Smart Wall Switch (with neutral, two buttons)",
        fromZigbee: [
            fz.on_off,
            fz.power_on_behavior,
            sdevices.fz.cover_position_tilt,
            sdevices.fz.multistate_input,
            sdevices.fz.led_indicator_settings,
            sdevices.fz.decouple_relay,
            sdevices.fz.allow_double_click,
            sdevices.fz.closures,
        ],
        toZigbee: [
            sdevices.tz.custom_on_off,
            tz.power_on_behavior,
            tz.cover_position_tilt,
            sdevices.tz.cover_state,
            sdevices.tz.cover_mode,
            sdevices.tz.identify,
            sdevices.tz.led_indicator_on_settings,
            sdevices.tz.led_indicator_off_settings,
            sdevices.tz.decouple_relay,
            sdevices.tz.allow_double_click,
            sdevices.tz.closures_custom,
        ],
        exposes: (device, options) => {
            const switchExposes = [];
            if (!utils.isDummyDevice(device)) {
                const coversEpName = "cover";
                const coversExposes = [
                    e.enum("State", ea.STATE_SET, ["OPEN", "CLOSE", "STOP"]).withProperty("current_state").withEndpoint(coversEpName),
                    e
                        .numeric("position", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(100)
                        .withDescription("Position of this cover, 100 is fully open if 'Invert cover' option is false (default)")
                        .withUnit("%")
                        .withEndpoint(coversEpName),
                    e
                        .composite("cover_mode", "cover_mode", ea.ALL)
                        .withFeature(e.binary("reversed", ea.ALL, true, false).withDescription("Reversal of the motor rotating direction"))
                        .withEndpoint(coversEpName),
                    e
                        .numeric("calibration_time", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(3600)
                        .withValueStep(0.1)
                        .withDescription("Calibration time")
                        .withUnit("s")
                        .withEndpoint(coversEpName),
                    e
                        .numeric("motor_timeout", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(3600)
                        .withDescription("Timeout for continuous motor action")
                        .withUnit("s")
                        .withEndpoint(coversEpName),
                    e.enum("Buttons mode", ea.ALL, ["normal", "inverted"]).withProperty("buttons_mode").withEndpoint(coversEpName),
                    e
                        .enum("identify", ea.SET, ["identify"])
                        .withLabel("Identify")
                        .withDescription("Initiate device identification")
                        .withCategory("config")
                        .withEndpoint(coversEpName),
                    e
                        .binary("led_indicator_off_enable", ea.ALL, "ON", "OFF")
                        .withLabel("LED indication")
                        .withDescription("Is LED indicator enabled")
                        .withEndpoint(coversEpName),
                    e
                        .numeric("led_indicator_off_h", ea.ALL)
                        .withUnit("°")
                        .withValueMin(0)
                        .withValueMax(359)
                        .withLabel("Hue")
                        .withDescription("Hue of LED indicator")
                        .withEndpoint(coversEpName),
                    e
                        .numeric("led_indicator_off_s", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(0xfe)
                        .withLabel("Saturation")
                        .withDescription("Saturation of LED indicator")
                        .withEndpoint(coversEpName),
                    e
                        .numeric("led_indicator_off_b", ea.ALL)
                        .withValueMin(1)
                        .withValueMax(0xfe)
                        .withLabel("Brightness")
                        .withDescription("Brightness of LED indicator")
                        .withEndpoint(coversEpName),
                ];
                if (device.meta.window_covering_enabled) {
                    return [...coversExposes];
                }
            }
            const endpointsCount = 2;
            switchExposes.push(
                e.action(["hold_switch_1", "hold_switch_2", "single_switch_1", "single_switch_2", "double_switch_1", "double_switch_2"]),
            );
            for (let i = 1; i <= endpointsCount; i++) {
                const epName = `switch_${i}`;
                const epPrefix = `(${i}) `;
                switchExposes.push(e.switch().withEndpoint(epName));
                switchExposes.push(
                    e.power_on_behavior(["off", "on", "toggle", "previous"]).withLabel(`${epPrefix}Power-on behavior`).withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .enum("relay_mode", ea.ALL, ["control_relay", "decoupled"])
                        .withLabel(`${epPrefix}Relay mode`)
                        .withDescription("Decoupled mode")
                        .withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .binary("allow_double_click", ea.ALL, "ON", "OFF")
                        .withLabel(`${epPrefix}Allow double clicks`)
                        .withDescription("Allow detection of double clicks, may introduce delay in reaction when enabled")
                        .withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .enum("identify", ea.SET, ["identify"])
                        .withLabel(`${epPrefix}Identify`)
                        .withDescription("Initiate device identification")
                        .withCategory("config")
                        .withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .binary("led_indicator_on_enable", ea.ALL, "ON", "OFF")
                        .withLabel(`${epPrefix}LED indication`)
                        .withDescription("Is LED indicator enabled in ON state")
                        .withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .numeric("led_indicator_on_h", ea.ALL)
                        .withUnit("°")
                        .withValueMin(0)
                        .withValueMax(359)
                        .withLabel(`${epPrefix}Hue`)
                        .withDescription("Hue of LED in ON state")
                        .withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .numeric("led_indicator_on_s", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(0xfe)
                        .withLabel(`${epPrefix}Saturation`)
                        .withDescription("Saturation of LED in ON state")
                        .withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .numeric("led_indicator_on_b", ea.ALL)
                        .withValueMin(1)
                        .withValueMax(0xfe)
                        .withLabel(`${epPrefix}Brightness`)
                        .withDescription("Brightness of LED in ON state")
                        .withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .binary("led_indicator_off_enable", ea.ALL, "ON", "OFF")
                        .withLabel(`${epPrefix}LED indication`)
                        .withDescription("Is LED indicator enabled in OFF state")
                        .withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .numeric("led_indicator_off_h", ea.ALL)
                        .withUnit("°")
                        .withValueMin(0)
                        .withValueMax(359)
                        .withLabel(`${epPrefix}Hue`)
                        .withDescription("Hue of LED in OFF state")
                        .withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .numeric("led_indicator_off_s", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(0xfe)
                        .withLabel(`${epPrefix}Saturation`)
                        .withDescription("Saturation of LED in OFF state")
                        .withEndpoint(epName),
                );
                switchExposes.push(
                    e
                        .numeric("led_indicator_off_b", ea.ALL)
                        .withValueMin(1)
                        .withValueMax(0xfe)
                        .withLabel(`${epPrefix}Brightness`)
                        .withDescription("Brightness of LED in OFF state")
                        .withEndpoint(epName),
                );
            }
            return [...switchExposes];
        },
        extend: [
            m.deviceEndpoints({endpoints: {switch_1: 1, switch_2: 2, cover: 3}}),
            sdevicesExtend.sdevicesCustomCluster(),
            sdevicesExtend.haDiagnosticCluster(),
            sdevicesExtend.genOnOffCluster(),
            sdevicesExtend.closuresWindowCoveringCluster(),
            sdevicesExtend.childLock(),
            sdevicesExtend.deviceInfo(),
            sdevicesExtend.deviceCustomDiagnostic(3, 2),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            if (!device.customClusters.manuSpecificSDevices) {
                device.addCustomCluster("manuSpecificSDevices", sdevicesCustomClusterDefinition);
            }
            const coveringEp = device.getEndpoint(3);
            if (coveringEp != null) {
                try {
                    const deviceCoverMode = await device.getEndpoint(3).read("genBasic", ["deviceEnabled"]);
                    device.meta.window_covering_enabled = !!deviceCoverMode.deviceEnabled;
                    device.save();
                } catch (e) {
                    if ((e as Error).message.includes("UNSUPPORTED_ATTRIBUTE")) {
                        device.meta.window_covering_enabled = false;
                        device.save();
                    } else {
                        throw e;
                    }
                }
            } else {
                device.meta.window_covering_enabled = false;
                device.save();
            }
            if (device.meta.window_covering_enabled) {
                /* Device is in Window Covering mode */
                await device.getEndpoint(3).read("genBasic", ["serialNumber"]);
                await device.getEndpoint(3).read("closuresWindowCovering", ["currentPositionLiftPercentage", "windowCoveringMode"]);
                await device
                    .getEndpoint(3)
                    .read<"closuresWindowCovering", SberClosures>(
                        "closuresWindowCovering",
                        ["sdevicesCalibrationTime", "sdevicesButtonsMode", "sdevicesMotorTimeout"],
                        manufacturerOptions,
                    );
                await device
                    .getEndpoint(3)
                    .read<"manuSpecificSDevices", SberDevices>(
                        "manuSpecificSDevices",
                        ["ledIndicatorOffEnable", "ledIndicatorOffH", "ledIndicatorOffS", "ledIndicatorOffB"],
                        manufacturerOptions,
                    );
                await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["closuresWindowCovering"]);
                await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["manuSpecificSDevices"]);
                await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["haDiagnostic"]);
                try {
                    await device.getEndpoint(3).read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", ["childLock"]);
                } catch (error) {
                    if ((error as Error).message.includes("UNSUPPORTED_ATTRIBUTE")) {
                        // ignore: attribute is not supported in early versions
                    } else {
                        logger.warning(`Configure failed: ${error}`, NS);
                    }
                }
            } else {
                /* Device is in 2-button Switch mode */
                await device.getEndpoint(1).read("genBasic", ["serialNumber"]);
                await device.getEndpoint(1).read("genOnOff", ["onOff", "startUpOnOff"]);
                await device.getEndpoint(2).read("genOnOff", ["onOff", "startUpOnOff"]);
                await device.getEndpoint(1).read<"genOnOff", SberGenOnOff>("genOnOff", ["sdevicesRelayDecouple"], manufacturerOptions);
                await device.getEndpoint(2).read<"genOnOff", SberGenOnOff>("genOnOff", ["sdevicesRelayDecouple"], manufacturerOptions);
                await device
                    .getEndpoint(1)
                    .read<"manuSpecificSDevices", SberDevices>(
                        "manuSpecificSDevices",
                        [
                            "buttonEnableMultiClick",
                            "ledIndicatorOnEnable",
                            "ledIndicatorOnH",
                            "ledIndicatorOnS",
                            "ledIndicatorOnB",
                            "ledIndicatorOffEnable",
                            "ledIndicatorOffH",
                            "ledIndicatorOffS",
                            "ledIndicatorOffB",
                        ],
                        manufacturerOptions,
                    );
                await device
                    .getEndpoint(2)
                    .read<"manuSpecificSDevices", SberDevices>(
                        "manuSpecificSDevices",
                        [
                            "buttonEnableMultiClick",
                            "ledIndicatorOnEnable",
                            "ledIndicatorOnH",
                            "ledIndicatorOnS",
                            "ledIndicatorOnB",
                            "ledIndicatorOffEnable",
                            "ledIndicatorOffH",
                            "ledIndicatorOffS",
                            "ledIndicatorOffB",
                        ],
                        manufacturerOptions,
                    );
                await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff", "genMultistateInput"]);
                await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff", "genMultistateInput"]);
                await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["manuSpecificSDevices"]);
                await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["haDiagnostic"]);
                try {
                    await device.getEndpoint(1).read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", ["childLock"]);
                } catch (error) {
                    if ((error as Error).message.includes("UNSUPPORTED_ATTRIBUTE")) {
                        // ignore: attribute is not supported in early versions
                    } else {
                        logger.warning(`Configure failed: ${error}`, NS);
                    }
                }
            }
            device.save();
        },
    },
    {
        fingerprint: [{modelID: "SBDV-00202", manufacturerName: "SDevices"}],
        model: "SBDV-00202",
        vendor: "Sber",
        description: "Smart Wall Socket",
        fromZigbee: [sdevices.fz.emergency_shutoff_state],
        exposes: [
            e.binary("emergency_overvoltage", ea.STATE, true, false).withDescription("Overvoltage alarm is triggered").withCategory("diagnostic"),
            e.binary("emergency_undervoltage", ea.STATE, true, false).withDescription("Undervoltage alarm is triggered").withCategory("diagnostic"),
            e.binary("emergency_overcurrent", ea.STATE, true, false).withDescription("Overcurrent alarm is triggered").withCategory("diagnostic"),
            e.binary("emergency_overheat", ea.STATE, true, false).withDescription("Overheat alarm is triggered").withCategory("diagnostic"),
        ],
        extend: [
            sdevicesExtend.sdevicesCustomCluster(),
            sdevicesExtend.haDiagnosticCluster(),
            m.identify(),
            sdevicesExtend.deviceTemperature(),
            m.onOff({
                powerOnBehavior: true,
                configureReporting: false,
            }),
            sdevicesExtend.childLock(),
            sdevicesExtend.electricityMeter(),
            sdevicesExtend.ledIndicatorSettings(),
            sdevicesExtend.emergencyShutoffRecovery(),
            sdevicesExtend.upperVoltageThreshold(),
            sdevicesExtend.lowerVoltageThreshold(),
            sdevicesExtend.upperCurrentThreshold(),
            sdevicesExtend.temperatureThreshold(),
            sdevicesExtend.deviceInfo(),
            sdevicesExtend.deviceCustomDiagnostic(1, 1),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genBasic", ["serialNumber"]);
            await endpoint.read("genOnOff", ["onOff", "startUpOnOff"]);
            await endpoint.read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", [
                "childLock",
                "rmsVoltageMv",
                "rmsCurrentMa",
                "activePowerMw",
            ]);
            await endpoint.read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", [
                "ledIndicatorOnEnable",
                "ledIndicatorOnH",
                "ledIndicatorOnS",
                "ledIndicatorOnB",
                "ledIndicatorOffEnable",
                "ledIndicatorOffH",
                "ledIndicatorOffS",
                "ledIndicatorOffB",
            ]);
            await endpoint.read<"manuSpecificSDevices", SberDevices>("manuSpecificSDevices", [
                "upperVoltageThreshold",
                "lowerVoltageThreshold",
                "upperCurrentThreshold",
                "upperTempThreshold",
            ]);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genDeviceTempCfg", "manuSpecificSDevices"]);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haDiagnostic"]);
        },
    },
];
