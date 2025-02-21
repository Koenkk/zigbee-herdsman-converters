import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Bankamp Dimm-Leuchte"],
        model: "2189/1-xx",
        vendor: "Bankamp",
        description: "Ceiling light (e.g. Grazia, Grand)",
        extend: [m.light()],
    },
];
