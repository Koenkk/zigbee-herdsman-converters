import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerID: 4126,
                endpoints: [
                    {ID: 230, profileID: 49413, deviceID: 1, inputClusters: [], outputClusters: []},
                    {ID: 232, profileID: 49413, deviceID: 1, inputClusters: [], outputClusters: []},
                ],
            },
        ],
        model: "XBee",
        description: "Router",
        vendor: "Digi",
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
];
