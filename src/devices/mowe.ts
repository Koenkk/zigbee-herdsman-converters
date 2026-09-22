import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_ops9sidw"]),
        model: "MW833P",
        vendor: "Mowe",
        description: "Smart presence sensor (24 GHz mmWave radar)",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.presence(),
            e
                .enum("human_motion_state", ea.STATE, ["none", "peaceful", "motion"])
                .withDescription("Motion state reported by the radar: nobody, present but still, or moving"),
            e.illuminance(),
            e
                .numeric("body_motion", ea.STATE)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Body-motion amplitude, emitted every 5 seconds. 0 means nobody detected"),
            e
                .enum("move_direction", ea.STATE, ["none", "close_to", "far_away"])
                .withDescription("Direction of the detected movement relative to the sensor"),
            e
                .numeric("sensitivity", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(3)
                .withValueStep(1)
                .withDescription("Radar sensitivity, 1 (least sensitive) to 3 (most sensitive)"),
            e
                .enum("scene", ea.STATE_SET, ["default", "area", "toilet", "bedroom", "parlour", "office", "hotel"])
                .withDescription("Detection profile tuned for the size and use of the room"),
            e
                .enum("nobody_time", ea.STATE_SET, ["none", "10s", "30s", "1min", "2min", "5min", "10min", "30min", "1hour"])
                .withDescription("How long presence is held after the last detection before clearing"),
            e.binary("radar_self_check", ea.STATE_SET, true, false).withDescription("Start the radar self-check routine").withCategory("config"),
            e.binary("check_end_flag", ea.STATE, true, false).withDescription("Radar self-check has finished").withCategory("diagnostic"),
            e
                .binary("radar_reset_flag", ea.STATE, true, false)
                .withDescription("Radar reset marker, pushed by the device")
                .withCategory("diagnostic"),
            e
                .text("radar_detection_data", ea.STATE)
                .withDescription("Self-check output: '1111' confirms a false presence report, '0000' confirms it was genuine")
                .withCategory("diagnostic"),
            e.text("hardware_version", ea.STATE).withDescription("Radar hardware version").withCategory("diagnostic"),
            e.text("soft_version", ea.STATE).withDescription("Radar firmware version").withCategory("diagnostic"),
            e.text("radar_id", ea.STATE).withDescription("Radar module identifier").withCategory("diagnostic"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalseEnum1],
                [2, "sensitivity", tuya.valueConverter.raw],
                [101, "radar_reset_flag", tuya.valueConverter.raw],
                [102, "human_motion_state", tuya.valueConverterBasic.lookup({none: tuya.enum(0), peaceful: tuya.enum(1), motion: tuya.enum(2)})],
                [103, "illuminance", tuya.valueConverter.raw],
                [104, "radar_detection_data", tuya.valueConverter.raw],
                [107, "check_end_flag", tuya.valueConverter.raw],
                [108, "radar_self_check", tuya.valueConverter.raw],
                [109, "hardware_version", tuya.valueConverter.raw],
                [110, "soft_version", tuya.valueConverter.raw],
                [111, "radar_id", tuya.valueConverter.raw],
                [
                    112,
                    "scene",
                    tuya.valueConverterBasic.lookup({
                        default: tuya.enum(0),
                        area: tuya.enum(1),
                        toilet: tuya.enum(2),
                        bedroom: tuya.enum(3),
                        parlour: tuya.enum(4),
                        office: tuya.enum(5),
                        hotel: tuya.enum(6),
                    }),
                ],
                [114, "move_direction", tuya.valueConverterBasic.lookup({none: tuya.enum(0), close_to: tuya.enum(1), far_away: tuya.enum(2)})],
                [115, "body_motion", tuya.valueConverter.raw],
                [
                    131,
                    "nobody_time",
                    tuya.valueConverterBasic.lookup({
                        none: tuya.enum(0),
                        "10s": tuya.enum(1),
                        "30s": tuya.enum(2),
                        "1min": tuya.enum(3),
                        "2min": tuya.enum(4),
                        "5min": tuya.enum(5),
                        "10min": tuya.enum(6),
                        "30min": tuya.enum(7),
                        "1hour": tuya.enum(8),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_mexuq6lm"]),
        model: "MW836P",
        vendor: "Mowe",
        description: "Smart presence sensor with relay (24 GHz mmWave radar + infrared)",
        // The MCU answers a dataQuery with its live state, so re-query after a power cut instead of keeping a stale presence
        extend: [tuya.modernExtend.tuyaBase({dp: true, queryOnDeviceAnnounce: true, queryOnConfigure: true})],
        exposes: [
            e.presence(),
            e.illuminance(),
            e
                .numeric("motion_sensitivity", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(3)
                .withValueStep(1)
                .withDescription("Radar sensitivity to a moving person, 1 (least sensitive) to 3 (most sensitive)"),
            e
                .numeric("static_sensitivity", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(3)
                .withValueStep(1)
                .withDescription("Radar sensitivity to a still person, 1 (least sensitive) to 3 (most sensitive)"),
            e.enum("detection_range", ea.STATE_SET, ["2m", "3m"]).withDescription("Maximum detection distance"),
            e
                .enum("nobody_time", ea.STATE_SET, ["10s", "20s", "30s", "60s", "180s"])
                .withDescription("How long presence is held after the last detection before clearing"),
            e
                .binary("micro_motion_detection", ea.STATE_SET, "ON", "OFF")
                .withDescription("Detect very small movements so a still person keeps presence held")
                .withCategory("config"),
            e.binary("infrared", ea.STATE_SET, "ON", "OFF").withDescription("Infrared (PIR) trigger element").withCategory("config"),
            e
                .binary("induction_switch", ea.STATE_SET, "ON", "OFF")
                .withDescription("Switch presence triggering between the infrared (PIR) element and the radar")
                .withCategory("config"),
            e
                .binary("auto_monitoring", ea.STATE_SET, "ON", "OFF")
                .withDescription("Let the radar re-baseline its environment automatically while the room is empty")
                .withCategory("config"),
            e
                .binary("relay", ea.STATE_SET, "ON", "OFF")
                .withDescription("Enable the built-in relay output. Off stops the relay operating (no click); presence reporting is unaffected")
                .withCategory("config"),
            e
                .enum("relay_delay", ea.STATE_SET, ["0", "1", "5", "10", "20", "30"])
                .withDescription("Relay switch-off delay once the room reads vacant, as shown in the Tuya app. 0 = off together with presence")
                .withCategory("config"),
            e
                .binary("relay_off_trigger", ea.STATE, true, false)
                .withDescription("Pushed by the device when the relay has switched off after its delay, meant for automations")
                .withCategory("diagnostic"),
            e
                .binary("self_test", ea.STATE, true, false)
                .withDescription("Radar power-on self-test in progress (about 10 s after power-up)")
                .withCategory("diagnostic"),
            e.text("hardware_version", ea.STATE).withDescription("Radar hardware version").withCategory("diagnostic"),
            e.text("soft_version", ea.STATE).withDescription("Radar firmware version").withCategory("diagnostic"),
            e.text("radar_id", ea.STATE).withDescription("Radar module identifier").withCategory("diagnostic"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "presence", tuya.valueConverter.trueFalseEnum1],
                [101, "auto_monitoring", tuya.valueConverter.onOff],
                [103, "illuminance", tuya.valueConverter.raw],
                [104, "infrared", tuya.valueConverter.onOff],
                [105, "induction_switch", tuya.valueConverter.onOff],
                [107, "hardware_version", tuya.valueConverter.raw],
                [108, "soft_version", tuya.valueConverter.raw],
                [109, "radar_id", tuya.valueConverter.raw],
                [111, "relay", tuya.valueConverter.onOff],
                [
                    112,
                    "relay_delay",
                    tuya.valueConverterBasic.lookup({
                        "0": tuya.enum(0),
                        "1": tuya.enum(1),
                        "5": tuya.enum(2),
                        "10": tuya.enum(3),
                        "20": tuya.enum(4),
                        "30": tuya.enum(5),
                    }),
                ],
                [113, "relay_off_trigger", tuya.valueConverter.raw],
                [114, "micro_motion_detection", tuya.valueConverter.onOff],
                [115, "self_test", tuya.valueConverter.raw],
                [120, "detection_range", tuya.valueConverterBasic.lookup({"2m": tuya.enum(0), "3m": tuya.enum(1)})],
                [122, "motion_sensitivity", tuya.valueConverter.raw],
                [123, "static_sensitivity", tuya.valueConverter.raw],
                [
                    133,
                    "nobody_time",
                    tuya.valueConverterBasic.lookup({
                        "10s": tuya.enum(0),
                        "20s": tuya.enum(1),
                        "30s": tuya.enum(2),
                        "60s": tuya.enum(3),
                        "180s": tuya.enum(4),
                    }),
                ],
            ],
        },
    },
];
