import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['AL8TC13W-AP'],
        model: 'AL8TC13W-AP',
        vendor: 'Alchemy',
        description: 'Downlight with tuneable white',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['AL8RGB13W-AP'],
        model: 'AL8RGB13W-AP',
        vendor: 'Alchemy',
        description: 'Downlight RGBW',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
];

export default definitions;
module.exports = definitions;
