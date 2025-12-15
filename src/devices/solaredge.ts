import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SE-SW"],
        model: "SEHAZB-DR-SWITCH-2",
        vendor: "SolarEdge",
        description: "Smart energy switch",
        extend: [m.onOff()],
    },
];
