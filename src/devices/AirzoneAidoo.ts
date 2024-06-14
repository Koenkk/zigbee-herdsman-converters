import {Definition, Device, Endpoint, Logger} from 'zigbee-herdsman-converters';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';

const e = exposes.presets;
const ea = exposes.access;

const definition: Definition = {
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
        e.numeric('occupied_heating_setpoint', ea.ALL)
            .withUnit('°C')
            .withDescription('Occupied heating setpoint'),
        e.numeric('occupied_cooling_setpoint', ea.ALL)
            .withUnit('°C')
            .withDescription('Specifies the cooling mode setpoint when the room is occupied.'),
        e.enum('system_mode', ea.ALL, ['off', 'auto', 'cool', 'heat', 'fan_only', 'dry'])
            .withDescription('Specifies the current operating mode of the thermostat. Supported values are:\n- 0x00 = OFF\n- 0x01 = Auto\n- 0x03 = Cool\n- 0x04 = Heat\n- 0x07 = Fan Only\n- 0x08 = Dry'),
        e.binary('switch', ea.ALL),
        e.enum('fan_mode', ea.ALL, ['off', 'low', 'medium', 'high', 'on', 'auto'])
            .withDescription('Fan mode'),
    ],
    endpoint: (device: Device): { [key: string]: number } => {
        return { 'system': 1 };
    },
    meta: { configureKey: 1 } as any,
    configure: async (device: Device, coordinatorEndpoint: Endpoint, logger: Logger): Promise<void> => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl', 'genOnOff'], logger);
        await reporting.thermostatTemperature(endpoint, logger);
        await reporting.thermostatOccupiedHeatingSetpoint(endpoint, logger);
        await reporting.thermostatOccupiedCoolingSetpoint(endpoint, logger);
        await reporting.onOff(endpoint, logger);
        await reporting.fanMode(endpoint, logger);
    },
    device: {
        type: 'climate',
        features: [
            e.climate()
                .withLocalTemperature()
                .withSystemMode(['off', 'auto', 'cool', 'heat', 'fan_only', 'dry'])
                .withRunningState(['idle', 'heat', 'cool'])
                .withFanMode(['off', 'low', 'medium', 'high', 'on', 'auto'])
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('occupied_cooling_setpoint', 5, 30, 0.5)
        ]
    },
    ha_category: 'climate'
};

export default definition;
