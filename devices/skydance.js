const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_6qoazbre'}],
        model: 'WZ5_dim',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED Controller WZ5 (DIM mode)',
        fromZigbee: [fz.tuya_light_wz5],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_light_wz5],
        exposes: [
            e.light_brightness(),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_gz3n0tzf'}],
        model: 'WZ5_cct',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED Controller WZ5 (CCT mode)',
        fromZigbee: [fz.tuya_light_wz5],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_light_wz5],
        exposes: [
            exposes.light().withBrightness().setAccess('state',
                ea.STATE_SET).setAccess('brightness', ea.STATE_SET).withColorTemp([250, 454]).setAccess('color_temp', ea.STATE_SET),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_9hghastn'}],
        model: 'WZ5_rgb',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED Controller WZ5 (RGB mode)',
        fromZigbee: [fz.tuya_light_wz5],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_light_wz5],
        exposes: [
            exposes.light().withBrightness().setAccess('state', ea.STATE_SET).setAccess('brightness',
                ea.STATE_SET).withColor('hs'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_3thxjahu'}],
        model: 'WZ5_rgbw',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED Controller WZ5 (RGBW mode)',
        fromZigbee: [fz.tuya_light_wz5],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_light_wz5],
        exposes: [
            exposes.light().withBrightness().setAccess('state', ea.STATE_SET).setAccess('brightness',
                ea.STATE_SET).withColor('hs'),
            exposes.numeric('white_brightness', ea.STATE_SET).withValueMin(0).withValueMax(254).withDescription(
                'White brightness of this light'),
        ],
        meta: {separate_white: true},
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_mde0utnv'}],
        model: 'WZ5_rgbcct',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED Controller WZ5 (RGB+CCT mode)',
        fromZigbee: [fz.tuya_light_wz5],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_light_wz5],
        exposes: [
            exposes.light().withBrightness().setAccess('state', ea.STATE_SET).setAccess('brightness',
                ea.STATE_SET).withColor('hs').withColorTemp([250, 454]).setAccess('color_temp',
                ea.STATE_SET),
            exposes.numeric('white_brightness', ea.STATE_SET).withValueMin(0).withValueMax(254).withDescription(
                'White brightness of this light'),
        ],
        meta: {separate_white: true},
    },
];
