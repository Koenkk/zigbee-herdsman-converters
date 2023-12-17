import {Definition} from '../lib/types';
import {onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['CS-Z-CZ-2402'],
        model: 'CS-Z-CZ-2402',
        vendor: 'DNAKE',
        description: 'Smart socket',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
