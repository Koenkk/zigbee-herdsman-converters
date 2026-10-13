import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Expose, Fz, KeyValueAny, Tz} from "../lib/types";
import {
    addActionGroup,
    getFromLookup,
    hasAlreadyProcessedMessage,
    ignoreUnsupportedAttribute,
    isDummyDevice,
    postfixWithEndpointName,
} from "../lib/utils";
import * as zosung from "../lib/zosung";

const e = exposes.presets;
const ea = exposes.access;

const {tuyaBase} = tuya.modernExtend;

const fzZosung = zosung.fzZosung;
const tzZosung = zosung.tzZosung;
const ez = zosung.presetsZosung;
const te = tuya.exposes;
// Convert HA raw IR timings (microseconds) to a Broadlink IR packet.
// HOBEIAN ZG-IR01 only accepts Broadlink-encoded strings via ir_code_to_send,
// but HA's native infrared.* platform sends raw {timings: [...]} through
// ir_emitter, which the stock zosung converter would otherwise encode
// Tuya-style instead.
function zgIr01TimingsToBroadlinkBase64(timings: number[], repeatCount = 0): string {
    if (!Array.isArray(timings) || timings.length === 0) {
        throw new Error("IR timings must be a non-empty array");
    }

    const encoded: number[] = [];

    for (const timing of timings) {
        const duration = Math.abs(Number(timing));

        if (!Number.isFinite(duration) || duration <= 0) {
            throw new Error(`Invalid IR timing: ${timing}`);
        }

        const ticks = Math.max(1, Math.round((duration * 269) / 8192));

        if (ticks > 0xffff) {
            throw new Error(`IR timing too long: ${timing}`);
        }

        if (ticks < 0x100) {
            encoded.push(ticks);
        } else {
            encoded.push(0x00, (ticks >> 8) & 0xff, ticks & 0xff);
        }
    }

    const repeats = Math.max(0, Math.min(255, Math.trunc(Number(repeatCount) || 0)));

    const packet = [0x26, repeats, encoded.length & 0xff, (encoded.length >> 8) & 0xff, ...encoded, 0x0d, 0x05];

    while ((packet.length + 4) % 16 !== 0) {
        packet.push(0x00);
    }

    return Buffer.from(packet).toString("base64");
}

