const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_4hbx5cvx'}],
        model: '4500994',
        vendor: 'Connecte',
        description: 'Smart thermostat',
        fromZigbee: [fz.connecte_thermostat],
        toZigbee: [tz.connecte_thermostat],
        onEvent: tuya.onEventSetTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // Do a "magic" read on the basic cluster to trigger the thermostat start reporting.
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
        },
        exposes: [
            exposes.binary('state', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('On/off state of the switch'),
            e.child_lock(),
            e.window_detection(),
            e.away_mode(),
            exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withSystemMode(['heat', 'auto'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE),
            e.temperature_sensor_select(['internal', 'external', 'both']),
            exposes.numeric('external_temperature', ea.STATE)
                .withUnit('°C')
                .withDescription('Current temperature measured on the external sensor (floor)'),
            exposes.numeric('hysteresis', ea.STATE_SET)
                .withDescription('The difference between the temperature at which the thermostat switches off, ' +
                'and the temperature at which it switches on again.')
                .withValueMin(1)
                .withValueMax(9),
            exposes.numeric('max_temperature_protection', ea.STATE_SET)
                .withUnit('°C')
                .withDescription('Max guarding temperature')
                .withValueMin(20)
                .withValueMax(95),
        ],
    },
];
