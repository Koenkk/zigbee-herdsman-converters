import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {
                modelID: "MS01",
                manufacturerName: "zbeacon",
            },
        ],
        model: "MS01",
        vendor: "Besisglas",
        description: "Battery-powered 24GHz radar presence sensor",
        extend: [
            m.identify(),
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "occupancy",
                zoneAttributes: ["alarm_1", "battery_low"],
            }),
        ],
    },
    {
        fingerprint: [
            {
                modelID: "SNZB-05P",
                manufacturerName: "Zbeacon",
            },
        ],
        model: "WL01",
        vendor: "Besisglas",
        description: "Zigbee water leak sensor with wired probe",
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "water_leak",
                zoneAttributes: ["alarm_1", "battery_low"],
            }),
            m.forcePowerSource({powerSource: "Battery"}),
        ],
    },
];
