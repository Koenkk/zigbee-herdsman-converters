const extend = require('zigbee-herdsman-converters/lib/extend');

module.exports = [
    {
        zigbeeModel: ['A11'],
        model: 'ZC05M',
        vendor: 'GIDEALED',
        description: 'Smart Zigbee RGB LED strip controller',
        extend: extend.light_onoff_brightness_colortemp_color({supportsHS: true, colorTempRange: [153, 500]}),
    },
];
