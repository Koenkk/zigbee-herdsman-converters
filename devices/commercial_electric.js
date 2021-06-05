const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['Zigbee CCT Downlight'],
        model: '53170161',
        vendor: 'Commercial Electric',
        description: 'Matte White Recessed Retrofit Smart Led Downlight - 4 Inch',
        extend: extend.light_onoff_brightness_colortemp(),
    },
];
