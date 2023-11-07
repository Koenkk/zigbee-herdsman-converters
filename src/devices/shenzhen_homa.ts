import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import extend from '../lib/extend';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        fingerprint: [
            {modelID: 'HOMA1001', endpoints: [
                {ID: 10, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'HOMA1001_RGBW',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver RGBW',
        extend: extend.light_onoff_brightness_color(),
        exposes: [e.light_brightness().withEndpoint('white'), e.light_brightness_colorxy().withEndpoint('rgb')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {white: 10, rgb: 11};
        },
    },
    {
        fingerprint: [
            {modelID: 'HOMA1001', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'HOMA1001_RGB',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver RGB',
        extend: extend.light_onoff_brightness_color(),
    },
    {
        fingerprint: [
            {modelID: 'HOMA1001', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'HOMA1001_CT',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver CT',
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [
            {modelID: 'HOMA1001', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'HOMA1001_SC',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver SC',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HOMA1008', '00A'],
        model: 'HLD812-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HOMA1009', '050'],
        model: 'HLD503-Z-CT',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['HOMA1002', 'HOMA1004', 'HOMA0019', 'HOMA0006', 'HOMA000F', '019'],
        model: 'HLC610-Z',
        vendor: 'Shenzhen Homa',
        description: 'Wireless dimmable controller',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HOMA1031'],
        model: 'HLC821-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'ZigBee AC phase-cut dimmer',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HOMA1005'],
        model: 'HLC614-ZLL',
        vendor: 'Shenzhen Homa',
        description: '3 channel relay module',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
    },
    {
        zigbeeModel: ['HOMA1064', '012'],
        model: 'HLC833-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'Wireless dimmable controller',
        extend: extend.light_onoff_brightness(),
    },
];

module.exports = definitions;
