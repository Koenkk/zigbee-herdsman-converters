const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['1719SP-PS1-02'],
        model: 'SP-PS1-02',
        vendor: 'Spotmau',
        description: 'Smart wall switch - 1 gang',
        extend: extend.switch(),
        endpoint: (device) => {
            return {default: 16};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff', 'genBasic']);
        },
    },
    {
        zigbeeModel: ['1719SP-PS2-02'],
        model: 'SP-PS2-02',
        vendor: 'Spotmau',
        description: 'Smart wall switch - 2 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 16, 'right': 17};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff', 'genBasic']);
            await reporting.bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff', 'genBasic']);
        },
    },
];
