import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ED6XX"],
        model: "BEE PIR 1",
        vendor: "TIS Control",
        description: "PIR Sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "tamper", "battery_low"]})],
    },
];
