import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;
const te = tuya.exposes;

const NAS_PS10B2_PRESENCE_TIME_MIN = 3; // seconds, per device spec
const NAS_PS10B2_PRESENCE_TIME_MAX = 600; // seconds, per device spec

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_d0yu2xgi"]),
        zigbeeModel: ["0yu2xgi"],
        model: "NAS-AB02B0",
        vendor: "NEO",
        description: "Temperature & humidity sensor and alarm",
        fromZigbee: [legacy.fz.neo_t_h_alarm, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.neo_t_h_alarm],
        exposes: [
            e.temperature(),
            e.humidity(),
            e.binary("humidity_alarm", ea.STATE_SET, true, false),
            e.battery_low(),
            e.binary("temperature_alarm", ea.STATE_SET, true, false),
            e.binary("alarm", ea.STATE_SET, true, false),
            e.enum(
                "melody",
                ea.STATE_SET,
                Array.from(Array(18).keys()).map((x) => (x + 1).toString()),
            ),
            e.numeric("duration", ea.STATE_SET).withUnit("s").withValueMin(0).withValueMax(1800),
            e.numeric("temperature_min", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(80),
            e.numeric("temperature_max", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(80),
            e.numeric("humidity_min", ea.STATE_SET).withUnit("%").withValueMin(1).withValueMax(100),
            e.numeric("humidity_max", ea.STATE_SET).withUnit("%").withValueMin(1).withValueMax(100),
            e.enum("volume", ea.STATE_SET, ["low", "medium", "high"]),
            e.enum("power_type", ea.STATE, ["battery_full", "battery_high", "battery_medium", "battery_low", "usb"]),
        ],
        extend: [tuya.modernExtend.tuyaBase({forceTimeUpdates: true, queryOnConfigure: true, mcuVersionRequestOnConfigure: true})],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_t1blo2bj", "_TZE204_t1blo2bj", "_TZE204_q76rtoa9"]),
        zigbeeModel: ["1blo2bj", "lrfgpny", "q76rtoa9"],
        model: "NAS-AB02B2",
        vendor: "NEO",
        description: "Alarm",
        fromZigbee: [legacy.fz.neo_alarm],
        toZigbee: [legacy.tz.neo_alarm],
        exposes: [
            e.battery_low(),
            e.binary("alarm", ea.STATE_SET, true, false),
            e.enum(
                "melody",
                ea.STATE_SET,
                Array.from(Array(18).keys()).map((x) => (x + 1).toString()),
            ),
            e.numeric("duration", ea.STATE_SET).withUnit("s").withValueMin(0).withValueMax(1800),
            e.enum("volume", ea.STATE_SET, ["low", "medium", "high"]),
            e.numeric("battpercentage", ea.STATE).withUnit("%"),
        ],
        extend: [tuya.modernExtend.tuyaBase({forceTimeUpdates: true, queryOnConfigure: true, mcuVersionRequestOnConfigure: true})],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_7hfcudw5"]),
        model: "NAS-PD07",
        vendor: "NEO",
        description: "Motion, temperature & humidity sensor",
        fromZigbee: [legacy.fz.neo_nas_pd07, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.neo_nas_pd07],
        extend: [tuya.modernExtend.tuyaBase({mcuVersionRequestOnConfigure: true})],
        exposes: [
            e.occupancy(),
            e.humidity(),
            e.temperature(),
            e.tamper(),
            e.battery_low(),
            e.enum("power_type", ea.STATE, ["battery_full", "battery_high", "battery_medium", "battery_low", "usb"]),
            e
                .enum("alarm", ea.STATE, ["over_temperature", "over_humidity", "below_min_temperature", "below_min_humdity", "off"])
                .withDescription("Temperature/humidity alarm status"),
            e.numeric("temperature_min", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(80),
            e.numeric("temperature_max", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(80),
            e.binary("temperature_scale", ea.STATE_SET, "°C", "°F").withDescription("Temperature scale (°F/°C)"),
            e.numeric("humidity_min", ea.STATE_SET).withUnit("%").withValueMin(1).withValueMax(100),
            e.numeric("humidity_max", ea.STATE_SET).withUnit("%").withValueMin(1).withValueMax(100),
            // e.binary('unknown_111', ea.STATE_SET, 'ON', 'OFF').withDescription('Unknown datapoint 111 (default: ON)'),
            // e.binary('unknown_112', ea.STATE_SET, 'ON', 'OFF').withDescription('Unknown datapoint 112 (default: ON)')
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_nlrfgpny", "_TZE284_nlrfgpny", "_TZE204_nlrfgpny"]),
        model: "NAS-AB06B2",
        vendor: "NEO",
        description: "Outdoor solar alarm",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.enum("alarm_state", ea.STATE, ["alarm_sound", "alarm_light", "alarm_sound_light", "normal"]).withDescription("Alarm status"),
            e.binary("alarm_switch", ea.STATE_SET, "ON", "OFF").withDescription("Enable alarm"),
            e.binary("tamper_alarm_switch", ea.STATE_SET, "ON", "OFF").withDescription("Enable tamper alarm"),
            e.binary("tamper_alarm", ea.STATE, "ON", "OFF").withDescription("Indicates whether the device is tampered"),
            e.enum("alarm_melody", ea.STATE_SET, ["melody_1", "melody_2", "melody_3"]).withDescription("Alarm sound effect"),
            e.enum("alarm_mode", ea.STATE_SET, ["alarm_sound", "alarm_light", "alarm_sound_light"]).withDescription("Alarm mode"),
            e
                .numeric("alarm_time", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(60)
                .withValueStep(1)
                .withUnit("min")
                .withDescription("Alarm duration in minutes"),
            e.binary("charging", ea.STATE, true, false).withDescription("Charging status"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "alarm_state",
                    tuya.valueConverterBasic.lookup({
                        alarm_sound: tuya.enum(0),
                        alarm_light: tuya.enum(1),
                        alarm_sound_light: tuya.enum(2),
                        no_alarm: tuya.enum(3),
                    }),
                ],
                [13, "alarm_switch", tuya.valueConverter.onOff],
                [101, "tamper_alarm_switch", tuya.valueConverter.onOff],
                [20, "tamper_alarm", tuya.valueConverter.onOff],
                [21, "alarm_melody", tuya.valueConverterBasic.lookup({melody_1: tuya.enum(0), melody_2: tuya.enum(1), melody_3: tuya.enum(2)})],
                [
                    102,
                    "alarm_mode",
                    tuya.valueConverterBasic.lookup({alarm_sound: tuya.enum(0), alarm_light: tuya.enum(1), alarm_sound_light: tuya.enum(2)}),
                ],
                [7, "alarm_time", tuya.valueConverter.raw],
                [6, "charging", tuya.valueConverter.raw],
                [15, "battery", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE204_rzrrjkz2",
            "_TZE284_rzrrjkz2",
            "_TZE204_uab532m0",
            "_TZE284_uab532m0",
            "_TZE204_nnhwcvbk",
            "_TZE284_nnhwcvbk",
            "_TZE204_z7a2jmyy",
            "_TZE284_z7a2jmyy",
        ]),
        model: "NAS-WV03B",
        vendor: "NEO",
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "2000"})],
        description: "Smart sprinkler timer with measurements",
        whiteLabel: [
            tuya.whitelabel("Nous", "L14", "Smart water valve", ["_TZE204_nnhwcvbk", "_TZE284_nnhwcvbk"]),
            tuya.whitelabel("NEO", "NAS-WV05B2", "Smart sprinkler timer", ["_TZE284_rzrrjkz2", "_TZE284_uab532m0"]),
            tuya.whitelabel("NEO", "NAS-WV05B2-L", "Smart sprinkler timer", ["_TZE284_z7a2jmyy"]),
        ],
        exposes: (device, options) => [
            te.switch(),
            te.status_sprinkler(),
            te.refresh(),
            te.countdown_min(),
            te.on_with_countdown(),
            te.countdown_left(),
            te.single_watering_duration(),
            te.flow_switch(),
            ...(!device || ["_TZE204_z7a2jmyy", "_TZE284_z7a2jmyy"].includes(device.manufacturerName)
                ? [
                      te.quantitative_watering(), // liters
                      te.single_watering_amount(),
                      te.surplus_flow(),
                      te.water_current(),
                      te.water_total(),
                  ]
                : [
                      te.quantitative_watering().withUnit("gal"),
                      te.single_watering_amount().withUnit("gal"),
                      te.surplus_flow().withUnit("gal"),
                      te.water_current().withUnit("gal/min"),
                      te.water_total().withUnit("gal"),
                  ]),
            te.water_total_reset(),
            // e.text("normal_timer", ea.STATE_SET).withDescription("Schedule the sprinkler: time and weekdays"),
            // e.enum("weather_delay", ea.STATE_SET, ["24h", "48h", "72h", "cancel"]).withDescription("Unknown"),
            // e.binary("weather_switch", ea.STATE_SET, "ON", "OFF").withDescription("Unknown"),
            // e.binary("smart_irrigation", ea.STATE_SET, "ON", "OFF").withDescription("Unknown"),
            // e.binary("quantitative_water_linkage", ea.STATE_SET, "ON", "OFF").withDescription("Unknown"),
            te.fault(),
            e.child_lock(),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.onOff],
                [
                    3,
                    "status",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        on_auto: tuya.enum(1),
                        button_locked: tuya.enum(2),
                        on_manual_app: tuya.enum(3),
                        on_manual_button: tuya.enum(4),
                    }),
                ],
                [5, "countdown", tuya.valueConverter.raw], // (time)
                [6, "countdown_left", tuya.valueConverter.raw],
                [9, "water_current", tuya.valueConverter.divideBy1000],
                [11, "battery", tuya.valueConverter.raw], // (battery_percentage)
                [15, "water_total", tuya.valueConverter.divideBy1000],
                [19, "fault", tuya.valueConverter.fault],
                [
                    37,
                    "weather_delay",
                    tuya.valueConverterBasic.lookup({
                        "24h": tuya.enum(0),
                        "48h": tuya.enum(1),
                        "72h": tuya.enum(2),
                        cancel: tuya.enum(3),
                    }),
                ],
                [38, "normal_timer", tuya.valueConverter.raw], // string needs reverse-engineering
                [42, "weather_switch", tuya.valueConverter.onOff], // (switch)
                [47, "smart_irrigation", tuya.valueConverter.onOff], // (switch_enabled)
                [101, "water_total_reset", tuya.valueConverterBasic.lookup({reset: true, idle: false})], // (total_flow_reset_switch)
                [102, "quantitative_watering", tuya.valueConverter.raw],
                [103, "flow_switch", tuya.valueConverter.onOff], // (current_switch)
                [104, "child_lock", tuya.valueConverter.lockUnlock],
                [105, "surplus_flow", tuya.valueConverter.raw],
                [106, "single_watering_duration", tuya.valueConverter.raw], // (single_watering_time)
                [107, "refresh", tuya.valueConverter.refresh], // (ui_refresh)
                [108, "single_watering_amount", tuya.valueConverter.raw],
                [109, "on_with_countdown", tuya.valueConverter.raw], // (valve_opening_time)
                [110, "quantitative_water_linkage", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_a9ojznj8", "_TZE284_a9ojznj8"]),
        model: "NAS-WV03B2",
        vendor: "NEO",
        description: "Smart sprinkler timer",
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "2000"})],
        exposes: [
            te.switch(),
            te.status_sprinkler(),
            te.refresh(),
            te.countdown_min(),
            te.on_with_countdown(),
            te.countdown_left(),
            te.single_watering_duration(),
            // e.text("normal_timer", ea.STATE_SET).withDescription("Schedule the sprinkler: time and weekdays"),
            // e.enum("weather_delay", ea.STATE_SET, ["24h", "48h", "72h", "cancel"]).withDescription("Unknown"),
            // e.binary("weather_switch", ea.STATE_SET, "ON", "OFF").withDescription("Unknown"),
            // e.binary("smart_irrigation", ea.STATE_SET, "ON", "OFF").withDescription("Unknown"),
            // e.binary("quantitative_water_linkage", ea.STATE_SET, "ON", "OFF").withDescription("Unknown"),
            te.fault(),
            e.child_lock(),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.onOff],
                [
                    3,
                    "status",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        on_auto: tuya.enum(1),
                        button_locked: tuya.enum(2),
                        on_manual_app: tuya.enum(3),
                        on_manual_button: tuya.enum(4),
                    }),
                ],
                [5, "countdown", tuya.valueConverter.raw], // (time)
                [6, "countdown_left", tuya.valueConverter.raw],
                [11, "battery", tuya.valueConverter.raw], // (battery_percentage)
                [19, "fault", tuya.valueConverter.fault],
                [
                    37,
                    "weather_delay",
                    tuya.valueConverterBasic.lookup({
                        "24h": tuya.enum(0),
                        "48h": tuya.enum(1),
                        "72h": tuya.enum(2),
                        cancel: tuya.enum(3),
                    }),
                ],
                [38, "normal_timer", tuya.valueConverter.raw], // string needs reverse-engineering
                [42, "weather_switch", tuya.valueConverter.onOff], // (switch)
                [47, "smart_irrigation", tuya.valueConverter.onOff], // (switch_enabled)
                [101, "on_with_countdown", tuya.valueConverter.raw], // (valve_opening_time)
                [104, "child_lock", tuya.valueConverter.lockUnlock],
                [106, "single_watering_duration", tuya.valueConverter.raw], // (single_watering_time)
                [107, "refresh", tuya.valueConverter.refresh], // (ui_refresh)
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_rqcuwlsa"]),
        model: "NAS-STH02B2",
        vendor: "NEO",
        description: "Soil moisture, temperature, and ec",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.numeric("ec", ea.STATE).withUnit("µS/cm").withValueMin(0).withValueMax(20000).withDescription("Soil electrical conductivity"),
            e.enum("fertility", ea.STATE, ["normal", "lower", "low", "middle", "high", "higher"]).withDescription("Soil fertility"),
            e.numeric("humidity", ea.STATE).withUnit("%").withValueMin(0).withValueMax(100).withDescription("Soil humidity"),
            e.numeric("temperature", ea.STATE).withUnit("°C").withValueMin(-10).withValueMax(60).withDescription("Soil temperature"),
            e.numeric("temperature_f", ea.STATE).withUnit("°F").withValueMin(14).withValueMax(140).withDescription("Soil temperature"),
            e
                .numeric("temperature_sensitivity", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0.3)
                .withValueMax(1)
                .withValueStep(0.1)
                .withDescription("Upper temperature limit"),
            e.numeric("humidity_sensitivity", ea.STATE_SET).withUnit("%").withValueMin(1).withValueMax(5).withDescription("Upper temperature limit"),
            e.enum("temperature_alarm", ea.STATE, ["lower_alarm", "upper_alarm", "cancel"]).withDescription("Temperature alarm state"),
            e.enum("humidity_alarm", ea.STATE, ["lower_alarm", "upper_alarm", "cancel"]).withDescription("Humidity alarm state"),
            e
                .numeric("max_temperature_alarm", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(60)
                .withDescription("Upper temperature limit"),
            e
                .numeric("min_temperature_alarm", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(60)
                .withDescription("Lower temperature limit"),
            e.numeric("max_humidity_alarm", ea.STATE_SET).withUnit("%").withValueMin(0).withValueMax(100).withDescription("Upper humidity limit"),
            e.numeric("min_humidity_alarm", ea.STATE_SET).withUnit("%").withValueMin(0).withValueMax(100).withDescription("Lower humidity limit"),
            e.numeric("schedule_periodic", ea.STATE_SET).withUnit("min").withValueMin(5).withValueMax(60).withDescription("Report sensitivity"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    101,
                    "temperature_alarm",
                    tuya.valueConverterBasic.lookup({
                        lower_alarm: tuya.enum(0),
                        upper_alarm: tuya.enum(1),
                        cancel: tuya.enum(2),
                    }),
                ],
                [
                    102,
                    "humidity_alarm",
                    tuya.valueConverterBasic.lookup({
                        lower_alarm: tuya.enum(0),
                        upper_alarm: tuya.enum(1),
                        cancel: tuya.enum(2),
                    }),
                ],
                [
                    4,
                    "fertility",
                    tuya.valueConverterBasic.lookup({
                        normal: tuya.enum(0),
                        lower: tuya.enum(1),
                        low: tuya.enum(2),
                        middle: tuya.enum(3),
                        high: tuya.enum(4),
                        higher: tuya.enum(5),
                    }),
                ],
                [1, "ec", tuya.valueConverter.raw],
                [3, "humidity", tuya.valueConverter.raw],
                [5, "temperature", tuya.valueConverter.divideBy10],
                [110, "temperature_f", tuya.valueConverter.divideBy10],
                [107, "temperature_sensitivity", tuya.valueConverter.divideBy10],
                [108, "humidity_sensitivity", tuya.valueConverter.raw],
                [103, "max_temperature_alarm", tuya.valueConverter.divideBy10],
                [104, "min_temperature_alarm", tuya.valueConverter.divideBy10],
                [105, "max_humidity_alarm", tuya.valueConverter.raw],
                [106, "min_humidity_alarm", tuya.valueConverter.raw],
                [109, "schedule_periodic", tuya.valueConverter.raw],
                [15, "battery", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("SNZB-02", ["_TZ3000_utwgoauk"]),
        model: "NAS-TH07B2",
        vendor: "NEO",
        description: "Temperature & humidity sensor",
        extend: [m.temperature(), m.humidity(), m.battery()],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_1youk3hj", "_TZE284_1youk3hj"]),
        model: "NAS-PS10B2",
        vendor: "NEO",
        description: "Human presence sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true, queryOnDeviceAnnounce: true})],
        exposes: [
            e.presence(),
            e.enum("human_motion_state", ea.STATE, ["none", "small", "large"]).withDescription("Human Motion State"),
            e
                .numeric("dis_current", ea.STATE)
                .withUnit("cm")
                .withValueMin(0)
                .withValueMax(600)
                .withValueStep(1)
                .withLabel("Current distance")
                .withDescription("Current distance of detected motion"),
            e
                .numeric("presence_time", ea.STATE_SET)
                .withUnit("s")
                .withValueMin(NAS_PS10B2_PRESENCE_TIME_MIN)
                .withValueMax(NAS_PS10B2_PRESENCE_TIME_MAX)
                .withValueStep(1)
                .withDescription("Presence Time"),
            e
                .numeric("motion_far_detection", ea.STATE_SET)
                .withUnit("cm")
                .withValueMin(150)
                .withValueMax(600)
                .withValueStep(75)
                .withDescription("Motion Range Detection"),
            e
                .numeric("motion_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(7)
                .withValueStep(1)
                .withDescription("Motion Detection Sensitivity"),
            e
                .numeric("motionless_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(7)
                .withValueStep(1)
                .withDescription("Motionless Detection Sensitivity"),
            e.enum("work_mode", ea.STATE_SET, ["manual", "auto"]).withDescription("Work Mode"),
            e.binary("output_switch", ea.STATE_SET, "ON", "OFF").withDescription("Output Switch"),
            e.numeric("output_time", ea.STATE_SET).withUnit("s").withValueMin(10).withValueMax(1800).withDescription("Output Times"),
            e.binary("led_switch", ea.STATE_SET, "ON", "OFF").withDescription("Led Switch"),
            e.enum("lux_value", ea.STATE_SET, ["10_lux", "20_lux", "50_lux", "24h"]).withDescription("Lux Value"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [11, "human_motion_state", tuya.valueConverterBasic.lookup({none: 0, small: 1, large: 2})],
                [19, "dis_current", tuya.valueConverter.raw],
                [
                    12,
                    "presence_time",
                    {
                        // Device sends 0xFFFFFF08 as sentinel when presence_time has never been
                        // configured. Filter it out to prevent HA range errors.
                        // Device will re-report its stored value after reboot via queryOnDeviceAnnounce.
                        from: (v: number) => (v >= NAS_PS10B2_PRESENCE_TIME_MIN && v <= NAS_PS10B2_PRESENCE_TIME_MAX ? v : undefined),
                        to: (v: number) => v,
                    },
                ],
                [13, "motion_far_detection", tuya.valueConverter.raw],
                [15, "motion_sensitivity", tuya.valueConverter.raw],
                [16, "motionless_sensitivity", tuya.valueConverter.raw],
                [101, "work_mode", tuya.valueConverterBasic.lookup({manual: tuya.enum(0), auto: tuya.enum(1)})],
                [104, "output_switch", tuya.valueConverter.onOff],
                [103, "output_time", tuya.valueConverter.raw],
                [105, "led_switch", tuya.valueConverter.onOff],
                [
                    102,
                    "lux_value",
                    tuya.valueConverterBasic.lookup({"10_lux": tuya.enum(0), "20_lux": tuya.enum(1), "50_lux": tuya.enum(2), "24h": tuya.enum(3)}),
                ],
            ],
        },
    },
];
