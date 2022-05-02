const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [{
    fingerprint: [{ modelID: 'TS0601', manufacturerName: '_TZE200_akjefhj5' }, { modelID: 'TS0601', manufacturerName: '_TZE200_2wg5qrjy' }],
    model: 'ZVG1',
    vendor: 'RTX',
    description: 'Zigbee smart water valve',
    fromZigbee: [fz.ZVG1, fz.ignore_tuya_set_time, fz.ignore_basic_report],
    toZigbee: [tz.tuya_switch_state, tz.ZVG1_timer, tz.ZVG1_timer_state],
    exposes: [e.switch().setAccess('state', ea.STATE_SET), e.battery(),
        exposes.enum('timer_state', ea.STATE_SET, ['disabled', 'active', 'enabled']),
        exposes.numeric('timer', exposes.access.STATE_SET).withValueMin(0).withValueMax(240).withUnit('min')
            .withDescription('Auto off after specific time'),
        exposes.numeric('timer_time_left', exposes.access.STATE).withUnit('min')
            .withDescription('Auto off timer time left'),
        exposes.numeric('last_valve_open_duration', exposes.access.STATE).withUnit('min')
            .withDescription('Time the valve was open when state on'),
        exposes.numeric('water_consumed', exposes.access.STATE).withUnit('l')
            .withDescription('Liters of water consumed'),
    ],
}];