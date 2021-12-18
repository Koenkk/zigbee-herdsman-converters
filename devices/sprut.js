const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const {calibrateAndPrecisionRoundOptions, postfixWithEndpointName} = require('../lib/utils');

const fzLocal = {
    temperature: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.precision('temperature'), exposes.options.calibration('temperature')],
        convert: (model, msg, publish, options, meta) => {
            const temperature = parseFloat(msg.data['measuredValue']) / 100.0;
            const property = postfixWithEndpointName('temperature', msg, model);
            return {[property]: calibrateAndPrecisionRoundOptions(temperature, options, 'temperature')};
        },
    },
    occupancy: {
        cluster: 'msOccupancySensing',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('sprutOccupancyLevel')) {
                return {occupancy_level: msg.data['sprutOccupancyLevel']};
            }
        },
    },
    voc: {
        cluster: 'sprutVoc',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('voc')) {
                return {voc: msg.data['voc']};
            }
        },
    },
    noise: {
        cluster: 'sprutNoise',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('noise')) {
                return {noise: msg.data['noise'].toFixed(2)};
            }
        },
    },
    noise_detected: {
        cluster: 'sprutNoise',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('noise_detected')) {
                return {noise_detected: msg.data['noise_detected'] === 1};
            }
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['WBMSW3'],
        model: 'WBMSW3',
        vendor: 'Sprut.device',
        description: 'WB-MSW v.3 Zigbee Sensor',
        fromZigbee: [fzLocal.temperature, fz.illuminance, fz.humidity, fz.occupancy, fzLocal.occupancy, fz.co2, fzLocal.voc,
            fzLocal.noise, fzLocal.noise_detected, fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.temperature(), e.illuminance(), e.illuminance_lux(), e.humidity(),
            e.occupancy(), e.occupancy_level(), e.co2(), e.voc(), e.noise(), e.noise_detected(), e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'), e.switch().withEndpoint('relay')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const binds = ['genBasic', 'msTemperatureMeasurement', 'msIlluminanceMeasurement', 'msRelativeHumidity',
                'msOccupancySensing', 'msCO2', 'sprutVoc', 'sprutNoise'];
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
        },
        endpoint: (device) => {
            return {'default': 1, 'l1': 2, 'l2': 3, 'relay': 4};
        },
        meta: {multiEndpoint: true},
    },
];
