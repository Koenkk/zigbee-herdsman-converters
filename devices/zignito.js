const exposes = require('../lib/exposes');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        fingerprint: [{ modelID: 'TS0505B', manufacturerName: '_TZ3210_hzy4rjz3' }],
        model: 'TS0505B',
        vendor: 'Zignito',
        description: 'Zignito LED panel RGB+CCT',
        extend: extend.light_onoff_brightness_colortemp_color({ colorTempRange: [153, 500], disableColorTempStartup: true }),
        meta: { applyRedFix: true, enhancedHue: false }
    }
];


