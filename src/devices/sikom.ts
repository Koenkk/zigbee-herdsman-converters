import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['300-9715 Z3 Thermostat EP'],
        model: '300-9715V10',
        vendor: 'Sikom',
        description: 'Thermostat',
        fromZigbee: [fz.on_off, fz.thermostat],
        toZigbee: [tz.on_off, tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_occupied_heating_setpoint],
        exposes: [e.climate().withLocalTemperature().withSetpoint('occupied_heating_setpoint', 5, 40, 0.5).withSystemMode(['off', 'auto', 'heat']),
            e.binary('state', ea.ALL, 'ON', 'OFF').withDescription('Turn on or off.')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            await reporting.thermostatTemperature(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
