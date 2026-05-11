import {DefinitionWithExtend} from '../lib/types';
import * as m from '../lib/modernExtend';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['ZLL-DimmableLight'],
        model: 'LC201060',
        vendor: 'Megaman',
        description: 'LED Candle 6W 2700K (Dimmbar)',
        extend: [m.light()],
    },
];

export default definitions;
