
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
];
