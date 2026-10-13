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
    {
        zigbeeModel: ["LWM005"],
        model: "LWM005",
        vendor: "Modular",
        description: "Dim Module Hue 0-10V/1-10V 150-300W",
        extend: [m.light()],
    },
];
