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
        zigbeeModel: ['EB-E14-FLA-CCT'],
        model: 'EB-E14-FLA-CCT',
        vendor: 'EssentielB',
        description: 'E14 Flame CCT light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-E27-A60-CCT-FC'],
        model: 'EB-E27-A60-CCT-FC',
        vendor: 'EssentielB',
        description: 'E27 A60 CCT Filament Clear light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-E27-A60-CCT'],
        model: 'EB-E27-A60-CCT',
        vendor: 'EssentielB',
        description: 'E27 A60 CCT light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-E27-A60-RGBW'],
        model: 'EB-E27-A60-RGBW',
        vendor: 'EssentielB',
        description: 'E27 A60 RGBW light bulb',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['EB-E27-G95-CCT-FV'],
        model: 'EB-E27-G95-CCT-FV',
        vendor: 'EssentielB',
        description: 'Filament Vintage Globe light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-E27-ST64-CCT-FV'],
        model: 'EB-E27-ST64-CCT-FV',
        vendor: 'EssentielB',
        description: 'Filament vintage Edison light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-GU10-MR16-CCT'],
        model: 'EB-GU10-MR16-CCT',
        vendor: 'EssentielB',
        description: 'GU10 MR16 CCT light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-GU10-MR16-RGBW'],
        model: 'EB-GU10-MR16-RGBW',
        vendor: 'EssentielB',
        description: 'GU10 MR16 RGBW light bulb',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
];
