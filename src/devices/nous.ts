import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import * as tuya from '../lib/tuya';
import * as reporting from '../lib/reporting';
import {Definition} from '../lib/types';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
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
            {modelID: 'TS0601', manufacturerName: '_TZE200_locansqn'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_qrztc3ev'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_snloy4rw'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_eanjj2pa'}],
        model: 'SZ-T04',
        vendor: 'Nous',
        whiteLabel: [
            tuya.whitelabel('Tuya', 'TH01Z', 'Temperature and humidity sensor with clock', ['_TZE200_locansqn']),
        ],
        description: 'Temperature and humidity sensor with clock',
        fromZigbee: [legacy.fz.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.nous_lcd_temperature_humidity_sensor],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.temperature(), e.humidity(), e.battery(),
            e.numeric('temperature_report_interval', ea.STATE_SET).withUnit('min').withValueMin(5).withValueMax(120).withValueStep(5)
                .withDescription('Temperature Report interval'),
            e.numeric('humidity_report_interval', ea.STATE_SET).withUnit('min').withValueMin(5).withValueMax(120).withValueStep(5)
                .withDescription('Humidity Report interval'),
            e.enum('temperature_unit_convert', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Current display unit'),
            e.enum('temperature_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm'])
                .withDescription('Temperature alarm status'),
            e.numeric('max_temperature', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature max'),
            e.numeric('min_temperature', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature min'),
            e.numeric('temperature_sensitivity', ea.STATE_SET).withUnit('°C').withValueMin(0.1).withValueMax(50).withValueStep(0.1)
                .withDescription('Temperature sensitivity'),
            e.enum('humidity_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm'])
                .withDescription('Humidity alarm status'),
            e.numeric('max_humidity', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Alarm humidity max'),
            e.numeric('min_humidity', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Alarm humidity min'),
            e.numeric('humidity_sensitivity', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100).withValueStep(1)
                .withDescription('Humidity sensitivity'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_nnrfa68v'}],
        model: 'E6',
        vendor: 'Nous',
        description: 'Temperature & humidity LCD sensor',
        fromZigbee: [legacy.fz.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.nous_lcd_temperature_humidity_sensor],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            e.enum('temperature_unit_convert', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Current display unit'),
            e.enum('temperature_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm'])
                .withDescription('Temperature alarm status'),
            e.numeric('max_temperature', ea.STATE_SET)
                .withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature max'),
            e.numeric('min_temperature', ea.STATE_SET).withUnit('°C')
                .withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature min'),
            e.numeric('temperature_sensitivity', ea.STATE_SET)
                .withUnit('°C').withValueMin(0.1).withValueMax(50).withValueStep(0.1)
                .withDescription('Temperature sensitivity'),
        ],
    },
];

export default definitions;
module.exports = definitions;
