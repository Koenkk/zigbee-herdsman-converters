import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
const ea = exposes.access;


const definition = {
    zigbeeModel: ['Aidoo Zigbee'],
    model: 'Aidoo Zigbee AZAI6ZBEMHI',
    vendor: 'Airzone',
    description: 'Gateway for two-way control and integration of AirCon Units.AZAI6ZBEMHI for Mitsubishi Heavy',
    fromZigbee: [fz.thermostat, fz.on_off, fz.fan],
    toZigbee: [
        tz.thermostat_local_temperature,
        tz.thermostat_occupied_heating_setpoint,
        tz.thermostat_occupied_cooling_setpoint,
        tz.thermostat_system_mode,
        tz.on_off,
        tz.fan_mode,
    ],
    exposes: [
        e.local_temperature(),
        e.numeric('occupied_heating_setpoint', ea.ALL).withUnit('°C').withDescription('Occupied heating setpoint'),
        e.numeric('occupied_cooling_setpoint', ea.ALL).withUnit('°C').withDescription('Specifies the cooling mode setpoint when the room is occupied.'),
        exposes.Enum('system_mode', ea.ALL, ['off', 'auto', 'cool', 'heat', 'fan_only', 'dry'])
            .withDescription('Specifies the current operating mode of the thermostat.'),
        e.switch(),
        exposes.Enum('fan_mode', ea.ALL, ['off', 'low', 'medium', 'high', 'on', 'auto']).withDescription('Fan mode'),
    ],
    endpoint: (device) => {
        return { 'system': 1 };
    },
    meta: { configureKey: 1 },
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl', 'genOnOff']);
        await reporting.thermostatTemperature(endpoint);
        await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
        await reporting.onOff(endpoint);
        await reporting.fanMode(endpoint);
    },
};

module.exports = definition;