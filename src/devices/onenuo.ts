import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_kgaxpvxr", "_TZE284_n4ttsck2"]),
        model: "288WZ",
        vendor: "ONENUO",
        description: "Smoke detector",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.smoke(),
            e.battery(),
            tuya.exposes.silence(),
            tuya.exposes.selfTestResult(),
            e
                .enum("smoke_state", ea.STATE, ["alarm", "normal", "detecting", "unknown"])
                .withLabel("Smoke state")
                .withDescription("Possible states: alarm, normal, detecting, unknown"),
            e.enum("sensitivity", ea.STATE_SET, ["low", "medium", "high"]).withLabel("Sensitivity").withDescription("Smoke detection sensitivity"),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    null,
                    {
                        from: (v: number) => {
                            const lookup = {alarm: tuya.enum(0), normal: tuya.enum(1), detecting: tuya.enum(2), unknown: tuya.enum(3)};
                            const smokeState = Object.entries(lookup).find((i) => i[1].valueOf() === v)[0];
                            return {
                                smoke: smokeState === "alarm",
                                smoke_state: smokeState,
                            };
                        },
                    },
                ],
                [15, "battery", tuya.valueConverter.raw],
                [16, "silence", tuya.valueConverter.raw],
                [101, "self_test_result", tuya.valueConverterBasic.lookup({failure: false, success: true})],
                [102, "sensitivity", tuya.valueConverterBasic.lookup({low: tuya.enum(0), medium: tuya.enum(1), high: tuya.enum(2)})],
            ],
        },
    },
];
