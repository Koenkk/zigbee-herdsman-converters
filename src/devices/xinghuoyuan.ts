import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['X2SK11'],
        model: 'X2SK11',
        vendor: 'XingHuoYuan',
        description: 'Smart socket',
        extend: [m.onOff()],
    },
];

export default definitions;
module.exports = definitions;
