const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['WBMSW3'],
        model: 'WBMSW3',
        vendor: 'Sprut.device',
        description: 'WB-MSW v.3 Zigbee Sensor',
        fromZigbee: [fz.temperature, fz.illuminance, fz.humidity, fz.occupancy, fz.sprut_occupancy, fz.co2, fz.sprut_voc,
            fz.sprut_noise, fz.sprut_noise_detected, fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.temperature().withEndpoint(1), e.illuminance(), e.illuminance_lux(), e.humidity(),
            e.occupancy(), e.occupancy_level(), e.co2(), e.voc(), e.noise(), e.noise_detected(), e.switch().withEndpoint(2),
            e.switch().withEndpoint(3), e.switch().withEndpoint(4)],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const binds = ['genBasic', 'msTemperatureMeasurement', 'msIlluminanceMeasurement', 'msRelativeHumidity',
                'msOccupancySensing', 'msCO2', 'sprutDevice', 'sprutVoc', 'sprutNoise', 'sprutIrBlaster'];
            await reporting.bind(endpoint1, coordinatorEndpoint, binds);

            // led_red
            await device.getEndpoint(2).read('genOnOff', ['onOff']);

            // led_green
            await device.getEndpoint(3).read('genOnOff', ['onOff']);

            // buzzer
            await device.getEndpoint(4).read('genOnOff', ['onOff']);

            // Read data at start
            await endpoint1.read('msTemperatureMeasurement', ['measuredValue']);
            await endpoint1.read('msIlluminanceMeasurement', ['measuredValue']);
            await endpoint1.read('msRelativeHumidity', ['measuredValue']);
            await endpoint1.read('msOccupancySensing', ['occupancy']);
            await endpoint1.read('sprutNoise', ['noise']);
            await endpoint1.read('sprutNoise', ['noise_detected']);
            await endpoint1.read('genBasic', ['swBuildId']);
        },
        meta: {multiEndpoint: true},
    },
];
