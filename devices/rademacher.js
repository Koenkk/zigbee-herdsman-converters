const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['RDM-35104001'],
        model: '35104001',
        vendor: 'Rademacher',
        description: 'addZ white + colour',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555]}),
    },
];
