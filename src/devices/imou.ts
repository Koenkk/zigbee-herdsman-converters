import {Definition} from '../lib/types';
import {battery, forceDeviceType, iasWarning, iasZoneAlarm} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZP1-EN'],
        model: 'ZP1-EN',
        vendor: 'IMOU',
        description: 'Zigbee ZP1 PIR motion sensor',
        extend: [
            battery(),
            iasZoneAlarm({zoneType: 'occupancy', zoneAttributes: ['alarm_1', 'tamper', 'battery_low'], alarmTimeout: true}),
        ],
    },
    {
        zigbeeModel: ['ZR1-EN'],
        model: 'ZR1-EN',
        vendor: 'IMOU',
        description: 'Zigbee ZR1 siren',
        extend: [
            battery(),
            forceDeviceType({type: 'EndDevice'}), iasWarning(),
            iasZoneAlarm({zoneType: 'alarm', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
        ],
        meta: {disableDefaultResponse: true},
    },
];

export default definitions;
module.exports = definitions;
