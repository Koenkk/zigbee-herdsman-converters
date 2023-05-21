const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const ota = require('../lib/ota');
const constants = require('../lib/constants');
const e = exposes;
const ep = exposes.presets;
const eo = exposes.options;
const ea = exposes.access;
const {calibrateAndPrecisionRoundOptions, getOptions} = require('../lib/utils');

const sprutCode = 0x6666;
const manufacturerOptions = {manufacturerCode: sprutCode};
const switchActionValues = ['OFF', 'ON'];
const co2Lookup = {
    co2_autocalibration: 'sprutCO2AutoCalibration',
    co2_manual_calibration: 'sprutCO2Calibration',
};

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
    occupancy_level: {
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
    occupancy_timeout: {
        cluster: 'msOccupancySensing',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            return {occupancy_timeout: msg.data['pirOToUDelay']};
        },
    },
    noise_timeout: {
        cluster: 'sprutNoise',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            return {noise_timeout: msg.data['noiseAfterDetectDelay']};
        },
    },
    occupancy_sensitivity: {
        cluster: 'msOccupancySensing',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            return {occupancy_sensitivity: msg.data['sprutOccupancySensitivity']};
        },
    },
    noise_detect_level: {
        cluster: 'sprutNoise',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            return {noise_detect_level: msg.data['noiseDetectLevel']};
        },
    },
    co2_config: {
        key: ['co2_autocalibration', 'co2_manual_calibration'],
        cluster: 'msCO2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('sprutCO2AutoCalibration')) {
                return {co2_autocalibration: switchActionValues[msg.data['sprutCO2AutoCalibration']]};
            }
            if (msg.data.hasOwnProperty('sprutCO2Calibration')) {
                return {co2_manual_calibration: switchActionValues[msg.data['sprutCO2Calibration']]};
            }
        },
    },
    th_heater: {
        key: ['th_heater'],
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('sprutHeater')) {
                return {th_heater: switchActionValues[msg.data['sprutHeater']]};
            }
        },
    },
};

