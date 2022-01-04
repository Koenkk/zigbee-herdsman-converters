const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');

module.exports = [{
    zigbeeModel: ['PERCALE2 D1.00P1.01Z1.00'],
    model: 'PERCALE2',
    vendor: 'Acova',
    description: 'Percale 2 heater',
    fromZigbee: [fz.thermostat, fz.hvac_user_interface],
    toZigbee: [
        tz.thermostat_local_temperature,
        tz.thermostat_system_mode,
        tz.thermostat_occupied_heating_setpoint,
        tz.thermostat_unoccupied_heating_setpoint,
        tz.thermostat_occupied_cooling_setpoint,
        tz.thermostat_running_state,
    ],
    exposes: [
        exposes.climate()
            .withSetpoint('occupied_heating_setpoint', 7, 28, 0.5)
            .withLocalTemperature()
            .withSystemMode(['off', 'heat', 'auto'])
            .withRunningState(['idle', 'heat']),
    ],
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);
        await reporting.thermostatTemperature(endpoint);
        await reporting.thermostatRunningState(endpoint);
        await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
        await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
    },
}];
