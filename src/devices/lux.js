const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');

module.exports = [
    {
        zigbeeModel: ['KONOZ'],
        model: 'KN-Z-WH1-B04',
        vendor: 'LUX',
        description: 'KONOz thermostat',
        fromZigbee: [fz.battery, fz.thermostat, fz.fan, fz.thermostat_weekly_schedule],
        toZigbee: [tz.thermostat_local_temperature,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint, tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_setpoint_raise_lower, tz.thermostat_running_state,
            tz.fan_mode, tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log],
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 10, 30, 0.05)
                .withSetpoint('occupied_cooling_setpoint', 10, 30, 0.05)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat', 'cool'])
                .withRunningState(['idle', 'heat', 'cool'])
                .withFanMode(['on', 'auto']),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3) || device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genPowerCfg', 'genTime', 'hvacThermostat', 'hvacUserInterfaceCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            await reporting.thermostatSystemMode(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.fanMode(endpoint);
        },
    },
];
