const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['SPZB0001'],
        model: 'SPZB0001',
        vendor: 'Eurotronic',
        description: 'Spirit Zigbee wireless heater thermostat',
        fromZigbee: [fz.legacy.eurotronic_thermostat, fz.battery],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration, tz.eurotronic_thermostat_system_mode, tz.eurotronic_host_flags,
            tz.eurotronic_error_status, tz.thermostat_setpoint_raise_lower, tz.thermostat_control_sequence_of_operation,
            tz.thermostat_remote_sensing, tz.thermostat_local_temperature, tz.thermostat_running_state,
            tz.eurotronic_current_heating_setpoint, tz.eurotronic_trv_mode, tz.eurotronic_valve_position],
        exposes: [e.battery(), exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withLocalTemperatureCalibration()
            .withPiHeatingDemand(),
        exposes.enum('eurotronic_trv_mode', exposes.access.ALL, [1, 2])
            .withDescription('Select between direct control of the valve via the `eurotronic_valve_position` or automatic control of the '+
            'valve based on the `current_heating_setpoint`. For manual control set the value to 1, for automatic control set the value '+
            'to 2 (the default). When switched to manual mode the display shows a value from 0 (valve closed) to 100 (valve fully open) '+
            'and the buttons on the device are disabled.'),
        exposes.numeric('eurotronic_valve_position', exposes.access.ALL).withValueMin(0).withValueMax(255)
            .withDescription('Directly control the radiator valve when `eurotronic_trv_mode` is set to 1. The values range from 0 (valve '+
            'closed) to 255 (valve fully open)')],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 4151};
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);
            await reporting.thermostatTemperature(endpoint, {min: 0, max: constants.repInterval.MINUTES_10, change: 25});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 0, max: constants.repInterval.MINUTES_10, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: constants.repInterval.MINUTES_10, change: 25});
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint, {min: 0, max: constants.repInterval.MINUTES_10, change: 25});
            await endpoint.configureReporting('hvacThermostat', [{attribute: {ID: 0x4003, type: 41}, minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.MINUTES_10, reportableChange: 25}], options);
            await endpoint.configureReporting('hvacThermostat', [{attribute: {ID: 0x4008, type: 34}, minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1}], options);
        },
    },
];
