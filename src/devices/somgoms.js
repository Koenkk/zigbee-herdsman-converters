const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = {...require('../converters/toZigbee'), legacy: require('../lib/legacy').toZigbee};
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['tdtqgwv'],
        model: 'ZSTY-SM-11ZG-US-W',
        vendor: 'Somgoms',
        description: '1 gang switch',
        extend: extend.switch(),
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.legacy.tuya_switch, fz.ignore_time_read, fz.ignore_basic_report],
        toZigbee: [tz.legacy.tuya_switch_state],
    },
    {
        zigbeeModel: ['bordckq'],
        model: 'ZSTY-SM-1CTZG-US-W',
        vendor: 'Somgoms',
        description: 'Curtain switch',
        fromZigbee: [fz.legacy.tuya_cover, fz.ignore_basic_report],
        toZigbee: [tz.legacy.tuya_cover_control, tz.legacy.tuya_cover_options],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_sbordckq'}],
        model: 'SM-1CTW-EU',
        vendor: 'Somgoms',
        description: 'Curtain switch',
        fromZigbee: [fz.legacy.tuya_cover, fz.ignore_basic_report],
        toZigbee: [tz.legacy.tuya_cover_control, tz.legacy.tuya_cover_options],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
    {
        zigbeeModel: ['hpb9yts'],
        model: 'ZSTY-SM-1DMZG-US-W',
        vendor: 'Somgoms',
        description: 'Dimmer switch',
        fromZigbee: [fz.legacy.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.legacy.tuya_dimmer_state, tz.legacy.tuya_dimmer_level],
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        extend: extend.light_onoff_brightness(),
    },
];
