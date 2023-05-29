const fz = require('../converters/fromZigbee');
const exposes = require('../lib/exposes');
const tuya = require('../lib/tuya');
const legacy = require('../lib/legacy');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_arge1ptm', '_TZE200_anv5ujhv']),
        model: 'QT-05M',
        vendor: 'QOTO',
        description: 'Solar powered garden watering timer',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_set_time, fz.ignore_onoff_report, legacy.fromZigbee.watering_timer],
        toZigbee: [legacy.toZigbee.valve_state, legacy.toZigbee.shutdown_timer, legacy.toZigbee.valve_state_auto_shutdown],
        exposes: [
            exposes.numeric('water_flow', ea.STATE).withUnit('%').withValueMin(0).withDescription('Current water flow in %.'),
            exposes.numeric('last_watering_duration', ea.STATE).withUnit('sec').withValueMin(0)
                .withDescription('Last watering duration in seconds.'),
            exposes.numeric('remaining_watering_time', ea.STATE).withUnit('sec').withValueMin(0)
                .withDescription('Remaning watering time (for auto shutdown). Updates every minute, and every 10s in the last minute.'),
            exposes.numeric('valve_state', ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(5).withUnit('%')
                .withDescription('Set valve to %.'),
            exposes.numeric('shutdown_timer', ea.STATE_SET).withValueMin(0).withValueMax(14400).withUnit('sec')
                .withDescription('Auto shutdown in seconds.'),
            exposes.numeric('valve_state_auto_shutdown', ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(5).withUnit('%')
                .withDescription('Set valve to % with auto shutdown.'),
            e.battery(),
        ],
    },
];
