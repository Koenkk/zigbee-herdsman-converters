const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const tuya = require('../lib/tuya');
const e = exposes.presets;

module.exports = [
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_j0ktmul1']),
        model: 'AUT000069',
        vendor: 'AutomatOn',
        description: 'Underfloor heating controller - 5 zones',
        fromZigbee: [fz.on_off, fz.ignore_basic_report, tuya.fz.power_on_behavior_2, tuya.fz.child_lock],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_2, tuya.tz.child_lock],
        exposes: [
            e.child_lock(),
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.switch().withEndpoint('l5'),
            e.power_on_behavior().withEndpoint('l1'),
            e.power_on_behavior().withEndpoint('l2'),
            e.power_on_behavior().withEndpoint('l3'),
            e.power_on_behavior().withEndpoint('l4'),
            e.power_on_behavior().withEndpoint('l5'),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
];
