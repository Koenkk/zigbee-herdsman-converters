import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['PSSP5_00.00.03.02TC'],
        model: "PSSP5_00.00.03.02TC",
        vendor: "Climaxtechnology",
        description: "Automatically generated definition",
        extend: [m.deviceEndpoints({"endpoints":{"1":1,"4":4}}), m.onOff({"powerOnBehavior":false})],
        meta: {"multiEndpoint":true},
};
    {
        zigbeeModel: ['852L_00.00.03.10TC'],
        model: '852L_00.00.03.10TC',
        vendor: 'ClimaxTechnology',
        description: 'Automatically generated definition',
        extend: [m.iasZoneAlarm({"zoneType":"generic","zoneAttributes":["alarm_1","alarm_2","tamper","battery_low"]})],
        meta: {},
};
];
