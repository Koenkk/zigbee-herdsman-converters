const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['VIYU-A60-806-RGBW-10011725'],
        model: '10011725',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart LED bulb RGB E27',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['VIYU_C35_470_RGBW_10297667'],
        model: '10297667',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart LED bulb RGB E14',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['VIYU-A60-806-CCT-10011723'],
        model: '10011723',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart LED bulb CCT E27',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['VIYU-C35-470-CCT-10011722'],
        model: '10011722',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart LED candle CCT E14',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['VIYU_GU10_350_RGBW_10297666'],
        model: '10297666',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart GU10 RGBW lamp',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['VIYU-GU10-350-CCT-10011724'],
        model: '10011724',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart GU10 CCT lamp',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['VIYU_A60_470_FI_D_CCT_10297665'],
        model: '10297665',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart LED bulb CCT E27 filament',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
    },
];
