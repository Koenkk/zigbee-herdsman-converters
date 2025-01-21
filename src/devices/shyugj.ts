import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: 'DoorSensor-ZB3.0', manufacturerName: 'Shyugj'}],
        model: 'S901D-ZG',
        vendor: 'Shyugj',
        description: 'Door sensor',
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: 'generic',
                zoneAttributes: ['alarm_1', 'alarm_2', 'tamper', 'battery_low'],
            }),
        ],
    },
];

export default definitions;
module.exports = definitions;
