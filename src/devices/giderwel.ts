import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['A10'],
        model: 'GD-ZCRGB012',
        vendor: 'GIDERWEL',
        description: 'Smart Zigbee RGB LED strip controller',
        extend: [light({color: {modes: ['xy', 'hs']}})],
    },
];

export default definitions;
module.exports = definitions;
