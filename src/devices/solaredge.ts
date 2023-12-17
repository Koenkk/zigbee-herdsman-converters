import {Definition} from '../lib/types';
import {onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['SE-SW'],
        model: 'SEHAZB-DR-SWITCH-2',
        vendor: 'SolarEdge',
        description: 'Smart energy switch',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
