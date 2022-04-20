const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [
            {modelID: 'daqwrsj\u0000', manufacturerName: '_TYST11_8daqwrsj'},
        ],
        model: 'SMART-HEAT10',
        vendor: 'Alecto',
        description: 'Radiator valve with thermostat',
        fromZigbee: [fz.tuya_thermostat, fz.ignore_basic_report],
        meta: {tuyaThermostatSystemMode: tuya.thermostatSystemModes4, tuyaThermostatPreset: tuya.thermostatPresets,
            tuyaThermostatPresetToSystemMode: tuya.thermostatSystemModes4},
        toZigbee: [tz.tuya_thermostat_child_lock, tz.siterwell_thermostat_window_detection,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_system_mode,
        ],
        exposes: [e.child_lock(), e.window_detection(), e.battery(), exposes.climate()
            .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)],
    },
    {
        fingerprint: [
        {
            modelID: 'tbrwrfv\u0000',
            manufacturerName: '_TYST11_qtbrwrfv'
        },
    ],
    model: 'SMART-SMOKE10',
    vendor: 'Alecto',
    description: 'Alecto Smoke Detector SMART-SMOKE 10',
    fromZigbee: [
      fz.tuya_alecto_smoke],
    toZigbee: [tz.tuya_alecto_smoke],
    meta: {},
    exposes: [exposes.text("Smoke state", ea.STATE, ["Alarm", "Normal"]), 
        exposes.text('battery_state', ea.STATE, ["Low", "Middle", "High"]), 
        exposes.text("checking_result", ea.STATE, ["checking", "Check success", "Check failure", "Others"]), 
        exposes.numeric('smoke_value', ea.STATE), 
        exposes.numeric('battery', ea.STATE), 
        exposes.binary('lifecycle', ea.STATE), 
        exposes.enum('self_checking', ea.STATE_SET, ["True", "False"]), 
        exposes.enum('silence', ea.STATE, ["True", "False"])]
    },
];
