import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["WAV Smart Receiver"],
        model: "T-TWAV-60W-PSR",
        vendor: "Task Lighting",
        description: "WAV smart receiver LED lighting controller",
        extend: [m.light({colorTemp: {range: [150, 500]}, color: true})],
    },
];
