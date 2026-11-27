import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_hva0ao7p"]),
        model: "SY-6872860",
        vendor: "Sygonix",
        description: "Tubular motor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        options: [exposes.options.invert_cover()],
        exposes: [
            tuya.exposes.coverPosition(),
            e.battery(),
            tuya.exposes.motorDirection(),
            e.enum("cover_limit", ea.SET, ["up", "down"]).withDescription("Set current position as the limit position").withCategory("config"),
            tuya.exposes.favoritePosition(),
            e.numeric("travel_time", ea.STATE).withUnit("ms").withDescription("Calibrated travel time").withCategory("diagnostic"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.coverAction],
                // DP2 = set, DP3 = report
                [2, "position", {to: tuya.valueConverter.coverPosition.to}],
                [3, "position", tuya.valueConverter.coverPosition],
                [5, "motor_direction", tuya.valueConverter.tubularMotorDirection],
                [10, "travel_time", tuya.valueConverter.raw],
                [13, "battery", tuya.valueConverter.raw],
                [16, "cover_limit", tuya.valueConverterBasic.lookup({up: tuya.enum(0), down: tuya.enum(1)})],
                [19, "favorite_position", tuya.valueConverter.raw],
            ],
        },
    },
];
