import {battery, iasZoneAlarm} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['DoorSensor-ZB3.0'],
        model: 'DoorSensor-ZB3.0',
        vendor: 'Shyugj',
        description: 'Automatically generated definition',
        extend: [
            battery(),
            iasZoneAlarm({
                zoneType: 'generic',
                zoneAttributes: ['alarm_1', 'alarm_2', 'tamper', 'battery_low'],
            }),
        ],
        meta: {},
    },
];

export default definitions;
module.exports = definitions;
