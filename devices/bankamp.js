const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['Bankamp Dimm-Leuchte'],
        model: '2189/1-xx',
        vendor: 'Bankamp',
        description: 'Grazia ceiling light',
        extend: extend.light_onoff_brightness(),
    },
];
