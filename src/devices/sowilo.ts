import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definition: Definition[] = [
    {
        zigbeeModel: ['L258'],
        model: 'L258',
        vendor: 'Sowilo DS',
        description: 'Heimdall Pro 5 channel RGBWW controller',
        extend: extend.light_onoff_brightness_colortemp_color({supportsHueAndSaturation: true, colorTempRange: [150, 575]}),
        meta: {turnsOffAtBrightness1: true},
    },
];

module.exports = definition;
