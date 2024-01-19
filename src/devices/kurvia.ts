import {Definition} from '../lib/types';
import tz from '../converters/toZigbee';
import extend from '../lib/extend';

const extendData = extend.light_onoff_brightness_colortemp_color({colorTempRange: [250, 454]});

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZB-CL01'],
        model: 'ZB-CL01',
        vendor: 'KURVIA',
        description: 'GU10 GRBWC built from AliExpress',
        extend: extendData,
        toZigbee: [tz.on_off, ...extendData.toZigbee],
        meta: {applyRedFix: true, supportsEnhancedHue: false},
    },
];

export default definitions;
module.exports = definitions;
