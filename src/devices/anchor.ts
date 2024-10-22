import {onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['FB56-SKT17AC1.4'],
        model: '67200BL',
        description: 'Vetaar smart plug',
        vendor: 'Anchor',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
