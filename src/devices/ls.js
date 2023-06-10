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
    // Note that fromZigbee, toZigbee and exposes are missing here since we use extend here.
    // Extend contains a default set of fromZigbee/toZigbee converters and expose for common device types.
    // The following extends are available:
    // - extend.switch
    // - extend.light_onoff_brightness
    // - extend.light_onoff_brightness_colortemp
    // - extend.light_onoff_brightness_color
    // - extend.light_onoff_brightness_colortemp_color
    extend: extend.light_onoff_brightness_colortemp(),
};

module.exports = definition;
