import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["TQL25-2211"],
        model: "TQL25-2211",
        vendor: "Raex",
        description: "Tubular motor",
        extend: [m.battery(), m.windowCovering({controls: ["lift"]})],
    },
];
