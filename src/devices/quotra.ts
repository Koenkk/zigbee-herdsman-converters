import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Dimmer_us'],
        model: 'B07CVL9SZF',
        vendor: 'Quotra',
        description: 'Dimmer',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['QV-RGBCCT'],
        model: 'B07JHL6DRV',
        vendor: 'Quotra',
        description: 'RGB WW LED strip',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [150, 500]}),
    },
];

module.exports = definitions;
