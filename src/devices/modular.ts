import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["MWM002"],
        model: "MWM002",
        vendor: "Modular",
        description: "0-10V Zigbee Dimmer",
        extend: [m.light()],
    },
];
