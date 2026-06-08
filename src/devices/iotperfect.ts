import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const te = tuya.exposes;
const tvc = tuya.valueConverter;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE200_vrjkcam9",
            "_TZE200_d0ypnbvn",
            "_TZE204_v5xjyphj",
            "_TZE204_d0ypnbvn",
            "_TZE284_v5xjyphj",
            "_TZE284_d0ypnbvn",
        ]),
        model: "PF-PM02D-TYZ",
        vendor: "IOTPerfect",
        description: "Smart water/gas valve",
        extend: [tuya.modernExtend.tuyaBase({dp: true, queryOnConfigure: true})],
        exposes: [te.switch(), te.fault()],
        meta: {
            tuyaDatapoints: [
                [1, "state", tvc.onOff],
                [26, "fault", tvc.fault],
            ],
        },
    },
];
