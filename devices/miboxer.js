const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;
const extend = require('../lib/extend');
const tuya = require('../lib/tuya');

module.exports = [
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_jicmoite'}],
        model: 'FUT039Z',
        vendor: 'Miboxer',
        description: 'RGB+CCT LED controller',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true, colorTempRange: [153, 500]}),
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0501B', manufacturerName: '_TZ3210_dxroobu3'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_dbilpfqk'}],
        model: 'FUT036Z',
        description: 'Single color LED controller',
        vendor: 'Miboxer',
        extend: extend.light_onoff_brightness(),
        onEvent: tuya.onEventSetTime,
    },
    {
        fingerprint: [{modelID: 'TS0502B', manufacturerName: '_TZ3210_frm6149r'}],
        model: 'FUT035Z',
        description: 'Dual white LED controller',
        vendor: 'Miboxer',
        extend: extend.light_onoff_brightness_colortemp({disableColorTempStartup: true, colorTempRange: [153, 500]}),
    },
    {
        fingerprint: [{modelID: 'TS0504B', manufacturerName: '_TZ3210_ttkgurpb'}],
        model: 'FUT038Z',
        description: 'RGBW LED controller',
        vendor: 'Miboxer',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true, colorTempRange: [153, 500]}),
    },
];
