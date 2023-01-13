const tz = require('../converters/toZigbee');
const extend = require('../lib/extend');

const extendData = extend.light_onoff_brightness_colortemp_color({colorTempRange: [250, 454]});

module.exports = [
    {
        zigbeeModel: ['ZB-CL01'],
        model: 'ZB-CL01',
        vendor: 'KURVIA',
        description: 'GU10 GRBWC built from AliExpress',
        extend: extendData,
        toZigbee: [tz.on_off].concat(extendData.toZigbee),
        meta: {applyRedFix: true, enhancedHue: false},
    },
];

