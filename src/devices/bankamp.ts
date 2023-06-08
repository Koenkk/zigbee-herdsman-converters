import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Bankamp Dimm-Leuchte'],
        model: '2189/1-xx',
        vendor: 'Bankamp',
        description: 'Ceiling light (e.g. Grazia, Grand)',
        extend: extend.light_onoff_brightness(),
    },
];

module.exports = definitions;
