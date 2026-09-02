import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SC0002"],
        model: "SC0002",
        vendor: "Selena",
        description: "Desktop environmental monitoring station",
        extend: [m.temperature(), m.pressure(), m.humidity(), m.illuminance(), m.co2()],
    },
];
