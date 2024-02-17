import {Definition} from '../lib/types';
import {onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['X2SK11'],
        model: 'X2SK11',
        vendor: 'XingHuoYuan',
        description: 'Smart socket',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