const tzLocal = {
    zgIr01IrCodeToSend: {
        key: ["ir_code_to_send", "ir_emitter"],
        convertSet: async (entity, key, value, meta) => {
            if (key === "ir_emitter" && value && typeof value === "object" && Array.isArray((value as KeyValueAny).timings)) {
                const raw = value as KeyValueAny;
                const broadlinkCode = zgIr01TimingsToBroadlinkBase64(raw.timings, raw.repeat_count ?? 0);
                return await tzZosung.zosung_ir_code_to_send.convertSet(entity, key, broadlinkCode, meta);
            }
            return await tzZosung.zosung_ir_code_to_send.convertSet(entity, key, value, meta);
        },
    } satisfies Tz.Converter,
    zg204_attr: {
        key: ["sensitivity", "keep_time"],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
                case "sensitivity":
                    await entity.write("ssIasZone", {currentZoneSensitivityLevel: getFromLookup(value, {low: 0, medium: 1, high: 2})});
                    break;
                case "keep_time":
                    await entity.write("ssIasZone", {61441: {value: getFromLookup(value, {30: 0, 60: 1, 120: 2}), type: 0x20}});
                    break;
                default: // Unknown key
                    throw new Error(`Unhandled key ${key}`);
            }
        },
        convertGet: async (entity, key, meta) => {
            // Apparently, reading values may interfere with a commandStatusChangeNotification for changed occupancy.
            // Therefore, read "zoneStatus" as well.
            await entity.read("ssIasZone", ["currentZoneSensitivityLevel", 61441, "zoneStatus"]);
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    command_stop_move_raw: {
        cluster: "lightingColorCtrl",
        type: "raw",
        convert: (model, msg, publish, options, meta) => {
            // commandStopMove without params
            if (msg.data[2] !== 71) return;
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const movestop = "stop";
            const action = postfixWithEndpointName(`hue_${movestop}`, msg, model, meta);
            const payload = {action};
            addActionGroup(payload, msg, model);
            return payload;
        },
    } satisfies Fz.Converter<"lightingColorCtrl", undefined, "raw">,
    zg204_attr: {
        cluster: "ssIasZone",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            let result: KeyValueAny = {};
            const data = msg.data;
            if (data && data.zoneStatus !== undefined) {
                const result1 = fz.ias_occupancy_alarm_1_report.convert(model, msg, publish, options, meta);
                result = {...result1};
            }
            if (data && data.currentZoneSensitivityLevel !== undefined) {
                const senslookup: Record<number, string> = {0: "low", 1: "medium", 2: "high"};
                result.sensitivity = senslookup[data.currentZoneSensitivityLevel];
            }
            if (data && data["61441"] !== undefined) {
                const keeptimelookup: Record<number, number> = {0: 30, 1: 60, 2: 120};
                result.keep_time = keeptimelookup[data["61441"] as number];
            }
            return result;
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZG-IR01"],
        model: "ZG-IR01",
        vendor: "HOBEIAN",
        description: "Smart IR remote switch",
        extend: [
            tuya.modernExtend.tuyaBase({dp: true}),
            zosung.zosungExtend.addZosungIRTransmitCluster(),
            zosung.zosungExtend.addZosungIRControlCluster(),
        ],
        fromZigbee: [
            fzZosung.zosung_send_ir_code_00,
            fzZosung.zosung_send_ir_code_01,
            fzZosung.zosung_send_ir_code_02,
            fzZosung.zosung_send_ir_code_03,
            fzZosung.zosung_send_ir_code_04,
            fzZosung.zosung_send_ir_code_05,
            fz.battery,
        ],
        toZigbee: [tzLocal.zgIr01IrCodeToSend, tzZosung.zosung_learn_ir_code],
        exposes: [
            e.binary("switch1", ea.STATE_SET, "ON", "OFF").withDescription("IR Switch1"),
            e.binary("switch2", ea.STATE_SET, "ON", "OFF").withDescription("IR Switch2"),
            e.binary("switch3", ea.STATE_SET, "ON", "OFF").withDescription("IR Switch3"),
            e.binary("switch4", ea.STATE_SET, "ON", "OFF").withDescription("IR Switch4"),
            e.binary("switch5", ea.STATE_SET, "ON", "OFF").withDescription("IR Switch5"),
            e.binary("switch6", ea.STATE_SET, "ON", "OFF").withDescription("IR Switch6"),
            e.temperature(),
            e.humidity(),
            ez.learn_ir_code().withDescription("Turn on to learn new IR code "),
            ez.learned_ir_code(),
            ez.learned_ir_timings(),
            ez
                .ir_code_to_send()
                .withDescription(
                    "The IR code to send by device (Firmware ID must be >01062026,Support SmartIR IR code library https://github.com/smartHomeHub/SmartIR/blob/master/docs/CLIMATE.md)",
                ),
            ez.ir_emitter().withDescription("IR emitter feature. IR remote Firmware ID must be Firmware ID>01062026)"),
            e.enum("switch1_on", ea.STATE_SET, ["study", "registered", "unregistered"]).withDescription("Switch 1 on IR code Study and Study status"),
            e
                .enum("switch1_off", ea.STATE_SET, ["study", "registered", "unregistered"])
                .withDescription("Switch 1 off IR code Study and Study status"),
            e.enum("switch2_on", ea.STATE_SET, ["study", "registered", "unregistered"]).withDescription("Switch 2 on IR code Study and Study status"),
            e
                .enum("switch2_off", ea.STATE_SET, ["study", "registered", "unregistered"])
                .withDescription("Switch 2 off IR code Study and Study status"),
            e.enum("switch3_on", ea.STATE_SET, ["study", "registered", "unregistered"]).withDescription("Switch 3 on IR code Study and Study status"),
            e
                .enum("switch3_off", ea.STATE_SET, ["study", "registered", "unregistered"])
                .withDescription("Switch 3 off IR code Study and Study status"),
            e.enum("switch4_on", ea.STATE_SET, ["study", "registered", "unregistered"]).withDescription("Switch 4 on IR code Study and Study status"),
            e
                .enum("switch4_off", ea.STATE_SET, ["study", "registered", "unregistered"])
                .withDescription("Switch 4 off IR code Study and Study status"),
            e.enum("switch5_on", ea.STATE_SET, ["study", "registered", "unregistered"]).withDescription("Switch 5 on IR code Study and Study status"),
            e
                .enum("switch5_off", ea.STATE_SET, ["study", "registered", "unregistered"])
                .withDescription("Switch 5 off IR code Study and Study status"),
            e.enum("switch6_on", ea.STATE_SET, ["study", "registered", "unregistered"]).withDescription("Switch 6 on IR code Study and Study status"),
            e
                .enum("switch6_off", ea.STATE_SET, ["study", "registered", "unregistered"])
                .withDescription("Switch 6 off IR code Study and Study status"),
            tuya.exposes.temperatureUnit(),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "switch1", tuya.valueConverter.onOff],
                [2, "switch2", tuya.valueConverter.onOff],
                [3, "switch3", tuya.valueConverter.onOff],
                [4, "switch4", tuya.valueConverter.onOff],
                [5, "switch5", tuya.valueConverter.onOff],
                [6, "switch6", tuya.valueConverter.onOff],
                [
                    109,
                    "temperature",
                    {
                        // Device reports the raw value already scaled in the currently selected
                        // display unit (DP 111), instead of always reporting Celsius. Convert
                        // back to Celsius here so `temperature` (exposed with a fixed °C unit)
                        // stays consistent regardless of the device's temperature_unit setting.
                        // https://github.com/Koenkk/zigbee2mqtt/issues/32984
                        from: (value: number, meta: Fz.Meta) => {
                            const raw = value / 10;
                            return meta.state.temperature_unit === "fahrenheit" ? ((raw - 32) * 5) / 9 : raw;
                        },
                    },
                ],
                [110, "humidity", tuya.valueConverter.raw],
                [112, "battery", tuya.valueConverter.raw],
                [111, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [107, "temperature_calibration", tuya.valueConverter.divideBy10],
                [108, "humidity_calibration", tuya.valueConverter.raw],
                [120, "switch1_on", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [121, "switch1_off", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [122, "switch2_on", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [123, "switch2_off", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [124, "switch3_on", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [125, "switch3_off", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [126, "switch4_on", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [127, "switch4_off", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [128, "switch5_on", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [129, "switch5_off", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [130, "switch6_on", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
                [131, "switch6_off", tuya.valueConverterBasic.lookup({study: tuya.enum(0), registered: tuya.enum(1), unregistered: tuya.enum(2)})],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-308Z"],
        model: "ZG-308Z",
        vendor: "HOBEIAN",
        description: "Water valve",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.binary("switch", ea.STATE_SET, "ON", "OFF").withDescription("Valve on/off"),
            e.enum("valve_status", ea.STATE, ["auto", "manual", "idle"]).withDescription("Valve 1 status (manual, auto, idle)"),
            e.numeric("countdown", ea.STATE_SET).withUnit("s").withDescription("Valve countdown in seconds").withValueMin(0).withValueMax(86400),
            e.numeric("valve_duration", ea.STATE).withUnit("s").withDescription("Valve  irrigation last duration in seconds"),
            e.numeric("total_irrigation_duration", ea.STATE).withUnit("s").withDescription("Valve  irrigation last duration in seconds"),
            e
                .enum("weather_delay", ea.STATE_SET, ["cancel", "hour_12h", "hour_24h", "hour_48h", "hour_72h"])
                .withDescription("Weather delay: No operation when raining"),
            e
                .enum("current_weather", ea.STATE_SET, ["sunny", "clear", "cloud", "cloudy", "rainy", "snow", "fog"])
                .withDescription("Weather status needs to be sent to the device"),
            e.binary("weather_onoff", ea.STATE_SET, "ON", "OFF").withDescription("smart weather_onoff on/off"),
            e
                .binary("get_weather", ea.STATE, "ON", "OFF")
                .withDescription(
                    "The device actively requests weather data from the gateway, and the gateway shall respond with current_weather information to the device",
                ),
            e.enum("weather_status", ea.STATE, ["sunny", "cloudy", "rainy", "snow", "null"]).withDescription("Weather information feedback received"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "switch", tuya.valueConverter.onOff],
                [12, "valve_status", tuya.valueConverterBasic.lookup({auto: 0, manual: 1, idle: 2})], // Valve status
                [11, "countdown", tuya.valueConverter.raw],
                [15, "valve_duration", tuya.valueConverter.raw],
                [9, "total_irrigation_duration", tuya.valueConverter.raw],
                [10, "weather_delay", tuya.valueConverterBasic.lookup({cancel: 0, hour_12h: 1, hour_24h: 2, hour_48h: 3, hour_72h: 4})],
                [13, "current_weather", tuya.valueConverterBasic.lookup({sunny: 0, clear: 1, cloud: 2, cloudy: 3, rainy: 4, snow: 5, fog: 6})],
                [101, "weather_status", tuya.valueConverterBasic.lookup({sunny: 0, cloudy: 1, rainy: 2, snow: 3, null: 4})],
                [14, "weather_onoff", tuya.valueConverter.onOff],
                [102, "get_weather", tuya.valueConverter.onOff],
                [7, "battery", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-226Z"],
        model: "ZG-226Z",
        vendor: "HOBEIAN",
        description: "Water leak alarm",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.water_leak(),
            e.binary("alarm", ea.STATE_SET, "ON", "OFF").withDescription("Audible and visual alarm"),
            e.binary("muffling", ea.STATE_SET, "ON", "OFF").withDescription("Stop alarm"),
            e
                .numeric("alarm_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(1800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Alarm sounding time"),
            e.enum("alarm_volume", ea.STATE_SET, ["low", "middle", "high", "mute"]).withDescription("Alarm Volume"),
            e.enum("alarm_ring", ea.STATE_SET, ["mute", "beep", "music"]).withDescription("Alarm Volume"),

            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "water_leak", tuya.valueConverter.trueFalse0],
                [101, "alarm", tuya.valueConverter.onOff],
                [7, "muffling", tuya.valueConverter.onOff],
                [4, "battery", tuya.valueConverter.raw],
                [102, "alarm_time", tuya.valueConverter.raw],
                [
                    104,
                    "alarm_volume",
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        middle: tuya.enum(1),
                        high: tuya.enum(2),
                        mute: tuya.enum(3),
                    }),
                ],
                [
                    103,
                    "alarm_ring",
                    tuya.valueConverterBasic.lookup({
                        mute: tuya.enum(0),
                        beep: tuya.enum(1),
                        music: tuya.enum(2),
                    }),
                ],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-228Z"],
        model: "ZG-228Z",
        vendor: "HOBEIAN",
        description: "Vibration alarm",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.vibration(),
            e.enum("vibration_siren", ea.STATE_SET, ["OFF", "ON"]).withDescription("Vibration"),
            e.enum("alarm", ea.STATE_SET, ["beep", "ring", "stop"]).withDescription("Initiatively trigger an alarm"),
            e.binary("muffling", ea.STATE_SET, "ON", "OFF").withDescription("Stop alarm"),
            e
                .numeric("alarm_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(1800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Alarm sounding time"),
            e.enum("alarm_volume", ea.STATE_SET, ["low", "middle", "high", "mute"]).withDescription("Alarm volume"),
            e.enum("alarm_ring", ea.STATE_SET, ["mute", "beep", "music"]).withDescription("Alarm ring"),
            e
                .numeric("sensitivity", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(50)
                .withValueStep(1)
                .withDescription("The larger the value, the more sensitive it is (refresh and update only while active)"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "vibration", tuya.valueConverter.trueFalse1],
                [
                    101,
                    "vibration_siren",
                    tuya.valueConverterBasic.lookup({
                        OFF: tuya.enum(0),
                        ON: tuya.enum(1),
                    }),
                ],
                [
                    105,
                    "alarm",
                    tuya.valueConverterBasic.lookup({
                        beep: tuya.enum(0),
                        ring: tuya.enum(1),
                        stop: tuya.enum(2),
                    }),
                ],
                [102, "muffling", tuya.valueConverter.onOff],
                [4, "battery", tuya.valueConverter.raw],
                [106, "alarm_time", tuya.valueConverter.raw],
                [6, "sensitivity", tuya.valueConverter.raw],
                [
                    103,
                    "alarm_volume",
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        middle: tuya.enum(1),
                        high: tuya.enum(2),
                        mute: tuya.enum(3),
                    }),
                ],
                [
                    104,
                    "alarm_ring",
                    tuya.valueConverterBasic.lookup({
                        mute: tuya.enum(0),
                        beep: tuya.enum(1),
                        music: tuya.enum(2),
                    }),
                ],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-229Z"],
        model: "ZG-229Z",
        vendor: "HOBEIAN",
        description: "Smart light & sound siren",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e
                .enum("alarm", ea.STATE_SET, ["alarm_sound", "alarm_light", "alarm_sound_light", "normal"])
                .withDescription("Initiatively trigger an alarm"),
            e.binary("doorbell", ea.STATE_SET, "ON", "OFF").withDescription("Doorbell"),
            e.binary("muffling", ea.STATE_SET, "ON", "OFF").withDescription("Stop alarm"),
            e
                .numeric("alarm_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(1800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Alarm sounding time"),
            e.enum("alarm_volume", ea.STATE_SET, ["low", "middle", "high", "mute"]).withDescription("Alarm volume"),
            e.enum("doorbell_volume", ea.STATE_SET, ["low", "middle", "high", "mute"]).withDescription("Doorbell volume"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "alarm",
                    tuya.valueConverterBasic.lookup({
                        alarm_sound: tuya.enum(0),
                        alarm_light: tuya.enum(1),
                        alarm_sound_light: tuya.enum(2),
                        normal: tuya.enum(3),
                    }),
                ],
                [102, "doorbell", tuya.valueConverter.onOff],
                [16, "muffling", tuya.valueConverter.onOff],
                [15, "battery", tuya.valueConverter.raw],
                [7, "alarm_time", tuya.valueConverter.raw],
                [
                    5,
                    "alarm_volume",
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        middle: tuya.enum(1),
                        high: tuya.enum(2),
                        mute: tuya.enum(3),
                    }),
                ],
                [
                    101,
                    "doorbell_volume",
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        middle: tuya.enum(1),
                        high: tuya.enum(2),
                        mute: tuya.enum(3),
                    }),
                ],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-204ZX"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_w0ap83qu"]),
        model: "ZG-204ZX",
        vendor: "HOBEIAN",
        description: "24Ghz millimeter wave and T&H sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.illuminance(),
            e.temperature(),
            e.humidity(),
            tuya.exposes.temperatureUnit(),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
            e.battery(),
            e
                .numeric("fading_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Presence keep time"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator mode"),
            e
                .numeric("illuminance_interval", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(720)
                .withValueStep(1)
                .withUnit("minutes")
                .withDescription("Light sensing sampling(refresh and update only while active)"),
            e
                .numeric("detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(5)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Detection distance"),
            e
                .numeric("motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Motion detection sensitivity"),
            e
                .numeric("static_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Static detection sensitivity"),
            e.binary("anti_interference", ea.STATE_SET, "ON", "OFF").withDescription("Anti interference function"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [106, "illuminance", tuya.valueConverter.raw],
                [102, "fading_time", tuya.valueConverter.raw],
                [103, "anti_interference", tuya.valueConverter.onOff],
                [4, "detection_distance", tuya.valueConverter.divideBy100],
                [2, "static_detection_sensitivity", tuya.valueConverter.raw],
                [123, "motion_detection_sensitivity", tuya.valueConverter.raw],
                [108, "indicator", tuya.valueConverter.onOff],
                [110, "battery", tuya.valueConverter.raw],
                [111, "temperature", tuya.valueConverter.divideBy10],
                [101, "humidity", tuya.valueConverter.raw],
                [109, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [105, "temperature_calibration", tuya.valueConverter.divideBy10],
                [104, "humidity_calibration", tuya.valueConverter.raw],
                [107, "illuminance_interval", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-210Z"],
        model: "ZG-210Z",
        vendor: "HOBEIAN",
        description: "Pressure Sensing Strap/Bed Occupancy Sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e
                .enum("pressure_state", ea.STATE, ["none", "sit", "sedentary"])
                .withDescription("Pressure state,none: Vacant,sit: Sitting,sedentary: Sedentary"),
            e.numeric("current_pressure", ea.STATE).withUnit("x").withDescription("Sensing pressure value"),
            e.temperature(),
            e.humidity(),
            e.battery(),
            e
                .numeric("pressure_intensity", ea.ALL)
                .withUnit("x")
                .withValueMin(0)
                .withValueMax(2000)
                .withValueStep(1)
                .withDescription("Set Sensing pressure intensity value"),
            exposes
                .numeric("presence_delay", ea.ALL)
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(3600)
                .withValueStep(1)
                .withDescription("Delay to report no presence"),
            exposes
                .numeric("sedentary_reminder", ea.ALL)
                .withUnit("minutes")
                .withValueMin(0)
                .withValueMax(1440)
                .withValueStep(1)
                .withDescription("Set sedentary Reminder Time"),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "pressure_state", tuya.valueConverterBasic.lookup({none: tuya.enum(0), sit: tuya.enum(1), sedentary: tuya.enum(2)})],
                [2, "current_pressure", tuya.valueConverter.raw],
                [101, "temperature", tuya.valueConverter.divideBy10],
                [102, "humidity", tuya.valueConverter.raw],
                [15, "battery", tuya.valueConverter.raw],
                [105, "pressure_intensity", tuya.valueConverter.raw],
                [106, "presence_delay", tuya.valueConverter.raw],
                [107, "sedentary_reminder", tuya.valueConverter.raw],
                [103, "temperature_calibration", tuya.valueConverter.divideBy10],
                [104, "humidity_calibration", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-204ZK", "AY-204ZX"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_ka8l86iu", "_TZE200_zbfmvj13"]),
        model: "ZG-204ZK",
        vendor: "HOBEIAN",
        description: "24Ghz human presence sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.battery(),
            e
                .numeric("fading_time", ea.STATE_SET)
                .withValueMin(10)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Presence keep time"),
            e
                .numeric("detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(5)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Detection distance"),
            e
                .numeric("static_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Static detection sensitivity"),
            e
                .numeric("motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Motion detection sensitivity"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator mode"),
            e.binary("anti_interference", ea.STATE_SET, "ON", "OFF").withDescription("Anti interference function"),
        ],
        whiteLabel: [
            {
                model: "AY-204ZX",
                vendor: "AOYAN",
                description: "24Ghz millimeter wave and T&H sensor",
                fingerprint: [{modelID: "AY-204ZX", manufacturerName: "AOYAN"}],
            },
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [102, "fading_time", tuya.valueConverter.raw],
                [4, "detection_distance", tuya.valueConverter.divideBy100],
                [2, "static_detection_sensitivity", tuya.valueConverter.raw],
                [107, "indicator", tuya.valueConverter.onOff],
                [123, "motion_detection_sensitivity", tuya.valueConverter.raw],
                [121, "battery", tuya.valueConverter.raw],
                [122, "anti_interference", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-204ZE"],
        fingerprint: [
            {modelID: "CK-BL702-MWS-01(7016)", manufacturerName: "ZG-204ZE"},
            {modelID: "TS0601", manufacturerName: "_TZE200_cq8lu23i"},
            {modelID: "TS0601", manufacturerName: "_TZE200_4pm4pekt"},
            {modelID: "TS0601", manufacturerName: "_TZE200_y8jijhba"},
        ],
        model: "ZG-204ZE",
        vendor: "HOBEIAN",
        description: "10G mw motion detection",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.illuminance(),
            e.battery(),
            e
                .numeric("fading_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Motion keep time"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator mode"),
            e
                .numeric("motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(19)
                .withValueStep(1)
                .withDescription("The larger the value, the more sensitive it is (refresh and update only while active)"),
            e
                .numeric("illuminance_interval", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(720)
                .withValueStep(1)
                .withUnit("minutes")
                .withDescription("Light sensing sampling(refresh and update only while active)"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [102, "fading_time", tuya.valueConverter.raw],
                [2, "motion_detection_sensitivity", tuya.valueConverter.raw],
                [108, "indicator", tuya.valueConverter.onOff],
                [110, "battery", tuya.valueConverter.raw],
                [106, "illuminance", tuya.valueConverter.raw],
                [107, "illuminance_interval", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-204ZM", "AY205Z"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_2aaelwxk", "_TZE200_kb5noeto", "_TZE200_tyffvoij", "_TZE200_yflzeeqj"]),
        model: "ZG-204ZM",
        vendor: "HOBEIAN",
        description: "PIR 24Ghz human presence sensor",
        extend: [
            tuya.modernExtend.tuyaBase({dp: true}),
            // Besides dp, also uses standard illuminance cluster
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/10897
            m.illuminance({reporting: false}),
        ],
        exposes: [
            e.presence(),
            e.enum("motion_state", ea.STATE, ["none", "large", "small", "static"]).withDescription("Motion state"),
            e.battery(),
            e
                .numeric("fading_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Presence keep time"),
            e
                .numeric("static_detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Static detection distance"),
            e
                .numeric("static_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Static detection sensitivity"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator mode"),
            e
                .enum("motion_detection_mode", ea.STATE_SET, ["only_pir", "pir_and_radar", "only_radar"])
                .withDescription("Motion detection mode (Firmware version>=0122052017)"),
            e
                .numeric("motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Motion detection sensitivity (Firmware version>=0122052017)"),
        ],

        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [2, "static_detection_sensitivity", tuya.valueConverter.raw],
                [4, "static_detection_distance", tuya.valueConverter.divideBy100],
                [
                    101,
                    "motion_state",
                    tuya.valueConverterBasic.lookup({
                        none: tuya.enum(0),
                        large: tuya.enum(1),
                        small: tuya.enum(2),
                        static: tuya.enum(3),
                    }),
                ],
                [102, "fading_time", tuya.valueConverter.raw],
                [106, "illuminance", tuya.valueConverter.raw],
                [107, "indicator", tuya.valueConverter.onOff],
                [121, "battery", tuya.valueConverter.raw],
                [
                    122,
                    "motion_detection_mode",
                    tuya.valueConverterBasic.lookup({
                        only_pir: tuya.enum(0),
                        pir_and_radar: tuya.enum(1),
                        only_radar: tuya.enum(2),
                    }),
                ],
                [123, "motion_detection_sensitivity", tuya.valueConverter.raw],
            ],
        },
        whiteLabel: [
            {
                model: "AY205Z",
                vendor: "AOYAN",
                description: "PIR 24Ghz human presence sensor",
                fingerprint: [{modelID: "AY205Z", manufacturerName: "AOYAN"}, {manufacturerName: "AOYAN"}],
            },
        ],
    },
    {
        zigbeeModel: ["ZG-204ZQ"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_p9zbdqgs"]),
        model: "ZG-204ZQ",
        vendor: "HOBEIAN",
        description: "PIR temperature&humidity sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.illuminance(),
            e.temperature(),
            e.humidity(),
            tuya.exposes.temperatureUnit(),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
            e.battery(),
            e
                .numeric("fading_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Motion keep time"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator mode"),
            e
                .numeric("illuminance_interval", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(720)
                .withValueStep(1)
                .withUnit("minutes")
                .withDescription("Light sensing sampling(refresh and update only while active)"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [106, "illuminance", tuya.valueConverter.raw],
                [102, "fading_time", tuya.valueConverter.raw],
                [108, "indicator", tuya.valueConverter.onOff],
                [110, "battery", tuya.valueConverter.raw],
                [111, "temperature", tuya.valueConverter.divideBy10],
                [101, "humidity", tuya.valueConverter.raw],
                [109, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [105, "temperature_calibration", tuya.valueConverter.divideBy10],
                [104, "humidity_calibration", tuya.valueConverter.raw],
                [107, "illuminance_interval", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-204ZH", "AY208Z"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_vuqzj1ej", "_TZE200_hdih4foa"]),
        model: "ZG-204ZH",
        vendor: "HOBEIAN",
        description: "PIR 24Ghz human presence sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.enum("motion_state", ea.STATE, ["none", "large", "small", "static"]).withDescription("Motion state"),
            e.illuminance(),
            e.temperature(),
            e.humidity(),
            tuya.exposes.temperatureUnit(),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
            e.battery(),
            e
                .numeric("fading_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Motion keep time"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator mode"),
            e
                .numeric("illuminance_interval", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(720)
                .withValueStep(1)
                .withUnit("minutes")
                .withDescription("Light sensing sampling(refresh and update only while active)"),
            e
                .numeric("static_detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(5)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Static detection distance"),
            e
                .numeric("static_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Static detection sensitivity"),
            e.enum("motion_detection_mode", ea.STATE_SET, ["pir_and_radar", "pir_or_radar", "only_radar"]).withDescription("Motion detection mode"),
            e
                .numeric("motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Radar Motion detection sensitivity"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [106, "illuminance", tuya.valueConverter.raw],
                [102, "fading_time", tuya.valueConverter.raw],
                [2, "static_detection_sensitivity", tuya.valueConverter.raw],
                [4, "static_detection_distance", tuya.valueConverter.divideBy100],
                [108, "indicator", tuya.valueConverter.onOff],
                [110, "battery", tuya.valueConverter.raw],
                [111, "temperature", tuya.valueConverter.divideBy10],
                [101, "humidity", tuya.valueConverter.raw],
                [109, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [105, "temperature_calibration", tuya.valueConverter.divideBy10],
                [104, "humidity_calibration", tuya.valueConverter.raw],
                [107, "illuminance_interval", tuya.valueConverter.raw],
                [
                    112,
                    "motion_detection_mode",
                    tuya.valueConverterBasic.lookup({
                        pir_and_radar: tuya.enum(0),
                        pir_or_radar: tuya.enum(1),
                        only_radar: tuya.enum(2),
                    }),
                ],
                [
                    103,
                    "motion_state",
                    tuya.valueConverterBasic.lookup({
                        none: tuya.enum(0),
                        large: tuya.enum(1),
                        small: tuya.enum(2),
                        static: tuya.enum(3),
                    }),
                ],
                [123, "motion_detection_sensitivity", tuya.valueConverter.raw],
            ],
        },
        whiteLabel: [
            {
                model: "AY208Z",
                vendor: "AOYAN",
                description: "24G millimeter wave human presence sensor",
                fingerprint: [{modelID: "AY208Z", manufacturerName: "AOYAN"}],
            },
        ],
    },
    {
        zigbeeModel: ["ZG-106Z"],
        model: "ZG-106Z",
        vendor: "HOBEIAN",
        description: "Light intensity sensor",
        fromZigbee: [fz.battery, legacy.fromZigbee.TS0222],
        toZigbee: [],
        exposes: [e.battery()],
        configure: tuya.configureMagicPacket,
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["ZG-301Z"],
        model: "ZG-301Z",
        vendor: "HOBEIAN",
        description: "Wall switch module",
        extend: [tuya.modernExtend.tuyaBase(), tuya.modernExtend.tuyaOnOff({switchType: true, onOffCountdown: true})],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["ZG-301Z-2CH"],
        model: "ZG-301Z-2CH",
        vendor: "HOBEIAN",
        description: "2 gang switch module",
        extend: [
            tuya.modernExtend.tuyaBase(),
            tuya.modernExtend.tuyaOnOff({
                endpoints: ["l1", "l2"],
                switchType: true,
                powerOutageMemory: true,
            }),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);

            for (const endpoint of [device.getEndpoint(1), device.getEndpoint(2)]) {
                await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
                await reporting.onOff(endpoint);
            }
        },
    },
    {
        zigbeeModel: ["ZG-301Z-3CH"],
        model: "ZG-301Z-3CH",
        vendor: "HOBEIAN",
        description: "3 gang switch module",
        extend: [
            tuya.modernExtend.tuyaBase(),
            tuya.modernExtend.tuyaOnOff({
                endpoints: ["l1", "l2", "l3"],
                switchType: true,
                powerOutageMemory: true,
            }),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["ZG-301Z-MOTO"],
        model: "ZG-301Z-MOTO",
        vendor: "HOBEIAN",
        description: "Curtain Motor Controller",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            te.coverPosition(),
            e.enum("cur_calibration", ea.STATE_SET, ["start", "end"]).withDescription("Curtain calibration"),
            e.enum("control_back", ea.STATE_SET, ["forward", "back"]).withDescription("Set curtain control back"),
            e.numeric("tr_timecon", ea.STATE_SET).withValueMin(0).withValueMax(120).withValueStep(1).withUnit("s").withDescription("Quick Calibrate"),
            e
                .enum("switch_type", ea.STATE_SET, ["flip_switch", "sync_switch", "button_switch"])
                .withDescription("Set curtain controller switch type"),
            e.enum("indicator_mode", ea.STATE_SET, ["relay", "pos", "none"]).withDescription("Set Controller indicator mode"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.coverAction],
                [2, "position", tuya.valueConverter.coverPosition],
                [3, "cur_calibration", tuya.valueConverterBasic.lookup({start: tuya.enum(0), end: tuya.enum(1)})],
                [8, "control_back", tuya.valueConverterBasic.lookup({forward: tuya.enum(0), back: tuya.enum(1)})],
                [10, "tr_timecon", tuya.valueConverter.raw],
                [14, "indicator_mode", tuya.valueConverterBasic.lookup({relay: tuya.enum(0), pos: tuya.enum(1), none: tuya.enum(2)})],
                [
                    101,
                    "switch_type",
                    tuya.valueConverterBasic.lookup({flip_switch: tuya.enum(0), sync_switch: tuya.enum(1), button_switch: tuya.enum(2)}),
                ],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-302ZM"],
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE200_kccdzaeo",
            "_TZE200_s7rsrtbg",
            "_TZE200_tmszbtzq",
            "_TZE200_bfmfhxra",
            "_TZE200_ahpcyzth",
            "_TZE200_kijxnb8q",
        ]),
        model: "ZG-302ZM",
        vendor: "HOBEIAN",
        description: "Motion sensing switch",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.binary("switch1", ea.STATE_SET, "ON", "OFF").withDescription("Switch1"),
            e.binary("switch2", ea.STATE_SET, "ON", "OFF").withDescription("Switch2"),
            e.binary("switch3", ea.STATE_SET, "ON", "OFF").withDescription("Switch3"),
            e
                .numeric("distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.1)
                .withUnit("m")
                .withDescription("detection distance"),
            e.numeric("sensitivity", ea.STATE_SET).withValueMin(0).withValueMax(19).withValueStep(1).withDescription("detection sensitivity"),
            e.binary("backlight", ea.STATE_SET, "ON", "OFF").withDescription("backlight"),
            e
                .numeric("trigger_hold", ea.STATE_SET)
                .withValueMin(5)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Trigger hold(second)"),
            tuya.exposes.powerOutageMemory(),
            e
                .enum("auto_on", ea.STATE_SET, ["off", "all", "ch1", "ch2", "ch3", "ch1_2", "ch2_3", "ch1_3"])
                .withDescription("Someone turn on the light"),
            e
                .enum("auto_off", ea.STATE_SET, ["off", "all", "ch1", "ch2", "ch3", "ch1_2", "ch2_3", "ch1_3"])
                .withDescription("No one turns off the lights"),
            e.enum("trigger_switch", ea.STATE_SET, ["ch1", "ch2", "ch3"]).withDescription("Switch state reversal"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [2, "sensitivity", tuya.valueConverter.raw],
                [4, "distance", tuya.valueConverter.divideBy100],
                [101, "switch1", tuya.valueConverter.onOff],
                [102, "switch2", tuya.valueConverter.onOff],
                [103, "switch3", tuya.valueConverter.onOff],
                [111, "backlight", tuya.valueConverter.onOff],
                [114, "trigger_hold", tuya.valueConverter.raw],
                [
                    112,
                    "power_outage_memory",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        on: tuya.enum(1),
                        restore: tuya.enum(2),
                    }),
                ],
                [
                    113,
                    "auto_on",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        all: tuya.enum(1),
                        ch1: tuya.enum(2),
                        ch2: tuya.enum(3),
                        ch3: tuya.enum(4),
                        ch1_2: tuya.enum(5),
                        ch2_3: tuya.enum(6),
                        ch1_3: tuya.enum(7),
                    }),
                ],
                [
                    115,
                    "auto_off",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        all: tuya.enum(1),
                        ch1: tuya.enum(2),
                        ch2: tuya.enum(3),
                        ch3: tuya.enum(4),
                        ch1_2: tuya.enum(5),
                        ch2_3: tuya.enum(6),
                        ch1_3: tuya.enum(7),
                    }),
                ],
                [
                    108,
                    "trigger_switch",
                    tuya.valueConverterBasic.lookup({
                        ch1: tuya.enum(0),
                        ch2: tuya.enum(1),
                        ch3: tuya.enum(2),
                    }),
                ],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-302ZL"],
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE200_khzbklyh",
            "_TZE200_df04ghrb",
            "_TZE200_toeldckg",
            "_TZE200_cqtamhh5",
            "_TZE200_xlnzk169",
            "_TZE200_llvwkkde",
        ]),
        model: "ZG-302ZL",
        vendor: "HOBEIAN",
        description: "Motion sensing switch",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.binary("switch_1", ea.STATE_SET, "ON", "OFF").withDescription("Switch2"),
            e.binary("switch_2", ea.STATE_SET, "ON", "OFF").withDescription("Switch2"),
            e.binary("switch_3", ea.STATE_SET, "ON", "OFF").withDescription("Switch3"),
            e.numeric("sensitivity", ea.STATE_SET).withValueMin(0).withValueMax(19).withValueStep(1).withDescription("detection sensitivity"),
            e.binary("backlight", ea.STATE_SET, "ON", "OFF").withDescription("backlight"),
            e
                .numeric("trigger_hold", ea.STATE_SET)
                .withValueMin(5)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Trigger hold(second)"),
            tuya.exposes.powerOutageMemory(),
            e
                .enum("auto_on", ea.STATE_SET, ["off", "all", "ch1", "ch2", "ch3", "ch1_and_ch2", "ch2_and_ch3", "ch1_and_ch3"])
                .withDescription("When somebody passes in front of their sensors, the lights turn"),
            e
                .enum("auto_off", ea.STATE_SET, ["off", "all", "ch1", "ch2", "ch3", "ch1_and_ch2", "ch2_and_ch3", "ch1_and_ch3"])
                .withDescription("No one turns off the lights"),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [101, "presence", tuya.valueConverter.trueFalse1],
                [102, "sensitivity", tuya.valueConverter.raw],
                [1, "switch_1", tuya.valueConverter.onOff],
                [2, "switch_2", tuya.valueConverter.onOff],
                [3, "switch_3", tuya.valueConverter.onOff],
                [16, "backlight", tuya.valueConverter.onOff],
                [103, "trigger_hold", tuya.valueConverter.raw],
                [
                    14,
                    "power_outage_memory",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        on: tuya.enum(1),
                        restore: tuya.enum(2),
                    }),
                ],
                [
                    104,
                    "auto_on",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        all: tuya.enum(1),
                        ch1: tuya.enum(1),
                        ch2: tuya.enum(2),
                        ch3: tuya.enum(3),
                        ch1_and_ch2: tuya.enum(4),
                        ch2_and_ch3: tuya.enum(5),
                        ch1_and_ch3: tuya.enum(6),
                    }),
                ],
                [
                    105,
                    "auto_off",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        all: tuya.enum(1),
                        ch1: tuya.enum(1),
                        ch2: tuya.enum(2),
                        ch3: tuya.enum(3),
                        ch1_and_ch2: tuya.enum(4),
                        ch2_and_ch3: tuya.enum(5),
                        ch1_and_ch3: tuya.enum(6),
                    }),
                ],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-103Z"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_iba1ckek", "_TZE200_hggxgsjj", "_TZE200_afycb3cg"]),
        model: "ZG-103Z",
        vendor: "Tuya",
        description: "Vibration sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.vibration(),
            e.tilt(),
            e
                .numeric("x", ea.STATE)
                .withLabel("Accel. X Component")
                .withValueMin(-128)
                .withValueMax(127)
                .withValueStep(1)
                .withDescription("Gravitational acceleration component along the X-axis"),
            e
                .numeric("y", ea.STATE)
                .withLabel("Accel. Y Component")
                .withValueMin(-128)
                .withValueMax(127)
                .withValueStep(1)
                .withDescription("Gravitational acceleration component along the Y-axis"),
            e
                .numeric("z", ea.STATE)
                .withLabel("Accel. Z Component")
                .withValueMin(-128)
                .withValueMax(127)
                .withValueStep(1)
                .withDescription("Gravitational acceleration component along the Z-axis"),
            e.battery(),
            e.enum("sensitivity", ea.STATE_SET, ["low", "middle", "high"]).withDescription("Vibration detection sensitivity"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "vibration", tuya.valueConverter.trueFalseEnum1],
                [7, "tilt", tuya.valueConverter.trueFalseEnum1],
                [101, "x", {from: (v: number) => (v > 127 ? v - 256 : v)}],
                [102, "y", {from: (v: number) => (v > 127 ? v - 256 : v)}],
                [103, "z", {from: (v: number) => (v > 127 ? v - 256 : v)}],
                [
                    104,
                    "sensitivity",
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        middle: tuya.enum(1),
                        high: tuya.enum(2),
                    }),
                ],
                [105, "battery", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_wqashyqo"]),
        model: "ZG-303Z",
        vendor: "HOBEIAN",
        description: "Soil moisture sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.enum("water_warning", ea.STATE, ["none", "alarm"]).withDescription("Water shortage warning"),
            e.temperature(),
            e.humidity(),
            e.soil_moisture(),
            tuya.exposes.temperatureUnit(),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
            tuya.exposes.soilCalibration(),
            tuya.exposes.temperatureSampling(),
            tuya.exposes.soilSampling(),
            tuya.exposes.soilWarning(),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "water_warning",
                    tuya.valueConverterBasic.lookup({
                        none: tuya.enum(0),
                        alarm: tuya.enum(1),
                    }),
                ],
                [103, "temperature", tuya.valueConverter.divideBy10],
                [109, "humidity", tuya.valueConverter.raw],
                [107, "soil_moisture", tuya.valueConverter.raw],
                [108, "battery", tuya.valueConverter.raw],
                [106, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [104, "temperature_calibration", tuya.valueConverter.divideBy10],
                [105, "humidity_calibration", tuya.valueConverter.raw],
                [102, "soil_calibration", tuya.valueConverter.raw],
                [111, "temperature_sampling", tuya.valueConverter.raw],
                [112, "soil_sampling", tuya.valueConverter.raw],
                [110, "soil_warning", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-303Z", "AY-303Z", "AY-302Z"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_npj9bug3", "_TZE200_wrmhp6b3"]),
        model: "CS-201Z",
        vendor: "COOLO",
        description: "Soil moisture sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true}), m.identify({isSleepy: true})],
        whiteLabel: [
            {
                model: "AY-303Z",
                vendor: "AOYAN",
                description: "Soil moisture sensor",
                fingerprint: [{modelID: "AY-303Z", manufacturerName: "AOYAN  "}],
            },
            {
                model: "AY-302Z",
                vendor: "AOYAN",
                description: "Soil moisture sensor",
                fingerprint: [{modelID: "AY-302Z", manufacturerName: "AOYAN  "}],
            },
        ],
        exposes: (device) => {
            const exposes = [
                e.dry(),
                e.temperature(),
                e.soil_moisture(),
                tuya.exposes.temperatureUnit(),
                tuya.exposes.temperatureCalibration(),
                tuya.exposes.soilCalibration(),
                tuya.exposes.temperatureSampling(),
                tuya.exposes.soilSampling(),
                tuya.exposes.soilWarning(),
                e.battery(),
            ];

            if (!isDummyDevice(device) && device.modelID !== "AY-302Z") {
                exposes.splice(2, 0, e.humidity());
                exposes.splice(6, 0, tuya.exposes.humidityCalibration());
            }

            return exposes;
        },
        meta: {
            tuyaDatapoints: [
                [106, "dry", tuya.valueConverter.raw],
                [5, "temperature", tuya.valueConverter.divideBy10],
                [109, "humidity", tuya.valueConverter.raw],
                [3, "soil_moisture", tuya.valueConverter.raw],
                [15, "battery", tuya.valueConverter.raw],
                [9, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [104, "temperature_calibration", tuya.valueConverter.divideBy10],
                [105, "humidity_calibration", tuya.valueConverter.raw],
                [102, "soil_calibration", tuya.valueConverter.raw],
                [111, "temperature_sampling", tuya.valueConverter.raw],
                [112, "soil_sampling", tuya.valueConverter.raw],
                [110, "soil_warning", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-102ZM", "AY02SZ"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_wzk0x7fq", "_TZE200_jfw0a4aa", "_TZE200_yjryxpot"]),
        model: "ZG-102ZM",
        vendor: "HOBEIAN",
        description: "Vibration sensor",
        whiteLabel: [
            {
                model: "AY02SZ",
                vendor: "AOYAN",
                description: "Vibration sensor",
                fingerprint: [{modelID: "AY02SZ", manufacturerName: "AOYAN"}, {manufacturerName: "AOYAN"}],
            },
        ],
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.vibration(),
            e.contact(),
            e.battery(),
            e
                .numeric("sensitivity", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(50)
                .withValueStep(1)
                .withDescription("The larger the value, the more sensitive it is (refresh and update only while active)"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "vibration", tuya.valueConverter.trueFalse1],
                [101, "contact", tuya.valueConverter.inverse],
                [4, "battery", tuya.valueConverter.raw],
                [6, "sensitivity", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-204ZV", "AY204T"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_uli8wasj", "_TZE200_grgol3xp", "_TZE200_rhgsbacq"]),
        model: "ZG-204ZV",
        vendor: "HOBEIAN",
        description: "Millimeter wave motion detection",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.illuminance(),
            e.temperature(),
            e.humidity(),
            tuya.exposes.temperatureUnit(),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
            e.battery(),
            e
                .numeric("fading_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Motion keep time"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator mode"),
            e
                .numeric("illuminance_interval", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(720)
                .withValueStep(1)
                .withUnit("minutes")
                .withDescription("Light sensing sampling(refresh and update only while active)"),
            e
                .numeric("motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(19)
                .withValueStep(1)
                .withDescription("The larger the value, the more sensitive it is (refresh and update only while active)"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [106, "illuminance", tuya.valueConverter.raw],
                [102, "fading_time", tuya.valueConverter.raw],
                [2, "motion_detection_sensitivity", tuya.valueConverter.raw],
                [108, "indicator", tuya.valueConverter.onOff],
                [110, "battery", tuya.valueConverter.raw],
                [111, "temperature", tuya.valueConverter.divideBy10],
                [101, "humidity", tuya.valueConverter.raw],
                [109, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [105, "temperature_calibration", tuya.valueConverter.divideBy10],
                [104, "humidity_calibration", tuya.valueConverter.raw],
                [107, "illuminance_interval", tuya.valueConverter.raw],
            ],
        },
        whiteLabel: [
            {
                model: "AY204T",
                vendor: "AOYAN",
                description: "Millimeter wave motion detection",
                fingerprint: [{modelID: "AY204T", manufacturerName: "AOYAN  "}],
            },
        ],
    },
    {
        zigbeeModel: ["ZG-223Z", "HS118Z"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_jsaqgakf", "_TZE200_u6x1zyv2", "_TZE200_2pddnnrk", "_TZE200_gt1gge3x"]),
        model: "ZG-223Z",
        vendor: "HOBEIAN",
        description: "Rainwater detection sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.enum("rainwater", ea.STATE, ["none", "raining"]).withDescription("Sensor rainwater status"),
            e.illuminance(),
            e
                .numeric("sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9)
                .withValueStep(1)
                .withDescription("The larger the value, the more sensitive it is (refresh and update only while active)"),
            e
                .numeric("illuminance_sampling", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(480)
                .withValueStep(1)
                .withUnit("minutes")
                .withDescription("Brightness acquisition interval (refresh and update only while active)"),
            e.battery(),
        ],
        whiteLabel: [
            {
                model: "HS118Z",
                vendor: "HYSYIOT",
                description: "Rainwater detection sensor",
                fingerprint: [{modelID: "HS118Z", manufacturerName: "HYSYIOT"}],
            },
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "rainwater",
                    tuya.valueConverterBasic.lookup({
                        none: tuya.enum(0),
                        raining: tuya.enum(1),
                    }),
                ],
                [102, "illuminance", tuya.valueConverter.raw],
                [104, "battery", tuya.valueConverter.raw],
                [2, "sensitivity", tuya.valueConverter.raw],
                [101, "illuminance_sampling", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-305Z"],
        model: "ZG-305Z",
        vendor: "HOBEIAN",
        description: "2 gang switch with USB",
        extend: [
            tuya.modernExtend.tuyaBase(),
            tuya.modernExtend.tuyaOnOff({
                childLock: true,
                endpoints: ["l1", "l2"],
            }),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {
            multiEndpoint: true,
            multiEndpointSkip: ["power_on_behavior"],
        },
        configure: tuya.configureMagicPacket,
    },
    {
        zigbeeModel: ["ZG-227ZP", "ZG-227ZH"],
        model: "ZG-227ZP",
        vendor: "HOBEIAN",
        description: "Temperature(NTC) & humidity sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.numeric("ntc_temperature", ea.STATE).withUnit("°C").withDescription("External NTC temperature,if <-40°C,no installed sensor"),
            e.temperature(),
            e.humidity(),
            e.enum("ntc_alarm", ea.STATE, ["loweralarm", "upperalarm", "cancel"]).withDescription("NTC temperature alarm"),
            e
                .numeric("ntc_temperature_calibration", ea.STATE_SET)
                .withValueMin(-5.0)
                .withValueMax(5.0)
                .withValueStep(0.1)
                .withUnit("°C")
                .withDescription("NTC temperature calibration"),
            tuya.exposes.temperatureUnit(),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
            tuya.exposes.temperatureSampling(),
            e
                .numeric("ntc_high_temp_alarm_threshold", ea.STATE_SET)
                .withValueMin(-40.0)
                .withValueMax(130.0)
                .withValueStep(0.1)
                .withUnit("°C")
                .withDescription("NTC high temp alarm threshold"),
            e
                .numeric("ntc_low_temp_alarm_threshold", ea.STATE_SET)
                .withValueMin(-40.0)
                .withValueMax(130.0)
                .withValueStep(0.1)
                .withUnit("°C")
                .withDescription("NTC high temp alarm threshold"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "temperature", tuya.valueConverter.divideBy10],
                [2, "humidity", tuya.valueConverter.raw],
                [9, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [4, "battery", tuya.valueConverter.raw],
                [6, "temperature_sampling", tuya.valueConverter.raw],
                [23, "temperature_calibration", tuya.valueConverter.divideBy10],
                [24, "humidity_calibration", tuya.valueConverter.raw],
                [104, "ntc_temperature_calibration", tuya.valueConverter.divideBy10],
                [10, "ntc_high_temp_alarm_threshold", tuya.valueConverter.divideBy10],
                [11, "ntc_low_temp_alarm_threshold", tuya.valueConverter.divideBy10],
                [14, "ntc_alarm", tuya.valueConverterBasic.lookup({loweralarm: tuya.enum(0), upperalarm: tuya.enum(1), cancel: tuya.enum(2)})],
                [105, "ntc_temperature", tuya.valueConverter.divideBy10],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-204ZL"],
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE200_3towulqd",
            "_TZE200_1ibpyhdc",
            "_TZE200_bh3n6gk8",
            "_TZE200_ttcovulf",
            "_TZE200_gjldowol",
            "_TZE200_s6hzw8g2",
            "_TZE200_jxyhl4eq",
            "_TZE200_qxyh4r7g",
            "_TZE200_na5qlzow",
        ]),
        model: "ZG-204ZL",
        vendor: "HOBEIAN",
        description: "Luminance motion sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.occupancy(),
            e.illuminance().withUnit("lx"),
            e.battery(),
            e
                .enum("sensitivity", ea.STATE_SET, ["low", "medium", "high"])
                .withDescription("PIR sensor sensitivity (refresh and update only while active)"),
            e
                .enum("keep_time", ea.STATE_SET, ["10", "30", "60", "120"])
                .withDescription("PIR keep time in seconds (refresh and update only while active)"),
            e
                .numeric("illuminance_interval", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(720)
                .withValueStep(1)
                .withUnit("minutes")
                .withDescription("Brightness acquisition interval (refresh and update only while active)"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "occupancy", tuya.valueConverter.trueFalse0],
                [4, "battery", tuya.valueConverter.raw],
                [
                    9,
                    "sensitivity",
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        medium: tuya.enum(1),
                        high: tuya.enum(2),
                    }),
                ],
                [
                    10,
                    "keep_time",
                    tuya.valueConverterBasic.lookup({
                        "10": tuya.enum(0),
                        "30": tuya.enum(1),
                        "60": tuya.enum(2),
                        "120": tuya.enum(3),
                    }),
                ],
                [12, "illuminance", tuya.valueConverter.raw],
                [101, "illuminance", tuya.valueConverter.raw], // For _TZE200_s6hzw8g2
                [102, "illuminance_interval", tuya.valueConverter.raw],
            ],
        },
        whiteLabel: [tuya.whitelabel("Nedis", "ZBSM20WT", "Nedis motion sensor", ["_TZE200_s6hzw8g2"])],
    },
    {
        zigbeeModel: ["ZG-225Z"],
        fingerprint: [...tuya.fingerprint("TS0601", ["_TZE200_8isdky6j"]), ...tuya.fingerprint("TS0225", ["_TZE200_p6fuhvez", "_TZE200_aj0oxo1i"])],
        model: "ZG-225Z",
        vendor: "HOBEIAN",
        description: "Gas sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.gas(),
            tuya.exposes.gasValue().withUnit("ppm"),
            e.enum("sensitivity", ea.STATE_SET, ["low", "medium", "high"]).withDescription("Gas sensor sensitivity"),
            e.enum("ring", ea.STATE_SET, ["ring1", "ring2"]).withDescription("Ring"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "gas", tuya.valueConverter.trueFalse0],
                [2, "gas_value", tuya.valueConverter.raw],
                [
                    101,
                    "sensitivity",
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        medium: tuya.enum(1),
                        high: tuya.enum(2),
                    }),
                ],
                [
                    6,
                    "ring",
                    tuya.valueConverterBasic.lookup({
                        ring1: tuya.enum(0),
                        ring2: tuya.enum(1),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_n8dljorx"]),
        model: "ZG-102Z",
        vendor: "HOBEIAN",
        description: "Door sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [e.contact(), e.battery()],
        meta: {
            tuyaDatapoints: [
                [1, "contact", tuya.valueConverter.inverse],
                [2, "battery", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-102ZL"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_pay2byax", "_TZE200_ijey4q29", "_TZE200_ykglasuj", "_TZE200_kf2hbko4"]),
        model: "ZG-102ZL",
        vendor: "HOBEIAN",
        description: "Luminance door sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.contact(),
            e.illuminance().withUnit("lx"),
            e.battery(),
            e
                .numeric("illuminance_interval", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(720)
                .withValueStep(1)
                .withUnit("minutes")
                .withDescription("Brightness acquisition interval (refresh and update only while active)"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "contact", tuya.valueConverter.inverse],
                [101, "illuminance", tuya.valueConverter.raw],
                [2, "battery", tuya.valueConverter.raw],
                [102, "illuminance_interval", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-102Z"],
        model: "ZG-102ZA",
        vendor: "HOBEIAN",
        description: "Door/window sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: (device, options) => {
            const exps: Expose[] = [e.contact(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()];
            return exps;
        },
        meta: {
            battery: {
                voltageToPercentage: "3V_1500_2800",
            },
        },
        configure: async (device, coordinatorEndpoint) => {
            try {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.batteryVoltage(endpoint);
            } catch {
                /* Fails for some*/
            }

            const endpoint = device.getEndpoint(1);
            if (endpoint.binds.some((b) => b.cluster.name === "genPollCtrl")) {
                await endpoint.unbind("genPollCtrl", coordinatorEndpoint);
            }
        },
    },
    {
        zigbeeModel: ["ZG-204Z"],
        model: "ZG-204Z",
        vendor: "HOBEIAN",
        description: "Motion sensor",
        fromZigbee: [fzLocal.zg204_attr, fz.battery],
        toZigbee: [tzLocal.zg204_attr],
        extend: [
            m.quirkCheckinInterval(15000),
            // Occupancy reporting interval is 60s, so allow for one dropped update plus a small safety margin of 5s
            m.iasZoneAlarm({
                zoneType: "occupancy",
                zoneAttributes: ["alarm_1"],
                // No keepAlivetimeout for ZG-204Z
                // https://github.com/Koenkk/zigbee2mqtt/issues/30676
                keepAliveTimeout: (d) => (d.modelID === "ZG-204Z" ? 0 : 125),
            }),
        ],
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.enum("sensitivity", ea.ALL, ["low", "medium", "high"]).withDescription("PIR sensor sensitivity"),
            e.enum("keep_time", ea.ALL, [30, 60, 120]).withDescription("PIR keep time in seconds"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ["ZG-101ZD"],
        fingerprint: tuya.fingerprint("TS004F", ["_TZ3000_abrsvsou", "_TZ3000_402vrq2i", "_TZ3000_gwkzibhs"]),
        model: "ZG-101ZD",
        vendor: "HOBEIAN",
        description: "Smart knob",
        extend: [tuya.modernExtend.tuyaBase()],
        fromZigbee: [
            fz.command_step,
            fz.command_toggle,
            fz.command_move_hue,
            fz.command_step_color_temperature,
            fzLocal.command_stop_move_raw,
            tuya.fz.multi_action,
            tuya.fz.operation_mode,
            fz.battery,
        ],
        whiteLabel: [tuya.whitelabel("HOBEIAN", "ZG-101Z_D_1", "Smart knob", ["_TZ3000_402vrq2i"])],
        toZigbee: [tuya.tz.operation_mode],
        exposes: [
            e.action([
                "toggle",
                "brightness_step_up",
                "brightness_step_down",
                "color_temperature_step_up",
                "color_temperature_step_down",
                "saturation_move",
                "hue_move",
                "hue_stop",
                "single",
                "double",
                "hold",
                "rotate_left",
                "rotate_right",
            ]),
            e.numeric("action_brightness_delta", ea.STATE).withValueMin(-255).withValueMax(255),
            e.numeric("action_step_size", ea.STATE).withValueMin(0).withValueMax(255),
            e.numeric("action_color_temperature_delta", ea.STATE).withValueMin(-65535).withValueMax(65535),
            e.numeric("action_transition_time", ea.STATE).withUnit("s"),
            e.numeric("action_rate", ea.STATE).withValueMin(0).withValueMax(255),
            e.battery(),
            e
                .enum("operation_mode", ea.ALL, ["command", "event"])
                .withDescription('Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            // Some firmwares (e.g. _TZ3000_gwkzibhs) reply UNSUPPORTED_ATTRIBUTE to the magic packet (0xfffe) read,
            // similar TS004F buttons do so for the tuyaOperationMode write; both work fine without it.
            // https://github.com/Koenkk/zigbee2mqtt/issues/31917
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await ignoreUnsupportedAttribute(async () => {
                await endpoint.write<"genOnOff", tuya.TuyaGenOnOff>("genOnOff", {tuyaOperationMode: 1});
            }, "tuyaOperationMode write");
            await endpoint.read<"genOnOff", tuya.TuyaGenOnOff>("genOnOff", ["tuyaOperationMode"]);
            try {
                await endpoint.read(0xe001, [0xd011]);
            } catch {
                /* do nothing */
            }
            await endpoint.read("genPowerCfg", ["batteryVoltage", "batteryPercentageRemaining"]);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        // Only the ones with applicationVersion 145 should be detected as this, e.g. applicationVersion 66 should be detected as ERS-10TZBVK-AA.
        // https://github.com/Koenkk/zigbee2mqtt/issues/25053
        fingerprint: [
            {
                modelID: "TS004F",
                manufacturerName: "_TZ3000_abrsvsou",
                applicationVersion: 145,
                priority: 1,
            },
        ],
        model: "ZG-101Z/D",
        vendor: "HOBEIAN",
        description: "Smart knob",
        fromZigbee: [tuya.fz.multi_action, fz.battery, tuya.fz.operation_mode],
        exposes: [
            e.action(["rotate_left", "rotate_right"]),
            e
                .enum("operation_mode", ea.ALL, ["command", "event"])
                .withDescription('Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        extend: [tuyaBase(), m.battery(), tuya.modernExtend.tuyaMagicPacket()],
    },
    {
        zigbeeModel: ["ZG-205ZL"],
        fingerprint: [
            {modelID: "TS0225", manufacturerName: "_TZE200_hl0ss9oa"},
            {modelID: "CK-BL702-MWS-01(7016)", manufacturerName: "ZGAF-205L"},
            {modelID: "TS0225", manufacturerName: "_TZE200_y4mdop0b"},
        ],
        model: "ZG-205ZL",
        vendor: "HOBEIAN",
        description: "24Ghz/5.8GHz human presence sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.enum("motion_state", ea.STATE, ["none", "large", "small", "static"]).withDescription("Motion state"),
            e.illuminance(),
            e
                .numeric("fading_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(3600)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Presence keep time"),
            e
                .numeric("large_motion_detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Large motion detection distance"),
            e
                .numeric("large_motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Large motion detection sensitivity"),
            e
                .numeric("small_motion_detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Small motion detection distance"),
            e
                .numeric("small_motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Small motion detection sensitivity"),
            e
                .numeric("static_detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Static detection distance"),
            e
                .numeric("static_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Static detection sensitivity"),
            e.enum("mode", ea.STATE_SET, ["off", "arm", "alarm", "doorbell"]).withDescription("Working mode"),
            e.enum("alarm_volume", ea.STATE_SET, ["mute", "low", "medium", "high"]).withDescription("Alarm volume"),
            e.numeric("alarm_time", ea.STATE_SET).withValueMin(1).withValueMax(60).withValueStep(1).withUnit("m").withDescription("Alarm time"),
            e.binary("light_mode", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator mode"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [20, "illuminance", tuya.valueConverter.raw],
                [
                    11,
                    "motion_state",
                    tuya.valueConverterBasic.lookup({
                        none: tuya.enum(0),
                        large: tuya.enum(1),
                        small: tuya.enum(2),
                        static: tuya.enum(3),
                        far: tuya.enum(4),
                        near: tuya.enum(5),
                    }),
                ],
                [12, "fading_time", tuya.valueConverter.raw],
                [13, "large_motion_detection_distance", tuya.valueConverter.divideBy100],
                [15, "large_motion_detection_sensitivity", tuya.valueConverter.raw],
                [14, "small_motion_detection_distance", tuya.valueConverter.divideBy100],
                [16, "small_motion_detection_sensitivity", tuya.valueConverter.raw],
                [103, "static_detection_distance", tuya.valueConverter.divideBy100],
                [104, "static_detection_sensitivity", tuya.valueConverter.raw],
                [
                    105,
                    "mode",
                    tuya.valueConverterBasic.lookup({
                        arm: tuya.enum(0),
                        off: tuya.enum(1),
                        alarm: tuya.enum(2),
                        doorbell: tuya.enum(3),
                    }),
                ],
                [
                    102,
                    "alarm_volume",
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        medium: tuya.enum(1),
                        high: tuya.enum(2),
                        mute: tuya.enum(3),
                    }),
                ],
                [101, "alarm_time", tuya.valueConverter.raw],
                [24, "light_mode", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [
            ...tuya.fingerprint("TS0225", ["_TZE200_2aaelwxk", "_TZE200_crq3r3la"]),
            ...tuya.fingerprint("CK-BL702-MWS-01(7016)", ["HOBEIAN", "_TZE200_crq3r3la"]),
        ],
        model: "ZG-205Z/A",
        vendor: "HOBEIAN",
        description: "5.8Ghz/24Ghz Human presence sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.enum("motion_state", ea.STATE, ["none", "small", "medium", "large", "far", "near"]).withDescription("State of the motion"),
            e.numeric("target_distance", ea.STATE).withDescription("Distance to target").withUnit("m"),
            e.illuminance().withUnit("lx"),
            e
                .numeric("large_motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Motion detection sensitivity"),
            e
                .numeric("large_motion_detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Motion detection distance"),

            e
                .numeric("fading_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("For how much time presence should stay true after detecting it"),
            e
                .numeric("medium_motion_detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Medium motion detection distance"),
            e
                .numeric("medium_motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Medium motion detection sensitivity"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED Indicator"),
            e
                .numeric("small_detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Small detection distance"),
            e
                .numeric("small_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription("Small detection sensitivity"),
            e
                .numeric("minimum_range", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit("m")
                .withDescription("Minimum range"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [2, "large_motion_detection_sensitivity", tuya.valueConverter.raw],
                [4, "large_motion_detection_distance", tuya.valueConverter.divideBy100],
                [
                    101,
                    "motion_state",
                    tuya.valueConverterBasic.lookup({
                        none: tuya.enum(0),
                        large: tuya.enum(1),
                        medium: tuya.enum(2),
                        small: tuya.enum(3),
                        far: tuya.enum(4),
                        near: tuya.enum(5),
                    }),
                ],
                [102, "fading_time", tuya.valueConverter.raw],
                [104, "medium_motion_detection_distance", tuya.valueConverter.divideBy100],
                [105, "medium_motion_detection_sensitivity", tuya.valueConverter.raw],
                [106, "illuminance", tuya.valueConverter.raw],
                [107, "indicator", tuya.valueConverter.onOff],
                [108, "small_detection_distance", tuya.valueConverter.divideBy100],
                [109, "small_detection_sensitivity", tuya.valueConverter.raw],
                [122, "target_distance", tuya.valueConverter.divideBy100],
                [123, "minimum_range", tuya.valueConverter.divideBy100],
            ],
        },
    },
    {
        zigbeeModel: ["ZG-222Z"],
        model: "ZG-222Z",
        vendor: "HOBEIAN",
        description: "Water leak detector",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: (device, options) => {
            const exps: Expose[] = [e.water_leak(), e.battery_low(), e.battery()];
            return exps;
        },
    },
    {
        zigbeeModel: ["ZG-227Z", "ZG-227ZL", "AY201Z"],
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE200_qoy0ekbd",
            "_TZE200_znbl8dj5",
            "_TZE200_a8sdabtg",
            "_TZE200_dikkika5",
            "_TZE200_vs0skpuc",
            "_TZE200_3xfjp0ag",
            "_TZE200_ehhrv2e3",
            "_TZE200_lhqtjwax",
            "_TZE200_y8wkaq6w",
        ]),
        model: "ZG-227ZL",
        vendor: "Tuya",
        description: "Temperature & humidity LCD sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.temperature(),
            e.humidity(),
            tuya.exposes.temperatureUnit(),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
            e.battery(),
        ],
        whiteLabel: [
            {
                model: "ZG-227Z",
                vendor: "HOBEIAN",
                description: "Temperature & humidity sensor",
                fingerprint: [
                    {modelID: "ZG-227Z"},
                    {manufacturerName: "_TZE200_a8sdabtg"},
                    {manufacturerName: "_TZE200_vs0skpuc"},
                    {manufacturerName: "_TZE200_ehhrv2e3"},
                    {manufacturerName: "_TZE200_dikkika5"},
                    {manufacturerName: "_TZE200_lhqtjwax"},
                    {manufacturerName: "_TZE200_vs0skpuc"},
                ],
            },
            tuya.whitelabel("KOJIMA", "KOJIMA-THS-ZG-LCD", "Temperature and humidity sensor", ["_TZE200_dikkika5", "_TZE200_y8wkaq6w"]),
            {
                model: "AY201Z",
                vendor: "AOYAN",
                description: "Temperature & humidity LCD sensor",
                fingerprint: [{modelID: "AY201Z"}],
            },
        ],
        meta: {
            tuyaDatapoints: [
                [1, "temperature", tuya.valueConverter.divideBy10],
                [2, "humidity", tuya.valueConverter.raw],
                [4, "battery", tuya.valueConverter.raw],
                [9, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [23, "temperature_calibration", tuya.valueConverter.divideBy10],
                [24, "humidity_calibration", tuya.valueConverter.raw],
            ],
        },
    },
];
