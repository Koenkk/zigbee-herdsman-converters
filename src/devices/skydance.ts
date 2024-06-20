import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as tuya from '../lib/tuya';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_6qoazbre'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fcooykb4'},
        ],
        model: 'WZ5_dim_1',
        vendor: 'Skydance',
        description: 'Zigbee & RF 5 in 1 LED controller (DIM mode)',
        fromZigbee: [legacy.fz.tuya_light_wz5],
        toZigbee: [legacy.tz.tuya_dimmer_state, legacy.tz.tuya_light_wz5],
        exposes: [
            e.light().withBrightness().setAccess('state',
                ea.STATE_SET).setAccess('brightness', ea.STATE_SET),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_gz3n0tzf'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nthosjmx'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_na98lvjp'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2gtsuokt'},
        ],
        model: 'WZ5_cct',
        vendor: 'Skydance',
        description: 'Zigbee & RF 5 in 1 LED controller (CCT mode)',
        fromZigbee: [legacy.fz.tuya_light_wz5],
        toZigbee: [legacy.tz.tuya_dimmer_state, legacy.tz.tuya_light_wz5],
        exposes: [
            e.light().withBrightness().setAccess('state',
                ea.STATE_SET).setAccess('brightness', ea.STATE_SET).withColorTemp([250, 454]).setAccess('color_temp', ea.STATE_SET),
        ],
        whiteLabel: [
            tuya.whitelabel('Ltech', 'TY-75-24-G2Z2_CCT', '150W 24V Zigbee CV tunable white LED driver', ['_TZE200_na98lvjp']),
            tuya.whitelabel('Ltech', 'SE-20-250-1000-W2Z2', 'LED (CCT mode)', ['_TZE200_2gtsuokt']),
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
        fromZigbee: [legacy.fz.tuya_light_wz5],
        toZigbee: [legacy.tz.tuya_dimmer_state, legacy.tz.tuya_light_wz5],
        exposes: [
            e.light().withBrightness().setAccess('state', ea.STATE_SET).setAccess('brightness',
                ea.STATE_SET).withColor(['hs']).setAccess('color_hs', ea.STATE_SET),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0503B', manufacturerName: '_TZB210_zdvrsts8'}],
        model: 'WZ5_rgb_1',
        vendor: 'Tuya',
        description: 'Zigbee & RF 5 in 1 LED controller (RGB mode)',
        extend: [tuya.modernExtend.tuyaLight({color: {modes: ['hs', 'xy']}})],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_3thxjahu'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_g9jdneiu'},
        ],
        model: 'WZ5_rgbw',
        vendor: 'Skydance',
        description: 'Zigbee & RF 5 in 1 LED controller (RGBW mode)',
        fromZigbee: [legacy.fz.tuya_light_wz5],
        toZigbee: [legacy.tz.tuya_dimmer_state, legacy.tz.tuya_light_wz5],
        exposes: [
            e.light().withBrightness().setAccess('state', ea.STATE_SET).setAccess('brightness',
                ea.STATE_SET).withColor(['hs']).setAccess('color_hs', ea.STATE_SET),
            e.numeric('white_brightness', ea.STATE_SET).withValueMin(0).withValueMax(254).withDescription(
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
        fromZigbee: [legacy.fz.tuya_light_wz5],
        toZigbee: [legacy.tz.tuya_dimmer_state, legacy.tz.tuya_light_wz5],
        exposes: [
            e.light().withBrightness().setAccess('state', ea.STATE_SET).setAccess('brightness',
                ea.STATE_SET).withColor(['hs']).withColorTemp([250, 454]).setAccess('color_temp',
                ea.STATE_SET).setAccess('color_hs', ea.STATE_SET),
            e.numeric('white_brightness', ea.STATE_SET).withValueMin(0).withValueMax(254).withDescription(
                'White brightness of this light'),
        ],
        meta: {separateWhite: true},
    },
];

export default definitions;
module.exports = definitions;
