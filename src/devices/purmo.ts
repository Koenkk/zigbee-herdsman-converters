import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: 'PUMM01102', manufacturerName: 'computime'}],
        model: 'Yali Parada Plus',
        vendor: 'Purmo/Radson',
        description: 'Electric oil-filled radiator',
        extend: [],
        fromZigbee: [fz.thermostat],
        toZigbee: [
            tz.thermostat_occupancy,
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_running_state,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_local_temperature_calibration,
        ],
        meta: {},
        exposes: [
            e
                .climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
                .withSystemMode(['heat', 'off'])
                .withLocalTemperature()
                .withLocalTemperatureCalibration()
                .withRunningState(['idle', 'heat'])
                .withRunningMode(['off', 'heat']),
            e.max_heat_setpoint_limit(5, 30, 0.5),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genTime', 'hvacThermostat', 'hvacUserInterfaceCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatRunningMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupancy(endpoint);
            await reporting.thermostatTemperatureCalibration(endpoint);

            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
];
