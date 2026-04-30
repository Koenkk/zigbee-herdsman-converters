import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["TS0721"],
        model: "TS0721",
        vendor: "Zbeacon",
        description: "On/off switch",
        extend: [m.onOff({powerOnBehavior: false})],
    },
];
