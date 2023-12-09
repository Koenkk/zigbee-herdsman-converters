import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {light} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['PROLIGHT E27 WHITE AND COLOUR'],
        model: '5412748727371',
        vendor: 'Prolight',
        description: 'E27 white and colour bulb',
        extend: [light({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ['PROLIGHT E27 WARM WHITE CLEAR'],
        model: '5412748727432',
        vendor: 'Prolight',
        description: 'E27 filament bulb dimmable',
        extend: [light()],
    },
    {
        zigbeeModel: ['PROLIGHT E27 WARM WHITE'],
        model: '5412748727364',
        vendor: 'Prolight',
        description: 'E27 bulb dimmable',
        extend: [light()],
    },
    {
        zigbeeModel: ['PROLIGHT GU10 WHITE AND COLOUR'],
        model: '5412748727401',
        vendor: 'Prolight',
        description: 'GU10 white and colour spot',
        extend: [light({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ['PROLIGHT GU10 WARM WHITE'],
        model: '5412748727395',
        vendor: 'Prolight',
        description: 'GU10 spot dimmable',
        extend: [light()],
    },
    {
        zigbeeModel: ['PROLIGHT REMOTE CONTROL'],
        model: '5412748727388',
        vendor: 'Prolight',
        description: 'Remote control',
        toZigbee: [],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move_to_level, fz.command_move, fz.command_stop,
            fz.command_move_to_color_temp, fz.command_move_to_color, fz.command_move_color_temperature, fz.battery],
        exposes: [e.battery(), e.action(['on', 'off', 'color_temperature_move', 'color_temperature_move_up',
            'color_temperature_move_down', 'color_move', 'brightness_move_up', 'brightness_move_down',
            'brightness_stop', 'brightness_move_to_level'])],
    },
];

export default definitions;
module.exports = definitions;
