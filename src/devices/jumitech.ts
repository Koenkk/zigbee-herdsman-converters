import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['J2182548'],
        model: 'J2182548',
        vendor: 'JUMITECH APS',
        description: 'ZigBee AC phase-cut dimmer single-line',
        extend: [m.light({configureReporting: true})],
    },
];
