import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZG 401224'],
        model: 'ZG401224',
        vendor: 'Matcall',
        description: 'LED dimmer driver',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ZG 430700', 'ZG  430700'],
        model: 'ZG430700',
        vendor: 'Matcall',
        description: 'LED dimmer driver',
        extend: extend.light_onoff_brightness(),
    },
];

module.exports = definitions;
