import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["L258"],
        model: "L258",
        vendor: "Sowilo DS",
        description: "Heimdall Pro 5 channel RGBWW controller",
        extend: [m.light({colorTemp: {range: [150, 575]}, color: {modes: ["xy", "hs"]}, turnsOffAtBrightness1: true})],
    },
];
