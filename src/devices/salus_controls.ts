import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import {electricityMeter, onOff} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SPE600'],
        model: 'SPE600',
        vendor: 'Salus Controls',
        description: 'Smart plug (EU socket)',
        extend: [onOff(), electricityMeter({cluster: 'metering'})],
        ota: {manufacturerName: 'SalusControls'},
    },
    {
        zigbeeModel: ['SP600'],
        model: 'SP600',
        vendor: 'Salus Controls',
        description: 'Smart plug (UK socket)',
        extend: [onOff(), electricityMeter({cluster: 'metering', fzMetering: fz.SP600_power})],
        ota: {manufacturerName: 'SalusControls'},
    },
    {
        zigbeeModel: ['SX885ZB'],
        model: 'SX885ZB',
        vendor: 'Salus Controls',
        description: 'miniSmartPlug',
        extend: [onOff(), electricityMeter({cluster: 'metering'})],
        ota: {manufacturerName: 'SalusControls'},
    },
    {
        zigbeeModel: ['SR600'],
        model: 'SR600',
        vendor: 'Salus Controls',
        description: 'Relay switch',
        extend: [onOff({ota: {manufacturerName: 'SalusControls'}})],
    },
    {
        zigbeeModel: ['SW600'],
        model: 'SW600',
        vendor: 'Salus Controls',
        description: 'Door or window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: 'SalusControls'},
    },
    {
        zigbeeModel: ['WLS600'],
        model: 'WLS600',
        vendor: 'Salus Controls',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: 'SalusControls'},
    },
    {
        zigbeeModel: ['OS600'],
        model: 'OS600',
        vendor: 'Salus Controls',
        description: 'Door or window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: 'SalusControls'},
    },
    {
        zigbeeModel: ['SS909ZB', 'PS600'],
        model: 'PS600',
        vendor: 'Salus Controls',
        description: 'Pipe temperature sensor',
        fromZigbee: [fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        exposes: [e.battery(), e.temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        ota: {manufacturerName: 'SalusControls'},
    },
    {
        zigbeeModel: ['RE600'],
        model: 'RE600',
        vendor: 'Salus Controls',
        description: 'Router Zigbee',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        ota: {manufacturerName: 'SalusControls'},
    },
    {
        zigbeeModel: ['FC600'],
        model: 'FC600',
        vendor: 'Salus Controls',
        description: 'Fan coil thermostat',
        extend: [],
        fromZigbee: [fz.thermostat, fz.fan],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_setpoint_raise_lower,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_relay_status_log,
            tz.thermostat_running_state,
            tz.thermostat_keypad_lockout,
            tz.fan_mode,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint('occupied_heating_setpoint', 5, 40, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat', 'cool', 'auto'])
                .withRunningMode(['off', 'cool', 'heat'])
                .withRunningState(['idle', 'heat', 'cool'])
                .withLocalTemperatureCalibration(-3, 3, 0.5)
                .withFanMode(['off', 'low', 'medium', 'high', 'auto']),
            e.keypad_lockout(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            const binds = ['genBasic', 'genIdentify', 'genTime', 'hvacThermostat', 'hvacFanCtrl', 'hvacUserInterfaceCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.fanMode(endpoint);
            await reporting.thermostatRunningMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
        },
        ota: true,
    },
];

export default definitions;
module.exports = definitions;
