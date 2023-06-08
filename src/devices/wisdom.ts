import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['HK-DIM-SW'],
        model: 'DMZ250',
        vendor: 'Wisdom',
        description: 'Zigbee led dimmer 5-250 Watt',
        extend: extend.light_onoff_brightness(),
    },
];

module.exports = definitions;
