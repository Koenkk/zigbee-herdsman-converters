const reporting = require('../lib/reporting');
const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['FB56-SKT17AC1.4'],
        model: '67200BL',
        description: 'Vetaar smart plug',
        vendor: 'Anchor',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3) || device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
];
