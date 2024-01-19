import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
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
