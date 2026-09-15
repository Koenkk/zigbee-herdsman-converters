import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["J2182548"],
        model: "J2182548",
        vendor: "JUMITECH APS",
        description: "Zigbee AC phase-cut dimmer single-line",
        extend: [m.light({configureReporting: true})],
    },
];
