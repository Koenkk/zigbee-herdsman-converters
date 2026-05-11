import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

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
        exposes: [e.switch().setAccess("state", ea.STATE_SET)],
        fromZigbee: [legacy.fz.tuya_switch],
        toZigbee: [legacy.tz.tuya_switch_state],
    },
];
