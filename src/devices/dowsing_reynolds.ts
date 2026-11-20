import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["DR3000"],
        model: "DR3000",
        vendor: "Dowsing & Reynolds",
        description: "Antique brass double dimmer switch",
        version: "0.0.1",
        extend: [m.light({configureReporting: true})],
    },
];
