const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['Dimmer-Switch-ZB3.0'],
        model: '0140302',
        vendor: 'Idinio',
        description: 'Zigbee LED Foot Dimmer',
        extend: extend.light_onoff_brightness(),
    },
];
