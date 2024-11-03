import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['LST103'],
        model: 'LST103',
        vendor: 'Gumax',
        description: 'Gumax lighting system',
        extend: [light({colorTemp: {range: [153, 370]}, color: {modes: ['xy', 'hs'], enhancedHue: true}})],
    },
];

export default definitions;
module.exports = definitions;
