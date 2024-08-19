import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['FB56-ZCW08KU1.1', 'FB56-ZCW08KU1.0'],
        model: 'K2RGBW01',
        vendor: 'JIAWEN',
        description: 'Wireless Bulb E27 9W RGBW',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['FB56-ZBW02KU1.5'],
        model: 'JW-A04-CT',
        vendor: 'JIAWEN',
        description: 'LED strip light controller',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
