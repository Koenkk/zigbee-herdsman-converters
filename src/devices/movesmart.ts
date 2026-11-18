import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_lnsk1ead"]),
        model: "MS-JT-63",
        vendor: "MoveSmart",
        description: "MoveSmart smart switch with power monitoring",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
    },
];
