import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "BEGA Gantenbrink-Leuchten KG",
                modelID: "",
                endpoints: [{ID: 1, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 9, 768, 769, 64733], outputClusters: [25]}],
            },
        ],
        model: "70049",
        vendor: "Bega",
        description: "Zigbee control module DALI",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["BEGA 13557 bulb E27 RGBW 805lm"],
        model: "13557",
        vendor: "Bega",
        description: "LED lamp with adjustable LED color temperature (Tunable White - RGBW) for use in luminaires with E27 lamp base",
        extend: [m.light({colorTemp: {range: [153, 556]}, color: true})],
    },
    {
        zigbeeModel: ["BEGA 85000 Garden Spotlight"],
        model: "85000",
        vendor: "Bega",
        description: "Wired Garden LED Spotlight color temperature (Tunable White - RGBW)",
        extend: [m.light({colorTemp: {range: [50, 1000]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
];
