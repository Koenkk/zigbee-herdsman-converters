const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['ZPLUG'],
        model: 'ZPLUG_Boost',
        vendor: 'CLEODE',
        description: 'ZPlug boost',
        extend: extend.switch(),
        exposes: [e.switch(), e.power()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
];
