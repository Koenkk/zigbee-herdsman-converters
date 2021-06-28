const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['RGBgenie ZB-5121'],
        model: 'ZB-5121',
        vendor: 'RGB Genie',
        description: 'Micro remote and dimmer with single scene recall',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down', 'brightness_stop', 'recall_*'])],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['RGBgenie ZB-3009'],
        model: 'ZB-3009',
        vendor: 'RGB Genie',
        description: '3 scene remote and dimmer ',
        fromZigbee: [fz.command_recall, fz.command_move_hue, fz.command_move, fz.command_stop, fz.command_on, fz.command_off,
            fz.command_move_to_color_temp, fz.command_move_to_color, fz.command_move_color_temperature],
        toZigbee: [],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down', 'brightness_stop', 'recall_*', 'hue_move', 'color_temperature_move', 'color_move',
            'color_temperature_move_up', 'color_temperature_move_down'])],
    },
    {
        zigbeeModel: ['RGBgenie ZB-5028'],
        model: 'ZB-5028',
        vendor: 'RGB Genie',
        description: 'RGB remote with 4 endpoints and 3 scene recalls',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall,
            fz.command_move_hue, fz.command_move_to_color, fz.command_move_to_color_temp],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down', 'brightness_stop', 'recall_1', 'recall_2', 'recall_3'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['RGBgenie ZB-5004'],
        model: 'ZB-5004',
        vendor: 'RGB Genie',
        description: 'Zigbee 3.0 remote control',
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['recall_*', 'on', 'off', 'brightness_stop', 'brightness_move_up', 'brightness_move_down'])],
        toZigbee: [],
    },
];
