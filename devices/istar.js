const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['iStar DIM Light'],
        model: 'SCCV2401-1',
        vendor: 'iStar',
        description: 'Zigbee 3.0 LED controller, dimmable white 12-36V DC max. 5A',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
];
