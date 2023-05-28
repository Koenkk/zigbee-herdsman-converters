const exposes = require('../lib/exposes');
const legacy = require('../lib/legacy');
const fz = {...require('../converters/fromZigbee'), legacy: legacy.fromZigbee};
const tz = {...require('../converters/toZigbee'), legacy: legacy.toZigbee};
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['ivfvd7h', 'eaxp72v\u0000', 'kfvq6avy\u0000', 'fvq6avy\u0000', 'fvq6avy', 'zk78ptr\u0000', '4yfvweb\u0000'],
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_zivfvd7h'},
            {modelId: 'TS0601', manufacturerName: '_TZE200_kfvq6avy'},
            {modelId: 'TS0601', manufacturerName: '_TZE200_hhrtiq0x'},
            {modelId: 'TS0601', manufacturerName: '_TZE200_ps5v5jor'},
            {modelId: 'TS0601', manufacturerName: '_TZE200_jeaxp72v'},
            {modelId: 'TS0601', manufacturerName: '_TZE200_owwdxjbx'},
            {modelId: 'TS0601', manufacturerName: '_TZE200_2cs6g9i7'},
            {modelId: 'TS0601', manufacturerName: '_TZE200_04yfvweb'}],
        model: 'GS361A-H04',
        vendor: 'Siterwell',
        description: 'Radiator valve with thermostat',
        fromZigbee: [fz.legacy.tuya_thermostat, fz.ignore_basic_report],
        meta: {tuyaThermostatSystemMode: legacy.thermostatSystemModes4, tuyaThermostatPreset: legacy.thermostatPresets,
            tuyaThermostatPresetToSystemMode: legacy.thermostatSystemModes4},
        toZigbee: [tz.legacy.tuya_thermostat_child_lock, tz.legacy.siterwell_thermostat_window_detection, tz.legacy.tuya_thermostat_valve_detection,
            tz.legacy.tuya_thermostat_current_heating_setpoint, tz.legacy.tuya_thermostat_system_mode, tz.legacy.tuya_thermostat_auto_lock,
            tz.legacy.tuya_thermostat_calibration, tz.legacy.tuya_thermostat_min_temp, tz.legacy.tuya_thermostat_max_temp,
            tz.legacy.tuya_thermostat_comfort_temp, tz.legacy.tuya_thermostat_eco_temp, tz.legacy.tuya_thermostat_force,
            tz.legacy.tuya_thermostat_preset, tz.legacy.tuya_thermostat_boost_time],
        whiteLabel: [{vendor: 'Essentials', description: 'Smart home heizkörperthermostat premium', model: '120112'},
            {vendor: 'TuYa', description: 'Głowica termostatyczna', model: 'GTZ02'},
            {vendor: 'Revolt', description: 'Thermostatic Radiator Valve Controller', model: 'NX-4911'},
            {vendor: 'Unitec', description: 'Thermostatic Radiator Valve Controller', model: '30946'},
            {vendor: 'Tesla Smart', description: 'Thermostatic Radiator Valve Controller', model: 'TSL-TRV-GS361A'},
            {vendor: 'Nedis', description: 'Thermostatic Radiator Valve Controller', model: 'ZBHTR10WT'},
            {vendor: 'TCP Smart', description: 'Smart Thermostatic Radiator Valve', model: 'TBUWTRV'},
            {vendor: 'Brennenstuhl', description: 'Radiator Thermostat', model: 'HT CZ 01'},
            {vendor: 'Appartme', description: 'Głowica termostatyczna', model: 'APRM-04-001'}],
        exposes: [e.child_lock(), e.window_detection(), e.battery(), e.valve_detection(),
            e.position().withDescription('TRV valve position in %.'),
            exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)],
    },
];
