import {battery, iasZoneAlarm} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['PAT04A-v1.1.5'],
        model: 'PAT04-A',
        vendor: 'Philio',
        description: 'Water leak detector',
        extend: [iasZoneAlarm({zoneType: 'water_leak', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}), battery()],
        whiteLabel: [{vendor: 'Evology', model: 'PAT04-A'}],
    },
];

export default definitions;
module.exports = definitions;
