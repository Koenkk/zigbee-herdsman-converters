import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["LST103"],
        model: "LST103",
        vendor: "Gumax",
        description: "Gumax lighting system",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
];
