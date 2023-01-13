const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['053'],
        model: 'HLC610',
        vendor: 'iLightsIn',
        description: '1-10V dimming LED controller',
        extend: extend.light_onoff_brightness(),
    },
];