const tzLocal = {
    sprut_ir_remote: {
        key: ['play_store', 'learn_start', 'learn_stop', 'clear_store', 'play_ram', 'learn_ram_start', 'learn_ram_stop'],
        convertSet: async (entity, key, value, meta) => {
            const options = {
                frameType: 0, manufacturerCode: sprutCode, disableDefaultResponse: true,
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
            case 'clear_store':
                await entity.command('sprutIrBlaster', 'clearStore',
                    {}, options);
                break;
            case 'play_ram':
                await entity.command('sprutIrBlaster', 'playRam',
                    {}, options);
                break;
            case 'learn_ram_start':
                await entity.command('sprutIrBlaster', 'learnRamStart',
                    {}, options);
                break;
            case 'learn_ram_stop':
                await entity.command('sprutIrBlaster', 'learnRamStop',
                    {}, options);
                break;
            }
        },
    },
    occupancy_timeout: {
        key: ['occupancy_timeout'],
        convertSet: async (entity, key, value, meta) => {
            value *= 1;
            await entity.write('msOccupancySensing', {pirOToUDelay: value}, getOptions(meta.mapped, entity));
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('msOccupancySensing', ['pirOToUDelay']);
        },
    },
    noise_timeout: {
        key: ['noise_timeout'],
        convertSet: async (entity, key, value, meta) => {
            value *= 1;
            await entity.write('sprutNoise', {noiseAfterDetectDelay: value}, getOptions(meta.mapped, entity));
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('sprutNoise', ['noiseAfterDetectDelay']);
        },
    },
    occupancy_sensitivity: {
        key: ['occupancy_sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            value *= 1;
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write('msOccupancySensing', {'sprutOccupancySensitivity': value}, options);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('msOccupancySensing', ['sprutOccupancySensitivity'], manufacturerOptions);
        },
    },
    noise_detect_level: {
        key: ['noise_detect_level'],
        convertSet: async (entity, key, value, meta) => {
            value *= 1;
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write('sprutNoise', {'noiseDetectLevel': value}, options);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('sprutNoise', ['noiseDetectLevel'], manufacturerOptions);
        },
    },
    temperature_offset: {
        key: ['temperature_offset'],
        convertSet: async (entity, key, value, meta) => {
            value *= 1;
            const newValue = parseFloat(value) * 100.0;
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write('msTemperatureMeasurement', {'sprutTemperatureOffset': newValue}, options);
            return {state: {[key]: value}};
        },
    },
    co2_config: {
        key: ['co2_autocalibration', 'co2_manual_calibration'],
        convertSet: async (entity, key, value, meta) => {
            let newValue = value;
            newValue = switchActionValues.indexOf(value);
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write('msCO2', {[co2Lookup[key]]: newValue}, options);


            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('msCO2', [co2Lookup[key]], manufacturerOptions);
        },
    },
    th_heater: {
        key: ['th_heater'],
        convertSet: async (entity, key, value, meta) => {
            let newValue = value;
            newValue = switchActionValues.indexOf(value);
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write('msRelativeHumidity', {'sprutHeater': newValue}, options);

            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('msRelativeHumidity', ['sprutHeater'], manufacturerOptions);
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['WBMSW3'],
        model: 'WB-MSW-ZIGBEE v.3',
        vendor: 'Sprut.device',
        description: 'Wall-mounted Zigbee sensor',
        fromZigbee: [fzLocal.temperature, fz.illuminance, fz.humidity, fz.occupancy, fzLocal.occupancy_level, fz.co2, fzLocal.voc,
            fzLocal.noise, fzLocal.noise_detected, fz.on_off, fzLocal.occupancy_timeout, fzLocal.noise_timeout, fzLocal.co2_config,
            fzLocal.th_heater, fzLocal.occupancy_sensitivity, fzLocal.noise_detect_level],
        toZigbee: [tz.on_off, tzLocal.sprut_ir_remote, tzLocal.occupancy_timeout, tzLocal.noise_timeout, tzLocal.co2_config,
            tzLocal.th_heater, tzLocal.temperature_offset, tzLocal.occupancy_sensitivity, tzLocal.noise_detect_level],
        exposes: [ep.temperature(), ep.illuminance(), ep.illuminance_lux(), ep.humidity(), ep.occupancy(), ep.occupancy_level(), ep.co2(),
            ep.voc(), ep.noise(), ep.noise_detected(ea.STATE_GET), ep.switch().withEndpoint('l1'), ep.switch().withEndpoint('l2'),
            ep.switch().withEndpoint('l3'),
            e.numeric('noise_timeout', ea.ALL).withValueMin(0).withValueMax(2000).withUnit('s')
                .withDescription('Time in seconds after which noise is cleared after detecting it (default: 60)'),
            e.numeric('occupancy_timeout', ea.ALL).withValueMin(0).withValueMax(2000).withUnit('s')
                .withDescription('Time in seconds after which occupancy is cleared after detecting it (default: 60)'),
            e.numeric('temperature_offset', ea.SET).withValueMin(-10).withValueMax(10).withUnit('°C')
                .withDescription('Self-heating compensation. The compensation value is subtracted from the measured temperature'),
            e.numeric('occupancy_sensitivity', ea.ALL).withValueMin(0).withValueMax(2000)
                .withDescription('If the sensor is triggered by the slightest movement, reduce the sensitivity, '+
                    'otherwise increase it (default: 50)'),
            e.numeric('noise_detect_level', ea.ALL).withValueMin(0).withValueMax(150).withUnit('dBA')
                .withDescription('The minimum noise level at which the detector will work (default: 50)'),
            e.enum('co2_autocalibration', ea.ALL, switchActionValues)
                .withDescription('Automatic calibration of the CO2 sensor. If ON, the CO2 sensor will automatically calibrate '+
                    'every 7 days. (MH-Z19B sensor)'),
            e.enum('co2_manual_calibration', ea.ALL, switchActionValues)
                .withDescription('Ventilate the room for 20 minutes, turn on manual calibration, and turn it off after one second. '+
                    'After about 5 minutes the CO2 sensor will show 400ppm. Calibration completed. (MH-Z19B sensor)'),
            e.enum('th_heater', ea.ALL, switchActionValues)
                .withDescription('Turn on when working in conditions of high humidity (more than 70 %, RH) or condensation, '+
                    'if the sensor shows 0 or 100 %.'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const binds = ['genBasic', 'msTemperatureMeasurement', 'msIlluminanceMeasurement', 'msRelativeHumidity',
                'msOccupancySensing', 'msCO2', 'sprutVoc', 'sprutNoise', 'sprutIrBlaster', 'genOta'];
            await reporting.bind(endpoint1, coordinatorEndpoint, binds);

            // report configuration
            await reporting.temperature(endpoint1);
            await reporting.illuminance(endpoint1);
            await reporting.humidity(endpoint1);
            await reporting.occupancy(endpoint1);

            let payload = reporting.payload('sprutOccupancyLevel', 10, constants.repInterval.MINUTE, 5);
            await endpoint1.configureReporting('msOccupancySensing', payload, manufacturerOptions);

            payload = reporting.payload('noise', 10, constants.repInterval.MINUTE, 5);
            await endpoint1.configureReporting('sprutNoise', payload);

            // led_red
            await device.getEndpoint(2).read('genOnOff', ['onOff']);

            // led_green
            await device.getEndpoint(3).read('genOnOff', ['onOff']);

            // buzzer
            await device.getEndpoint(4).read('genOnOff', ['onOff']);
        },
        endpoint: (device) => {
            return {'default': 1, 'l1': 2, 'l2': 3, 'l3': 4};
        },
        meta: {multiEndpoint: true},
        ota: ota.zigbeeOTA,
    },
];
