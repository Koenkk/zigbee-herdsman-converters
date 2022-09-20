const extend = require('../lib/extend');

module.exports = [
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_mcm6m1ma'}],
        model: 'DL41-03-10-R-ZB',
        vendor: 'Oz Smart Things',
        description: 'Oz Smart RGBW Zigbee downlight 10w',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
];
