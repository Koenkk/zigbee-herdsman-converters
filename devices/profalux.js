const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{manufId: 4368, endpoints: [{ID: 1, profileID: 260, deviceID: 513, inputClusters: [0, 3, 21],
            outputClusters: [3, 4, 5, 6, 8, 256, 64544, 64545]}]}],
        model: 'NB102',
        vendor: 'Profalux',
        description: 'Cover remote',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['MOT-C1Z06C\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        fingerprint: [{manufId: 4368, endpoints: [{ID: 1, profileID: 260, deviceID: 512,
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
];
