import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['ZPLUG'],
        model: 'ZPLUG_Boost',
        vendor: 'CLEODE',
        description: 'ZPlug boost',
        extend: [m.onOff(), m.electricityMeter({cluster: 'metering'})],
    },
];
