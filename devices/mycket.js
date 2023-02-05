const tuya = require('../lib/tuya');

module.exports = [
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_evag0pvn'}],
        model: 'MS-SP-LE27WRGB',
        description: 'E27 RGBW bulb',
        vendor: 'Mycket',
        extend: tuya.extend.light_onoff_brightness_colortemp_color(),
    },
];
