const extend = require('../lib/extend');

module.exports = [
    {
        fingerprint: [
            {modelID: '1001248'},
            {modelID: 'ZBT-ColorTemperature-Panel'},
        ],
        model: '1001248',
        vendor: 'SLV',
        description: 'VALETO CCT LED Driver',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['1002994'],
        model: '1002994',
        vendor: 'SLV',
        description: 'VALETO Remote',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
];
