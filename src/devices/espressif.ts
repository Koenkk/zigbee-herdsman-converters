import * as fz from "../converters/fromZigbee";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['ZigbeeRangeExtender'],
        model: 'ZigbeeRangeExtender',
        vendor: 'Espressif',
        description: "Espressif ESP32-C6/H2 Router",
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const payload = [{attribute: "zclVersion" as const, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic"]);
            await endpoint.configureReporting("genBasic", payload);
        },
    },
];
