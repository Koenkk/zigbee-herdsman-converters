const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
    fingerprint: [
        {
            // The model ID from: Device with modelID 'TS0601' is not supported
            // You may need to add \u0000 at the end of the name in some cases
            modelID: 'TS0601',
            // The manufacturer name from: Device with modelID 'TS0601' is not supported.
            manufacturerName: '_TZE200_dmfguuli'
        },
    ],
    model: 'EZ200',
    vendor: 'Evanell',
    description: 'Thermostatic radiator valve',
    fromZigbee: [
        fz.ignore_basic_report, // Add this if you are getting no converter for 'genBasic'
        fz.tuya_data_point_dump, // This is a debug converter, it will be described in the next part
        fz.evanell_thermostat,
    ],
    toZigbee: [
        tz.tuya_data_point_test, // Another debug converter
        tz.evanell_thermostat_current_heating_setpoint,
        tz.evanell_thermostat_system_mode,
        tz.evanell_thermostat_child_lock,
    ],
    onEvent: tuya.onEventSetTime,
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
    },
    exposes: [
        e.child_lock(),
        e.battery(),
        exposes.climate()
            .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET),
    ],
},
];
