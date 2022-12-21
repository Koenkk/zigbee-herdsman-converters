const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['HK-DIM-SW'],
        model: 'DMS250',
        vendor: 'Wisdom',
        description: 'Zigbee led dimmer 5-250 Watt',
        extend: extend.light_onoff_brightness(),
    },
];
