import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['DR3000'],
        model: 'DR3000',
        vendor: 'Dowsing & Reynolds',
        description: 'Antique brass double dimmer switch',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
