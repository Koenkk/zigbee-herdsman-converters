const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['X2SK11'],
        model: 'X2SK11',
        vendor: 'XingHuoYuan',
        description: 'Smart socket',
        extend: extend.switch(),
    },
];
