import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Lamp_01"],
        model: "KS-SM001",
        vendor: "Ksentry Electronics",
        description: "Zigbee on/off controller",
        extend: [m.onOff({powerOnBehavior: false})],
    },
];
