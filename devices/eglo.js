const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['EBF_RGB_Zm'],
        model: '900091',
        vendor: 'EGLO',
        description: 'ROVITO-Z ceiling light',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['ESMLFzm_w6_TW'],
        model: '12242',
        vendor: 'EGLO',
        description: 'ST64 adjustable white filament bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EGLO_ZM_RGB_TW'],
        model: '900024',
        vendor: 'EGLO',
        description: 'SALITERAS-Z ceiling light',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
];
