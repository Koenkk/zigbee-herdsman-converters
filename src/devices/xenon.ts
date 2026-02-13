import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {Definition} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_hbjwgkdh"]),
        model: "X7726",
        vendor: "Xenon Smart",
        description: "Xenon Smart Zigbee curtain motor",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            exposes.enum("calibration", ea.STATE_SET, ["start", "finish"]),
            e.temperature(),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "state",
                    tuya.valueConverterBasic.lookup({
                        OPEN: tuya.enum(0),
                        STOP: tuya.enum(1),
                        CLOSE: tuya.enum(2),
                    }),
                ],
                // Koenkk suggestion: use standard coverPosition converter
                [2, "position", tuya.valueConverter.coverPosition],
                [3, "position", tuya.valueConverter.coverPosition],
                [
                    102,
                    "calibration",
                    tuya.valueConverterBasic.lookup({
                        start: tuya.enum(0),
                        finish: tuya.enum(1),
                    }),
                ],
                [103, "temperature", tuya.valueConverter.raw],
            ],
        },
    },
];

export default definitions;
