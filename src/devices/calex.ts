import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import extend from '../lib/extend';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['EC-Z3.0-CCT'],
        model: '421786',
        vendor: 'Calex',
        description: 'LED A60 Zigbee GLS-lamp',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['EC-Z3.0-RGBW'],
        model: '421792',
        vendor: 'Calex',
        description: 'LED A60 Zigbee RGB lamp',
        extend: extend.light_onoff_brightness_colortemp_color({supportsHueAndSaturation: true, colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['Smart Wall Switch '], // Yes, it has a space at the end :(
        model: '421782',
        vendor: 'Calex',
        description: 'Smart Wall Switch, wall mounted RGB controller',
        toZigbee: [],
        fromZigbee: [fz.command_off, fz.command_on, fz.command_step, fz.command_move_to_color_temp,
            fz.command_move, fz.command_stop, fz.command_ehanced_move_to_hue_and_saturation,
        ],
        exposes: [e.action([
            'on', 'off', 'color_temperature_move', 'brightness_step_up', 'brightness_step_down',
            'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            'enhanced_move_to_hue_and_saturation',
        ])],
        meta: {disableActionGroup: true},
    },
];

module.exports = definitions;
