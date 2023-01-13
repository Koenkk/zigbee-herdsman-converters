const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['FB56-ZBW14LF1.4'],
        model: '322054',
        vendor: 'Lanesto',
        description: 'Dimmable led driver',
        extend: extend.light_onoff_brightness(),
    },
];
