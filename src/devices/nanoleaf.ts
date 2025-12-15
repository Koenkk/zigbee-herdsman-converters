import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["NL08-0800"],
        model: "NL08-0800",
        vendor: "Nanoleaf",
        description: "Smart Ivy Bulb E27",
        extend: [m.light()],
    },
];
