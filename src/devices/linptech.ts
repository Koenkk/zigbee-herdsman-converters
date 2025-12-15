import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const tzLocal = {
    TS0225: {
        key: ["motion_detection_distance", "motion_detection_sensitivity", "static_detection_sensitivity", "led_indicator"],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
                case "motion_detection_distance": {
                    utils.assertNumber(value, "motion_detection_distance");
                    await entity.write("manuSpecificTuya2", {57355: {value, type: 0x21}});
                    break;
                }
                case "motion_detection_sensitivity": {
                    utils.assertNumber(value, "motion_detection_sensitivity");
                    await entity.write("manuSpecificTuya2", {57348: {value, type: 0x20}});
                    break;
                }
                case "static_detection_sensitivity": {
                    utils.assertNumber(value, "static_detection_sensitivity");
                    await entity.write("manuSpecificTuya2", {57349: {value, type: 0x20}});
                    break;
                }
                case "led_indicator": {
                    await entity.write("manuSpecificTuya2", {57353: {value: value ? 0x01 : 0x00, type: 0x10}});
                    break;
                }
            }
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    TS0225_illuminance: {
        cluster: "msIlluminanceMeasurement",
        type: "raw",
        convert: (model, msg, publish, options, meta) => {
            const buffer = msg.data;
            const measuredValue = Number(buffer[7]) * 256 + Number(buffer[6]);
            return {illuminance: measuredValue === 0 ? 0 : Math.round(10 ** ((measuredValue - 1) / 10000))};
        },
    } satisfies Fz.Converter<"msIlluminanceMeasurement", undefined, "raw">,
    TS0225: {
        cluster: "manuSpecificTuya2",
        type: ["attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data["57354"] !== undefined) {
                result.target_distance = msg.data["57354"];
            }
            if (msg.data["57355"] !== undefined) {
                result.motion_detection_distance = msg.data["57355"];
            }
            if (msg.data["57348"] !== undefined) {
                result.motion_detection_sensitivity = msg.data["57348"];
            }
            if (msg.data["57349"] !== undefined) {
                result.static_detection_sensitivity = msg.data["57349"];
            }
            if (msg.data["57345"] !== undefined) {
                result.presence_keep_time = msg.data["57345"];
            }
            if (msg.data["57353"] !== undefined) {
                result.led_indicator = msg.data["57353"] === 1;
            }
            return result;
        },
    } satisfies Fz.Converter<"manuSpecificTuya2", undefined, ["attributeReport"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0225", ["_TZ3218_awarhusb", "_TZ3218_t9ynfz4x"]),
        model: "ES1ZZ(TY)",
        vendor: "Linptech",
        description: "mmWave Presence sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1, fzLocal.TS0225, fzLocal.TS0225_illuminance],
        toZigbee: [tzLocal.TS0225],
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.occupancy().withDescription("Presence state"),
            e.illuminance().withUnit("lx"),
            e.numeric("target_distance", ea.STATE).withDescription("Distance to target").withUnit("cm"),
            e
                .numeric("motion_detection_distance", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(600)
                .withValueStep(75)
                .withDescription("Motion detection distance")
                .withUnit("cm"),
            e.numeric("presence_keep_time", ea.STATE).withDescription("Presence keep time").withUnit("min"),
            e
                .numeric("motion_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(5)
                .withValueStep(1)
                .withDescription("Motion detection sensitivity"),
            e
                .numeric("static_detection_sensitivity", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(5)
                .withValueStep(1)
                .withDescription("Static detection sensitivity"),
            e
                .numeric("fading_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10000)
                .withValueStep(1)
                .withUnit("s")
                .withDescription("Time after which the device will check again for presence"),
            e.binary("led_indicator", ea.STATE_SET, true, false).withDescription("LED Presence Indicator"),
        ],
        meta: {
            tuyaDatapoints: [[101, "fading_time", tuya.valueConverter.raw]],
        },
    },
];
