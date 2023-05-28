const exposes = require('../lib/exposes');
const legacy = require('../lib/legacy');
const fz = {...require('../converters/fromZigbee'), legacy: legacy.fromZigbee};
const tz = {...require('../converters/toZigbee'), legacy: legacy.toZigbee};
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [
            {modelID: 'daqwrsj\u0000', manufacturerName: '_TYST11_8daqwrsj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_qtbrwrfv'},
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
        exposes: [e.child_lock(), e.window_detection(), e.battery(), exposes.climate()
            .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)],
    },
    {
        fingerprint: [{modelID: 'tbrwrfv\u0000', manufacturerName: '_TYST11_qtbrwrfv'}],
        model: 'SMART-SMOKE10',
        vendor: 'Alecto',
        description: 'Smoke detector',
        fromZigbee: [fz.legacy.tuya_alecto_smoke],
        toZigbee: [tz.legacy.tuya_alecto_smoke],
        meta: {},
        exposes: [exposes.text('smoke_state', ea.STATE, ['alarm', 'normal']),
            exposes.text('battery_state', ea.STATE, ['low', 'middle', 'high']),
            exposes.text('checking_result', ea.STATE, ['checking', 'check_success', 'check_failure', 'others']),
            exposes.numeric('smoke_value', ea.STATE),
            exposes.numeric('battery', ea.STATE),
            exposes.binary('lifecycle', ea.STATE, true, false),
            exposes.binary('self_checking', ea.STATE_SET, true, false),
            exposes.binary('silence', ea.STATE_SET, true, false)],
    },
];
