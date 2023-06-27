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
        zigbeeModel: [
            'MOT-C1Z06C\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
            'MOT-C1Z10F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
            'MOT-C1Z06F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
        ],
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
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['MAI-ZTP20F'],
        model: 'MAI-ZTP20F',
        vendor: 'Profalux',
        description: 'Cover remote',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
];

module.exports = definitions;
