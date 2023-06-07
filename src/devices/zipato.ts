import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZHA-ColorLight'],
        model: 'rgbw2.zbee27',
        vendor: 'Zipato',
        description: 'RGBW LED bulb with dimmer',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
];

module.exports = definitions;
