import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["P2-WT"],
        model: "P2-WT",
        vendor: "TCL",
        description: "Water leak detector",
        extend: [m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "tamper", "battery_low"]})],
    },
];
