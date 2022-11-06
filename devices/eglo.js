const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['EBF_RGB_Zm'],
        model: '900091',
        vendor: 'EGLO',
        description: 'ROVITO-Z ceiling light',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
];
