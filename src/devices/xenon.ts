import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;
const te = tuya.exposes;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_hbjwgkdh"]),
        model: "X7726",
        vendor: "Xenon Smart",
        description: "Smart Zigbee curtain motor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [te.coverPosition(), exposes.enum("calibration", ea.STATE_SET, ["start", "finish"]), e.temperature()],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.coverAction],
                [2, "position", tuya.valueConverter.coverPosition],
                [3, "position", tuya.valueConverter.coverPosition],
                [102, "calibration", tuya.valueConverterBasic.lookup({start: tuya.enum(0), finish: tuya.enum(1)})],
                [103, "temperature", tuya.valueConverter.raw],
            ],
        },
    },
];

export default definitions;
