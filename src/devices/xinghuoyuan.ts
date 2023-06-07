import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['X2SK11'],
        model: 'X2SK11',
        vendor: 'XingHuoYuan',
        description: 'Smart socket',
        extend: extend.switch(),
    },
];

module.exports = definitions;
