const extend = require('../lib/extend');
const fz = require('../converters/fromZigbee');
const exposes = require('../lib/exposes');
const e = exposes.presets;

const awoxRemoteHelper = {
    convertToColorName: (buffer) => {
        const commonForColors = buffer[0] === 17 && buffer[2] === 48 && buffer[3] === 0 && buffer[5] === 8 && buffer[6] === 0;

        if (commonForColors && buffer[4] === 255) {
            return 'red';
        } else if (commonForColors && buffer[4] === 42) {
            return 'yellow';
        } else if (commonForColors && buffer[4] === 85) {
            return 'green';
        } else if (commonForColors && buffer[4] === 170) {
            return 'blue';
        }
        return null;
    },
    isRefresh: (buffer) => {
        return buffer[0] === 17 && buffer[2] === 16 && buffer[3] === 1 && buffer[4] === 1;
    },
};

const fzLocal = {
    colors: {
        cluster: 'lightingColorCtrl',
        type: ['raw'],
        convert: (model, msg, publish, options, meta) => {
            const color = awoxRemoteHelper.convertToColorName(msg.data);
            if (color != null) {
                return {
                    action: color,
                };
            }
        },
    },
    refreshColored: {
        cluster: 'lightingColorCtrl',
        type: ['commandMoveHue'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.movemode === 1 && msg.data.rate === 12) {
                return {
                    action: 'refresh_colored',
                };
            }
        },
    },
    refresh: {
        cluster: 'genLevelCtrl',
        type: ['raw'],
        convert: (model, msg, publish, options, meta) => {
            if (awoxRemoteHelper.isRefresh(msg.data)) {
                return {
                    action: 'refresh',
                };
            }
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['TLSR82xx'],
        model: '33951/33948',
        vendor: 'AwoX',
        description: 'LED white',
        extend: extend.light_onoff_brightness(),
        whiteLabel: [{vendor: 'EGLO', model: '12229'}],
    },
    {
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
        fromZigbee: [fz.command_on, fzLocal.colors, fzLocal.refresh, fzLocal.refreshColored, fz.command_off,
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
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370], supportsHS: true}),
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
        ],
        model: '33957',
        vendor: 'AwoX',
        description: 'LED light with color temperature',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
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
        vendor: 'Eglo',
        description: 'LED light with color temperature',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
];
