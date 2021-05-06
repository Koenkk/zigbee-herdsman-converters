const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');

module.exports = [
    {
        fingerprint: [{modelID: 'CCTFR6700', manufacturerName: 'Schneider Electric'}],
        model: 'CCTFR6700',
        vendor: 'Schneider Electric',
        description: 'Heating thermostat',
        fromZigbee: [fz.thermostat, fz.metering],
        toZigbee: [tz.thermostat_system_mode, tz.thermostat_running_state, tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation],
        exposes: [
                    exposes.climate().withSetpoint('occupied_heating_setpoint', 4, 30, 0.5)
                                     .withLocalTemperature()
                                     .withSystemMode(['off', 'auto', 'heat'])
                                     .withRunningState(['idle', 'heat'])
                                     .withPiHeatingDemand(),
                    exposes.power(),
                    exposes.energy(),
                    exposes.enum('schneider_pilot_mode', ea.ALL, ['relay', 'pilot'])
                           .withDescription('Controls piloting mode'),
                ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            var endpoint1 = device.getEndpoint(1);
            var endpoint2 = device.getEndpoint(2);
            
            await reporting.bind(endpoint1, coordinatorEndpoint, ['hvacThermostat']);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint1, {min: 1, max: 60, change: 1});
            await reporting.thermostatPIHeatingDemand(endpoint1, {min: 1, max: 60, change: 1});
            await reporting.bind(endpoint2, coordinatorEndpoint, ['seMetering']);
            await reporting.instantaneousDemand(endpoint2, {min: 1, max: 60, change: 1});
            await reporting.currentSummDelivered(endpoint2, {min: 1, max: 60, change: 1});
        },
    },
];
