const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['ABL-LIGHT-Z-001'],
        model: 'Juno Connect Wafer',
        vendor: 'Acuity Brands Lighting (ABL)',
        description: '4" and 6" LED Smart Wafer Downlight',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [200,370]}),
    },
];
