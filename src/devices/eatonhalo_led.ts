import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Halo_RL5601"],
        model: "RL460WHZHA69", // The 4" CAN variant presents as 5/6" zigbeeModel.
        vendor: "Eaton/Halo LED",
        description: "Wireless Controlled LED retrofit downlight",
        extend: [m.light({colorTemp: {range: [200, 370]}})],
    },
];
