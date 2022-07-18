const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const extend = require('../lib/extend');
const e = exposes.presets;

const extendData = extend.light_onoff_brightness_colortemp_color({colorTempRange: [250, 454]});


module.exports = [
    {
        zigbeeModel: ['ZB-CL01'],
        model: 'ZB-CL01',
        vendor: 'KURVIA',
        description: 'GU10 GRBWC Built from Aliexpress',
        exposes: extendData.exposes.concat(e.power_on_behavior()),
        toZigbee: [tz.on_off].concat(extendData.toZigbee),
        fromZigbee: extendData.fromZigbee,
        meta: {applyRedFix: true, enhancedHue: false},
    },
];

