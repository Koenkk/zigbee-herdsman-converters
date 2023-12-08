import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZBT-RGBWLight-A0000'],
        model: 'ZBT-RGBWLight-A0000',
        vendor: 'LDS',
        description: 'Ynoa smart LED E27',
        extend: [light({color: true, colorTemp: {range: [153, 555]}})],
    },
];

export default definitions;
module.exports = definitions;
