import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['NIV-ZC-OFD'],
        model: 'PS-ZIGBEE-SMART-CONTROLER-1CH-DIMMABLE',
        vendor: 'Niviss',
        description: 'Zigbee smart controller',
        extend: [m.light()],
    },
];
