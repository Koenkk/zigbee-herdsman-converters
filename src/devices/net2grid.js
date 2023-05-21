const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['SP31           ', 'SP31'],
        model: 'N2G-SP',
        vendor: 'NET2GRID',
        description: 'White Net2Grid power outlet switch with power meter',
        fromZigbee: [fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off, fz.legacy.genOnOff_cmdOff, fz.on_off, fz.metering],
        exposes: [e.switch(), e.power(), e.energy()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);

            const endpoint10 = device.getEndpoint(10);
            await reporting.bind(endpoint10, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint10);
            await reporting.instantaneousDemand(endpoint10);
            await reporting.currentSummDelivered(endpoint10);
            await reporting.currentSummReceived(endpoint10);
        },
    },
];
