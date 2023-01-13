const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_lbtpiody'}],
        model: 'E5',
        vendor: 'Nous',
        description: 'Temperature & humidity',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_lve3dvpy'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_c7emyjom'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_locansqn'}],
        model: 'SZ-T04',
        vendor: 'Nous',
        description: 'Temperature and humidity sensor with clock',
        fromZigbee: [fz.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [tz.nous_lcd_temperature_humidity_sensor],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.temperature(), e.humidity(), e.battery(),
            exposes.numeric('temperature_report_interval', ea.STATE_SET).withUnit('min').withValueMin(5).withValueMax(120).withValueStep(5)
                .withDescription('Temperature Report interval'),
            exposes.numeric('humidity_report_interval', ea.STATE_SET).withUnit('min').withValueMin(5).withValueMax(120).withValueStep(5)
                .withDescription('Humidity Report interval'),
            exposes.enum('temperature_unit_convert', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Current display unit'),
            exposes.enum('temperature_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm'])
                .withDescription('Temperature alarm status'),
            exposes.numeric('max_temperature', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature max'),
            exposes.numeric('min_temperature', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature min'),
            exposes.numeric('temperature_sensitivity', ea.STATE_SET).withUnit('°C').withValueMin(0.1).withValueMax(50).withValueStep(0.1)
                .withDescription('Temperature sensitivity'),
            exposes.enum('humidity_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm'])
                .withDescription('Humidity alarm status'),
            exposes.numeric('max_humidity', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Alarm humidity max'),
            exposes.numeric('min_humidity', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Alarm humidity min'),
            exposes.numeric('humidity_sensitivity', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100).withValueStep(1)
                .withDescription('Humidity sensitivity'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_nnrfa68v'}],
        model: 'E6',
        vendor: 'Nous',
        description: 'Temperature & humidity LCD sensor',
        fromZigbee: [fz.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [tz.nous_lcd_temperature_humidity_sensor],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            exposes.enum('temperature_unit_convert', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Current display unit'),
            exposes.enum('temperature_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm'])
                .withDescription('Temperature alarm status'),
            exposes.numeric('max_temperature', ea.STATE_SET)
                .withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature max'),
            exposes.numeric('min_temperature', ea.STATE_SET).withUnit('°C')
                .withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature min'),
            exposes.numeric('temperature_sensitivity', ea.STATE_SET)
                .withUnit('°C').withValueMin(0.1).withValueMax(50).withValueStep(0.1)
                .withDescription('Temperature sensitivity'),
        ],
    },
];
