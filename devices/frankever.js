const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_wt9agwf3'}],
        model: 'FK_V02',
        vendor: 'FrankEver',
        description: 'Zigbee smart water valve',
        fromZigbee: [fz.frankever_valve],
        toZigbee: [tz.tuya_switch_state, tz.frankever_threshold, tz.frankever_timer],
        exposes: [e.switch().setAccess('state', ea.STATE_SET),
            exposes.numeric('threshold', exposes.access.STATE_SET).withValueMin(0).withValueMax(100).withUnit('%')
                .withDescription('Valve open percentage (multiple of 10)'),
            exposes.numeric('timer', exposes.access.STATE_SET).withValueMin(0).withValueMax(600).withUnit('minutes')
                .withDescription('Countdown timer in minutes')],
    },
];
