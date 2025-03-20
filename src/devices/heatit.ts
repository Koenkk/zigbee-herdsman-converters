import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{type: "Router", manufacturerName: "Heatit Controls AB", modelID: "Dimmer-Switch-ZB3.0"}],
        model: "1444420",
        vendor: "Heatit",
        description: "Zig Dim 250W",
        extend: [m.light({configureReporting: true, powerOnBehavior: false})],
    },
];
