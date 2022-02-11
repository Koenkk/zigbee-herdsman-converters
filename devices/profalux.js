const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [
            {manufId: 4368, endpoints: [{ID: 1, profileID: 260, deviceID: 513, inputClusters: [
                0, 3, 21,
            ], outputClusters: [
                3, 4, 5, 6, 8, 256, 64544, 64545,
            ]}]},
        ],
        model: 'Remote',
        vendor: 'Profalux',
        description: 'Store profalux',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
    {
        fingerprint: [
            {manufId: 4368, endpoints: [{ID: 1, profileID: 260, deviceID: 512, inputClusters: [
                0, 3, 4, 5, 6, 8, 10, 21, 256, 64544, 64545,
            ], outputClusters: [
                3, 64544,
            ]}]},
        ],
        model: 'Store',
        vendor: 'Profalux',
        description: 'Store profalux',
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
