import {light} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
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
