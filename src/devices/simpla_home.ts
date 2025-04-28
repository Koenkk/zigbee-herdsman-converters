import * as m from "../lib/modernExtend";

import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Soil Pro"],

        fingerprint: [
            {
                type: "EndDevice",
                manufacturerName: "Simpla",
                modelID: "Soil Pro",
                hardwareVersion: 2,
            },
        ],
        model: "Soil Pro",
        vendor: "Simpla Home",
        description: "Soil moisture sensor: Simpla Home Soil Pro",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, z1_top: 2, z2_bottom: 3}}),
            m.identify(),
            m.temperature(),
            m.soilMoisture({
                description: "Soil Moisture of Zone 1 (Top Zone)",
                endpointNames: ["z1_top"],
            }),
            m.soilMoisture({
                description: "Soil Moisture of Zone 2 (Bottom Zone)",
                endpointNames: ["z2_bottom"],
            }),
            m.battery(),
            m.illuminance(),
        ],
        meta: {multiEndpoint: true},
        ota: true,
    },
];
