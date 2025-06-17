import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["053"],
        model: "HLC610",
        vendor: "iLightsIn",
        description: "1-10V dimming LED controller",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["13D"],
        model: "13D",
        vendor: "Light",
        description: "iLightsin HSSA18-Z-MID zhaga module",
        extend: [
            m.light(),
            m.illuminance(),
            m.occupancy(),
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"]}),
        ],
    },
];
