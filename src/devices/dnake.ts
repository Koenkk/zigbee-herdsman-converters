import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["CS-Z-CZ-2402"],
        model: "CS-Z-CZ-2402",
        vendor: "DNAKE",
        description: "Smart socket",
        extend: [m.onOff()],
    },
];
