import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["HK-DIM-SW"],
        model: "DMZ250",
        vendor: "Wisdom",
        description: "Zigbee led dimmer 5-250 Watt",
        extend: [m.light()],
    },
];
