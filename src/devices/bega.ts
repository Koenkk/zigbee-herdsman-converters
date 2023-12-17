import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'BEGA Gantenbrink-Leuchten KG', modelID: '', endpoints: [
                {ID: 1, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 9, 768, 769, 64733], outputClusters: [25]},
            ]},
        ],
        model: '70049',
        vendor: 'Bega',
        description: 'Zigbee control module DALI',
        extend: [light()],
    },
    {
        zigbeeModel: ['BEGA 13557 bulb E27 RGBW 805lm'],
        model: '13557',
        vendor: 'Bega',
        description: 'LED lamp with adjustable LED color temperature (Tunable White - RGBW) for use in luminaires with E27 lamp base',
        extend: [light({colorTemp: {range: [153, 556]}, color: true})],
    },
];

export default definitions;
module.exports = definitions;
