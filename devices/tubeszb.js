const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');

module.exports = [
    {
        zigbeeModel: ['tubeszb.router'],
        model: 'tubeszb.router',
        vendor: 'TubesZB',
        description: '[CC2652 Router](https://github.com/tube0013/tube_gateways/tree/main/tube_cc_router)',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(8);
            const payload = [{attribute: 'zclVersion', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
            await endpoint.configureReporting('genBasic', payload);
        },
    },
];
