import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['Zigbee CCT Downlight'],
        model: '53170161',
        vendor: 'Commercial Electric',
        description: 'Matte White Recessed Retrofit Smart Led Downlight - 4 Inch',
        extend: [m.light({colorTemp: {range: undefined}}), m.forcePowerSource({powerSource: 'Mains (single phase)'})],
    },
];

export default definitions;
module.exports = definitions;
