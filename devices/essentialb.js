const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['EB-E14-P45-RGBW'],
        model: 'EB-E14-P45-RGBW',
        vendor: 'EssentielB',
        description: 'Smart LED bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['EB-E27-ST64-CCT-FV'],
        model: 'EB-E27-ST64-CCT-FV',
        vendor: 'EssentielB',
        description: 'Filament Vintage light bulb',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 454]}),
    },
];
