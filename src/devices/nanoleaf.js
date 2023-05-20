const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['NL08-0800'],
        model: 'NL08-0800',
        vendor: 'Nanoleaf',
        description: 'Smart Ivy Bulb E27',
        extend: extend.light_onoff_brightness(),
    },
];
