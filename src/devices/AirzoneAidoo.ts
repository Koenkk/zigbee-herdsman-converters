const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');

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
        exposes.numeric('local_temperature', exposes.access.ALL),
        exposes.numeric('occupied_heating_setpoint', exposes.access.ALL)
            .withUnit('°C')
            .withDescription('Occupied heating setpoint'),
        exposes.numeric('occupied_cooling_setpoint', exposes.access.ALL)
            .withUnit('°C')
            .withDescription('Specifies the cooling mode setpoint when the room is occupied.'),
        exposes.enum('system_mode', exposes.access.ALL, ['off', 'auto', 'cool', 'heat', 'fan_only', 'dry'])
            .withDescription('Specifies the current operating mode of the thermostat.'),
        exposes.binary('switch', exposes.access.ALL),
        exposes.enum('fan_mode', exposes.access.ALL, ['off', 'low', 'medium', 'high', 'on', 'auto'])
            .withDescription('Fan mode'),
    ],
    endpoint: (device: any) => {
        return { 'system': 1 };
    },
    meta: { configureKey: 1 },
    configure: async (device: any, coordinatorEndpoint: any, logger: any) => {
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
            exposes.climate()
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

module.exports = definition;
