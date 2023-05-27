const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = {...require('../converters/toZigbee'), legacy: require('../lib/legacy').toZigbee};
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
            fz.legacy.moes_thermostat,
            fz.ignore_basic_report,
            fz.ignore_tuya_set_time,
        ],
        onEvent: tuya.onEventSetLocalTime,
        toZigbee: [
            tz.legacy.moes_thermostat_child_lock,
            tz.legacy.moes_thermostat_current_heating_setpoint,
            tz.legacy.moes_thermostat_mode,
            tz.legacy.hgkg_thermostat_standby,
            tz.legacy.moes_thermostat_sensor,
            tz.legacy.moes_thermostat_calibration,
            tz.legacy.tuya_thermostat_schedule,
            tz.legacy.tuya_thermostat_week,
            tz.legacy.tuya_thermostat_schedule_programming_mode,
            tz.legacy.tuya_thermostat_bac_fan_mode,
        ],
        exposes: [
            // e.switch(),
            e.child_lock(),
            // e.deadzone_temperature(),
            exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 45, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-10, 10, 0.1, ea.STATE_SET)
                .withSystemMode(['off', 'cool'], ea.STATE_SET)
                // .withRunningState(['off','on'], ea.STATE)
                .withPreset(['hold', 'program'])
                .withFanMode(['off', 'low', 'medium', 'high', 'auto'], ea.STATE_SET),
            e.temperature_sensor_select(['IN', 'AL', 'OU']),
            exposes.composite('programming_mode', 'programming_mode', ea.STATE)
                .withDescription(
                    'Schedule MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature.',
                )
                .withFeature(e.week())
                .withFeature(exposes.text('workdays_schedule', ea.STATE_SET))
                .withFeature(exposes.text('holidays_schedule', ea.STATE_SET)),
        ],
    },
];
