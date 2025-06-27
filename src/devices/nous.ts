import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0201", ["_TZ3000_lbtpiody"]),
        model: "E5",
        vendor: "Nous",
        description: "Temperature & humidity",
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.battery()],
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
        onEvent: tuya.onEventSetLocalTime,
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
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic"]);
        },
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
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_nnhwcvbk"]),
        model: "L14",
        vendor: "Nous",
        description: "ZigBee Smart Water Valve",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.switch(),
            e.enum("status", ea.STATE, ["Off", "Auto", "Disabled", "APP manual", "Key control"]).withDescription("Status"),
            e.numeric("countdown", ea.STATE_SET).withUnit("min").withValueMin(1).withValueMax(60).withDescription("Count down"),
            e.numeric("countdown_left", ea.STATE).withUnit("min").withValueMin(1).withValueMax(60).withDescription("Countdown left time"),
            e.numeric("water_total", ea.STATE).withUnit("gal").withValueMin(0).withValueStep(0.001).withDescription("Water total (gal)"),
            e
                .numeric("water_current", ea.STATE)
                .withUnit("gal/min")
                .withValueMin(0)
                .withValueStep(0.001)
                .withDescription("Current water flow (gal/min)"),
            e.binary("current_switch", ea.STATE_SET, "ON", "OFF").withDescription("Flow switch"),
            e.binary("reset_switch", ea.STATE_SET, "ON", "OFF").withDescription("Total flow reset switch"),
            e.binary("child_lock", ea.STATE_SET, "ON", "OFF").withDescription("Child lock"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    3,
                    "status",
                    tuya.valueConverterBasic.lookup({
                        Off: tuya.enum(0),
                        Auto: tuya.enum(1),
                        Disabled: tuya.enum(2),
                        "APP manual": tuya.enum(3),
                        "Key control": tuya.enum(4),
                    }),
                ],
                [1, "state", tuya.valueConverter.onOff],
                [109, "countdown", tuya.valueConverter.raw],
                [6, "countdown_left", tuya.valueConverter.raw],
                [9, "water_current", tuya.valueConverter.divideBy1000],
                [15, "water_total", tuya.valueConverter.divideBy1000],
                [103, "current_switch", tuya.valueConverter.onOff],
                [101, "reset_switch", tuya.valueConverter.onOff],
                [104, "child_lock", tuya.valueConverter.onOff],
                [11, "battery", tuya.valueConverter.raw],
            ],
        },
        extend: [],
    },
];
