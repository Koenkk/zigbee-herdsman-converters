const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['On-Air Combi CTW,303-0136'],
        model: '303-0136',
        vendor: 'HFH Solutions',
        description: 'LED controller',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [155, 495]}),
    },
];
