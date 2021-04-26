const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['ZHA-ColorLight'],
        model: 'rgbw2.zbee27',
        vendor: 'Zipato',
        description: 'RGBW LED bulb with dimmer',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
];
