const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['LEColorLight'],
        model: '900008-WW',
        vendor: 'ilux',
        description: 'Dimmable A60 E27 LED Bulb',
        extend: extend.light_onoff_brightness(),
    },
];
