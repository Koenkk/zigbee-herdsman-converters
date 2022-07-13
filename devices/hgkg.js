const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_dzuqwsyg'}],
        model: 'BAC-002-ALZB',
        vendor: 'HKGK',
        description: 'BAC series thermostat',
        fromZigbee: [
            fz.moes_thermostat,
            fz.ignore_basic_report,
            fz.ignore_tuya_set_time,
            fz.fan,
        ],
        onEvent: tuya.onEventSetLocalTime,
        toZigbee: [
            tz.moes_thermostat_child_lock,
            tz.moes_thermostat_current_heating_setpoint,
            tz.moes_thermostat_mode,
            tz.hgkg_thermostat_standby,
            tz.moes_thermostat_sensor,
            tz.moes_thermostat_calibration,
            tz.tuya_thermostat_schedule,
            tz.tuya_thermostat_week,
            tz.tuya_thermostat_schedule_programming_mode,
            tz.tuya_thermostat_bac_fan_mode,
        ],
        exposes: [
            e.switch(),
            e.child_lock(),
            //e.deadzone_temperature(),
            exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 45, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(5, 45, 0.1, ea.STATE_SET)
                .withSystemMode(['off', 'heat', 'cool', 'auto', 'fan_only'], ea.STATE_SET)
                .withRunningState(['idle', 'heat', 'cool', 'fan_only'], ea.STATE)
                .withPreset(['hold', 'program'])
                .withSensor(['IN', 'AL', 'OU'], ea.STATE_SET)
                .withFanMode(['off', 'low', 'medium', 'high', 'auto']),
            exposes.composite('programming_mode')
              .withDescription(
                    'Schedule MODE ⏱ - In this mode, ' +
                     'the device executes a preset week programming temperature time and temperature.'
             )
             .withFeature(e.week())
             .withFeature(exposes.text('workdays_schedule', ea.STATE_SET))
             .withFeature(exposes.text('holidays_schedule', ea.STATE_SET)),
        ],
        onEvent: tuya.onEventSetLocalTime,
    },
];
