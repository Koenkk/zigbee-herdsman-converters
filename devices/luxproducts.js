const exposes = require('zigbee-herdsman-converters/lib/exposes');
const fz = {...require('zigbee-herdsman-converters/converters/fromZigbee'), legacy: require('zigbee-herdsman-converters/lib/legacy').fromZigbee};
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['KONOZ'],
        model: 'KONOZ',
        vendor: 'LUX',
        description: 'Thermostat',
        fromZigbee: [fz.battery, fz.legacy.thermostat_att_report],
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint, tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_setpoint_raise_lower, tz.thermostat_running_state,
            tz.thermostat_remote_sensing, tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log],
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 10, 30, 0.05)
            .withSetpoint('occupied_cooling_setpoint', 10, 30, 0.05)
            .withLocalTemperature()
            .withSystemMode(['off', 'heat','cool','fan_only'])
            .withRunningState(['idle', 'heat', 'cool'])
            .withFanMode(['on','auto'])
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
