import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["70012"],
        model: "70012",
        vendor: "SuperLED",
        description: "SÄVY NUPPI, Zigbee LED-dimmer, triac, 5-200W",
        extend: [m.light({powerOnBehavior: false, effect: false})],
    },
];
