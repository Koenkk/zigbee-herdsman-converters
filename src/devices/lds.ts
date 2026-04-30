import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZBT-RGBWLight-A0000"],
        model: "ZBT-RGBWLight-A0000",
        vendor: "LDS",
        description: "Ynoa smart LED E27",
        extend: [m.light({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ["FWBulb03UK"],
        model: "FWBulb03UK",
        vendor: "LDS",
        description: "Hive Smart Light Bulb E27 Dimmable",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["PFMOT001"],
        model: "PFMOT001",
        vendor: "LDS",
        description: "Hive Pet Friendly Motion sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "tamper", "battery_low"]})],
    },
];
