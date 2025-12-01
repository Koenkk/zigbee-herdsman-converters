import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_ytx9fudw"]),
        model: "Senoro.Win",
        vendor: "Senoro",
        description: "Senoro window alarm",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            // Here you should put all functionality that your device exposes
            e.enum("opening_state", ea.STATE, ["open", "closed", "tilted"]),
            e.binary("alarm", ea.STATE_SET, true, false),
            e.battery(),
        ],
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [101, "opening_state", tuya.valueConverterBasic.lookup({open: 0, closed: 1, tilted: 2})],
                [16, "alarm", tuya.valueConverter.raw],
                [2, "battery", tuya.valueConverter.raw],
            ],
        },
    },
];
