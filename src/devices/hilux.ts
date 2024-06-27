import {light} from '../lib/modernExtend';
import {Definition} from '../lib/types';

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
