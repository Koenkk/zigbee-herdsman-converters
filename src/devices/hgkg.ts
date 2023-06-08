import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import * as tuya from '../lib/tuya';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_dzuqwsyg'}],
        model: 'BAC-002-ALZB',
        vendor: 'HKGK',
        description: 'BAC series thermostat',
        fromZigbee: [
            legacy.fz.moes_thermostat,
            fz.ignore_basic_report,
            fz.ignore_tuya_set_time,
        ],
        onEvent: tuya.onEventSetLocalTime,
        toZigbee: [
            legacy.tz.moes_thermostat_child_lock,
            legacy.tz.moes_thermostat_current_heating_setpoint,
            legacy.tz.moes_thermostat_mode,
            legacy.tz.hgkg_thermostat_standby,
            legacy.tz.moes_thermostat_sensor,
            legacy.tz.moes_thermostat_calibration,
            legacy.tz.tuya_thermostat_schedule,
            legacy.tz.tuya_thermostat_week,
            legacy.tz.tuya_thermostat_schedule_programming_mode,
            legacy.tz.tuya_thermostat_bac_fan_mode,
        ],
        exposes: [
            // e.switch(),
            e.child_lock(),
            // e.deadzone_temperature(),
            e.climate()
                .withSetpoint('current_heating_setpoint', 5, 45, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-10, 10, 0.1, ea.STATE_SET)
                .withSystemMode(['off', 'cool'], ea.STATE_SET)
                // .withRunningState(['off','on'], ea.STATE)
                .withPreset(['hold', 'program'])
                .withFanMode(['off', 'low', 'medium', 'high', 'auto'], ea.STATE_SET),
            e.temperature_sensor_select(['IN', 'AL', 'OU']),
            e.composite('programming_mode', 'programming_mode', ea.STATE)
                .withDescription(
                    'Schedule MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature.',
                )
                .withFeature(e.week())
                .withFeature(e.text('workdays_schedule', ea.STATE_SET))
                .withFeature(e.text('holidays_schedule', ea.STATE_SET)),
        ],
    },
];

module.exports = definitions;
