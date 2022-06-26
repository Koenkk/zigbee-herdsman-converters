const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('../lib/extend');

const definition = {
    zigbeeModel: ['Bouffalolab'],
    model: 'RMC002',
    vendor: 'Bouffalolab',
    description: 'US plug smart socket',
    extend: extend.switch(),
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        await reporting.onOff(endpoint);
    },
};

module.exports = definition;
