import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {
                type: "EndDevice",
                manufacturerName: "TELINK",
                modelID: "TLSR82xx",
                endpoints: [{ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 32, 1026, 1029, 1], outputClusters: [25]}],
            },
        ],
        model: "TNCE_CLIMATE",
        vendor: "TNCE",
        description: "Temperature and humidity sensor",
        extend: [m.temperature(), m.humidity(), m.battery()],
    },
];
