import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['RDM-35104001'],
        model: '35104001',
        vendor: 'Rademacher',
        description: 'addZ white + colour',
        extend: [light({color: true, colorTemp: {range: [153, 555]}})],
    },
    {
        zigbeeModel: ['RDM-35144001'],
        model: '35144001',
        vendor: 'Rademacher',
        description: 'addZ white + colour',
        extend: [light({color: true, colorTemp: {range: [153, 555]}})],
    },
];

export default definitions;
module.exports = definitions;
