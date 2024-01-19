import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS1001', manufacturerName: '_TZ3000_ztrfrcsu'}],
        model: '141L100RC',
        vendor: 'Aldi',
        description: 'MEGOS switch and dimming light remote control',
        exposes: [e.action(['on', 'off', 'brightness_stop', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down'])],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        toZigbee: [],
    },
];

export default definitions;
module.exports = definitions;
