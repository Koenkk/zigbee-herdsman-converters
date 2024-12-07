import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['RDM-35104001'],
        model: '35104001',
        vendor: 'Rademacher',
        description: 'addZ white + colour',
        extend: [light({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ['RDM-35144001'],
        model: '35144001',
        vendor: 'Rademacher',
        description: 'addZ white + colour',
        extend: [light({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ['RDM-35274001'],
        model: 'RDM-35274001',
        vendor: 'Rademacher',
        description: 'addZ white + colour E27 LED',
        extend: [light({colorTemp: {range: [153, 555]}, color: {modes: ['xy', 'hs'], enhancedHue: true}})],
    },
];

export default definitions;
module.exports = definitions;
