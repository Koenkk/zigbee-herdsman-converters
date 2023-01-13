const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_yenbr4om'}],
        model: 'BSEED_TS0601_cover',
        vendor: 'BSEED',
        description: 'Zigbee curtain switch',
        fromZigbee: [fz.tuya_cover],
        toZigbee: [tz.tuya_cover_control],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
];
