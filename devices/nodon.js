const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['SIN-4-1-20'],
        model: 'SIN-4-1-20',
        vendor: 'NodOn',
        description: 'Single LED Relay',
        exposes: [
            e.switch(),
        ],
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(ep);
        },
    },
    {
        zigbeeModel: ['SIN-4-2-20'],
        model: 'SIN-4-2-20',
        vendor: 'NodOn',
        description: 'Double LED Relay',
        exposes: [
            e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
        ],
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            await reporting.bind(ep1, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(ep2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(ep1);
            await reporting.onOff(ep2);
        },
    },
];
