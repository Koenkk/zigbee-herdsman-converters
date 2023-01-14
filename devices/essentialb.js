const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['EB-E14-P45-RGBW'],
        model: 'EB-E14-P45-RGBW',
        vendor: 'EssentielB',
        description: 'Smart LED bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
];
