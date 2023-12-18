import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {light} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['ESMLFzm_w6_Dimm'],
        model: '12226',
        vendor: 'AwoX',
        description: 'Dimmable filament lamp',
        extend: [light()],
    },
    {
        zigbeeModel: ['TLSR82xx'],
        model: '33951/33948',
        vendor: 'AwoX',
        description: 'LED white',
        extend: [light()],
        whiteLabel: [{vendor: 'EGLO', model: '12229'}],
    },
    {
        zigbeeModel: ['ERCU_Zm'],
        fingerprint: [
            {
                type: 'EndDevice', manufacturerName: 'AwoX', modelID: 'TLSR82xx', powerSource: 'Battery', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 2048, inputClusters: [0, 3, 4, 4096], outputClusters: [0, 3, 4, 5, 6, 8, 768, 4096]},
                    {ID: 3, profileID: 4751, deviceID: 2048, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
        ],
        model: '33952',
        vendor: 'AwoX',
        description: 'Remote controller',
        fromZigbee: [fz.command_on, fz.awox_colors, fz.awox_refresh, fz.awox_refreshColored, fz.command_off,
            fz.command_step, fz.command_move, fz.command_stop, fz.command_recall, fz.command_step_color_temperature],
        toZigbee: [],
        exposes: [e.action(['on', 'off', 'red', 'refresh', 'refresh_colored', 'blue', 'yellow',
            'green', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            'recall_1', 'color_temperature_step_up', 'color_temperature_step_down'])],
    },
    {
        fingerprint: [
            {
                type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599, 10], outputClusters: [6]},
                    {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
            {
                type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599, 10], outputClusters: [6]},
                    {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361, 4], outputClusters: [65360, 65361]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
            {
                type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096], outputClusters: [6, 25]},
                    {ID: 3, profileID: 49152, deviceID: 258, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
            {
                type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                    {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
            {
                type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                    {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
        ],
        model: '33943/33944/33946',
        vendor: 'AwoX',
        description: 'LED RGB & brightness',
        extend: [light({colorTemp: {range: [153, 370]}, color: {modes: ['xy', 'hs']}})],
    },
    {
        fingerprint: [
            {
                type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                    {ID: 3, profileID: 4751, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
            {
                type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                    {ID: 3, profileID: 4751, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
            {
                type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599, 10], outputClusters: [6]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                    {ID: 3, profileID: 4751, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
            {
                type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599, 10], outputClusters: [6]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                    {ID: 3, profileID: 4751, deviceID: 268, inputClusters: [65360, 65361, 4], outputClusters: [65360, 65361]},
                ],
            },
        ],
        model: '33957',
        vendor: 'AwoX',
        description: 'LED light with color temperature',
        extend: [light({colorTemp: {range: [153, 454]}})],
        whiteLabel: [{vendor: 'EGLO', model: '12239'}],
    },
    {
        zigbeeModel: ['EGLO_ZM_TW'],
        fingerprint: [
            {
                type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096], outputClusters: [6, 25]},
                    {ID: 3, profileID: 49152, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
        ],
        model: '33955',
        vendor: 'AwoX',
        description: 'LED light with color temperature',
        extend: [light({colorTemp: {range: [153, 370]}})],
        whiteLabel: [{vendor: 'EGLO', model: '900316'}, {vendor: 'EGLO', model: '900317'}, {vendor: 'EGLO', model: '900053'}],
    },
];

export default definitions;
module.exports = definitions;
