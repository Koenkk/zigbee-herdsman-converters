const extend = require('../lib/extend');

module.exports = [
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_hzy4rjz3'}],
        model: 'AJ_RGBCCT_CTRL',
        vendor: 'Zignito',
        description: 'Zignito LED panel RGB+CCT',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500], disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
    },
];
