const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['A10'],
        model: 'GD-ZCRGB012',
        vendor: 'GIDERWEL',
        description: 'Smart ZigBee RGB LED Strip Controller',
        extend: extend.light_onoff_brightness_color({supportsHS: false}),
    },
];
