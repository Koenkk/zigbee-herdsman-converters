const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const extend = require('../lib/extend');
const reporting = require('../lib/reporting');
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_6qoazbre'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fcooykb4'},
        ],
        model: 'WZ5_dim',
        vendor: 'Skydance',
        description: 'Zigbee & RF 5 in 1 LED controller (DIM mode)',
        fromZigbee: [fz.tuya_light_wz5],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_light_wz5],
        exposes: [
            exposes.light().withBrightness().setAccess('state',
                ea.STATE_SET).setAccess('brightness', ea.STATE_SET),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_gz3n0tzf'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nthosjmx'},
        ],
        model: 'WZ5_cct',
        vendor: 'Skydance',
        description: 'Zigbee & RF 5 in 1 LED controller (CCT mode)',
        fromZigbee: [fz.tuya_light_wz5],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_light_wz5],
        exposes: [
            exposes.light().withBrightness().setAccess('state',
                ea.STATE_SET).setAccess('brightness', ea.STATE_SET).withColorTemp([250, 454]).setAccess('color_temp', ea.STATE_SET),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_9hghastn'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9mt3kgn0'},
        ],
        model: 'WZ5_rgb',
        vendor: 'Skydance',
        description: 'Zigbee & RF 5 in 1 LED controller (RGB mode)',
        fromZigbee: [fz.tuya_light_wz5],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_light_wz5],
        exposes: [
            exposes.light().withBrightness().setAccess('state', ea.STATE_SET).setAccess('brightness',
                ea.STATE_SET).withColor(['hs']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0503B', manufacturerName: '_TZB210_zdvrsts8'}],
        model: 'WZ5_rgb_1',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED controller (RGB mode)',
        extend: extend.light_onoff_brightness_color({supportsHS: true, preferHS: true, disableEffect: true}),
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_3thxjahu'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_g9jdneiu'},
        ],
        model: 'WZ5_rgbw',
        vendor: 'Skydance',
        description: 'Zigbee & RF 5 in 1 LED controller (RGBW mode)',
        fromZigbee: [fz.tuya_light_wz5],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_light_wz5],
        exposes: [
            exposes.light().withBrightness().setAccess('state', ea.STATE_SET).setAccess('brightness',
                ea.STATE_SET).withColor(['hs']),
            exposes.numeric('white_brightness', ea.STATE_SET).withValueMin(0).withValueMax(254).withDescription(
                'White brightness of this light'),
        ],
        meta: {separateWhite: true},
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_mde0utnv'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_aa9awrng'},
        ],
        model: 'WZ5_rgbcct',
        vendor: 'Skydance',
        description: 'Zigbee & RF 5 in 1 LED controller (RGB+CCT mode)',
        fromZigbee: [fz.tuya_light_wz5],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_light_wz5],
        exposes: [
            exposes.light().withBrightness().setAccess('state', ea.STATE_SET).setAccess('brightness',
                ea.STATE_SET).withColor(['hs']).withColorTemp([250, 454]).setAccess('color_temp',
                ea.STATE_SET),
            exposes.numeric('white_brightness', ea.STATE_SET).withValueMin(0).withValueMax(254).withDescription(
                'White brightness of this light'),
        ],
        meta: {separateWhite: true},
    },
    {
        fingerprint: [{modelID: 'TS0501B', manufacturerName: '_TZB210_rkgngb5o'}],
        model: 'WZ1',
        vendor: 'Skydance',
        description: 'Zigbee & RF 2 channel LED controller',
        extend: extend.light_onoff_brightness({noConfigure: true, disableEffect: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
];
