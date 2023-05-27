const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = {...require('../converters/toZigbee'), legacy: require('../lib/legacy').toZigbee};
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_vrjkcam9'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_d0ypnbvn'}],
        model: 'PF-PM02D-TYZ',
        vendor: 'IOTPerfect',
        description: 'Smart water/gas valve',
        extend: extend.switch(),
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.legacy.tuya_switch, fz.ignore_time_read, fz.ignore_basic_report],
        toZigbee: [tz.legacy.tuya_switch_state],
    },
];
