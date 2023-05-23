const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['HR109 V01'],
        model: 'HR109 V01',
        vendor: 'REJIA',
        description: 'REJIA vibration sensor',
        fromZigbee: [fz.REJIA_vibration],
        exposes: [e.action(['vibration'])],
<<<<<<< HEAD
        toZigbee: [],
=======
>>>>>>> 03c677b951d8d38912b9eac415632729459adc85
    }
];
