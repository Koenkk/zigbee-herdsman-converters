import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
import {Definition} from '../lib/types';
import {deviceEndpoints, onOff} from '../lib/modernExtend';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['DIYRuZ_R4_5'],
        model: 'DIYRuZ_R4_5',
        vendor: 'DIYRuZ',
        description: 'DiY 4 Relays + 4 switches + 1 buzzer',
        extend: [
            deviceEndpoints({endpoints: {'bottom_left': 1, 'bottom_right': 2, 'top_left': 3, 'top_right': 4, 'center': 5}}),
            onOff({endpointNames: ['bottom_left', 'bottom_right', 'top_left', 'top_right', 'center']}),
        ],
    },
    {
        zigbeeModel: ['DIYRuZ_KEYPAD20'],
        model: 'DIYRuZ_KEYPAD20',
        vendor: 'DIYRuZ',
        description: 'DiY 20 button keypad',
        fromZigbee: [fz.keypad20states, fz.keypad20_battery],
        toZigbee: [],
        exposes: [e.battery()],
        endpoint: (device) => {
            return {
                btn_1: 1, btn_2: 2, btn_3: 3, btn_4: 4, btn_5: 5, btn_6: 6, btn_7: 7, btn_8: 8, btn_9: 9, btn_10: 10,
                btn_11: 11, btn_12: 12, btn_13: 13, btn_14: 14, btn_15: 15, btn_16: 16, btn_17: 17, btn_18: 18, btn_19: 19, btn_20: 20,
            };
        },
    },
    {
        zigbeeModel: ['DIYRuZ_magnet'],
        model: 'DIYRuZ_magnet',
        vendor: 'DIYRuZ',
        description: 'DIYRuZ contact sensor',
        fromZigbee: [fz.keypad20_battery, fz.diyruz_contact],
        exposes: [e.battery(), e.contact()],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DIYRuZ_rspm'],
        model: 'DIYRuZ_rspm',
        vendor: 'DIYRuZ',
        description: 'DIYRuZ relay switch power meter',
        fromZigbee: [fz.diyruz_rspm],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.cpu_temperature(), e.action(['hold', 'release'])],
        endpoint: (device) => {
            return {default: 8};
        },
    },
    {
        zigbeeModel: ['DIYRuZ_FreePad', 'FreePadLeTV8'],
        model: 'DIYRuZ_FreePad',
        vendor: 'DIYRuZ',
        description: 'DiY 8/12/20 button keypad',
        fromZigbee: [fz.diyruz_freepad_clicks, fz.diyruz_freepad_config, fz.battery],
        exposes: [e.battery(),
            e.action(['*_single', '*_double', '*_triple', '*_quadruple', '*_release', '*_hold'])].concat(((enpoinsCount) => {
            const features = [];
            for (let i = 1; i <= enpoinsCount; i++) {
                const epName = `button_${i}`;
                features.push(
                    e.enum('switch_type', ea.ALL, ['toggle', 'momentary', 'multifunction']).withEndpoint(epName));
                features.push(e.enum('switch_actions', ea.ALL, ['on', 'off', 'toggle']).withEndpoint(epName));
            }
            return features;
        })(20)),
        toZigbee: [tz.diyruz_freepad_on_off_config],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            if (device.applicationVersion < 3) { // Legacy PM2 firmwares
                const payload = [{
                    attribute: 'batteryPercentageRemaining', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0,
                }, {
                    attribute: 'batteryVoltage', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0,
                }];
                await endpoint.configureReporting('genPowerCfg', payload);
            }
            device.endpoints.forEach(async (ep) => {
                if (ep.outputClusters.includes(18)) {
                    await reporting.bind(ep, coordinatorEndpoint, ['genMultistateInput']);
                }
            });
        },
        endpoint: (device) => {
            return {
                button_1: 1, button_2: 2, button_3: 3, button_4: 4, button_5: 5,
                button_6: 6, button_7: 7, button_8: 8, button_9: 9, button_10: 10,
                button_11: 11, button_12: 12, button_13: 13, button_14: 14, button_15: 15,
                button_16: 16, button_17: 17, button_18: 18, button_19: 19, button_20: 20,
            };
        },
    },
    {
        zigbeeModel: ['FreePad_LeTV_8'],
        model: 'FreePad_LeTV_8',
        vendor: 'DIYRuZ',
        description: 'LeTV 8key FreePad mod',
        fromZigbee: [fz.diyruz_freepad_clicks, fz.diyruz_freepad_config, fz.battery],
        exposes: [e.battery(), e.action(['*_single', '*_double', '*_triple', '*_quadruple', '*_release'])].concat(((enpoinsCount) => {
            const features = [];
            for (let i = 1; i <= enpoinsCount; i++) {
                const epName = `button_${i}`;
                features.push(
                    e.enum('switch_type', ea.ALL, ['toggle', 'momentary', 'multifunction']).withEndpoint(epName));
                features.push(e.enum('switch_actions', ea.ALL, ['on', 'off', 'toggle']).withEndpoint(epName));
            }
            return features;
        })(8)),
        toZigbee: [tz.diyruz_freepad_on_off_config],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            if (device.applicationVersion < 3) { // Legacy PM2 firmwares
                const payload = [{
                    attribute: 'batteryPercentageRemaining', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0,
                }, {
                    attribute: 'batteryVoltage', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0,
                }];
                await endpoint.configureReporting('genPowerCfg', payload);
            }
            device.endpoints.forEach(async (ep) => {
                if (ep.outputClusters.includes(18)) {
                    await reporting.bind(ep, coordinatorEndpoint, ['genMultistateInput']);
                }
            });
        },
        endpoint: (device) => {
            return {button_1: 1, button_2: 2, button_3: 3, button_4: 4, button_5: 5, button_6: 6, button_7: 7, button_8: 8};
        },
    },
    {
        zigbeeModel: ['DIYRuZ_Geiger'],
        model: 'DIYRuZ_Geiger',
        vendor: 'DIYRuZ',
        description: 'DiY Geiger counter',
        fromZigbee: [fz.diyruz_geiger, fz.command_on, fz.command_off, fz.diyruz_geiger_config],
        exposes: [e.action(['on', 'off']),
            e.numeric('radioactive_events_per_minute', ea.STATE).withUnit('rpm')
                .withDescription('Current count radioactive pulses per minute'),
            e.numeric('radiation_dose_per_hour', ea.STATE).withUnit('μR/h').withDescription('Current radiation level'),
            e.binary('led_feedback', ea.ALL, 'ON', 'OFF').withDescription('Enable LED feedback'),
            e.binary('buzzer_feedback', ea.ALL, 'ON', 'OFF').withDescription('Enable buzzer feedback'),
            e.numeric('alert_threshold', ea.ALL).withUnit('μR/h').withDescription('Critical radiation level')
                .withValueMin(0).withValueMax(10000),
            e.enum('sensors_type', ea.ALL, ['СБМ-20/СТС-5/BOI-33', 'СБМ-19/СТС-6', 'Others'])
                .withDescription('Type of installed tubes'),
            e.numeric('sensors_count', ea.ALL).withDescription('Count of installed tubes').withValueMin(0).withValueMax(50),
            e.numeric('sensitivity', ea.ALL).withDescription('This is applicable if tubes type is set to other')
                .withValueMin(0).withValueMax(100)],
        toZigbee: [tz.diyruz_geiger_config],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msIlluminanceMeasurement', 'genOnOff']);

            const payload = [
                {attribute: {ID: 0xF001, type: 0x21}, minimumReportInterval: 0, maximumReportInterval: constants.repInterval.MINUTE,
                    reportableChange: 0},
                {attribute: {ID: 0xF002, type: 0x23}, minimumReportInterval: 0, maximumReportInterval: constants.repInterval.MINUTE,
                    reportableChange: 0}];
            await endpoint.configureReporting('msIlluminanceMeasurement', payload);
        },
    },
    {
        zigbeeModel: ['DIYRuZ_R8_8'],
        model: 'DIYRuZ_R8_8',
        vendor: 'DIYRuZ',
        description: 'DiY 8 Relays + 8 switches',
        fromZigbee: [fz.ptvo_multistate_action, legacy.fz.ptvo_switch_buttons, fz.ignore_basic_report],
        extend: [
            deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5, l6: 6, l7: 7, l8: 8}}),
            onOff({endpointNames: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8']}),
        ],
    },
    {
        zigbeeModel: ['DIYRuZ_RT'],
        model: 'DIYRuZ_RT',
        vendor: 'DIYRuZ',
        description: 'DiY CC2530 Zigbee 3.0 firmware',
        fromZigbee: [fz.on_off, fz.temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.temperature()],
    },
    {
        zigbeeModel: ['DIYRuZ_Flower'],
        model: 'DIYRuZ_Flower',
        vendor: 'DIYRuZ',
        description: 'Flower sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.illuminance, fz.soil_moisture, fz.pressure, fz.battery],
        toZigbee: [],
        meta: {multiEndpoint: true, multiEndpointSkip: ['humidity']},
        endpoint: (device) => {
            return {'bme': 1, 'ds': 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const firstEndpoint = device.getEndpoint(1);
            const secondEndpoint = device.getEndpoint(2);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement',
                'msIlluminanceMeasurement', 'msSoilMoisture']);
            await reporting.bind(secondEndpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const overrides = {min: 0, max: 3600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overrides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overrides);
            await reporting.temperature(firstEndpoint, overrides);
            await reporting.humidity(firstEndpoint, overrides);
            await reporting.pressureExtended(firstEndpoint, overrides);
            await reporting.illuminance(firstEndpoint, overrides);
            await reporting.soil_moisture(firstEndpoint, overrides);
            await reporting.temperature(secondEndpoint, overrides);
            await firstEndpoint.read('msPressureMeasurement', ['scale']);
        },
        exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.humidity(), e.pressure(),
            e.temperature().withEndpoint('ds'),
            e.temperature().withEndpoint('bme'),
        ],
    },
    {
        zigbeeModel: ['DIYRuZ_AirSense'],
        model: 'DIYRuZ_AirSense',
        vendor: 'DIYRuZ',
        description: 'Air quality sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.co2, fz.pressure, fz.diyruz_airsense_config_co2,
            fz.diyruz_airsense_config_temp, fz.diyruz_airsense_config_pres, fz.diyruz_airsense_config_hum],
        toZigbee: [tz.diyruz_airsense_config],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement', 'msCO2'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            for (const cluster of clusters) {
                await endpoint.configureReporting(cluster, [
                    {attribute: 'measuredValue', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
                ]);
            }
            await endpoint.read('msPressureMeasurement', ['scale']);
        },
        exposes: [e.co2(), e.temperature(), e.humidity(), e.pressure(),
            e.binary('led_feedback', ea.ALL, 'ON', 'OFF').withDescription('Enable LEDs feedback'),
            e.binary('enable_abc', ea.ALL, 'ON', 'OFF').withDescription('Enable ABC (Automatic Baseline Correction)'),
            e.numeric('threshold1', ea.ALL).withUnit('ppm').withDescription('Warning (LED2) CO2 level')
                .withValueMin(0).withValueMax(50000),
            e.numeric('threshold2', ea.ALL).withUnit('ppm').withDescription('Critical (LED3) CO2 level')
                .withValueMin(0).withValueMax(50000),
            e.numeric('temperature_offset', ea.ALL).withUnit('°C').withDescription('Adjust temperature')
                .withValueMin(-20).withValueMax(20),
            e.numeric('humidity_offset', ea.ALL).withUnit('%').withDescription('Adjust humidity')
                .withValueMin(-50).withValueMax(50),
            e.numeric('pressure_offset', ea.ALL).withUnit('hPa').withDescription('Adjust pressure')
                .withValueMin(-1000).withValueMax(1000)],
    },
    {
        zigbeeModel: ['DIY_Zintercom'],
        model: 'DIYRuZ_Zintercom',
        vendor: 'DIYRuZ',
        description: 'Matrix intercom auto opener',
        fromZigbee: [fz.battery, fz.diyruz_zintercom_config],
        toZigbee: [tz.diyruz_zintercom_config],
        configure: async (device, coordinatorEndpoint) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            const payload1 = [
                {attribute: 'batteryPercentageRemaining', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
                {attribute: 'batteryVoltage', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await firstEndpoint.configureReporting('genPowerCfg', payload1);
            const payload2 = [{attribute: {ID: 0x0050, type: 0x30},
                minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await firstEndpoint.configureReporting('closuresDoorLock', payload2);
        },
        exposes: [
            e.enum('state', ea.STATE, ['idle', 'ring', 'talk', 'open', 'drop'])
                .withDescription('Current state'),
            e.enum('mode', ea.ALL, ['never', 'once', 'always', 'drop'])
                .withDescription('Select open mode'),
            e.binary('sound', ea.ALL, 'ON', 'OFF').withProperty('sound')
                .withDescription('Enable or disable sound'),
            e.numeric('time_ring', ea.ALL).withUnit('sec')
                .withDescription('Time to ring before answer').withValueMin(0).withValueMax(600),
            e.numeric('time_talk', ea.ALL).withUnit('sec')
                .withDescription('Time to hold before open').withValueMin(0).withValueMax(600),
            e.numeric('time_open', ea.ALL).withUnit('sec')
                .withDescription('Time to open before end').withValueMin(0).withValueMax(600),
            e.numeric('time_bell', ea.ALL).withUnit('sec')
                .withDescription('Time after last bell to finish ring').withValueMin(0).withValueMax(600),
            e.numeric('time_report', ea.ALL).withUnit('min')
                .withDescription('Reporting interval').withValueMin(0).withValueMax(1440),
            e.battery(),
        ],
    },
];

export default definitions;
module.exports = definitions;
