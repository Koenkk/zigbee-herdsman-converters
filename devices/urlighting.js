const tuya = require('../lib/tuya');

module.exports = [
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_dn5higyl'}],
        model: 'TH008L10RGBCCT',
        vendor: 'UR Lighting',
        description: '10W RGB+CCT downlight',
        meta: {applyRedFix: true, enhancedHue: false},
        extend: tuya.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
];
