const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_j0gtlepx'}],
        model: 'L122FF63H11A5.0W',
        vendor: 'Aldi',
        description: 'LIGHTWAY smart home LED-lamp - spot',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_iivsrikg'}],
        model: 'L122AA63H11A6.5W',
        vendor: 'Aldi',
        description: 'LIGHTWAY smart home LED-lamp - candle',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0502B', manufacturerName: '_TZ3000_g1glzzfk'}],
        model: 'F122SB62H22A4.5W',
        vendor: 'Aldi',
        description: 'LIGHTWAY smart home LED-lamp - filament',
        extend: extend.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_v1srfw9x'}],
        model: 'C422AC11D41H140.0W',
        vendor: 'Aldi',
        description: 'MEGOS LED panel RGB+CCT 40W 3600lm 62 x 62 cm',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_gb5gaeca'}],
        model: 'C422AC14D41H140.0W',
        vendor: 'Aldi',
        description: 'MEGOS LED panel RGB+CCT 40W 3600lm 30 x 120 cm',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS1001', manufacturerName: '_TZ3000_ztrfrcsu'}],
        model: '141L100RC',
        vendor: 'Aldi',
        description: 'MEGOS switch and dimming light remote control',
        exposes: [e.action(['on', 'off', 'brightness_stop', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down'])],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        toZigbee: [],
    },
];
