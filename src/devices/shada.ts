import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["0190015"],
        model: "0190015",
        vendor: "Shada",
        description: "LED dimmer",
        extend: [m.light({configureReporting: true})],
    },
];
