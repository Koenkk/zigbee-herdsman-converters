import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['On-Air Combi CTW,303-0136'],
        model: '303-0136',
        vendor: 'HFH Solutions',
        description: 'LED controller',
        extend: [light({colorTemp: {range: [155, 495]}})],
    },
];

export default definitions;
module.exports = definitions;
