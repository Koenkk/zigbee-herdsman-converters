import {deviceEndpoints, light, onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {
                modelID: 'HOMA1001',
                endpoints: [
                    {ID: 10, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
        ],
        model: 'HOMA1001_RGBW',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver RGBW',
        extend: [deviceEndpoints({endpoints: {white: 10, rgb: 11}}), light({endpointNames: ['white', 'rgb'], color: true})],
    },
    {
        fingerprint: [
            {
                modelID: 'HOMA1001',
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
        ],
        model: 'HOMA1001_RGB',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver RGB',
        extend: [light({color: true})],
    },
    {
        fingerprint: [
            {
                modelID: 'HOMA1001',
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
        ],
        model: 'HOMA1001_CT',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver CT',
        extend: [light()],
    },
    {
        fingerprint: [
            {
                modelID: 'HOMA1001',
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
        ],
        model: 'HOMA1001_SC',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver SC',
        extend: [light()],
    },
    {
        zigbeeModel: ['HOMA1008', '00A'],
        model: 'HLD812-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver',
        extend: [light()],
    },
    {
        zigbeeModel: ['HOMA1009', '050', 'HOMA1022'],
        model: 'HLD503-Z-CT',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver',
        extend: [light({colorTemp: {range: [150, 500]}})],
    },
    {
        zigbeeModel: ['HOMA1002', 'HOMA1004', 'HOMA0019', 'HOMA0006', 'HOMA000F', '019'],
        model: 'HLC610-Z',
        vendor: 'Shenzhen Homa',
        description: 'Wireless dimmable controller',
        extend: [light()],
    },
    {
        zigbeeModel: ['HOMA1031'],
        model: 'HLC821-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'ZigBee AC phase-cut dimmer',
        extend: [light()],
    },
    {
        zigbeeModel: ['HOMA1005'],
        model: 'HLC614-ZLL',
        vendor: 'Shenzhen Homa',
        description: '3 channel relay module',
        extend: [deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}), onOff({endpointNames: ['l1', 'l2', 'l3']})],
    },
    {
        zigbeeModel: ['HOMA1064', '012'],
        model: 'HLC833-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'Wireless dimmable controller',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
