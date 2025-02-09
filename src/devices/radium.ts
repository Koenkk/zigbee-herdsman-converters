import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['LMZA4376'],
        model: 'LMZA4376',
        vendor: 'Radium',
        description: 'LED Controller ZGB White 84W/24V',
        extend: [m.light()],
    },
];
