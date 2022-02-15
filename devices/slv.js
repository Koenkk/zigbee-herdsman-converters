const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['1001248', 'ZBT-ColorTemperature-Panel'],
        model: '1001248',
        vendor: 'SLV',
        description: 'VALETO CCT LED driver',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['1002994'],
        model: '1002994',
        vendor: 'SLV',
        description: 'VALETO remote (binds to device)',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
];
