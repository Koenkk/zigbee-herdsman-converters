const {extendDevice} = require('../lib/utils');

module.exports = [
    extendDevice(require('./danfoss'), '014G2461', {
        zigbeeModel: ['eT093WRO'],
        model: '701721',
        vendor: 'Popp',
        description: 'Smart thermostat based on Danfoss Ally (014G2461)',
    }),
];
