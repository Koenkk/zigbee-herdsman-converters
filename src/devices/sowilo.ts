import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as fz from '../converters/fromZigbee';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
const e = exposes.presets;

const definition: Definition[] = [
  {
    zigbeeModel: ['L258'],
    model: 'L258',
    vendor: 'Sowilo DS',
    description: 'Heimdall Pro. 5 channel RGBWW controller.',
    extend: extend.light_onoff_brightness_colortemp_color({
	    supportsHueAndSaturation: true,
	    colorTempRange: [150, 575],
    }),
    ota: ota.zigbeeOTA,
    meta: {turnsOffAtBrightness1: true},
  }
];

module.exports = definition;
