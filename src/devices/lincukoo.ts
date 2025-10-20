import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

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
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE204_sndkanfr"}],
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
            e.numeric("fading_time", ea.STATE_SET).withValueMin(30).withValueMax(60).withValueStep(1).withDescription("Fading time").withUnit("s"),
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
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_rs62zxk8", "_TZE284_4dosadbh"]),
        model: "SZT04",
        vendor: "Lincukoo",
        description: "Temperature and humidity sensor with clock",
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "2000"})],
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
];
