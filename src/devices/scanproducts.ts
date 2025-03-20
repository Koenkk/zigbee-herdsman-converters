import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["12501"],
        model: "12501",
        vendor: "Scan Products",
        description: "Zigbee push dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["12502"],
        model: "12502",
        vendor: "Scan Products",
        description: "Zigbee 3.0 switch",
        extend: [m.onOff()],
    },
];
