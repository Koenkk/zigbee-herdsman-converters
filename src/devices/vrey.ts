import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0001", ["_TYZB01_reyozfcg", "_TYZB01_4vgantdz"]),
        model: "VR-X701U",
        vendor: "Vrey",
        description: "1 gang switch",
        extend: [m.onOff()],
    },
];
