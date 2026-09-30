import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["LPC-V1"],
        model: "LPC-V1",
        vendor: "Pulsar LLC",
        description: "Leak protection controller",
        extend: [
            m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"]}),
            m.deviceEndpoints({endpoints: {"2": 2, "3": 3, "4": 4, "5": 5}}),
            m.onOff({endpointNames: ["2", "3", "4", "5"], powerOnBehavior: false}),
        ],
    },
];
