import {Definition} from '../lib/types';
import {forcePowerSource, light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Zigbee CCT Downlight'],
        model: '53170161',
        vendor: 'Commercial Electric',
        description: 'Matte White Recessed Retrofit Smart Led Downlight - 4 Inch',
        extend: [light({colorTemp: {range: undefined}}), forcePowerSource({powerSource: 'Mains (single phase)'})],
    },
];

export default definitions;
module.exports = definitions;
