import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Connected A-19 60W Equivalent ', 'Connected A-19 60W Equivalent   '],
        model: 'B00TN589ZG',
        vendor: 'CREE',
        description: 'Connected bulb',
        extend: extend.light_onoff_brightness(),
    },
];

module.exports = definitions;
