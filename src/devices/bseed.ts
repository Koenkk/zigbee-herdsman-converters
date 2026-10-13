import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const te = tuya.exposes;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_yenbr4om", "_TZE204_bdblidq3", "_TZE200_bdblidq3"]),
        model: "BSEED_TS0601_cover",
        vendor: "BSEED",
        description: "Zigbee curtain switch",
        fromZigbee: [legacy.fz.tuya_cover],
        toZigbee: [legacy.tz.tuya_cover_control],
        exposes: [te.coverPosition()],
    },
];
