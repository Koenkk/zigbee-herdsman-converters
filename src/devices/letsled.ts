import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "RGBW Down Light", manufacturerName: "Letsleds China"}],
        model: "HLC929-Z-RGBW-4C-IA-OTA-3.0",
        vendor: "Letsleds",
        description: "RGBW down light (color temp is inverted)",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
];
