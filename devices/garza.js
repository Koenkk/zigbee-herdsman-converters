const tuya = require('../lib/tuya');

module.exports = [
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_sln7ah6r'}],
        model: 'Garza-Standard-A60',
        vendor: 'Garza Smart',
        description: 'Standard A60 bulb',
        extend: tuya.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
];
