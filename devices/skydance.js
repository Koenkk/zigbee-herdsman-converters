const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const globalStore = require('../lib/store');
const ota = require('../lib/ota');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_6qoazbre'}],
        model: 'WZ5_dim',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED Controller WZ5 (DIM mode)',
        meta: {applyRedFix: true, enhancedHue: false},
        fromZigbee: [fz.tuya_dimmer],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_dimmer_level],
        exposes: [
            e.light_brightness(),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_gz3n0tzf'}],
        model: 'WZ5_cct',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED Controller WZ5 (CCT mode)',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_9hghastn'}],
        model: 'WZ5_rgb',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED Controller WZ5 (RGB mode)',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_3thxjahu'}],
        model: 'WZ5_rgbw',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED Controller WZ5 (RGBW mode)',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_mde0utnv'}],
        model: 'WZ5_rgbcct',
        vendor: 'TuYa',
        description: 'Zigbee & RF 5 in 1 LED Controller WZ5 (RGB+CCT mode)',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        meta: {applyRedFix: true, enhancedHue: false},
    },
];