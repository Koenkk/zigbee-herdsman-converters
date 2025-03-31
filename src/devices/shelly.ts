import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mini1"],
        model: "S4SW-001X8EU",
        vendor: "Shelly",
        description: "Mini gen 4",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["1"],
        model: "S4SW-001X16EU",
        vendor: "Shelly",
        description: "1 gen 4",
        extend: [m.onOff({powerOnBehavior: false})],
    },
];
