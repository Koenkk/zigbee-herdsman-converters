import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZBT-RGBWLight-A0000"],
        model: "ZBT-RGBWLight-A0000",
        vendor: "LDS",
        description: "Ynoa smart LED E27",
        extend: [m.light({colorTemp: {range: [153, 555]}, color: true})],
    },
];
