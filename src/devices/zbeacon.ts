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
    {
        zigbeeModel: ["TH03"],
        model: "TH03",
        vendor: "Zbeacon",
        description: "Temperature and humidity sensor",
        extend: [m.identify(), m.battery(), m.temperature(), m.humidity()],
    },
];
