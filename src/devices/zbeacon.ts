import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["TH01-2-z"],
        model: "TH01-2-z",
        vendor: "ZBeacon",
        description: "ZBeacon TH01 v2.0 temperature & humidity sensor",
        extend: [m.temperature(), m.humidity(), m.battery()],
    },
    {
        zigbeeModel: ["TS0721"],
        model: "TS0721",
        vendor: "Zbeacon",
        description: "On/off switch",
        extend: [m.onOff({powerOnBehavior: false})],
    },
];
