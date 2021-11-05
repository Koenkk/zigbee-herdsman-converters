const extend = require('../lib/extend');

module.exports = [
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'BEGA Gantenbrink-Leuchten KG', modelID: '', endpoints: [
                {ID: 1, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 9, 768, 769, 64733], outputClusters: [25]},
            ]},
        ],
        model: '70049',
        vendor: 'Bega',
        description: 'Zigbee control module DALI',
        extend: extend.light_onoff_brightness(),
    },
];
