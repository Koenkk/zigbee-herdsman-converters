import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["LEColorLight"],
        model: "900008-WW",
        vendor: "ilux",
        description: "Dimmable A60 E27 LED Bulb",
        extend: [m.light()],
    },
];
