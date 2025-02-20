import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['On-Air Combi CTW,303-0136'],
        model: '303-0136',
        vendor: 'HFH Solutions',
        description: 'LED controller',
        extend: [m.light({colorTemp: {range: [155, 495]}})],
    },
];
