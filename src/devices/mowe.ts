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
];
