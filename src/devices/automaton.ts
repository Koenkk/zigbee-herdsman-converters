import {Definition} from '../lib/types';
import * as reporting from '../lib/reporting';
import * as tuya from '../lib/tuya';

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_j0ktmul1']),
        model: 'AUT000069',
        vendor: 'AutomatOn',
        description: 'Underfloor heating controller - 5 zones',
        extend: [tuya.modernExtend.tuyaOnOff({powerOnBehavior2: true, childLock: true, endpoints: ['l1', 'l2', 'l3', 'l4', 'l5']})],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
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

export default definitions;
module.exports = definitions;
