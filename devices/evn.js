const exposes = require('../lib/exposes');
const extend = require('../lib/extend');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['ZBHS4RGBW'],
        model: 'ZBHS4RGBW',
        vendor: 'EVN',
        description: 'Zigbee 4 channel RGBW remote control',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_stop, fz.command_move, fz.command_recall, fz.command_on, fz.command_off],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'brightness_step_up', 'brightness_step_down',
            'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            'hue_move', 'hue_stop', 'recall_*', 'on', 'off'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
    },
    {
        zigbeeModel: ['ZB24100VS'],
        model: 'ZB24100VS',
        vendor: 'EVN',
        description: 'Zigbee multicolor controller with power supply',
        extend: extend.light_onoff_brightness_colortemp_color({supportsHS: true, colorTempRange: [160, 450]}),
    },
];
