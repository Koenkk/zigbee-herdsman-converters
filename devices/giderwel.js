const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['A10'],
        model: 'GD-ZCRGB012',
        vendor: 'GIDERWEL',
        description: 'Smart Zigbee RGB LED strip controller',
        extend: extend.light_onoff_brightness_color({supportsHS: false}),
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_ijczzg9h'}],
        model: 'C05Z',
        vendor: 'GIDERWEL',
        description: 'Zigbee RGB+CCT LED strip controller',
        extend: extend.light_onoff_brightness_colortemp_color({
            colorTempRange: [153, 500],
            disableColorTempStartup: true,
            disableEffect: true,
        }),
    },
];
