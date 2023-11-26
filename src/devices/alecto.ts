import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
const fz = {...require('../converters/fromZigbee'), legacy: legacy.fromZigbee};
const tz = {...require('../converters/toZigbee'), legacy: legacy.toZigbee};
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [
            {modelID: 'daqwrsj\u0000', manufacturerName: '_TYST11_8daqwrsj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_8daqwrsj'},
        ],
        model: 'SMART-HEAT10',
        vendor: 'Alecto',
        description: 'Radiator valve with thermostat',
        fromZigbee: [fz.legacy.tuya_thermostat, fz.ignore_basic_report],
        meta: {tuyaThermostatSystemMode: legacy.thermostatSystemModes4, tuyaThermostatPreset: legacy.thermostatPresets,
            tuyaThermostatPresetToSystemMode: legacy.thermostatSystemModes4},
        toZigbee: [tz.legacy.tuya_thermostat_child_lock, tz.legacy.siterwell_thermostat_window_detection,
            tz.legacy.tuya_thermostat_current_heating_setpoint, tz.legacy.tuya_thermostat_system_mode,
        ],
        exposes: [e.child_lock(), e.window_detection(), e.battery(), e.climate()
            .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)],
    },
    {
        fingerprint: [
            {modelID: 'tbrwrfv\u0000', manufacturerName: '_TYST11_qtbrwrfv'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_qtbrwrfv'},
        ],
        model: 'SMART-SMOKE10',
        vendor: 'Alecto',
        description: 'Smoke detector',
        fromZigbee: [fz.legacy.tuya_alecto_smoke],
        toZigbee: [tz.legacy.tuya_alecto_smoke],
        meta: {},
        exposes: [e.enum('smoke_state', ea.STATE, ['alarm', 'normal']),
            e.enum('battery_state', ea.STATE, ['low', 'middle', 'high']),
            e.enum('checking_result', ea.STATE, ['checking', 'check_success', 'check_failure', 'others']),
            e.numeric('smoke_value', ea.STATE),
            e.numeric('battery', ea.STATE),
            e.binary('lifecycle', ea.STATE, true, false),
            e.binary('self_checking', ea.STATE_SET, true, false),
            e.binary('silence', ea.STATE_SET, true, false)],
    },
];

export default definitions;
module.exports = definitions;
