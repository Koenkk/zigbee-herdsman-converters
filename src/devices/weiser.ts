import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SMARTCODE_DEADBOLT_10"],
        model: "9GED18000-009",
        vendor: "Weiser",
        description: "SmartCode 10",
        extend: [m.lock({pinCodeCount: 30, readPinCodeOnProgrammingEvent: true}), m.battery()],
    },
    {
        zigbeeModel: ["SMARTCODE_DEADBOLT_10T"],
        model: "9GED21500-005",
        vendor: "Weiser",
        description: "SmartCode 10 Touch",
        extend: [m.lock({pinCodeCount: 30, readPinCodeOnProgrammingEvent: true}), m.battery()],
    },
];
