const exposes = require('../lib/exposes');
const fz = { ...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee };
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [{
    zigbeeModel: ['PERCALE2 D1.00P1.01Z1.00'],
    model: 'PERCALE2',
    vendor: 'Acova',
    description: 'Acova Percale 2 Heater',
    fromZigbee: [
        fz.thermostat,
        fz.hvac_user_interface
    ],
    toZigbee: [
        tz.thermostat_local_temperature,
        tz.thermostat_system_mode,
        tz.thermostat_occupied_heating_setpoint,
        tz.thermostat_unoccupied_heating_setpoint,
        tz.thermostat_occupied_cooling_setpoint,
        tz.thermostat_running_state
    ],
    exposes: [
        exposes.climate()
            .withSetpoint('occupied_heating_setpoint', 7, 28, 0.5)
            .withLocalTemperature()
            .withSystemMode(['off', 'heat', 'auto'])
            .withRunningState(['idle', 'heat'], ea.STATE),
    ],
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);
        await reporting.thermostatTemperature(endpoint);
        await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
        await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
    },
}]