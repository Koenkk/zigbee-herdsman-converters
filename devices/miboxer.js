const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;
const extend = require('../lib/extend');

module.exports = [
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_jicmoite'}],
        model: 'FUT039Z',
        vendor: 'Miboxer',
        description: 'RGB+CCT LED controller',
        toZigbee: [tz.on_off, tz.tuya_led_control, tz.tuya_do_not_disturb, tz.tuya_color_power_on_behavior],
        fromZigbee: [fz.on_off, fz.tuya_led_controller, fz.brightness, fz.ignore_basic_report],
        exposes: [e.light_brightness_colortemp_colorhs([153, 500]).removeFeature('color_temp_startup'),
            exposes.binary('do_not_disturb', ea.STATE_SET, true, false)
                .withDescription('Do not disturb mode'),
            exposes.enum('color_power_on_behavior', ea.STATE_SET, ['initial', 'previous', 'cutomized'])
                .withDescription('Power on behavior state'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0501B', manufacturerName: '_TZ3210_dxroobu3'}],
        model: 'FUT036Z',
        description: 'Single color LED controller',
        vendor: 'Miboxer',
        extend: extend.light_onoff_brightness(),
    },
];
