const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['iStar DIM Light'],
        model: 'ZBZIGBEEW12365A',
        vendor: 'iStar',
        description: 'ZigBee 3.0 LED Controller, dimmable white 12-36V DC max. 5A',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true}
    },
];
