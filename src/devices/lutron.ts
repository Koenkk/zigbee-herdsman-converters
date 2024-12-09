import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['LZL4BWHL01 Remote'],
        model: 'LZL4BWHL01',
        vendor: 'Lutron',
        description: 'Connected bulb remote control',
        fromZigbee: [fz.command_step, fz.command_step, fz.command_move_to_level, fz.command_stop],
        toZigbee: [],
        exposes: [e.action(['brightness_step_down', 'brightness_step_up', 'brightness_stop', 'brightness_move_to_level'])],
    },
    {
        zigbeeModel: ['Z3-1BRL'],
        model: 'Z3-1BRL',
        vendor: 'Lutron',
        description: 'Aurora smart bulb dimmer',
        fromZigbee: [fz.command_move_to_level],
        toZigbee: [],
        exposes: [e.action(['brightness']), e.numeric('brightness', ea.STATE)],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
        },
        ota: true,
    },
];

export default definitions;
module.exports = definitions;
