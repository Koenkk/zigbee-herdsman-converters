const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['B1027EB0Z01'],
        model: 'B1027EB0Z01',
        vendor: 'LG Electronics',
        description: 'LG Smart Bulb 1',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['B1027EB0Z02'],
        model: 'B1027EB0Z02',
        vendor: 'LG Electronics',
        description: 'LG Smart Bulb 2',
        extend: extend.light_onoff_brightness(),
    },
];