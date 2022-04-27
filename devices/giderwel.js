const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['A10'],
        model: 'GD-ZCRGB012',
        vendor: 'GIDERWEL',
        description: 'Smart Zigbee RGB LED strip controller',
        extend: extend.light_onoff_brightness_color({supportsHS: false}),
    },
    {
        zigbeeModel: ['A11'],
        model: 'ZC05M-5',
        vendor: 'GIDERWEL',
        description: 'Smart Zigbee RGB LED strip controller',
        extend: extend.light_onoff_brightness_color({supportsHS: false}),
    },
];
