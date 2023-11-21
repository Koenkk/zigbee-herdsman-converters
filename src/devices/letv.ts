import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['qlwz.letv8key.10'],
        model: 'LeTV.8KEY',
        vendor: 'LeTV',
        description: '8key switch',
        fromZigbee: [fz.qlwz_letv8key_switch],
        exposes: [e.action(['hold_up', 'single_up', 'double_up', 'tripple_up', 'hold_down', 'single_down', 'double_down', 'tripple_down',
            'hold_left', 'single_left', 'double_left', 'tripple_left', 'hold_right', 'single_right', 'double_right', 'tripple_right',
            'hold_center', 'single_center', 'double_center', 'tripple_center', 'hold_back', 'single_back', 'double_back', 'tripple_back',
            'hold_play', 'single_play', 'double_play', 'tripple_play', 'hold_voice', 'single_voice', 'double_voice', 'tripple_voice'])],
        toZigbee: [],
    },
];

export default definitions;
module.exports = definitions;
