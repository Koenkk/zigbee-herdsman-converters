const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_579lguh2'},
        ],
        model: 'X706U',
        vendor: 'Lerlink',
        description: 'Zigbee dimmer switch',
        fromZigbee: [fz.moes_105_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.moes_105_dimmer],
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
    },
];