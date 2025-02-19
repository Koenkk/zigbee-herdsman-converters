import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'idinio'}],
        model: '0140302',
        vendor: 'Idinio',
        description: 'Zigbee LED foot dimmer',
        extend: [m.light({configureReporting: true})],
    },
];
