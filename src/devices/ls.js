import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import * as ota from '../lib/ota';
import {Definition, Fz, KeyValue} from '../lib/types';
const e = exposes.presets;
const ea = exposes.access;


const definition = {
    zigbeeModel: ['Emotion'],
    model: 'Emotion',
    vendor: 'LS Deutschland GmbH',
    description: 'L&S Emotion Home Base',
    extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
};

module.exports = definition;
