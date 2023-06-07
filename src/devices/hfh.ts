import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['On-Air Combi CTW,303-0136'],
        model: '303-0136',
        vendor: 'HFH Solutions',
        description: 'LED controller',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [155, 495]}),
    },
];

module.exports = definitions;
