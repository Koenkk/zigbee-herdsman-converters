import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['LZL4BWHL01 Remote'],
        model: 'LZL4BWHL01',
        vendor: 'Lutron',
        description: 'Connected bulb remote control',
        fromZigbee: [legacy.fz.insta_down_hold, legacy.fz.insta_up_hold, legacy.fz.LZL4B_onoff, legacy.fz.insta_stop],
        toZigbee: [],
        exposes: [e.action(['brightness_step_down', 'brightness_step_up', 'brightness_stop', 'brightness_move_to_level'])],
    },
    {
        zigbeeModel: ['Z3-1BRL'],
        model: 'Z3-1BRL',
        vendor: 'Lutron',
        description: 'Aurora smart bulb dimmer',
        fromZigbee: [legacy.fz.dimmer_passthru_brightness],
        toZigbee: [],
        exposes: [e.action(['brightness']), e.numeric('brightness', ea.STATE)],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
        },
        ota: ota.zigbeeOTA,
    },
];

export default definitions;
module.exports = definitions;
