const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['5991711'],
        model: 'C5850000',
        vendor: 'Villeroy & Boch',
        description: 'Subway 3.0 Zigbee home automation kit',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [160, 450]}),
    },
    {
        zigbeeModel: ['EC1300'],
        model: 'C0040000',
        vendor: 'Villeroy & Boch',
        description: 'Zigbee home automation kit for mirror',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [160, 450]}),
    },
];
