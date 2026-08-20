import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["PSE03-V1.1.0"],
        model: "PSE03-V1.1.0",
        vendor: "EVOLOGY",
        description: "Sound and flash siren",
        meta: {disableDefaultResponse: true},
        extend: [m.iasZoneAlarm({zoneType: "alarm", zoneAttributes: ["alarm_1", "tamper"]}), m.iasWarning({maxDuration: true})],
    },
];
