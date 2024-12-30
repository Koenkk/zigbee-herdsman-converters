import {commandsWindowCovering, windowCovering} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['ZB-ERSM-01'],
        model: 'ZB-ERSM-01',
        vendor: 'Chacon',
        description: 'Roller shutter module',
        extend: [
            windowCovering({controls: ['lift'], coverInverted: true, coverMode: true}),
            commandsWindowCovering({commands: ['open', 'close', 'stop']}),
        ],
    },
];

export default definitions;
module.exports = definitions;
