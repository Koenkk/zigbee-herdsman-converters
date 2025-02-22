import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZHA-ColorLight"],
        model: "rgbw2.zbee27",
        vendor: "Zipato",
        description: "RGBW LED bulb with dimmer",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
];
