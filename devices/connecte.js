const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tuya = require('../lib/tuya');
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_4hbx5cvx'}],
        model: '4500994',
        vendor: 'Connecte',
        description: 'Smart termostat',
        fromZigbee: [
            fz.connecte_thermostat,
        ],
        toZigbee: [
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // Do a "magic" read on the basic cluster to trigger the termostat start reporting.
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
        },
        exposes: [
            exposes.binary('state', ea.STATE, true, false).withDescription('State of thermostat'),
            exposes.numeric('system_mode', ea.STATE),
            exposes.climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE),
            exposes.binary('child_lock', ea.STATE, true, false).withDescription('Child lock enabled'),
            exposes.numeric('external_temperature', ea.STATE)
                .withUnit('°C')
                .withDescription('Current temperature measured on the external sensor (floor)'),
            exposes.numeric('sensor', ea.STATE)
                .withDescription('Sensor type. Internal, floor, Max guard (regulator on air temperature and limiter with floor sensor'),
            exposes.numeric('activate_temperature', ea.STATE).withDescription('Turn'),
            exposes.binary('heating', ea.STATE, true, false).withDescription('Heating or not'),
            exposes.binary('window_detection', ea.STATE, 'ACTIVE', 'DISABLED').withDescription('Open windows detection activated'),
            exposes.numeric('max_temperature', ea.STATE)
                .withUnit('°C')
                .withDescription('Max guarding temperature'),
        ],
        onEvent: tuya.onEventSetLocalTime,
    },
];
