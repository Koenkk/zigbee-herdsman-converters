import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["FB56-ZCW08KU1.1", "FB56-ZCW08KU1.0"],
        model: "K2RGBW01",
        vendor: "JIAWEN",
        description: "Wireless Bulb E27 9W RGBW",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["FB56-ZBW02KU1.5"],
        model: "JW-A04-CT",
        vendor: "JIAWEN",
        description: "LED strip light controller",
        extend: [m.light()],
    },
];
