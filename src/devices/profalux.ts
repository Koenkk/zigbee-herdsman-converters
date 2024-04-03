import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {logger} from '../lib/logger';

const NS = 'zhc:profalux';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['MAI-ZTS'],
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
        options: [],
        exposes: (device, options) => {
            const endpoint = device?.getEndpoint(2);
            // Motor can be configured using the associated remote:
            //  0: default hard cover         : 2xF Up + Down on the associated remote
            //  1: cover using tilt (aka BSO) : 2xF Stop + Up
            //  2: soft cover (aka store)     : 2xF Stop + Down

            if ((device == null && options == null) || endpoint.getClusterAttributeValue('manuSpecificProfalux1', 'motorCoverType') == 1) {
                return [e.cover_position_tilt(), e.linkquality()];
            } else {
                return [e.cover_position(), e.linkquality()];
            }
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await endpoint.read('manuSpecificProfalux1', ['motorCoverType'])
                .catch((e) => {
                    logger.warning(`Failed to read zigbee attributes: ${e}`, NS);
                });
            const coverType = endpoint.getClusterAttributeValue('manuSpecificProfalux1', 'motorCoverType');
            // logger.debug(`Profalux '${device.ieeeAddr}' setup as cover type '${coverType)}'`, NS);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
            if (coverType == 1) {
                await reporting.currentPositionTiltPercentage(endpoint);
            }
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
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
            await reporting.brightness(endpoint);
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
    {
        // Newer remotes. These expose a bunch of things but they are bound to
        // the cover and don't seem to communicate with the coordinator, so
        // nothing is likely to be doable in Z2M.
        fingerprint: [
            {type: 'EndDevice', manufacturerName: 'Profalux', modelID: 'MAI-ZTS', manufacturerID: 4368, endpoints: [
                {ID: 1, profileID: 260, deviceID: 513, inputClusters: [0, 3, 21, 64514, 64544], outputClusters: [3, 4, 5, 6, 8, 256, 64544, 64545]},
                {ID: 2, profileID: 260, deviceID: 515, inputClusters: [0, 1, 3, 9, 21, 32, 64514, 64544],
                    outputClusters: [3, 4, 5, 25, 258, 64544, 64545]},
            ]},
        ],
        model: 'MAI-ZTM20C',
        vendor: 'Profalux',
        description: 'Cover remote',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
];

export default definitions;
module.exports = definitions;
