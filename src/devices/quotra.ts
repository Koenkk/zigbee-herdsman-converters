import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Dimmer_us"],
        model: "B07CVL9SZF",
        vendor: "Quotra",
        description: "Dimmer",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["QV-RGBCCT"],
        model: "B07JHL6DRV",
        vendor: "Quotra",
        description: "RGB WW LED strip",
        extend: [m.light({colorTemp: {range: [150, 500]}, color: true, powerOnBehavior: false})],
    },
];
