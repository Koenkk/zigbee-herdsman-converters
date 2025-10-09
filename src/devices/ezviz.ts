import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["CS-T51C-A0-BG"],
        model: "CS-T51C-A0-BG",
        vendor: "EZVIZ",
        description: "Temperature and humidity sensor",
        extend: [m.humidity(), m.temperature(), m.battery()],
    },
];
