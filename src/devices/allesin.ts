import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "TLSR82xx", manufacturerName: "Aubor"}],
        model: "allesin_cover",
        vendor: "Allesin",
        description: "Roller shade",
        extend: [m.windowCovering({controls: ["lift"]}), m.identify({isSleepy: true}), m.battery({dontDividePercentage: true})],
    },
];
