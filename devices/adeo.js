const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const tz = require('../converters/toZigbee');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['LDSENK01F'],
        model: 'LDSENK01F',
        vendor: 'ADEO',
        description: '10A EU smart plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['LXEK-5'],
        model: 'HR-C99C-Z-C045',
        vendor: 'ADEO',
        description: 'RGB CTT LEXMAN ENKI remote control',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_stop, fz.command_step_color_temperature,
            fz.command_step_hue, fz.command_step_saturation, fz.color_stop_raw, fz.scenes_recall_scene_65024, fz.ignore_genOta],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'color_saturation_step_up',
            'color_saturation_step_down', 'color_stop', 'color_hue_step_up', 'color_hue_step_down',
            'color_temperature_step_up', 'color_temperature_step_down', 'brightness_step_up', 'brightness_step_down', 'brightness_stop'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genOnOff', 'genPowerCfg', 'lightingColorCtrl', 'genLevelCtrl'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['LXEK-1'],
        model: '9CZA-A806ST-Q1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED RGBW',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXEK-3'],
        model: '9CZA-P470T-A1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E14 LED RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['LXEK-4'],
        model: '9CZA-M350ST-Q1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN GU-10 LED RGBW',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXEK-2'],
        model: '9CZA-G1521-Q1A',
        vendor: 'ADEO',
        description: 'ENKI Lexman E27 14W to 100W LED RGBW',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXEK-7'],
        model: '9CZA-A806ST-Q1Z',
        vendor: 'ADEO',
        description: 'ENKI Lexman E27 LED white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['LDSENK02F'],
        model: 'LDSENK02F',
        description: '10A/16A EU smart plug',
        vendor: 'ADEO',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_genLevelCtrl_report],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
        exposes: [e.power(), e.switch(), e.energy()],
    },
    {
        zigbeeModel: ['LDSENK10'],
        model: 'LDSENK10',
        vendor: 'ADEO',
        description: 'LEXMAN motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
];
