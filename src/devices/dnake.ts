import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['CS-Z-CZ-2402'],
        model: 'CS-Z-CZ-2402',
        vendor: 'DNAKE',
        description: 'Smart socket',
        extend: extend.switch(),
    },
];

module.exports = definitions;
