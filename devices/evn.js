const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['EVN ZBHS4RGBW'],
        model: 'ZBHS4RGBW',
        vendor: 'EVN',
        description: 'Zigbee 4 channel RGBW remote control',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall,
            fz.command_move_hue, fz.command_move_to_color, fz.command_move_to_color_temp],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down', 'brightness_stop', 'recall_1', 'recall_2', 'recall_3', 'hue_move', 'color_temperature_move',
            'color_move', 'hue_stop'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
];
