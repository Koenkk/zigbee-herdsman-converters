import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["CS-T2C-A0-BG"],
        model: "CS-T2C",
        vendor: "EZVIZ",
        description: "Open/close sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"]})],
    },
];
