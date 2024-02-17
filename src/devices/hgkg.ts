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
            legacy.tz.moes_thermostat_sensor,
            legacy.tz.moes_thermostat_calibration,
            legacy.tz.tuya_thermostat_schedule,
            legacy.tz.tuya_thermostat_week,
            legacy.tz.tuya_thermostat_schedule_programming_mode,
            legacy.tz.tuya_thermostat_bac_fan_mode,
            legacy.tz.moes_thermostat_mode,
            legacy.tz.moes_thermostat_mode2,
        ],
        exposes: [
            // e.switch(),
            e.child_lock(),
            // e.deadzone_temperature(),
            e.climate()
                .withSetpoint('current_heating_setpoint', 5, 45, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-10, 10, 0.1, ea.STATE_SET)
                .withSystemMode(['off', 'cool', 'heat', 'fan_only'], ea.STATE_SET)
                // .withRunningState(['off','on'], ea.STATE)
                .withPreset(['hold', 'program'])
                .withFanMode(['low', 'medium', 'high', 'auto'], ea.STATE_SET),
            e.temperature_sensor_select(['IN', 'AL', 'OU']),
            e.week(),
            e.text('workdays_schedule', ea.STATE_SET)
                .withDescription('Workdays schedule, 6 entries max, example: "00:20/5°C 01:20/5°C 6:59/15°C 18:00/5°C 20:00/5°C 23:30/5°C"'),
            e.text('holidays_schedule', ea.STATE_SET)
                .withDescription('Holidays schedule, 6 entries max, example: "00:20/5°C 01:20/5°C 6:59/15°C 18:00/5°C 20:00/5°C 23:30/5°C"'),
        ],
    },
];

export default definitions;
module.exports = definitions;
