import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Hilux DZ8'],
        model: 'DZ8',
        vendor: 'Hilux',
        description: 'Spot 7W',
        extend: [light({colorTemp: {range: [153, 370]}, powerOnBehavior: false})],
    },
];

export default definitions;
module.exports = definitions;
