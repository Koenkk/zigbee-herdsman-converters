const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['SA-003-Zigbee'],
        model: 'SA-003-Zigbee',
        vendor: 'eWeLink',
        description: 'Zigbee smart plug',
        extend: extend.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW01'],
        model: 'ZB-SW01',
        vendor: 'eWeLink',
        description: 'Smart light switch - 1 gang',
        extend: extend.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW02', 'E220-KR2N0Z0-HA'],
        model: 'ZB-SW02',
        vendor: 'eWeLink',
        description: 'Smart light switch - 2 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW03'],
        model: 'ZB-SW03',
        vendor: 'eWeLink',
        description: 'Smart light switch - 3 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW04'],
        model: 'ZB-SW04',
        vendor: 'eWeLink',
        description: 'Smart light switch - 4 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'), e.switch().withEndpoint('l4')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
];
