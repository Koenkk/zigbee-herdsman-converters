const reporting = require('../lib/reporting');
const tuya = require('../lib/tuya');

module.exports = [
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_j0ktmul1']),
        model: 'AUT000069',
        vendor: 'AutomatOn',
        description: 'Underfloor heating controller - 5 zones',
        extend: tuya.extend.switch({powerOnBehavior2: true, childLock: true, endpoints: ['l1', 'l2', 'l3', 'l4', 'l5']}),
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
