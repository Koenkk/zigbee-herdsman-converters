import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0505B", ["_TZ3210_mcm6m1ma", "_TZ3210_klsm24op"]),
        model: "DL41-03-10-R-ZB",
        vendor: "Oz Smart Things",
        description: "Oz Smart RGBW Zigbee downlight 10w",
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}, color: true})],
    },
];
