import * as tz from "../converters/toZigbee";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZB-CL01"],
        model: "ZB-CL01",
        vendor: "KURVIA",
        description: "GU10 GRBWC built from AliExpress",
        extend: [m.light({colorTemp: {range: [250, 454]}, color: {applyRedFix: true, enhancedHue: false}})],
        toZigbee: [tz.on_off],
    },
];
