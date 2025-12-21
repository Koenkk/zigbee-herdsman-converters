import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['CS-T2C-A0-BG'],
        model: 'CS-T2C',
        vendor: 'EZVIZ',
        description: 'Open/Close Sensor',
        extend: [m.deviceEndpoints({"endpoints":{"0":0,"1":1}}), m.battery(), m.iasZoneAlarm({"zoneType":"generic","zoneAttributes":["alarm_1","alarm_2","tamper","battery_low"]})],
    }
];
