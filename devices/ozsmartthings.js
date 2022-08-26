const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['TS0505B'],
        model: 'DL41-03-10-R-ZB',
        vendor: 'OzSmartThings',
        description: 'Oz Smart RGBW Zigbee Downlight',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
];
