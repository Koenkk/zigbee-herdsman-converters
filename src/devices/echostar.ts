import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['   Bell'],
        model: 'SAGE206612',
        vendor: 'EchoStar',
        description: 'SAGE by Hughes doorbell sensor',
        fromZigbee: [fz.SAGE206612_state, fz.battery],
        exposes: [e.battery(), e.action(['bell1', 'bell2'])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
    },
    {
        zigbeeModel: [' Switch'],
        model: 'SAGE206611',
        vendor: 'Echostar',
        description: 'SAGE by Hughes single gang light switch',
        fromZigbee: [fz.command_on, fz.command_off],
        exposes: [e.action(['on', 'off'])],
        toZigbee: [],
    },
];

export default definitions;
module.exports = definitions;
