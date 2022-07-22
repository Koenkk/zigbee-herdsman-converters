const exposes = require('../lib/exposes');
const fz = { ...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee };
const tz = require('../converters/toZigbee');

function genL101ZThermostatExposes(epName) {
    const sensorTypes = [
        '3.3kOhm', '5kOhm', '6.8kOhm', '10kOhm', '12kOhm', '14.8kOhm', '15kOhm', '20kOhm', '33kOhm', 'Binded'
    ];

    return [
        exposes.climate()
            .withSystemMode(['off', 'auto'])
            .withLocalTemperature()
            .withLocalTemperatureCalibration(0.0, 2.5, 0.5)
            .withSetpoint('occupied_heating_setpoint', 5.0, 75.0, 0.5)
            .withEndpoint(epName),
        
        exposes.enum('sensor_type', ea.ALL, sensorTypes).withEndpoint(epName),
    ]
}

function genL101ZExposes(has_second_channel) {
    let exposes = [];

    if (has_second_channel) {
        exposes.push(...genL101ZThermostatExposes('l3'));
        exposes.push(...genL101ZThermostatExposes('l4'));
    } else {
        exposes.push(...genL101ZThermostatExposes('l3'));
    }

    return exposes;
}

function genL101ZDevice(name, desc, has_second_channel) {
    return {
        zigbeeModel: ["L101Z-" + name],
        model: "L101Z-" + name,
        description: desc,
        fromZigbee: [
            fz.thermostat,
            fz.lytko_thermostat,
        ],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.lytko_sensorType
        ],
        meta: {
            multiEndpoint: true
        },
        endpoint: (device) => {
            if (has_second_channel) {
                return {
                    'l1': 1,  // Basic, Identify, OTA
                    'l2': 2,  // Reserved for hardware
                    'l3': 3,  // Thermostat 1
                    'l4': 4   // Thermostat 2
                };
            } else {
                return {
                    'l1': 1,  // Basic, Identify, OTA
                    'l2': 2,  // Reserved for hardware
                    'l3': 3,  // Thermostat 1
                };
            }
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            let eps = [];
            if (has_second_channel) {
                eps = [device.getEndpoint(3), device.getEndpoint(4)];
            } else {
                eps = [device.getEndpoint(3), device.getEndpoint(4)];
            }

            // Read thermostat channels values
            // FIXME: Rework with binding
            for (const ep of eps) {
                await ep.read('hvacThermostat', [
                    'systemMode',
                    'localTemp',
                    'minSetpointDeadBand',
                    'occupiedHeatingSetpoint',
                    'localTemperatureCalibration'
                ]);

                const options = {manufacturerCode: 0x1037};
                await ep.read('hvacThermostat', [1024], options);
            }
        },
        exposes: genL101ZExposes(has_second_channel),
        //ota: ???
    }
}

module.exports = [
    genL101ZDevice("DBN", "Big screen dual channel thermostat", true),
    genL101ZDevice("DMN", "Small screen dual channel thermostat", true),
    genL101ZDevice("DLN", "Headless dual channel thermostat", true),

    genL101ZDevice("SBN", "Big screen single channel thermostat", false),
    genL101ZDevice("SMN", "Small screen single channel thermostat", false),
    genL101ZDevice("SLN", "Headless single channel thermostat", false),
];