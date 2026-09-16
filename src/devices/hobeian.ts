import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";
import * as zosung from "../lib/zosung";

const e = exposes.presets;
const ea = exposes.access;

const fzZosung = zosung.fzZosung;
const tzZosung = zosung.tzZosung;
const ez = zosung.presetsZosung;

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
];
