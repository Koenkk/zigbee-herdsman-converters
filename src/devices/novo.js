const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_swhwv3k3'}],
        model: 'C10-3E-1.2',
        vendor: 'Novo',
        description: 'Curtain switch',
        fromZigbee: [fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [tz.tuya_cover_control, tz.tuya_cover_options],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
];
