
import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE204_bb5xlia1",
        ]),
        model: "SA-WK 4X4",
        vendor: "NovaDigital",
        description: "6-channel Zigbee smart switch",

        extend: [tuya.modernExtend.tuyaBase({dp: true})],

        exposes: [
            e.switch().withEndpoint("ch1"),
            e.switch().withEndpoint("ch2"),
            e.switch().withEndpoint("ch3"),
            e.switch().withEndpoint("ch4"),
            e.switch().withEndpoint("ch5"),
            e.switch().withEndpoint("ch6"),
            e.switch().withEndpoint("master"),

            e.enum("relay_status", ea.STATE_SET, [
                "off",
                "on",
                "memory",
            ]).withDescription(
                "Relay state after power restoration"
            ),

            e.numeric("countdown_ch1", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1)
                .withUnit("s"),

            e.numeric("countdown_ch2", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1)
                .withUnit("s"),

            e.numeric("countdown_ch3", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1)
                .withUnit("s"),

            e.numeric("countdown_ch4", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1)
                .withUnit("s"),

            e.numeric("countdown_ch5", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1)
                .withUnit("s"),

            e.numeric("countdown_ch6", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1)
                .withUnit("s"),

            e.enum("light_mode", ea.STATE_SET, [
                "none",
                "relay",
                "pos",
            ]).withDescription(
                "LED indicator operating mode"
            ),
        ],

        endpoint: () => ({
            ch1: 1,
            ch2: 1,
            ch3: 1,
            ch4: 1,
            ch5: 1,
            ch6: 1,
            master: 1,
        }),

        meta: {
            multiEndpoint: true,

            tuyaDatapoints: [
                [1, "state_ch1", tuya.valueConverter.onOff],
                [2, "state_ch2", tuya.valueConverter.onOff],
                [3, "state_ch3", tuya.valueConverter.onOff],
                [4, "state_ch4", tuya.valueConverter.onOff],
                [5, "state_ch5", tuya.valueConverter.onOff],
                [6, "state_ch6", tuya.valueConverter.onOff],

                [101, "state_master", tuya.valueConverter.onOff],

                [
                    14,
                    "relay_status",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        on: tuya.enum(1),
                        memory: tuya.enum(2),
                    }),
                ],

                [7, "countdown_ch1", tuya.valueConverter.raw],
                [8, "countdown_ch2", tuya.valueConverter.raw],
                [9, "countdown_ch3", tuya.valueConverter.raw],
                [10, "countdown_ch4", tuya.valueConverter.raw],
                [11, "countdown_ch5", tuya.valueConverter.raw],
                [12, "countdown_ch6", tuya.valueConverter.raw],

                [
                    15,
                    "light_mode",
                    tuya.valueConverterBasic.lookup({
                        none: tuya.enum(0),
                        relay: tuya.enum(1),
                        pos: tuya.enum(2),
                    }),
                ],
            ],
        },
    },
];
