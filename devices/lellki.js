const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_air9m6af'}],
        zigbeeModel: ['JZ-ZB-005'],
        model: 'WP33-EU',
        vendor: 'LELLKI',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (16A)',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'), e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['JZ-ZB-001'],
        model: 'JZ-ZB-001',
        description: 'Smart plug (without power monitoring)',
        vendor: 'LELLKI',
        fromZigbee: [fz.on_off, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
        exposes: [e.switch(), exposes.enum(ea.STATE_SET, ['on', 'off', 'restore']).withDescription('Recover state after power outage')],
    },
    {
        zigbeeModel: ['JZ-ZB-003'],
        model: 'JZ-ZB-003',
        vendor: 'LELLKI',
        description: '3 gang switch',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['JZ-ZB-002'],
        model: 'JZ-ZB-002',
        vendor: 'LELLKI',
        description: '2 gang touch switch',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_twqctvna'}],
        model: 'CM001',
        vendor: 'LELLKI',
        description: 'Circuit switch',
        extend: extend.switch(),
    },
];
