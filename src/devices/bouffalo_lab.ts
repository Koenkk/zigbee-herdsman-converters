import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Bouffalolab"],
        model: "RMC002",
        vendor: "Bouffalolab",
        description: "US plug smart socket",
        extend: [m.onOff(), m.forcePowerSource({powerSource: "Mains (single phase)"})],
    },
];
