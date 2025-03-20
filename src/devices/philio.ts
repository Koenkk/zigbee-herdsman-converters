import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["PAT04A-v1.1.5"],
        model: "PAT04-A",
        vendor: "Philio",
        description: "Water leak detector",
        extend: [m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}), m.battery()],
        whiteLabel: [{vendor: "Evology", model: "PAT04-A"}],
    },
];
