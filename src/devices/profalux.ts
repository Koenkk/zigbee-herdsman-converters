import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [{manufacturerID: 4368, endpoints: [{ID: 1, profileID: 260, deviceID: 513, inputClusters: [0, 3, 21],
            outputClusters: [3, 4, 5, 6, 8, 256, 64544, 64545]}]}],
        model: 'NB102',
        vendor: 'Profalux',
        description: 'Cover remote',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
    {
        // Recent covers are matched by Zigbee model. Their remotes communicate
        // using cluster 0x102 "closuresWindowCovering", so use that.
        // 06/10/20/30 is the torque in Nm. 20/30 have not been seen but
        // extracted from Profalux documentation. C/F seems to be a version. D
        // and E have not been seen in the while. I suspect A is the earlier
        // model covered below, NSAV061.
        zigbeeModel: [
            'MOT-C1Z06C\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
            'MOT-C1Z10C\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
            'MOT-C1Z20C\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
            'MOT-C1Z30C\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
            'MOT-C1Z06F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
            'MOT-C1Z10F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
            'MOT-C1Z20F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
            'MOT-C1Z30F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
        ],
        model: 'MOT-C1ZxxC/F',
        vendor: 'Profalux',
        description: 'Cover',
        fromZigbee: [fz.command_cover_close, fz.command_cover_open, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        // Identify older covers based on their fingerprint. These do not
        // expose closuresWindowCovering and need to use genLevelCtrl
        // instead. Sniffing a remote would be welcome to confirm that this
        // is the right thing to do.
        fingerprint: [{manufacturerID: 4368, endpoints: [{ID: 1, profileID: 260, deviceID: 512,
            inputClusters: [0, 3, 4, 5, 6, 8, 10, 21, 256, 64544, 64545], outputClusters: [3, 64544]}]}],
        model: 'NSAV061',
        vendor: 'Profalux',
        description: 'Cover',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        // Newer remotes. These expose a bunch of things but they are bound to
        // the cover and don't seem to communicate with the coordinator, so
        // nothing is likely to be doable in Z2M.
        zigbeeModel: ['MAI-ZTP20F', 'MAI-ZTP20C'],
        model: 'MAI-ZTP20',
        vendor: 'Profalux',
        description: 'Cover remote',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
];

module.exports = definitions;
