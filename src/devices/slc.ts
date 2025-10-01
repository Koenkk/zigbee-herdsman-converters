// Scandinavian Lighting Concept / The Light Group AS
// http://tlg.no/slc

import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["S32052"],
        model: "S32052",
        vendor: "SLC",
        description: "SmartOne Driver CC 2CH 350-1500mA TW 50W",
        ota: true,
        extend: [m.light({colorTemp: {range: [160, 450]}})],
    }
];