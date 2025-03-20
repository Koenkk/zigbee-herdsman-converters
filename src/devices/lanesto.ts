import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["FB56-ZBW14LF1.4", "RH0039", "AG0002"],
        model: "322054",
        vendor: "Lanesto",
        description: "Dimmable led driver",
        extend: [m.light()],
    },
];
