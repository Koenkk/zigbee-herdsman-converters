const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['020B0B'],
        model: '020B0B',
        vendor: 'Fischer & Honsel',
        description: 'LED Tischleuchte Beta Zig',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
];
