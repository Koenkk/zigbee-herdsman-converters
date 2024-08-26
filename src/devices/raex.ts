import {battery, windowCovering} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['TQL25-2211'],
        model: 'TQL25-2211',
        vendor: 'Raex',
        description: 'Tubular motor',
        extend: [battery(), windowCovering({controls: ['lift']})],
    },
];

export default definitions;
module.exports = definitions;
