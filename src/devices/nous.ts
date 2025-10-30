import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_sonkaxrd"]),
        model: "E12",
        vendor: "NOUS",
        description: "Zigbee carbon monoxide (CO) sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.carbon_monoxide(),
            e.numeric("carbon_monoxide_value", ea.STATE).withUnit("ppm").withDescription("Current CO concentration"),
            e.binary("self_checking", ea.ALL, true, false).withDescription("Triggers self-checking process"),
            e.enum("checking_result", ea.STATE, ["ok", "error"]).withDescription("Result of self-checking"),
            e.binary("preheat", ea.ALL, "ON", "OFF").withDescription("Sensor preheating status"),
            e.binary("fault", ea.ALL, true, false).withDescription("Sensor fault indicator"),
            e.numeric("lifecycle", ea.STATE).withUnit("days").withDescription("Sensor service life or usage counter"),
            e.battery().withDescription("Battery level in %"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "carbon_monoxide", tuya.valueConverter.trueFalse1],
                [2, "carbon_monoxide_value", tuya.valueConverter.raw],
                [8, "self_checking", tuya.valueConverter.trueFalse0],
                [9, "checking_result", tuya.valueConverterBasic.lookup({0: "ok", 1: "error"})],
                [10, "preheat", tuya.valueConverterBasic.lookup({0: "OFF", 1: "ON"})],
                [11, "fault", tuya.valueConverter.trueFalse1],
                [12, "lifecycle", tuya.valueConverter.raw],
                [14, "battery", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_1di7ujzp"]),
        model: "E13",
        vendor: "NOUS",
        description: "Zigbee water leak sensor with sound alarm",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.water_leak(),
            e.battery(),
            e.enum("working_mode", ea.ALL, ["normal", "silent", "test"]).withDescription("Operational mode of the device"),
            e.text("status", ea.STATE).withDescription("Device status"),
            e.enum("alarm_ringtone", ea.ALL, ["tone_1", "tone_2", "tone_3"]).withDescription("Alarm ringtone"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "water_leak", tuya.valueConverter.trueFalse0],
                [4, "battery", tuya.valueConverter.raw],
                [101, "working_mode", tuya.valueConverterBasic.lookup({0: "normal", 1: "silent", 2: "test"})],
                [102, "status", tuya.valueConverter.raw],
                [103, "alarm_ringtone", tuya.valueConverterBasic.lookup({0: "tone_1", 1: "tone_2", 2: "tone_3"})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0201", ["_TZ3000_lbtpiody"]),
        model: "E5",
        vendor: "Nous",
        description: "Temperature & humidity",
        fromZigbee: [fz.temperature, fz.humidity],
        exposes: [e.temperature(), e.humidity()],
        extend: [m.battery()],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE200_lve3dvpy",
            "_TZE200_c7emyjom",
            "_TZE200_locansqn",
            "_TZE200_qrztc3ev",
            "_TZE200_snloy4rw",
            "_TZE200_eanjj2pa",
            "_TZE200_ydrdfkim",
            "_TZE284_locansqn",
        ]),
        model: "SZ-T04",
        vendor: "Nous",
        whiteLabel: [tuya.whitelabel("Tuya", "TH01Z", "Temperature and humidity sensor with clock", ["_TZE200_locansqn"])],
        description: "Temperature and humidity sensor with clock",
        fromZigbee: [legacy.fz.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.nous_lcd_temperature_humidity_sensor],
        extend: [tuya.modernExtend.tuyaBase({forceTimeUpdates: true, timeStart: "1970"})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic"]);
        },
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            e
                .numeric("temperature_report_interval", ea.STATE_SET)
                .withUnit("min")
                .withValueMin(5)
                .withValueMax(120)
                .withValueStep(5)
                .withDescription("Temperature Report interval"),
            e
                .numeric("humidity_report_interval", ea.STATE_SET)
                .withUnit("min")
                .withValueMin(5)
                .withValueMax(120)
                .withValueStep(5)
                .withDescription("Humidity Report interval"),
            e.enum("temperature_unit_convert", ea.STATE_SET, ["celsius", "fahrenheit"]).withDescription("Current display unit"),
            e.enum("temperature_alarm", ea.STATE, ["canceled", "lower_alarm", "upper_alarm"]).withDescription("Temperature alarm status"),
            e.numeric("max_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(60).withDescription("Alarm temperature max"),
            e.numeric("min_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(60).withDescription("Alarm temperature min"),
            e
                .numeric("temperature_sensitivity", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0.1)
                .withValueMax(50)
                .withValueStep(0.1)
                .withDescription("Temperature sensitivity"),
            e.enum("humidity_alarm", ea.STATE, ["canceled", "lower_alarm", "upper_alarm"]).withDescription("Humidity alarm status"),
            e.numeric("max_humidity", ea.STATE_SET).withUnit("%").withValueMin(0).withValueMax(100).withDescription("Alarm humidity max"),
            e.numeric("min_humidity", ea.STATE_SET).withUnit("%").withValueMin(0).withValueMax(100).withDescription("Alarm humidity min"),
            e
                .numeric("humidity_sensitivity", ea.STATE_SET)
                .withUnit("%")
                .withValueMin(1)
                .withValueMax(100)
                .withValueStep(1)
                .withDescription("Humidity sensitivity"),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_wtikaxzs", "_TZE200_nnrfa68v", "_TZE200_zppcgbdj", "_TZE200_wtikaxzs"]),
        model: "E6",
        vendor: "Nous",
        description: "Temperature & humidity LCD sensor",
        fromZigbee: [legacy.fz.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.nous_lcd_temperature_humidity_sensor],
        extend: [tuya.modernExtend.tuyaBase({forceTimeUpdates: true, bindBasicOnConfigure: true, timeStart: "1970"})],
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            e.battery_low(),
            e.enum("temperature_unit_convert", ea.STATE_SET, ["celsius", "fahrenheit"]).withDescription("Current display unit"),
            e.enum("temperature_alarm", ea.STATE, ["canceled", "lower_alarm", "upper_alarm"]).withDescription("Temperature alarm status"),
            e.numeric("max_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(60).withDescription("Alarm temperature max"),
            e.numeric("min_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(60).withDescription("Alarm temperature min"),
            e.enum("humidity_alarm", ea.STATE, ["canceled", "lower_alarm", "upper_alarm"]).withDescription("Humidity alarm status"),
            e.numeric("max_humidity", ea.STATE_SET).withUnit("%").withValueMin(1).withValueMax(100).withDescription("Alarm humidity max"),
            e.numeric("min_humidity", ea.STATE_SET).withUnit("%").withValueMin(1).withValueMax(100).withDescription("Alarm humidity min"),
            e
                .numeric("temperature_sensitivity", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0.1)
                .withValueMax(50)
                .withValueStep(0.1)
                .withDescription("Temperature sensitivity"),
            e
                .numeric("temperature_report_interval", ea.STATE_SET)
                .withUnit("min")
                .withValueMin(1)
                .withValueMax(120)
                .withValueStep(1)
                .withDescription("Temperature Report interval"),
            e
                .numeric("humidity_sensitivity", ea.STATE_SET)
                .withUnit("%")
                .withValueMin(1)
                .withValueMax(100)
                .withValueStep(1)
                .withDescription("Humidity sensitivity"),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_qvxrkeif"]),
        model: "E9",
        vendor: "Nous",
        description: "Zigbee gas sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.binary("gas", ea.STATE, "ON", "OFF").withDescription("Gas detection state (ON = Gas detected)"),
            e.binary("preheat", ea.STATE, "ON", "OFF").withDescription("Sensor is preheating"),
            e.binary("fault_alarm", ea.STATE, "ON", "OFF").withDescription("Sensor fault detected"),
            e.numeric("lifecycle", ea.STATE).withUnit("%").withDescription("Sensor life remaining"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "gas", tuya.valueConverter.trueFalse0],
                [10, "preheat", tuya.valueConverter.trueFalse0],
                [11, "fault_alarm", tuya.valueConverter.trueFalse1],
                [12, "lifecycle", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_t9ffmdin"]),
        model: "D5Z",
        vendor: "NOUS",
        description: "Zigbee smart energy meter with leakage and prepayment",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.energy(),
            e.produced_energy(),
            e.current(),
            e.temperature(),
            e.numeric("leakage_current", ea.STATE).withUnit("mA").withDescription("Leakage current"),
            e.switch().withDescription("Relay switch control"),
            e.binary("reclosing_enable", ea.ALL, true, false).withDescription("Reclosing enable"),
            e.numeric("timer", ea.ALL).withDescription("Timer (schedule control in seconds)").withValueMin(0).withValueMax(86400),
            e.text("cycle_schedule", ea.ALL).withDescription("Cycle schedule configuration (JSON string)"),
            e.binary("clear_energy", ea.SET, true, false).withDescription("Clear accumulated forward and reverse energy"),
            e.binary("switch_prepayment", ea.STATE_SET, true, false).withDescription("Switch prepayment mode ON/OFF"),
            e.numeric("balance_energy", ea.STATE).withUnit("kWh").withDescription("Remaining energy balance for prepayment"),
            e.numeric("charge_energy", ea.STATE).withUnit("kWh").withDescription("Last charged energy amount"),
            e.binary("fault", ea.STATE, true, false).withDescription("General fault detected"),
            e.text("status", ea.STATE).withDescription("Detailed status information (e.g., fault codes)"),
            e.numeric("reclose_recover_seconds", ea.STATE).withUnit("s").withDescription("Time for auto reclosing recovery"),
            e.numeric("power_on_delay", ea.STATE).withUnit("s").withDescription("Power-on delay time"),
            e.numeric("overcurrent_threshold_time", ea.STATE).withUnit("s").withDescription("Overcurrent event threshold time"),
            e.numeric("lost_flow_threshold_time", ea.STATE).withUnit("s").withDescription("Lost flow event threshold time"),
            e.binary("relay_status_on_power_on", ea.STATE, true, false).withDescription("Relay status after power on (true=ON)"),
            e.text("alarm_set_1", ea.ALL).withDescription("Alarm set 1 configuration"),
            e.text("alarm_set_2", ea.ALL).withDescription("Alarm set 2 configuration"),
            e.text("alarm_set_3", ea.ALL).withDescription("Alarm set 3 configuration"),
        ],

        meta: {
            tuyaDatapoints: [
                [1, "energy", tuya.valueConverter.divideBy100],
                [6, "current", tuya.valueConverter.divideBy1000],
                [15, "leakage_current", tuya.valueConverter.divideBy10],
                [110, "produced_energy", tuya.valueConverter.divideBy100],
                [16, "state", tuya.valueConverter.onOff],
                [9, "fault", tuya.valueConverter.trueFalse1],
                [103, "temperature", tuya.valueConverter.raw],
                [104, "reclosing_enable", tuya.valueConverter.trueFalse1],
                [105, "timer", tuya.valueConverter.raw],
                [106, "cycle_schedule", tuya.valueConverter.raw],
                [107, "reclose_recover_seconds", tuya.valueConverter.raw],
                [127, "status", tuya.valueConverter.raw],
                [134, "relay_status_on_power_on", tuya.valueConverter.raw],
                [11, "switch_prepayment", tuya.valueConverter.trueFalse1],
                [12, "clear_energy", tuya.valueConverter.raw],
                [13, "balance_energy", tuya.valueConverter.divideBy100],
                [14, "charge_energy", tuya.valueConverter.divideBy100],
                [17, "alarm_set_1", tuya.valueConverter.raw],
                [18, "alarm_set_2", tuya.valueConverter.raw],
                [119, "power_on_delay", tuya.valueConverter.raw],
                [124, "overcurrent_threshold_time", tuya.valueConverter.raw],
                [125, "lost_flow_threshold_time", tuya.valueConverter.raw],
                [126, "alarm_set_3", tuya.valueConverter.raw],
            ],
        },
    },
];
