import * as exposes from "../lib/exposes";
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
        description: "Water leakage sensor with 2 in 1",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime, // Add this if you are getting no converter for 'commandMcuSyncTime'
        configure: tuya.configureMagicPacket,
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
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
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
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE284_9ovska9w"}],
        model: "SZLM04U",
        vendor: "Lincukoo",
        description: "Motion and brightness sensor",
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        exposes: [
            e.occupancy(),
            e.illuminance(),
            e.battery(),
            e.binary("usb_power", ea.STATE, "ON", "OFF").withDescription("check usb power plug in or not"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "occupancy", tuya.valueConverter.trueFalse0],
                [101, "illuminance", tuya.valueConverter.raw],
                [4, "battery", tuya.valueConverter.raw],
                [102, "usb_power", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE204_sndkanfr"}],
        model: "SZLMR10",
        vendor: "Lincukoo",
        description: "Human Motion & Presence Sensor",
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
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
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
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
        fingerprint: [{modelID: "TS0601", manufacturerName: "LINCUKOO"}],
        model: "SZT06",
        vendor: "Lincukoo",
        description: "Smart mini temperature and humidity sensor",
        extend: [m.temperature(), m.humidity(), m.identify({isSleepy: true}), m.battery({voltage: true})],
    },
];
