const m = require("zigbee-herdsman-converters/lib/modernExtend");
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["dqhome.re4"],
        model: "dqhome.re4",
        vendor: "DQHOME",
        description: "DQSmart Switch 4 Gang",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["l1", "l2", "l3", "l4"]}),
        ],
    },
];
