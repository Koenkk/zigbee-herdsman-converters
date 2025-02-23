import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SZ1000"],
        model: "ZB250",
        vendor: "Micro Matic Norge AS",
        description: "Zigbee dimmer for LED",
        extend: [m.light({configureReporting: true}), m.electricityMeter()],
    },
];
