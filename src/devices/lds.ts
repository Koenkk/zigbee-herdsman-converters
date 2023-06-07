import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZBT-RGBWLight-A0000'],
        model: 'ZBT-RGBWLight-A0000',
        vendor: 'LDS',
        description: 'Ynoa smart LED E27',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555]}),
    },
];

module.exports = definitions;
