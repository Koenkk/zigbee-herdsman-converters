import {onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
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
