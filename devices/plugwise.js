const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['160-01'],
        model: '160-01',
        vendor: 'Plugwise',
        description: 'Plug power socket on/off with power consumption monitoring',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['106-03'],
        model: '106-03',
        vendor: 'Plugwise',
        description: 'Tom thermostatic radiator valve',
        fromZigbee: [fz.thermostat, fz.temperature, fz.battery, fz.legacy.plugwise_radiator_valve],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_pi_heating_demand,
            tz.plugwise_valve_position,
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genPowerCfg', 'hvacThermostat']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
        },
        exposes: [e.battery(),
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5, ea.ALL).withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'auto'], ea.ALL)
                .withPiHeatingDemand(ea.STATE_GET),
            exposes.numeric('valve_position', ea.ALL).withValueMin(0).withValueMax(255)
                .withDescription('Directly control the radiator valve. The values range from 0 (valve ' +
                    'closed) to 255 (valve fully open)'),
        ],
    },
];
