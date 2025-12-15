import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["LUBEEZ-12AB"],
        model: "12AB",
        vendor: "Lubeez",
        description: "zigbee 3.0 AC dimmer",
        extend: [m.light({configureReporting: true})],
    },
];
