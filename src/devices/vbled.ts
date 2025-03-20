import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["43023"],
        model: "43023",
        vendor: "VBLED",
        description: "ZigBee AC phase-cut dimmer",
        extend: [m.light({configureReporting: true})],
    },
];
