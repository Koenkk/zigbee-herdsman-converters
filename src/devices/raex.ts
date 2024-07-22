import {battery, identify, windowCovering, commandsOnOff} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['TQL25-2211'],
        model: 'TQL25-2211',
        vendor: 'Raex',
        description: 'Tubular motor',
        extend: [battery(), identify(), windowCovering({controls: ['lift']}), commandsOnOff({commands: ['on', 'off', 'toggle']})],
    },
];

export default definitions;
module.exports = definitions;
