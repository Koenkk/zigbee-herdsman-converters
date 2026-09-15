import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "ZigbeeRangeExtender", manufacturerName: "Espressif"}],
        model: "Espressif-ZigbeeRangeExtender",
        vendor: "Espressif",
        description: "ESP32-C6/H2 router",
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            if (!endpoint) {
                return; // Exit if endpoint 1 is not found
            }
            // Check if the endpoint supports the genBasic cluster
            if (endpoint.supportsInputCluster("genBasic")) {
                const payload = [{attribute: "zclVersion" as const, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
                await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic"]);
                await endpoint.configureReporting("genBasic", payload);
            }
        },
    },
];
