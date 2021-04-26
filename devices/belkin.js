const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['MZ100'],
        model: 'F7C033',
        vendor: 'Belkin',
        description: 'WeMo smart LED bulb',
        extend: extend.light_onoff_brightness(),
    },
];
