import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['HA-ZM12/24-1K'],
        model: 'HA-ZM12/24-1K',
        vendor: 'Halemeier',
        description: '1-channel smart receiver',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HA-ZM12/24-mw2'],
        model: 'HA-ZM12/24-mw2',
        vendor: 'Halemeier',
        description: 'MultiWhite 1-channel smart receiver 12V',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [160, 450]}),
    },
    {
        zigbeeModel: ['HA-ZGMW2-E'],
        model: 'HA-ZGMW2-E',
        vendor: 'Halemeier',
        description: 'LED driver',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [160, 450]}),
    },
];

module.exports = definitions;
