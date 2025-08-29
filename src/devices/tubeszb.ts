import * as fz from "../converters/fromZigbee";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["tubeszb.router"],
        model: "tubeszb.router",
        vendor: "TubesZB",
        description: "CC2652 Router",
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(8);
            const payload = [{attribute: "zclVersion" as const, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic"]);
            await endpoint.configureReporting("genBasic", payload);
        },
    },
];
