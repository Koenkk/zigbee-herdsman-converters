const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['TLSR82xx'],
        model: '33951/33948',
        vendor: 'AwoX',
        description: 'LED white',
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599, 10], outputClusters: [6]},
                {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
            ]},
            {type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                {ID: 1, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096], outputClusters: [6, 25]},
                {ID: 3, profileID: 49152, deviceID: 258, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
            ]},
            {type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
            ]},
            {type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
            ]},
        ],
        model: '33943/33944/33946',
        vendor: 'AwoX',
        description: 'LED RGB & brightness',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                {ID: 3, profileID: 4751, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
            ]},
        ],
        model: '33957',
        vendor: 'AwoX',
        description: 'LED light with color temperature',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096], outputClusters: [6, 25]},
                {ID: 3, profileID: 49152, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
            ]},
        ],
        model: '33955',
        vendor: 'Eglo',
        description: 'LED light with color temperature',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
];
