import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["MZ100"],
        model: "F7C033",
        vendor: "Belkin",
        description: "WeMo smart LED bulb",
        extend: [m.light()],
    },
];
