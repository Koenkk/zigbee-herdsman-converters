import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["RDM-35104001"],
        model: "35104001",
        vendor: "Rademacher",
        description: "addZ white + colour",
        extend: [m.light({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ["RDM-35144001"],
        model: "35144001",
        vendor: "Rademacher",
        description: "addZ white + colour",
        extend: [m.light({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ["RDM-35274001"],
        model: "RDM-35274001",
        vendor: "Rademacher",
        description: "addZ white + colour E27 LED",
        extend: [m.light({colorTemp: {range: [153, 555]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
];
