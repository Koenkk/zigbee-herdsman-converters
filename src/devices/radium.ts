import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['LMZA4376'],
        model: 'LMZA4376',
        vendor: 'Radium',
        description: 'LED Controller ZGB White 84W/24V',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
