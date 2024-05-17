import {Definition, Fz} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
import {light, onOff} from '../lib/modernExtend';
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    on_off_via_brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('currentLevel')) {
                const currentLevel = Number(msg.data['currentLevel']);
                const property = utils.postfixWithEndpointName('state', msg, model, meta);
                return {[property]: currentLevel > 0 ? 'ON' : 'OFF'};
            }
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['DL15S'],
        model: 'DL15S-1BZ',
        vendor: 'Leviton',
        description: 'Lumina RF 15A switch, 120/277V',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['DG6HD'],
        model: 'DG6HD-1BW',
        vendor: 'Leviton',
        description: 'Zigbee in-wall smart dimmer',
        extend: [light({effect: false, configureReporting: true})],
    },
    {
        zigbeeModel: ['DG3HL'],
        model: 'DG3HL-1BW',
        vendor: 'Leviton',
        description: 'Indoor Decora smart Zigbee 3.0 certified plug-in dimmer',
        extend: [light({effect: false, configureReporting: true})],
    },
    {
        zigbeeModel: ['DG15A'],
        model: 'DG15A-1BW',
        vendor: 'Leviton',
        description: 'Indoor Decora smart Zigbee 3.0 certified plug-in outlet',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['DG15S'],
        model: 'DG15S-1BW',
        vendor: 'Leviton',
        description: 'Decora smart Zigbee 3.0 certified 15A switch',
        extend: [onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['65A01-1'],
        model: 'RC-2000WH',
        vendor: 'Leviton',
        description: 'Omnistat2 wireless thermostat',
        fromZigbee: [legacy.fz.thermostat_att_report, fz.fan],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration, tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_cooling_setpoint, tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log, tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration, tz.fan_mode],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
            await reporting.fanMode(endpoint);
        },
        exposes: [
            e.climate().withSetpoint('occupied_heating_setpoint', 10, 30, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat', 'cool']).withFanMode(['auto', 'on', 'smart'])
                .withSetpoint('occupied_cooling_setpoint', 10, 30, 1)
                .withLocalTemperatureCalibration().withPiHeatingDemand()],
    },
    {
        // Reference from a similar switch: https://gist.github.com/nebhead/dc5a0a827ec14eef6196ded4be6e2dd0
        zigbeeModel: ['ZS057'],
        model: 'ZS057-D0Z',
        vendor: 'Leviton',
        description: 'Wall switch, 0-10V dimmer, 120-277V, Lumina™ RF',
        meta: {disableDefaultResponse: true},
        extend: [light({effect: false, configureReporting: true})],
        fromZigbee: [fzLocal.on_off_via_brightness, fz.lighting_ballast_configuration],
        toZigbee: [tz.ballast_config],
        exposes: [
            // Note: ballast_power_on_level used to be here, but it doesn't appear to work properly with this device
            // If set, it's reset back to 0 when the device is turned off then back to 32 when turned on
            e.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum brightness value'),
            e.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum brightness value')],
    },
];

export default definitions;
module.exports = definitions;
