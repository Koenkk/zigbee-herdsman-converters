const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['ST218'],
        model: 'ST218',
        vendor: 'Stelpro',
        description: 'Ki convector, line-voltage thermostat',
        fromZigbee: [fz.legacy.stelpro_thermostat, fz.legacy.hvac_user_interface],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Ki
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await reporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{attribute: 'StelproSystemMode', minimumReportInterval: 1,
                maximumReportInterval: 0}]);
        },
    },
    {
        zigbeeModel: ['STZB402+', 'STZB402'],
        model: 'STZB402',
        vendor: 'Stelpro',
        description: 'Ki, line-voltage thermostat',
        fromZigbee: [fz.legacy.stelpro_thermostat, fz.legacy.hvac_user_interface, fz.humidity],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode,
            tz.thermostat_running_state, tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Ki
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await reporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{attribute: 'StelproSystemMode',
                minimumReportInterval: 1, maximumReportInterval: 0}]);
        },
    },
    {
        zigbeeModel: ['MaestroStat'],
        model: 'SMT402',
        vendor: 'Stelpro',
        description: 'Maestro, line-voltage thermostat',
        fromZigbee: [fz.legacy.stelpro_thermostat, fz.legacy.hvac_user_interface, fz.humidity],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msRelativeHumidity',
                'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Maestro
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await reporting.humidity(endpoint, {min: 10, max: 300, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await reporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode', minimumReportInterval: 1, maximumReportInterval: 0}]);
        },
    },
    {
        zigbeeModel: ['SMT402AD'],
        model: 'SMT402AD',
        vendor: 'Stelpro',
        description: 'Maestro, line-voltage thermostat',
        fromZigbee: [fz.legacy.stelpro_thermostat, fz.legacy.hvac_user_interface, fz.humidity],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msRelativeHumidity',
                'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Maestro
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await reporting.humidity(endpoint, {min: 10, max: 300, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await reporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode', minimumReportInterval: 1, maximumReportInterval: 0}]);
        },
    },
];
