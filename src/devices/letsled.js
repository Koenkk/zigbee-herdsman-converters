const extend = require('../lib/extend');

module.exports = [
    {
        fingerprint: [{modelID: 'RGBW Down Light', manufacturerName: 'Letsleds China'}],
        model: 'HLC929-Z-RGBW-4C-IA-OTA-3.0',
        vendor: 'Letsleds',
        description: 'RGBW down light (color temp is inverted)',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
];
