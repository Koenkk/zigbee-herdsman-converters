import * as m from "../lib/modernExtend";

export const definitions = [
    {
        zigbeeModel: ["Overflow"],
        model: "POFLW-WH02",
        vendor: "Quirky",
        description: "Smart water leak sensor",
        extend: [m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "battery_low"]})],
    },
];
