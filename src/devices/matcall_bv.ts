import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZG 401224"],
        model: "ZG401224",
        vendor: "Matcall",
        description: "LED dimmer driver",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["ZG 430700", "ZG  430700"],
        model: "ZG430700",
        vendor: "Matcall",
        description: "LED dimmer driver",
        extend: [m.light()],
    },
];
