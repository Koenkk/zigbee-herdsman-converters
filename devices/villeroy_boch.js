const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['5991711'],
        model: 'C5850000',
        vendor: 'Villeroy & Boch',
        description: 'Subway 3.0 Zigbee home Aautomation kit ',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [160, 450]}),
    },
];
