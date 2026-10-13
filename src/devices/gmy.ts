import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["CCT box"],
        model: "B07KG5KF5R",
        vendor: "GMY Smart Bulb",
        description: "GMY Smart bulb, 470lm, vintage dimmable, 2700-6500k, E27",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
];
