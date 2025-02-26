import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["DS-Z-001DE"],
        model: "DS-Z-001DE",
        vendor: "DIRECTSIGNS",
        description: "RGB + CCT LED Controller",
        extend: [m.light({colorTemp: {range: [158, 500]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
];
