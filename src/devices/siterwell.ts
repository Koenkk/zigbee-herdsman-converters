import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as tuya from '../lib/tuya';
import fz from '../converters/fromZigbee';
import {Definition} from '../lib/types';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['ivfvd7h', 'eaxp72v\u0000', 'kfvq6avy\u0000', 'fvq6avy\u0000', 'fvq6avy', '4yfvweb\u0000'],
        model: 'GS361A-H04',
        vendor: 'Siterwell',
        description: 'Radiator valve with thermostat',
        fromZigbee: [legacy.fz.tuya_thermostat, fz.ignore_basic_report],
        meta: {tuyaThermostatSystemMode: legacy.thermostatSystemModes4, tuyaThermostatPreset: legacy.thermostatPresets,
            tuyaThermostatPresetToSystemMode: legacy.thermostatSystemModes4},
        toZigbee: [legacy.tz.tuya_thermostat_child_lock, legacy.tz.siterwell_thermostat_window_detection, legacy.tz.tuya_thermostat_valve_detection,
            legacy.tz.tuya_thermostat_current_heating_setpoint, legacy.tz.tuya_thermostat_system_mode, legacy.tz.tuya_thermostat_auto_lock,
            legacy.tz.tuya_thermostat_calibration, legacy.tz.tuya_thermostat_min_temp, legacy.tz.tuya_thermostat_max_temp,
            legacy.tz.tuya_thermostat_comfort_temp, legacy.tz.tuya_thermostat_eco_temp, legacy.tz.tuya_thermostat_force,
            legacy.tz.tuya_thermostat_preset, legacy.tz.tuya_thermostat_boost_time],
        whiteLabel: [
            tuya.whitelabel('TuYa', 'GTZ02', 'Głowica termostatyczna', ['_TZE200_zivfvd7h']),
            tuya.whitelabel('Revolt', 'NX-4911','Thermostatic Radiator Valve Controller', 'NX-4911', ['_TZE200_kfvq6avy']),
            tuya.whitelabel('Unitec', '30946', 'Thermostatic Radiator Valve Controller', ['_TZE200_ps5v5jor']),
            tuya.whitelabel('Tesla Smart', 'TSL-TRV-GS361A', 'Thermostatic Radiator Valve Controller', ['_TZE200_owwdxjbx']),
            tuya.whitelabel('Nedis', 'ZBHTR10WT', 'Thermostatic Radiator Valve Controller', ['_TZE200_hhrtiq0x']),
            {
                vendor: 'TCP Smart', 
                description: 'Smart Thermostatic Radiator Valve', 
                model: 'TBUWTRV', 
                fingerprint: [{zigbeeModel: 'zk78ptr\u0000'}]
            },
            tuya.whitelabel('Essentials', '120112', 'Smart home heizkörperthermostat premium', ['_TZE200_jeaxp72v']),
            tuya.whitelabel('Brennenstuhl', 'HT CZ 01', 'Radiator Thermostat', ['_TZE200_2cs6g9i7']),
            tuya.whitelabel('Appartme', 'APRM-04-001', 'Thermostatic Head', ['_TZE200_04yfvweb']),
        ],
        exposes: [e.child_lock(), e.window_detection(), e.battery(), e.valve_detection(),
            e.position().withDescription('TRV valve position in %.'),
            e.climate()
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)],
    },
];

export default definitions;
module.exports = definitions;
