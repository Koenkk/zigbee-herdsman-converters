import {Definition} from 'zigbee-herdsman-converters/lib/types';
import {presets, access} from 'zigbee-herdsman-converters/lib/exposes';
import * as fz from 'zigbee-herdsman-converters/converters/fromZigbee';
import * as tz from 'zzigbee-herdsman-converters/converters/toZigbee';
import * as reporting from 'zigbee-herdsman-converters/lib/reporting';
import {Endpoint} from 'zigbee-herdsman/dist/controller/model';

import {Definition} from 'zigbee-herdsman-converters/lib/types';
import {presets, access} from 'zigbee2mqtt/lib/exposes';
import * as fz from 'zigbee2mqtt/lib/converters/fromZigbee';
import * as tz from 'zigbee2mqtt/lib/converters/toZigbee';
import * as reporting from 'zigbee2mqtt/lib/reporting';
import {Endpoint} from 'zigbee-herdsman/dist/controller/model';

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
        presets.local_temperature(),
        presets.numeric('occupied_heating_setpoint', access.ALL)
            .withUnit('°C')
            .withDescription('Occupied heating setpoint'),
        presets.numeric('occupied_cooling_setpoint', access.ALL)
            .withUnit('°C')
            .withDescription('Specifies the cooling mode setpoint when the room is occupied.'),
        presets.enum('system_mode', access.ALL, ['off', 'auto', 'cool', 'heat', 'fan_only', 'dry'])
            .withDescription('Specifies the current operating mode of the thermostat. Supported values are:\n- 0x00 = OFF\n- 0x01 = Auto\n- 0x03 = Cool\n- 0x04 = Heat\n- 0x07 = Fan Only\n- 0x08 = Dry'),
        presets.binary('switch', access.ALL),
        presets.enum('fan_mode', access.ALL, ['off', 'low', 'medium', 'high', 'on', 'auto'])
            .withDescription('Fan mode'),
    ],
    endpoint: (device: any): { [key: string]: number } => {
        return { 'system': 1 };
    },
    meta: { configureKey: 1 },
    configure: async (device: any, coordinatorEndpoint: Endpoint, logger: any): Promise<void> => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl', 'genOnOff']);
        await reporting.thermostatTemperature(endpoint);
        await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
        await reporting.onOff(endpoint);
        await reporting.fanMode(endpoint);
    },
    device: {
        type: 'climate',
        features: [
            presets.climate()
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
