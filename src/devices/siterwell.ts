import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ivfvd7h", "eaxp72v\u0000", "kfvq6avy\u0000", "fvq6avy\u0000", "fvq6avy", "zk78ptr\u0000", "4yfvweb\u0000"],
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE200_zivfvd7h",
            "_TZE200_kfvq6avy",
            "_TZE200_hhrtiq0x",
            "_TZE200_ps5v5jor",
            "_TZE200_jeaxp72v",
            "_TZE200_owwdxjbx",
            "_TZE200_2cs6g9i7",
            "_TZE200_04yfvweb",
            "_TZE200_lrznf59v",
        ]),
        model: "GS361A-H04",
        vendor: "Siterwell",
        description: "Radiator valve with thermostat",
        fromZigbee: [legacy.fz.tuya_thermostat],
        meta: {
            tuyaThermostatSystemMode: legacy.thermostatSystemModes4,
            tuyaThermostatPreset: legacy.thermostatPresets,
            tuyaThermostatPresetToSystemMode: legacy.thermostatSystemModes4,
        },
        toZigbee: [
            legacy.tz.tuya_thermostat_child_lock,
            legacy.tz.siterwell_thermostat_window_detection,
            legacy.tz.tuya_thermostat_valve_detection,
            legacy.tz.tuya_thermostat_current_heating_setpoint,
            legacy.tz.tuya_thermostat_system_mode,
            legacy.tz.tuya_thermostat_auto_lock,
            legacy.tz.tuya_thermostat_calibration,
            legacy.tz.tuya_thermostat_min_temp,
            legacy.tz.tuya_thermostat_max_temp,
            legacy.tz.tuya_thermostat_comfort_temp,
            legacy.tz.tuya_thermostat_eco_temp,
            legacy.tz.tuya_thermostat_force,
            legacy.tz.tuya_thermostat_preset,
            legacy.tz.tuya_thermostat_boost_time,
        ],
        whiteLabel: [
            {vendor: "Essentials", description: "Smart home heizkörperthermostat premium", model: "120112"},
            {vendor: "Tuya", description: "Głowica termostatyczna", model: "GTZ02"},
            {vendor: "Revolt", description: "Thermostatic Radiator Valve Controller", model: "NX-4911"},
            {vendor: "Unitec", description: "Thermostatic Radiator Valve Controller", model: "30946"},
            {vendor: "Tesla Smart", description: "Thermostatic Radiator Valve Controller", model: "TSL-TRV-GS361A"},
            {vendor: "Nedis", description: "Thermostatic Radiator Valve Controller", model: "ZBHTR10WT"},
            {vendor: "TCP Smart", description: "Smart Thermostatic Radiator Valve", model: "TBUWTRV"},
            tuya.whitelabel("Brennenstuhl", "HT CZ 01", "Radiator thermostat", ["_TZE200_lrznf59v"]),
            {vendor: "Appartme", description: "Głowica termostatyczna", model: "APRM-04-001"},
        ],
        exposes: [
            e.child_lock(),
            e.window_detection(),
            e.battery(),
            e.valve_detection(),
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "auto", "heat"], ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE),
        ],
    },
];
