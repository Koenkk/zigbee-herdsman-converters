import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SLZB-06M', 'SLZB-06', 'SLZB-06p7', 'SLZB-06P10', 'SLZB-07', 'SLZB-0xp7', 'SLZB-07Mg24', 'SLZB-06Mg24'],
        model: 'SLZB-06M',
        vendor: 'SMLIGHT',
        description: 'Router',
        whiteLabel: [
            {vendor: 'SMLIGHT', model: 'SLZB-06', description: 'Router', fingerprint: [{modelID: 'SLZB-06'}]},
            {vendor: 'SMLIGHT', model: 'SLZB-06p7', description: 'Router', fingerprint: [{modelID: 'SLZB-06p7'}]},
            {vendor: 'SMLIGHT', model: 'SLZB-06p10', description: 'Router', fingerprint: [{modelID: 'SLZB-06P10'}]},
            {vendor: 'SMLIGHT', model: 'SLZB-07', description: 'Router', fingerprint: [{modelID: 'SLZB-07'}]},
            {vendor: 'SMLIGHT', model: 'SLZB-0xp7', description: 'Router', fingerprint: [{modelID: 'SLZB-0xp7'}]},
            {vendor: 'SMLIGHT', model: 'SLZB-07Mg24', description: 'Router', fingerprint: [{modelID: 'SLZB-07Mg24'}]},
            {vendor: 'SMLIGHT', model: 'SLZB-06Mg24', description: 'Router', fingerprint: [{modelID: 'SLZB-06Mg24'}]},
        ],
        extend: [m.linkQuality({reporting: true}), m.forcePowerSource({powerSource: 'Mains (single phase)'})],
    },
];
