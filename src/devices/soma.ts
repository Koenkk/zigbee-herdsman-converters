import {battery, windowCovering} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['SmartShades3'],
        model: 'SmartShades3',
        vendor: 'SOMA',
        description: 'Smart shades 3',
        extend: [battery(), windowCovering({controls: ['lift', 'tilt']})],
    },
];

export default definitions;
module.exports = definitions;
