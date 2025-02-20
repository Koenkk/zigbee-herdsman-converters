import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['053'],
        model: 'HLC610',
        vendor: 'iLightsIn',
        description: '1-10V dimming LED controller',
        extend: [m.light()],
    },
];
