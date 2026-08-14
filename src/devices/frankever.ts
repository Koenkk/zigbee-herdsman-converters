import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_wt9agwf3", "_TZE200_5uodvhgc", "_TZE200_1n2zev06"]),
        model: "FK_V02",
        vendor: "FrankEver",
        description: "Zigbee smart water valve",
        fromZigbee: [legacy.fz.frankever_valve],
        toZigbee: [legacy.tz.tuya_switch_state, legacy.tz.frankever_threshold, legacy.tz.frankever_timer],
        exposes: [
            e.switch().setAccess("state", ea.STATE_SET),
            e
                .numeric("threshold", exposes.access.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withUnit("%")
                .withDescription("Valve open percentage (multiple of 10)"),
            e
                .numeric("timer", exposes.access.STATE_SET)
                .withValueMin(0)
                .withValueMax(600)
                .withUnit("min")
                .withDescription("Countdown timer in minutes"),
        ],
    },
    {
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE200_nbqnmkee"}],
        model: "FK-BV05",
        vendor: "FrankEver",
        description: "Zigbee smart water valve with flow meter and temperature sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            // --- Valve Controls ---
            e.switch().setAccess("state", ea.STATE_SET),
            e
                .numeric("threshold", ea.STATE_SET)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(10)
                .withDescription("Target valve opening percentage"),
            e.numeric("position", ea.STATE).withUnit("%").withDescription("Current valve position"),
            e.enum("power_off_state", ea.STATE_SET, ["off", "on", "maintain"]).withDescription("Power-off status behavior"),
            e.enum("weather_delay", ea.STATE_SET, ["cancel", "24h", "48h", "72h"]).withDescription("Weather delay"),
            e
                .numeric("countdown", ea.STATE_SET)
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(86400)
                .withDescription("Irrigation Duration (countdown in seconds)"),

            // --- Sensors ---
            e.numeric("water_temperature", ea.STATE).withUnit("°C").withDescription("Water temperature"),
            e.numeric("water_consumed_last", ea.STATE).withUnit("L").withDescription("Single water consumption (Last irrigation)"),
            e.numeric("water_consumed_total", ea.STATE).withUnit("L").withDescription("Daily water consumption total"),
            e.enum("water_leakage_state", ea.STATE, ["water_leakage_yes", "water_leakage_no"]).withDescription("Leak detection status"),

            // --- Irrigation Volume Limits ---
            e.binary("single_irrigation_switch", ea.STATE_SET, "ON", "OFF").withDescription("Enable single irrigation volume limit"),
            e
                .numeric("single_irrigation_set", ea.STATE_SET)
                .withUnit("L")
                .withValueMin(0)
                .withValueMax(1000)
                .withDescription("Single irrigation water volume setting"),
            e.binary("day_irrigation_switch", ea.STATE_SET, "ON", "OFF").withDescription("Enable daily irrigation volume limit"),
            e
                .numeric("day_irrigation_set", ea.STATE_SET)
                .withUnit("L")
                .withValueMin(0)
                .withValueMax(1000)
                .withDescription("Daily irrigation water volume setting"),

            // --- Alarms and Thresholds ---
            e.binary("water_volume_alarm_switch", ea.STATE_SET, "ON", "OFF").withDescription("Water volume alarm switch"),
            e
                .numeric("water_volume_alarm_set", ea.STATE_SET)
                .withUnit("L")
                .withValueMin(0)
                .withValueMax(1000)
                .withDescription("Alarm water volume setting value"),
            e.binary("water_temp_alarm_switch", ea.STATE_SET, "ON", "OFF").withDescription("Water temperature alarm switch"),
            e
                .numeric("water_temp_alarm_max", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(120)
                .withDescription("Alarm water temperature maximum setting"),
            e
                .numeric("water_temp_alarm_min", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(120)
                .withDescription("Alarm water temperature minimum setting"),

            // --- Maintenance ---
            e
                .binary("creep_switch", ea.STATE_SET, "ON", "OFF")
                .withDescription("Peristaltic function switch (Auto cycle anti-calc) - KEEP OFF for normal use"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.onOff],
                [2, "threshold", tuya.valueConverter.raw],
                [3, "position", tuya.valueConverter.raw],
                [5, "water_consumed_last", tuya.valueConverter.raw],
                [6, "water_consumed_total", tuya.valueConverter.raw],
                [10, "weather_delay", tuya.valueConverterBasic.lookup({cancel: 0, "24h": 1, "48h": 2, "72h": 3})],
                [11, "countdown", tuya.valueConverter.raw],
                [22, "water_temperature", tuya.valueConverter.raw],
                [101, "water_leakage_state", tuya.valueConverterBasic.lookup({water_leakage_yes: 0, water_leakage_no: 1})],
                [102, "single_irrigation_switch", tuya.valueConverter.onOff],
                [103, "single_irrigation_set", tuya.valueConverter.raw],
                [104, "day_irrigation_switch", tuya.valueConverter.onOff],
                [105, "day_irrigation_set", tuya.valueConverter.raw],
                [106, "water_volume_alarm_switch", tuya.valueConverter.onOff],
                [107, "water_volume_alarm_set", tuya.valueConverter.raw],
                [108, "water_temp_alarm_switch", tuya.valueConverter.onOff],
                [109, "water_temp_alarm_max", tuya.valueConverter.raw],
                [110, "power_off_state", tuya.valueConverterBasic.lookup({off: 0, on: 1, maintain: 2})],
                [112, "creep_switch", tuya.valueConverter.onOff],
                [113, "water_temp_alarm_min", tuya.valueConverter.raw],
            ],
        },
    },
];
