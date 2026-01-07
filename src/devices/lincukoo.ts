import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Expose} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        // Since a lot of Tuya devices use the same modelID, but use different datapoints
        // it's necessary to provide a fingerprint instead of a zigbeeModel
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE284_ajhu0zqb"}],
        model: "SZW08",
        vendor: "Lincukoo",
        description: "Smart water leakage/lack alarm sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.enum("alarm_status", ea.STATE, ["normal", "alarm"]).withDescription("device alarm status"),
            e.enum("mode", ea.STATE_SET, ["leakage", "shortage"]).withDescription("work mode of the alarm"),
            e.enum("alarm_ringtone", ea.STATE_SET, ["mute", "ring1", "ring2", "ring3"]).withDescription("Ringtone of the alarm"),
            e.battery(),
        ],
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [4, "battery", tuya.valueConverter.raw],
                [102, "alarm_status", tuya.valueConverterBasic.lookup({normal: 0, alarm: 1})],
                [
                    103,
                    "alarm_ringtone",
                    tuya.valueConverterBasic.lookup({mute: tuya.enum(0), ring1: tuya.enum(1), ring2: tuya.enum(2), ring3: tuya.enum(3)}),
                ],
                [101, "mode", tuya.valueConverterBasic.lookup({leakage: tuya.enum(0), shortage: tuya.enum(1)})],
            ],
        },
    },
    {
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE204_lw5ny7tp"}],
        model: "SZLR08",
        vendor: "Lincukoo",
        description: "24GHz millimeter wave radar",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e
                .numeric("detection_distance", ea.STATE)
                .withValueMin(0)
                .withValueMax(1000)
                .withValueStep(1)
                .withDescription("Distance of detected person")
                .withUnit("cm"),
            e.illuminance(),
            e
                .numeric("installation_height", ea.STATE_SET)
                .withValueMin(1.5)
                .withValueMax(6)
                .withValueStep(0.75)
                .withUnit("m")
                .withDescription("Maximum range"),
            e
                .numeric("radar_sensitivity", ea.STATE_SET)
                .withValueMin(68)
                .withValueMax(90)
                .withValueStep(1)
                .withDescription("Sensitivity of the radar"),
            e.numeric("fading_time", ea.STATE_SET).withValueMin(3).withValueMax(1799).withValueStep(1).withDescription("Fading time").withUnit("s"),
            e.binary("relay_switch", ea.STATE_SET, "ON", "OFF").withDescription("Relay switch"),
            e.binary("radar_switch", ea.STATE_SET, "ON", "OFF").withDescription("Radar switch"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator"),
            e.enum("relay_mode", ea.STATE_SET, ["auto", "manual"]).withDescription("control mode of the relay"),
            e.enum("radar_mode", ea.STATE_SET, ["people_on", "people_off"]).withDescription("radar mode for the relay controlling"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [20, "illuminance", tuya.valueConverter.raw],
                [13, "installation_height", tuya.valueConverter.divideBy100],
                [16, "radar_sensitivity", tuya.valueConverter.raw],
                [19, "detection_distance", tuya.valueConverter.raw],
                [103, "fading_time", tuya.valueConverter.raw],
                [101, "indicator", tuya.valueConverter.onOff],
                [104, "relay_switch", tuya.valueConverter.onOff],
                [102, "radar_switch", tuya.valueConverter.onOff], // toggle to enable presence notifications in app is ignored
                [106, "relay_mode", tuya.valueConverterBasic.lookup({auto: tuya.enum(0), manual: tuya.enum(1)})],
                [107, "radar_mode", tuya.valueConverterBasic.lookup({people_on: tuya.enum(0), people_off: tuya.enum(1)})],
            ],
        },
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_9ovska9w", "_TZE284_bquwrqh1"]),
        model: "SZLM04U",
        vendor: "Lincukoo",
        description: "Motion and brightness sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.occupancy(),
            e.illuminance(),
            e.battery(),
            e.binary("usb_power", ea.STATE, "ON", "OFF").withDescription("check usb power plug in or not"),
            e.binary("switch", ea.STATE, "ON", "OFF").withDescription("enable or disable the sensor"),
            e.numeric("fading_time", ea.STATE_SET).withValueMin(5).withValueMax(300).withValueStep(1).withDescription("Fading time").withUnit("s"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "occupancy", tuya.valueConverter.trueFalse0],
                [101, "illuminance", tuya.valueConverter.raw],
                [4, "battery", tuya.valueConverter.raw],
                [102, "usb_power", tuya.valueConverter.onOff],
                [103, "switch", tuya.valueConverter.onOff],
                [104, "fading_time", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_sndkanfr", "_TZE204_bjf8qum1"]),
        model: "SZLMR10",
        vendor: "Lincukoo",
        description: "Human Motion & Presence Sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.illuminance(),
            e
                .numeric("detection_distance", ea.STATE_SET)
                .withValueMin(3)
                .withValueMax(6)
                .withValueStep(1.5)
                .withUnit("m")
                .withDescription("Maximum range"),
            e.numeric("radar_sensitivity", ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1).withDescription("Sensitivity of the radar"),
            e.numeric("fading_time", ea.STATE_SET).withValueMin(30).withValueMax(300).withValueStep(1).withDescription("Fading time").withUnit("s"),
            e.binary("radar_switch", ea.STATE_SET, "ON", "OFF").withDescription("Radar switch"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator"),
            e.enum("work_mode", ea.STATE_SET, ["pir_mode", "radar_mode", "combine_mode"]).withDescription("work mode of device"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse0],
                [20, "illuminance", tuya.valueConverter.raw],
                [13, "detection_distance", tuya.valueConverter.divideBy100],
                [16, "radar_sensitivity", tuya.valueConverter.raw],
                [103, "fading_time", tuya.valueConverter.raw],
                [101, "indicator", tuya.valueConverter.onOff],
                [102, "radar_switch", tuya.valueConverter.onOff],
                [104, "work_mode", tuya.valueConverterBasic.lookup({pir_mode: tuya.enum(0), radar_mode: tuya.enum(1), combine_mode: tuya.enum(2)})],
            ],
        },
    },

    {
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE284_gw05grph"}],
        model: "CZF02",
        vendor: "Lincukoo",
        description: "Finger Robot",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch(),
            e.enum("mode", ea.STATE_SET, ["click", "long_press"]).withDescription("work mode of the finger robot"),
            e
                .numeric("click_sustain_time", ea.STATE_SET)
                .withValueMin(0.3)
                .withValueMax(10)
                .withValueStep(0.1)
                .withDescription("keep times for click")
                .withUnit("s"),
            e
                .numeric("arm_down_percent", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(30)
                .withValueStep(1)
                .withDescription("the position for arm moving down"),
            e
                .numeric("arm_up_percent", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(30)
                .withValueStep(1)
                .withDescription("the position for arm moving up"),
            e.binary("auto_adjustment", ea.STATE_SET, "ON", "OFF").withDescription("auto adjustment the arm position"),
            e.binary("set_switch_state", ea.STATE_SET, "ON", "OFF").withDescription("set the switch display status"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.onOff],
                [2, "mode", tuya.valueConverterBasic.lookup({click: tuya.enum(0), long_press: tuya.enum(1)})],
                [3, "click_sustain_time", tuya.valueConverter.divideBy10],
                [5, "arm_down_percent", tuya.valueConverter.raw],
                [6, "arm_up_percent", tuya.valueConverter.raw],
                [101, "auto_adjustment", tuya.valueConverter.onOff],
                [102, "set_switch_state", tuya.valueConverter.onOff],
                [8, "battery", tuya.valueConverter.raw],
            ],
        },
    },

    {
        fingerprint: [{modelID: "SZT06", manufacturerName: "LINCUKOO"}],
        model: "SZT06",
        vendor: "Lincukoo",
        description: "Smart mini temperature and humidity sensor",
        extend: [m.temperature(), m.humidity(), m.identify({isSleepy: true}), m.battery({voltage: true})],
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_rs62zxk8", "_TZE284_4dosadbh", "_TZE284_mpzuabwk"]),
        model: "SZT04",
        vendor: "Lincukoo",
        description: "Temperature and humidity sensor with clock",
        extend: [tuya.modernExtend.tuyaBase({dp: true, forceTimeUpdates: true, timeStart: "1970"})],
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            e.enum("temperature_unit_convert", ea.STATE_SET, ["celsius", "fahrenheit"]).withDescription("Current display unit"),
            e.enum("temperature_alarm", ea.STATE, ["canceled", "lower_alarm", "upper_alarm"]).withDescription("Temperature alarm status"),
            e.numeric("max_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(60).withDescription("Alarm temperature max"),
            e.numeric("min_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(60).withDescription("Alarm temperature min"),
            e
                .numeric("temperature_sensitivity", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0.3)
                .withValueMax(5)
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

        meta: {
            tuyaDatapoints: [
                [1, "temperature", tuya.valueConverter.divideBy10],
                [2, "humidity", tuya.valueConverter.raw],
                [4, "battery", tuya.valueConverter.raw],
                [9, "temperature_unit_convert", tuya.valueConverterBasic.lookup({celsius: tuya.enum(0), fahrenheit: tuya.enum(1)})],
                [
                    14,
                    "temperature_alarm",
                    tuya.valueConverterBasic.lookup({canceled: tuya.enum(0), lower_alarm: tuya.enum(1), upper_alarm: tuya.enum(2)}),
                ],
                [10, "max_temperature", tuya.valueConverter.divideBy10],
                [11, "min_temperature", tuya.valueConverter.divideBy10],
                [19, "temperature_sensitivity", tuya.valueConverter.divideBy10],
                [
                    15,
                    "humidity_alarm",
                    tuya.valueConverterBasic.lookup({canceled: tuya.enum(0), lower_alarm: tuya.enum(1), upper_alarm: tuya.enum(2)}),
                ],
                [12, "max_humidity", tuya.valueConverter.raw],
                [13, "min_humidity", tuya.valueConverter.raw],
                [20, "humidity_sensitivity", tuya.valueConverter.raw],
            ],
        },
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_khoqss0a"]),
        model: "SZR07",
        vendor: "Lincukoo",
        description: "24GHz millimeter wave radar",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.illuminance(),
            e
                .numeric("detection_distance", ea.STATE_SET)
                .withValueMin(3)
                .withValueMax(6)
                .withValueStep(1.5)
                .withUnit("m")
                .withDescription("Maximum range"),
            e.numeric("radar_sensitivity", ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1).withDescription("Sensitivity of the radar"),
            e.numeric("fading_time", ea.STATE_SET).withValueMin(5).withValueMax(300).withValueStep(1).withDescription("Fading time").withUnit("s"),
            e.binary("radar_switch", ea.STATE_SET, "ON", "OFF").withDescription("Radar switch"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse1],
                [20, "illuminance", tuya.valueConverter.raw],
                [13, "detection_distance", tuya.valueConverter.divideBy100],
                [16, "radar_sensitivity", tuya.valueConverter.raw],
                [103, "fading_time", tuya.valueConverter.raw],
                [102, "radar_switch", tuya.valueConverter.onOff], // toggle to enable presence notifications in app is ignored
                [101, "indicator", tuya.valueConverter.onOff],
            ],
        },
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_b8vxct9l"]),
        model: "SZLR08T",
        vendor: "Lincukoo",
        description: "24GHz millimeter wave radar",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.illuminance(),
            e
                .numeric("installation_height", ea.STATE_SET)
                .withValueMin(3)
                .withValueMax(5)
                .withValueStep(1)
                .withUnit("m")
                .withDescription("Maximum range"),
            e.numeric("radar_sensitivity", ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1).withDescription("Sensitivity of the radar"),
            e.numeric("fading_time", ea.STATE_SET).withValueMin(5).withValueMax(300).withValueStep(1).withDescription("Fading time").withUnit("s"),
            e.binary("radar_switch", ea.STATE_SET, "ON", "OFF").withDescription("Radar switch"),
            e.binary("indicator", ea.STATE_SET, "ON", "OFF").withDescription("LED indicator"),
            e.binary("relay_switch", ea.STATE_SET, "ON", "OFF").withDescription("Relay switch"),
            e.enum("relay_mode", ea.STATE_SET, ["auto", "manual"]).withDescription("control mode of the relay"),
            e.enum("radar_mode", ea.STATE_SET, ["people_on", "people_off"]).withDescription("radar mode for the relay controlling"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse0],
                [20, "illuminance", tuya.valueConverter.raw],
                [13, "installation_height", tuya.valueConverter.divideBy100],
                [16, "radar_sensitivity", tuya.valueConverter.raw],
                [103, "fading_time", tuya.valueConverter.raw],
                [102, "radar_switch", tuya.valueConverter.onOff], // toggle to enable presence notifications in app is ignored
                [101, "indicator", tuya.valueConverter.onOff],
                [104, "relay_switch", tuya.valueConverter.onOff],
                [106, "relay_mode", tuya.valueConverterBasic.lookup({auto: tuya.enum(0), manual: tuya.enum(1)})],
                [107, "radar_mode", tuya.valueConverterBasic.lookup({people_on: tuya.enum(0), people_off: tuya.enum(1)})],
            ],
        },
    },
    {
        zigbeeModel: ["CZB01"],
        model: "CZB01",
        vendor: "Lincukoo",
        description: "Wireless switch with 1 button",
        extend: [m.battery(), m.commandsOnOff()],
    },

    {
        zigbeeModel: ["G91E-ZH", "G94E"],
        model: "G91E-ZH",
        vendor: "Lincukoo",
        description: "Zigbee Router",
        extend: [],
        whiteLabel: [{fingerprint: [{modelID: "G94E"}], vendor: "Lincukoo", model: "G94E"}],
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_vbgmewta", "_TZE284_iunyuzwe"]),
        model: "W04-Z10T",
        vendor: "Lincukoo",
        description: "Smart water leakage alarm sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: (device) => {
            const exps: Expose[] = [
                e.enum("alarm_status", ea.STATE, ["normal", "alarm"]).withDescription("device alarm status"),
                e.enum("alarm_switch", ea.STATE_SET, ["mute", "alarm"]).withDescription("switch of the alarm"),
            ];

            if (["_TZE284_iunyuzwe"].includes(device.manufacturerName)) {
                exps.push(e.enum("battery_state", ea.STATE, ["low", "middle", "high"]).withDescription("battery state of the sensor"));
            } else {
                exps.push(e.enum("alarm_ringtone", ea.STATE_SET, ["ring1", "ring2", "ring3"]).withDescription("Ringtone of the alarm"));
                exps.push(e.battery());
            }
            return exps;
        },
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [1, "alarm_status", tuya.valueConverterBasic.lookup({alarm: 0, normal: 1})],
                [3, "battery_state", tuya.valueConverterBasic.lookup({low: tuya.enum(0), middle: tuya.enum(1), high: tuya.enum(2)})],
                [4, "battery", tuya.valueConverter.raw],
                [101, "alarm_switch", tuya.valueConverterBasic.lookup({mute: tuya.enum(0), alarm: tuya.enum(1)})],
                [102, "alarm_ringtone", tuya.valueConverterBasic.lookup({ring1: tuya.enum(0), ring2: tuya.enum(1), ring3: tuya.enum(2)})],
            ],
        },
        whiteLabel: [tuya.whitelabel("Lincukoo", "W10-Z10T", "Smart water leakage alarm sensor", ["_TZE284_iunyuzwe"])],
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_aghfucwi", "_TZE284_2qx7sivb", "_TZE284_8sejxcue"]),
        model: "V04-Z10T",
        vendor: "Lincukoo",
        description: "Smart vibration alarm sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: (device) => {
            const exps: Expose[] = [
                e.enum("alarm_status", ea.STATE, ["normal", "alarm"]).withDescription("device alarm status"),
                e.enum("sensitivity", ea.STATE_SET, ["low", "middle", "high"]).withDescription("Sensitivity of the sensor"),
            ];
            if (["_TZE284_2qx7sivb"].includes(device.manufacturerName))
                exps.push(e.enum("battery_state", ea.STATE, ["low", "middle", "high"]).withDescription("battery state of the sensor"));
            else if (["_TZE284_aghfucwi"].includes(device.manufacturerName)) {
                exps.push(e.enum("disarm", ea.STATE_SET, ["normal"]).withDescription("Disarm the current alarm"));
                exps.push(e.binary("silence_mode", ea.STATE_SET, "ON", "OFF").withDescription("enable/disable alarm"));
                exps.push(e.battery());
            } else {
                exps.push(e.enum("disarm", ea.STATE_SET, ["normal"]).withDescription("Disarm the current alarm"));
                exps.push(e.binary("silence_mode", ea.STATE_SET, "ON", "OFF").withDescription("enable/disable alarm"));
                exps.push(e.enum("battery_state", ea.STATE, ["low", "middle", "high"]).withDescription("battery state of the sensor"));
            }
            return exps;
        },

        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [1, "alarm_status", tuya.valueConverterBasic.lookup({normal: 0, alarm: 1})],
                [3, "battery_state", tuya.valueConverterBasic.lookup({low: tuya.enum(0), middle: tuya.enum(1), high: tuya.enum(2)})],
                [4, "battery", tuya.valueConverter.raw],
                [101, "sensitivity", tuya.valueConverterBasic.lookup({low: tuya.enum(0), middle: tuya.enum(1), high: tuya.enum(2)})],
                [102, "disarm", tuya.valueConverterBasic.lookup({normal: tuya.enum(0)})],
                [103, "silence_mode", tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [
            tuya.whitelabel("Lincukoo", "V06-Z10T", "Mini vibration sensor", ["_TZE284_2qx7sivb"]),
            tuya.whitelabel("Lincukoo", "V04-Z20T", "Vibration alarm sensor", ["_TZE284_8sejxcue"]),
        ],
    },

    {
        zigbeeModel: ["Zigbee-Repeater"],
        model: "Zigbee-Repeater",
        vendor: "Lincukoo",
        description: "Zigbee Repeater",
        extend: [],
        meta: {},
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_hqys6frs"]),
        model: "R12LM-Z10T",
        vendor: "Lincukoo",
        description: "Human Motion & Presence Sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e.illuminance(),
            e.enum("work_mode", ea.STATE_SET, ["radar_mode", "combine_mode"]).withDescription("work mode of device"),
            e.binary("radar_switch", ea.STATE_SET, "ON", "OFF").withDescription("Radar switch"),
            e.numeric("fading_time", ea.STATE_SET).withValueMin(5).withValueMax(60).withValueStep(5).withDescription("Fading time").withUnit("s"),
            e
                .numeric("detection_distance", ea.STATE_SET)
                .withValueMin(3)
                .withValueMax(9)
                .withValueStep(1.5)
                .withUnit("m")
                .withDescription("Maximum range"),
            e.numeric("radar_sensitivity", ea.STATE_SET).withValueMin(0).withValueMax(4).withValueStep(1).withDescription("Sensitivity of the radar"),
            e.enum("battery_state", ea.STATE, ["low", "middle", "high", "usb"]).withDescription("battery state of the sensor"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalse0],
                [101, "illuminance", tuya.valueConverter.raw],
                [102, "work_mode", tuya.valueConverterBasic.lookup({radar_mode: tuya.enum(0), combine_mode: tuya.enum(1)})],
                [103, "radar_switch", tuya.valueConverter.onOff],
                [104, "fading_time", tuya.valueConverter.raw],
                [106, "detection_distance", tuya.valueConverter.divideBy100],
                [107, "radar_sensitivity", tuya.valueConverter.raw],
                [
                    108,
                    "battery_state",
                    tuya.valueConverterBasic.lookup({low: tuya.enum(0), middle: tuya.enum(1), high: tuya.enum(2), usb: tuya.enum(3)}),
                ],
            ],
        },
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_hyt4iucb"]),
        model: "E02C-Z10T",
        vendor: "Lincukoo",
        description: "Smart Air Quality Monitor(CO2)",
        extend: [tuya.modernExtend.tuyaBase({dp: true, forceTimeUpdates: true, timeStart: "1970"})],
        exposes: [
            e.temperature(),
            e.humidity(),
            e.numeric("co2_value", ea.STATE).withUnit("ppm").withValueMin(400).withValueMax(10000).withDescription("Current CO2 Value"),
            e.battery(),
            e.enum("temperature_unit_convert", ea.STATE_SET, ["celsius", "fahrenheit"]).withDescription("Current display unit"),
            e.binary("alarm_switch", ea.STATE_SET, "ON", "OFF").withDescription("alarm switch"),
            e.enum("charge_status", ea.STATE, ["none", "charging"]).withDescription("usb charging status"),
            e.enum("reset_co2", ea.STATE_SET, ["reset_co2"]).withDescription("reset the CO2"),
            e
                .enum("screen_sleep", ea.STATE_SET, [
                    "after_30s",
                    "after_1minute",
                    "after_2minutes",
                    "after_5minutes",
                    "after_10minutes",
                    "never_sleep",
                ])
                .withDescription("Humidity alarm status"),
            e
                .numeric("co2_alarm_value", ea.STATE_SET)
                .withUnit("ppm")
                .withValueMin(1000)
                .withValueMax(10000)
                .withValueStep(100)
                .withDescription("CO2 alarm value"),
            e.binary("co2_alarm", ea.STATE, "ON", "OFF").withDescription("CO2 alarm"),
        ],
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [2, "temperature", tuya.valueConverter.divideBy10],
                [3, "humidity", tuya.valueConverter.raw],
                [4, "co2_value", tuya.valueConverter.raw],
                [22, "battery", tuya.valueConverter.raw],
                [102, "temperature_unit_convert", tuya.valueConverterBasic.lookup({celsius: tuya.enum(0), fahrenheit: tuya.enum(1)})],
                [101, "alarm_switch", tuya.valueConverter.onOff],
                [103, "charge_status", tuya.valueConverterBasic.lookup({none: 0, charging: 1})],
                [104, "reset_co2", tuya.valueConverterBasic.lookup({reset_co2: tuya.enum(0)})],
                [
                    105,
                    "screen_sleep",
                    tuya.valueConverterBasic.lookup({
                        after_30s: tuya.enum(0),
                        after_1minute: tuya.enum(1),
                        after_2minutes: tuya.enum(2),
                        after_5minutes: tuya.enum(3),
                        after_10minutes: tuya.enum(4),
                        never_sleep: tuya.enum(5),
                    }),
                ],
                [106, "co2_alarm_value", tuya.valueConverter.raw],
                [107, "co2_alarm", tuya.valueConverter.onOff],
            ],
        },
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_isvlaage"]),
        model: "EZC04",
        vendor: "Lincukoo",
        description: "Smart Air Quality Monitor(CO2)",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.numeric("co2", ea.STATE).withUnit("ppm").withValueMin(400).withValueMax(10000).withDescription("Current CO2 Value"),
            e.temperature(),
            e.humidity(),
            e.enum("temperature_unit_convert", ea.STATE_SET, ["celsius", "fahrenheit"]).withDescription("Current display unit"),
            e
                .numeric("co2_alarm_value", ea.STATE_SET)
                .withUnit("ppm")
                .withValueMin(1000)
                .withValueMax(10000)
                .withValueStep(100)
                .withDescription("CO2 alarm value"),
            e.enum("alarm_ringtone", ea.STATE_SET, ["ringtone_0", "ringtone_1", "ringtone_2", "ringtone_3"]).withDescription("alarm_ringtone"),
            e.enum("co2_state", ea.STATE, ["alarm", "normal"]).withDescription("CO2 alarm status"),
            e.enum("reset_co2", ea.STATE_SET, ["reset_co2"]).withDescription("reset the CO2"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "co2_state", tuya.valueConverterBasic.lookup({alarm: 0, normal: 1})],
                [2, "co2", tuya.valueConverter.raw],
                [
                    6,
                    "alarm_ringtone",
                    tuya.valueConverterBasic.lookup({
                        ringtone_0: tuya.enum(0),
                        ringtone_1: tuya.enum(1),
                        ringtone_2: tuya.enum(2),
                        ringtone_3: tuya.enum(3),
                    }),
                ],
                [18, "temperature", tuya.valueConverter.divideBy10],
                [19, "humidity", tuya.valueConverter.raw],
                [26, "co2_alarm_value", tuya.valueConverter.raw],
                [31, "temperature_unit_convert", tuya.valueConverterBasic.lookup({celsius: tuya.enum(0), fahrenheit: tuya.enum(1)})],
                [101, "reset_co2", tuya.valueConverterBasic.lookup({reset_co2: tuya.enum(0)})],
            ],
        },
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_fpwtjlfh"]),
        model: "EZCP04",
        vendor: "Lincukoo",
        description: "Smart Air Quality Monitor(CO2+PM2.5)",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.numeric("co2", ea.STATE).withUnit("ppm").withValueMin(400).withValueMax(10000).withDescription("Current CO2 Value"),
            e.numeric("pm25", ea.STATE).withUnit("ug/m3").withValueMin(0).withValueMax(1000).withDescription("Current PM2.5 Value"),
            e.temperature(),
            e.humidity(),
            e.enum("temperature_unit_convert", ea.STATE_SET, ["celsius", "fahrenheit"]).withDescription("Current display unit"),
            e
                .numeric("co2_alarm_value", ea.STATE_SET)
                .withUnit("ppm")
                .withValueMin(1000)
                .withValueMax(10000)
                .withValueStep(100)
                .withDescription("CO2 alarm value"),
            e
                .numeric("pm25_alarm_value", ea.STATE_SET)
                .withUnit("ug/m3")
                .withValueMin(10)
                .withValueMax(1000)
                .withValueStep(10)
                .withDescription("PM2.5 alarm value"),
            e.enum("alarm_ringtone", ea.STATE_SET, ["mute", "ringtone_1", "ringtone_2", "ringtone_3"]).withDescription("alarm_ringtone"),
            e.enum("alarm_state", ea.STATE, ["normal", "alarm_co2", "alarm_pm25"]).withDescription("alarm status"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "alarm_state", tuya.valueConverterBasic.lookup({normal: 0, alarm_co2: 1, alarm_pm25: 2})],
                [2, "co2", tuya.valueConverter.raw],
                [
                    6,
                    "alarm_ringtone",
                    tuya.valueConverterBasic.lookup({
                        mute: tuya.enum(0),
                        ringtone_1: tuya.enum(1),
                        ringtone_2: tuya.enum(2),
                        ringtone_3: tuya.enum(3),
                    }),
                ],
                [18, "temperature", tuya.valueConverter.divideBy10],
                [19, "humidity", tuya.valueConverter.raw],
                [26, "co2_alarm_value", tuya.valueConverter.raw],
                [31, "temperature_unit_convert", tuya.valueConverterBasic.lookup({celsius: tuya.enum(0), fahrenheit: tuya.enum(1)})],
                [20, "pm25", tuya.valueConverter.raw],
                [101, "pm25_alarm_value", tuya.valueConverter.raw],
            ],
        },
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_ra9zfiwr"]),
        model: "E04CF-Z10T",
        vendor: "Lincukoo",
        description: "Smart Gas and CO sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.numeric("gas", ea.STATE).withUnit("%LEL").withValueMin(0).withValueMax(20).withDescription("Current Gas Value"),
            e.numeric("co", ea.STATE).withUnit("ppm").withValueMin(0).withValueMax(1000).withDescription("Current CO Value"),
            e
                .numeric("set_max_gas_alarm", ea.STATE_SET)
                .withUnit("%LEL")
                .withValueMin(0.1)
                .withValueMax(20)
                .withValueStep(0.1)
                .withDescription("Gas alarm value"),
            e
                .numeric("set_max_co_alarm", ea.STATE_SET)
                .withUnit("ppm")
                .withValueMin(10)
                .withValueMax(1000)
                .withValueStep(10)
                .withDescription("CO alarm value"),
            e.enum("gas_sensor_state", ea.STATE, ["normal", "alarm"]).withDescription("Gas alarm status"),
            e.enum("co_state", ea.STATE, ["normal", "alarm"]).withDescription("CO alarm status"),
            e.binary("self_checking", ea.STATE_SET, "ON", "OFF").withDescription("self checking"),
            e.enum("checking_result", ea.STATE, ["checking", "check_success", "check_failure", "others"]).withDescription("checking result"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "gas_sensor_state", tuya.valueConverterBasic.lookup({normal: 0, alarm: 1})],
                [2, "gas", tuya.valueConverter.divideBy1000],
                [8, "self_checking", tuya.valueConverter.onOff],
                [
                    9,
                    "checking_result",
                    tuya.valueConverterBasic.lookup({
                        checking: tuya.enum(0),
                        check_success: tuya.enum(1),
                        check_failure: tuya.enum(2),
                        others: tuya.enum(3),
                    }),
                ],
                [18, "co_state", tuya.valueConverterBasic.lookup({normal: 0, alarm: 1})],
                [19, "co", tuya.valueConverter.raw],
                [101, "set_max_gas_alarm", tuya.valueConverter.divideBy1000],
                [102, "set_max_co_alarm", tuya.valueConverter.raw],
            ],
        },
    },

    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_l4daccga"]),
        model: "A08-Z10T",
        vendor: "Lincukoo",
        description: "Smart Sound and flash siren",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.enum("alarm_state", ea.STATE_SET, ["alarm_sound", "alarm_light", "alarm_sound_light", "normal"]).withDescription("alarm status"),
            e.enum("alarm_volume", ea.STATE_SET, ["low", "middle", "high", "mute"]).withDescription("alarm volume"),
            e.numeric("alarm_time", ea.STATE_SET).withUnit("times").withValueMin(0).withValueMax(100).withValueStep(1).withDescription("alarm times"),
            e.binary("mute", ea.STATE_SET, "ON", "OFF").withDescription("mute"),
            e
                .enum("alarm_ringtone", ea.STATE_SET, [
                    "ringtone_1",
                    "ringtone_2",
                    "ringtone_3",
                    "ringtone_4",
                    "ringtone_5",
                    "ringtone_6",
                    "ringtone_7",
                    "ringtone_8",
                    "ringtone_9",
                    "ringtone_10",
                    "ringtone_11",
                    "ringtone_12",
                    "ringtone_13",
                    "ringtone_14",
                    "ringtone_15",
                    "ringtone_16",
                    "ringtone_17",
                    "ringtone_18",
                    "ringtone_19",
                    "ringtone_20",
                    "ringtone_21",
                    "ringtone_22",
                    "ringtone_23",
                    "ringtone_24",
                    "ringtone_25",
                    "ringtone_26",
                    "ringtone_27",
                ])
                .withDescription("alarm ringtone"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "alarm_state", tuya.valueConverterBasic.lookup({alarm_sound: 0, alarm_light: 1, alarm_sound_light: 2, normal: 3})],
                [
                    5,
                    "alarm_volume",
                    tuya.valueConverterBasic.lookup({low: tuya.enum(0), middle: tuya.enum(1), high: tuya.enum(2), mute: tuya.enum(3)}),
                ],
                [7, "alarm_time", tuya.valueConverter.raw],
                [16, "mute", tuya.valueConverter.onOff],
                [
                    21,
                    "alarm_ringtone",
                    tuya.valueConverterBasic.lookup({
                        ringtone_1: tuya.enum(0),
                        ringtone_2: tuya.enum(1),
                        ringtone_3: tuya.enum(2),
                        ringtone_4: tuya.enum(3),
                        ringtone_5: tuya.enum(4),
                        ringtone_6: tuya.enum(5),
                        ringtone_7: tuya.enum(6),
                        ringtone_8: tuya.enum(7),
                        ringtone_9: tuya.enum(8),
                        ringtone_10: tuya.enum(9),
                        ringtone_11: tuya.enum(10),
                        ringtone_12: tuya.enum(11),
                        ringtone_13: tuya.enum(12),
                        ringtone_14: tuya.enum(13),
                        ringtone_15: tuya.enum(14),
                        ringtone_16: tuya.enum(15),
                        ringtone_17: tuya.enum(16),
                        ringtone_18: tuya.enum(17),
                        ringtone_19: tuya.enum(18),
                        ringtone_20: tuya.enum(19),
                        ringtone_21: tuya.enum(20),
                        ringtone_22: tuya.enum(21),
                        ringtone_23: tuya.enum(22),
                        ringtone_24: tuya.enum(23),
                        ringtone_25: tuya.enum(24),
                        ringtone_26: tuya.enum(25),
                        ringtone_27: tuya.enum(26),
                    }),
                ],
            ],
        },
    },
];
