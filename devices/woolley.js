const extend = require('../lib/extend');
const reporting = require('../lib/reporting');

module.exports = [
    {
        zigbeeModel: ['Z111PL0H-1JX', 'SA-029-1'],
        model: 'SA-029',
        vendor: 'Woolley',
        description: 'Smart Plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
        {
        zigbeeModel: ['SA-030-1'],
        model: 'SA-030-1',
        vendor: 'Woolley',
        description: 'Smart plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
        {
        zigbeeModel: ['SA-030-1'],
        model: 'SA-030',
        vendor: 'Woolley',
        description: 'Smart plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
];
