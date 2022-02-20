const exposes = require('../lib/exposes');
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
        toZigbee: extend.light_onoff_brightness_colortemp_color().toZigbee.concat([
            tz.tuya_do_not_disturb, tz.tuya_color_power_on_behavior,
        ]),
        meta: {applyRedFix: true, enhancedHue: false},
        fromZigbee: extend.light_onoff_brightness_colortemp_color().fromZigbee,
        exposes: [e.light_brightness_colortemp_colorhs([153, 500]).removeFeature('color_temp_startup'),
            exposes.binary('do_not_disturb', ea.STATE_SET, true, false)
                .withDescription('Do not disturb mode'),
            exposes.enum('color_power_on_behavior', ea.STATE_SET, ['initial', 'previous', 'cutomized'])
                .withDescription('Power on behavior state'),
        ],
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
        fingerprint: [{modelID: 'TS0502B', manufacturerName: '_TZ3210_frm6149r'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_jtifm80b'}],
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
