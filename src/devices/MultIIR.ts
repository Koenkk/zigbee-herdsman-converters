import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["MIR-MC100-E"],
        model: "MIR-MC100-E",
        vendor: "MultIR",
        description: "Doors sensor",
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "contact",
                zoneAttributes: ["alarm_1", "tamper", "battery_low"],
            }),
        ],
    },

];
