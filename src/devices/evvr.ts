import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SRB01", "SRB01A"],
        model: "SRB01",
        vendor: "Evvr",
        description: "In-wall relay switch",
        extend: [m.onOff()],
    },
];
