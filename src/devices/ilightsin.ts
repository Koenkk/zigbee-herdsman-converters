import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['053'],
        model: 'HLC610',
        vendor: 'iLightsIn',
        description: '1-10V dimming LED controller',
        extend: extend.light_onoff_brightness(),
    },
];

module.exports = definitions;
