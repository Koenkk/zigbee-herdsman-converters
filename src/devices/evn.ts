import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import extend from '../lib/extend';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
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
        extend: extend.light_onoff_brightness_colortemp_color({supportsHueAndSaturation: true, colorTempRange: [160, 450]}),
    },
];

module.exports = definitions;
