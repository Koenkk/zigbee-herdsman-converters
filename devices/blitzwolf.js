const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['5j6ifxj'],
        model: 'BW-IS3',
        vendor: 'BlitzWolf',
        description: 'Rechargeable Zigbee PIR motion sensor',
        fromZigbee: [fz.blitzwolf_occupancy_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy()],
    },
    {

        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_aneiicmq'}],
        model: 'BW-SS7_1gang',
        vendor: 'BlitzWolf',
        description: 'Zigbee 3.0 smart light switch module 1 gang',
        extend: extend.switch(),
        toZigbee: [tz.TYZB01_on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_digziiav'}],
        model: 'BW-SS7_2gang',
        vendor: 'BlitzWolf',
        description: 'Zigbee 3.0 smart light switch module 2 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        toZigbee: [tz.TYZB01_on_off],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
];
