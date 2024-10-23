import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{type: 'Router', manufacturerName: 'Heatit Controls AB', modelID: 'Dimmer-Switch-ZB3.0'}],
        model: '1444420',
        vendor: 'Heatit',
        description: 'Zig Dim 250W',
        extend: [light({configureReporting: true, powerOnBehavior: false})],
    },
];

export default definitions;
module.exports = definitions;
