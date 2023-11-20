import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['SE-SW'],
        model: 'SEHAZB-DR-SWITCH-2',
        vendor: 'SolarEdge',
        description: 'Smart energy switch',
        extend: extend.switch(),
    },
];

export default definitions;
module.exports = definitions;
