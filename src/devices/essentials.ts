import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const NS = "zhc:essentials";

const localValueConverters = {
    battery: {
        from: (value: number, meta: Fz.Meta) => {
            return value > 130 ? 100 : value < 70 ? 0 : ((value - 70) * 1.7).toFixed(1);
        },
    },
    fault_code: {
        from: (value: string, meta: Fz.Meta) => {
            logger.warning(`ERROR CODE received: ${JSON.stringify(value)}`, NS);
            return value;
        },
    },
    away_setting: {
        from: (value: number[]) => {
            return {
                year: value[0] + 2000,
                month: value[1],
                day: value[2],
                hour: value[3],
                minute: value[4],
                away_preset_temperature: Number((value[5] / 2).toFixed(1)),
                away_preset_days: (value[6] << 8) | value[7],
            };
        },
        to: (
            value: {
                year: number;
                month: number;
                day: number;
                hour: number;
                minute: number;
                awayPresetTemperature: number;
                awayPresetDays: number;
            },
            meta: Tz.Meta,
        ) => {
            const output = new Uint8Array(8);
            // byte 0 - Start Year (0x00 = 2000)
            // byte 1 - Start Month
            // byte 2 - Start Day
            // byte 3 - Start Hour
            // byte 4 - Start Minute
            // byte 5 - Temperature (1~59 = 0.5~29.5°C (0.5 step))
            // byte 6-7 - Duration in Hours (0~2400 (100 days))
            output[0] = value.year > 2000 ? value.year - 2000 : value.year; // year
            output[1] = value.month; // month
            output[2] = value.day; // day
            output[3] = value.hour; // hour
            output[4] = value.minute; // min
            output[5] = Math.round(value.awayPresetTemperature * 2);
            output[7] = value.awayPresetDays & 0xff;
            output[6] = value.awayPresetDays >> 8;
            logger.debug(JSON.stringify({"send to tuya": output, "value was": value}), NS);
        },
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_i48qyn9s"]),
        model: "_TZE200_i48qyn9s",
        vendor: "Essentials",
        description: "Thermostat Zigbee smart home",
        ota: true,
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "1970"})],
        exposes: [
            e.battery(),
            e.battery_low(),
            e.child_lock(),
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 0.5, 29.5, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-12.5, 5.5, 0.1, ea.STATE_SET)
                .withSystemMode(
                    ["auto", "heat", "off"],
                    ea.STATE_SET,
                    'Mode auto: schedule active. Mode heat: manual temperature setting. Mode off: "away" setting active',
                ),
            e.comfort_temperature(),
            e.eco_temperature(),
            e.open_window_temperature().withDescription("open winow detection temperature"),
            e.binary("window_open", ea.STATE, "YES", "NO").withDescription("Open window detected"),
            e
                .numeric("detect_window_time_minute", ea.STATE_SET)
                .withUnit("min")
                .withDescription("Open window time in minutes")
                .withValueMin(0)
                .withValueMax(1000),
            e
                .composite("away_setting", "away_setting", ea.STATE)
                .withFeature(e.away_preset_days())
                .withFeature(e.away_preset_temperature())
                .withFeature(e.numeric("year", ea.STATE_SET).withUnit("year").withDescription("Start away year 20xx"))
                .withFeature(e.numeric("month", ea.STATE_SET).withUnit("month").withDescription("Start away month"))
                .withFeature(e.numeric("day", ea.STATE_SET).withUnit("day").withDescription("Start away day"))
                .withFeature(e.numeric("hour", ea.STATE_SET).withUnit("hour").withDescription("Start away hours"))
                .withFeature(e.numeric("minute", ea.STATE_SET).withUnit("min").withDescription("Start away minutes")),
        ],
        meta: {
            tuyaDatapoints: [
                [2, "system_mode", tuya.valueConverterBasic.lookup({auto: tuya.enum(0), heat: tuya.enum(1), off: tuya.enum(2)})],
                [16, "current_heating_setpoint", tuya.valueConverterBasic.divideBy(2)],
                [24, "local_temperature", tuya.valueConverter.divideBy10],
                [30, "child_lock", tuya.valueConverter.lockUnlock],
                [34, "battery", localValueConverters.battery],
                [45, "fault_code", localValueConverters.fault_code],
                [101, "comfort_temperature", tuya.valueConverter.divideBy10],
                [102, "eco_temperature", tuya.valueConverter.divideBy10],
                [103, "away_setting", localValueConverters.away_setting],
                [104, "local_temperature_calibration", tuya.valueConverter.localTempCalibration1],
                [105, "schedule_override_setpoint", tuya.valueConverter.divideBy10],
                [106, null, null], // TODO rapid heating
                [107, "window_open", tuya.valueConverterBasic.lookup({YES: true, NO: false})],
                [108, null, null], // TODO hibernate
                [116, "open_window_temperature", tuya.valueConverterBasic.divideBy(2)],
                [117, "detect_window_time_minute", tuya.valueConverterBasic.raw()],
                [118, null, null], // TODO rapidHeatCntdownTimer
                [119, null, null], // TODO tempControl
            ],
        },
    },
];
