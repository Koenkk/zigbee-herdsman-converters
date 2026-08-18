import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Ribag Air O"],
        model: "Ribag Air O",
        vendor: "RIBAG Licht",
        description: "Ribag Vertico Air Pendant Light",
        extend: [m.light({colorTemp: {range: [153, 500]}})],
        meta: {omitOptionalLevelAndColorParams: true},
    },
];
