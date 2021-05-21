const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['7637434'],
        model: 'ZK03840',
        vendor: 'Viessmann',
        description: 'ViCare radiator thermostat valve',
        fromZigbee: [fz.legacy.viessmann_thermostat_att_report, fz.battery, fz.legacy.hvac_user_interface],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode, tz.thermostat_keypad_lockout, tz.viessmann_window_open, tz.viessmann_window_open_force,
            tz.viessmann_assembly_mode,
        ],
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1)
                .withLocalTemperature().withSystemMode(['heat', 'sleep']),
            exposes.binary('window_open', ea.STATE_GET, true, false)
                .withDescription('Detected by sudden temperature drop or set manually.'),
            exposes.binary('window_open_force', ea.ALL, true, false)
                .withDescription('Manually set window_open, ~1 minute to take affect.'),
            e.keypad_lockout(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 0x1221};
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genPowerCfg', 'genIdentify', 'genTime', 'hvacThermostat']);

            // standard ZCL attributes
            await reporting.batteryPercentageRemaining(endpoint, {min: 60, max: 43200, change: 1});
            await reporting.thermostatTemperature(endpoint, {min: 90, max: 900, change: 10});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: 65534, change: 1});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 60, max: 3600, change: 1});

            // manufacturer attributes
            await endpoint.configureReporting('hvacThermostat', [{attribute: 'viessmannWindowOpenInternal', minimumReportInterval: 60,
                maximumReportInterval: 3600}], options);

            // read window_open_force, we don't need reporting as it cannot be set physically on the device
            await endpoint.read('hvacThermostat', ['viessmannWindowOpenForce'], options);

            // read keypadLockout, we don't need reporting as it cannot be set physically on the device
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
        },
    },
];
