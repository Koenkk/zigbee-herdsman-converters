import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["X2SK11"],
        model: "X2SK11",
        vendor: "XingHuoYuan",
        description: "Smart socket",
        extend: [m.onOff()],
    },
];
