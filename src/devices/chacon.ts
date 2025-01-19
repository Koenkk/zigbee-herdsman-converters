import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['ZB-ERSM-01'],
        model: 'ZB-ERSM-01',
        vendor: 'Chacon',
        description: 'Roller shutter module',
        extend: [
            m.windowCovering({controls: ['lift'], coverInverted: true, coverMode: true}),
            m.commandsWindowCovering({commands: ['open', 'close', 'stop']}),
        ],
    },
];

export default definitions;
module.exports = definitions;
