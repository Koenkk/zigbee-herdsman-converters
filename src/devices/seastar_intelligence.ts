import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["020B0B"],
        model: "020B0B",
        vendor: "Fischer & Honsel",
        description: "LED Tischleuchte Beta Zig",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
        endpoint: (device) => {
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/5463
            const endpoint = device.endpoints.find((e) => e.inputClusters.includes(6))?.ID ?? 1;
            return {default: endpoint};
        },
    },
];
