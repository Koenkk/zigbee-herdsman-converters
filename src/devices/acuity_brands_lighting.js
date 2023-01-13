const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['ABL-LIGHT-Z-001'],
        model: 'WF4C_WF6C',
        vendor: 'Acuity Brands Lighting (ABL)',
        description: 'Juno 4" and 6" LED smart wafer downlight',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [200, 370]}),
    },
];
