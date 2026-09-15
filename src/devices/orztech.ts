import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

/* For the touch wall switches, it is generally this:
 * DPs:
 * 1 (up to 6) - main switch state by position on panel (0 or 1)
 * 13 - switch all (0 or 1)
 * 16 - backlight state (0 or 1)
 * 101 - child lock - no physical switch, only digital (0 or 1)
 * 102 - TT switch (momentary press setting) - (0 or 1)
 */

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_b0ihkhxh"]),
        model: "_TZE200_b0ihkhxh",
        vendor: "Orztech",
        description: "1 gang touch wall switch",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch().withEndpoint("t1").withDescription("Switch"),
            e.switch().withEndpoint("c1").withDescription("Switch all"),
            e.switch().withEndpoint("c2").withDescription("Backlight"),
            e.switch().withEndpoint("c3").withDescription("Child lock"),
        ],
        endpoint: (device) => ({t1: 1, c1: 1, c2: 1, c3: 1}),
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_t1", tuya.valueConverter.onOff],
                [13, "state_c1", tuya.valueConverter.onOff],
                [16, "state_c2", tuya.valueConverter.onOff],
                [101, "state_c3", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_htj3hcpl"]),
        model: "_TZE200_htj3hcpl",
        vendor: "Orztech",
        description: "2 gang touch wall switch",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch().withEndpoint("t1").withDescription("Left"),
            e.switch().withEndpoint("t2").withDescription("Right"),
            e.switch().withEndpoint("c1").withDescription("Switch all"),
            e.switch().withEndpoint("c2").withDescription("Backlight"),
            e.switch().withEndpoint("c3").withDescription("Child lock"),
            e.switch().withEndpoint("c4").withDescription("TT switch"),
        ],
        endpoint: (device) => ({t1: 1, t2: 1, c1: 1, c2: 1, c3: 1, c4: 1}),
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_t1", tuya.valueConverter.onOff],
                [2, "state_t2", tuya.valueConverter.onOff],
                [13, "state_c1", tuya.valueConverter.onOff],
                [16, "state_c2", tuya.valueConverter.onOff],
                [101, "state_c3", tuya.valueConverter.onOff],
                [102, "state_c4", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_pcg0rykt"]),
        model: "_TZE200_pcg0rykt",
        vendor: "Orztech",
        description: "3 gang touch wall switch",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch().withEndpoint("t1").withDescription("Left"),
            e.switch().withEndpoint("t2").withDescription("Middle"),
            e.switch().withEndpoint("t3").withDescription("Right"),
            e.switch().withEndpoint("c1").withDescription("Switch all"),
            e.switch().withEndpoint("c2").withDescription("Backlight"),
            e.switch().withEndpoint("c3").withDescription("Child lock"),
            e.switch().withEndpoint("c4").withDescription("TT switch"),
        ],
        endpoint: (device) => ({t1: 1, t2: 1, t3: 1, c1: 1, c2: 1, c3: 1, c4: 1}),
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_t1", tuya.valueConverter.onOff],
                [2, "state_t2", tuya.valueConverter.onOff],
                [3, "state_t3", tuya.valueConverter.onOff],
                [13, "state_c1", tuya.valueConverter.onOff],
                [16, "state_c2", tuya.valueConverter.onOff],
                [101, "state_c3", tuya.valueConverter.onOff],
                [102, "state_c4", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_7a5ob7xq", "_TZE284_7a5ob7xq"]),
        model: "_TZE200_7a5ob7xq",
        vendor: "Orztech",
        description: "4 gang touch wall switch",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch().withEndpoint("t1").withDescription("Top left"),
            e.switch().withEndpoint("t2").withDescription("Top right"),
            e.switch().withEndpoint("b1").withDescription("Bottom left"),
            e.switch().withEndpoint("b2").withDescription("Bottom right"),
            e.switch().withEndpoint("c1").withDescription("Switch all"),
            e.switch().withEndpoint("c2").withDescription("Backlight"),
            e.switch().withEndpoint("c3").withDescription("Child lock"),
            e.switch().withEndpoint("c4").withDescription("TT switch"),
        ],
        endpoint: (device) => ({t1: 1, t2: 1, b1: 1, b2: 1, c1: 1, c2: 1, c3: 1, c4: 1}),
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_t1", tuya.valueConverter.onOff],
                [2, "state_t2", tuya.valueConverter.onOff],
                [3, "state_b1", tuya.valueConverter.onOff],
                [4, "state_b2", tuya.valueConverter.onOff],
                [13, "state_c1", tuya.valueConverter.onOff],
                [16, "state_c2", tuya.valueConverter.onOff],
                [101, "state_c3", tuya.valueConverter.onOff],
                [102, "state_c4", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_xo3vpoah"]),
        model: "_TZE200_xo3vpoah",
        vendor: "Orztech",
        description: "6 gang touch wall switch",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch().withEndpoint("t1").withDescription("Top Left"),
            e.switch().withEndpoint("t2").withDescription("Top Middle"),
            e.switch().withEndpoint("t3").withDescription("Top Right"),
            e.switch().withEndpoint("b1").withDescription("Bottom Left"),
            e.switch().withEndpoint("b2").withDescription("Bottom Middle"),
            e.switch().withEndpoint("b3").withDescription("Bottom Right"),
            e.switch().withEndpoint("c1").withDescription("switch_all"),
            e.switch().withEndpoint("c2").withDescription("backlight"),
            e.switch().withEndpoint("c3").withDescription("child_lock"),
            e.switch().withEndpoint("c4").withDescription("TT_switch"),
        ],
        endpoint: (device) => ({t1: 1, t2: 1, t3: 1, b1: 1, b2: 1, b3: 1, c1: 1, c2: 1, c3: 1, c4: 1}),
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_t1", tuya.valueConverter.onOff],
                [2, "state_t2", tuya.valueConverter.onOff],
                [3, "state_t3", tuya.valueConverter.onOff],
                [4, "state_b1", tuya.valueConverter.onOff],
                [5, "state_b2", tuya.valueConverter.onOff],
                [6, "state_b3", tuya.valueConverter.onOff],
                [13, "state_c1", tuya.valueConverter.onOff],
                [16, "state_c2", tuya.valueConverter.onOff],
                [101, "state_c3", tuya.valueConverter.onOff],
                [102, "state_c4", tuya.valueConverter.onOff],
            ],
        },
    },
];
