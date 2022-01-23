const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const ota = require('../lib/ota');
const e = exposes;
const ep = exposes.presets;
const eo = exposes.options;
const ea = exposes.access;
const {calibrateAndPrecisionRoundOptions, getOptions} = require('../lib/utils');

const fzLocal = {
    temperature: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        options: [eo.precision('temperature'), eo.calibration('temperature')],
        convert: (model, msg, publish, options, meta) => {
            const temperature = parseFloat(msg.data['measuredValue']) / 100.0;
            return {temperature: calibrateAndPrecisionRoundOptions(temperature, options, 'temperature')};
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
            if (msg.data.hasOwnProperty('noiseDetected')) {
                return {noise_detected: msg.data['noiseDetected'] === 1};
            }
        },
    },
    noise_timeout: {
        cluster: 'sprutNoise',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            return {noise_timeout: msg.data.noiseAfterDetectDelay};
        },
    },
};

const tzLocal = {
    sprut_ir_remote: {
        key: ['play_store', 'learn_start', 'learn_stop'],
        convertSet: async (entity, key, value, meta) => {
            const options = {
                frameType: 0, manufacturerCode: 26214, disableDefaultResponse: true,
                disableResponse: true, reservedBits: 0, direction: 0, writeUndiv: false,
                transactionSequenceNumber: null,
            };
            switch (key) {
            case 'play_store':
                await entity.command('sprutIrBlaster', 'playStore',
                    {param: value['rom']}, options);
                break;
            case 'learn_start':
                await entity.command('sprutIrBlaster', 'learnStart',
                    {value: value['rom']}, options);
                break;
            case 'learn_stop':
                await entity.command('sprutIrBlaster', 'learnStop',
                    {value: value['rom']}, options);
                break;
            }
        },
    },
    noise_timeout: {
        key: ['noise_timeout'],
        convertSet: async (entity, key, value, meta) => {
            value *= 1;
            const endpoint = meta.device.getEndpoint(1);
            await endpoint.write('sprutNoise', {noiseAfterDetectDelay: value}, getOptions(meta.mapped, entity));
            return {state: {noise_timeout: value}};
        },
        convertGet: async (entity, key, meta) => {
            const endpoint = meta.device.getEndpoint(1);
            await endpoint.read('sprutNoise', ['noiseAfterDetectDelay']);
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['WBMSW3'],
        model: 'WB-MSW-ZIGBEE v.3',
        vendor: 'Sprut.device',
        description: 'Wall-mounted Zigbee sensor',
        fromZigbee: [fzLocal.temperature, fz.illuminance, fz.humidity, fz.occupancy, fzLocal.occupancy, fz.co2, fzLocal.voc,
            fzLocal.noise, fzLocal.noise_detected, fz.on_off, fz.occupancy_timeout, fzLocal.noise_timeout],
        toZigbee: [tz.on_off, tzLocal.sprut_ir_remote, tz.occupancy_timeout, tzLocal.noise_timeout],
        exposes: [ep.temperature(), ep.illuminance(), ep.illuminance_lux(), ep.humidity(),
            ep.occupancy(), ep.occupancy_level(), ep.co2(), ep.voc(), ep.noise(), ep.noise_detected(), ep.switch().withEndpoint('l1'),
            ep.switch().withEndpoint('l2'), ep.switch().withEndpoint('default'),
            e.numeric('noise_timeout', ea.SET).withValueMin(0).withValueMax(2000).withUnit('s')
                .withDescription('Time in seconds after which noise is cleared after detecting it (default: 30)'),
            e.numeric('occupancy_timeout', ea.SET).withValueMin(0).withValueMax(2000).withUnit('s')
                .withDescription('Time in seconds after which occupancy is cleared after detecting it (default: 30)')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const binds = ['genBasic', 'msTemperatureMeasurement', 'msIlluminanceMeasurement', 'msRelativeHumidity',
                'msOccupancySensing', 'msCO2', 'sprutVoc', 'sprutNoise', 'sprutIrBlaster', 'genOta'];
            await reporting.bind(endpoint1, coordinatorEndpoint, binds);

            // led_red
            await device.getEndpoint(2).read('genOnOff', ['onOff']);

            // led_green
            await device.getEndpoint(3).read('genOnOff', ['onOff']);

            // buzzer
            await device.getEndpoint(4).read('genOnOff', ['onOff']);

            // Read settings at start
            await endpoint1.read('msOccupancySensing', ['pirOToUDelay']);
            await endpoint1.read('sprutNoise', ['noiseAfterDetectDelay']);

            // Read data at start
            await endpoint1.read('msTemperatureMeasurement', ['measuredValue']);
            await endpoint1.read('msIlluminanceMeasurement', ['measuredValue']);
            await endpoint1.read('msRelativeHumidity', ['measuredValue']);
            await endpoint1.read('msOccupancySensing', ['occupancy']);
            await endpoint1.read('sprutNoise', ['noise']);
            await endpoint1.read('sprutNoise', ['noiseDetected']);
        },
        endpoint: (device) => {
            return {'system': 1, 'l1': 2, 'l2': 3, 'default': 4};
        },
        meta: {multiEndpoint: true},
        ota: ota.zigbeeOTA,
    },
];
