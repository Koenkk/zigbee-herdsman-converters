import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {light} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['EBF_RGB_Zm', 'EBF_RGB_Zm_CLP'],
        model: '900091',
        vendor: 'EGLO',
        description: 'ROVITO-Z ceiling light',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['ESMLFzm_w6_TW'],
        model: '12242',
        vendor: 'EGLO',
        description: 'ST64 adjustable white filament bulb',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ['EGLO_ZM_RGB_TW'],
        model: '900024/12253',
        vendor: 'EGLO',
        description: 'RGB light',
        extend: [light({colorTemp: {range: [153, 370]}, color: {modes: ['xy', 'hs']}})],
    },
    {
        zigbeeModel: ['EGLO_ZM_TW_CLP'],
        model: '98847',
        vendor: 'EGLO',
        description: 'FUEVA-Z ceiling light IP44',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['ERCU_3groups_Zm'],
        model: '99099',
        vendor: 'EGLO',
        description: '3 groups remote controller',
        fromZigbee: [fz.command_on, fz.awox_colors, fz.awox_refresh, fz.awox_refreshColored, fz.command_off,
            fz.command_step, fz.command_move, fz.command_move_to_level, fz.command_move_to_color_temp,
            fz.command_stop, fz.command_recall, fz.command_step_color_temperature],
        toZigbee: [],
        exposes: [e.action(['on', 'off', 'red', 'refresh', 'refresh_colored', 'blue', 'yellow',
            'green', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            'recall_1', 'color_temperature_step_up', 'color_temperature_step_down'])],
    },
];

export default definitions;
module.exports = definitions;
