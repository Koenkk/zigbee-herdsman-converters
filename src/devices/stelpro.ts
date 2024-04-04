import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {Definition, Fz} from '../lib/types';
const e = exposes.presets;
import * as constants from '../lib/constants';

const fzLocal = {
    power: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('16392')) {
                return {power: msg.data['16392']};
            }
        },
    } satisfies Fz.Converter,
    energy: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('16393')) {
                return {energy: parseFloat(msg.data['16393']) / 1000};
            }
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['HT402'],
        model: 'HT402',
        vendor: 'Stelpro',
        description: 'Hilo thermostat',
        fromZigbee: [fz.stelpro_thermostat, fz.hvac_user_interface, fzLocal.power, fzLocal.energy],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode,
            tz.thermostat_running_state, tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(), e.power(), e.energy(),
            e.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['heat']).withRunningState(['idle', 'heat'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // Has Unknown power source, force it.
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['ST218'],
        model: 'ST218',
        vendor: 'Stelpro',
        description: 'Ki convector, line-voltage thermostat',
        fromZigbee: [legacy.fz.stelpro_thermostat, legacy.fz.hvac_user_interface],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            e.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Ki
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }]);
        },
    },
    {
        zigbeeModel: ['STZB402+', 'STZB402'],
        model: 'STZB402',
        vendor: 'Stelpro',
        description: 'Ki, line-voltage thermostat',
        fromZigbee: [legacy.fz.stelpro_thermostat, legacy.fz.hvac_user_interface, fz.humidity],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode,
            tz.thermostat_running_state, tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(), e.humidity(),
            e.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Ki
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }]);
        },
    },
    {
        zigbeeModel: ['MaestroStat'],
        model: 'SMT402',
        vendor: 'Stelpro',
        description: 'Maestro, line-voltage thermostat',
        fromZigbee: [legacy.fz.stelpro_thermostat, legacy.fz.hvac_user_interface, fz.humidity],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(), e.humidity(),
            e.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msRelativeHumidity',
                'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Maestro
            await reporting.thermostatTemperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1}]);
        },
    },
    {
        zigbeeModel: ['SORB'],
        model: 'SORB',
        vendor: 'Stelpro',
        description: 'ORLÉANS fan heater',
        fromZigbee: [fz.stelpro_thermostat, fz.hvac_user_interface],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            e.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro SORB
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1}]);
        },
    },
    {
        zigbeeModel: ['SMT402AD'],
        model: 'SMT402AD',
        vendor: 'Stelpro',
        description: 'Maestro, line-voltage thermostat',
        fromZigbee: [legacy.fz.stelpro_thermostat, legacy.fz.hvac_user_interface, fz.humidity],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(), e.humidity(),
            e.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msRelativeHumidity',
                'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Maestro
            await reporting.thermostatTemperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1}]);
        },
    },
];

export default definitions;
module.exports = definitions;
