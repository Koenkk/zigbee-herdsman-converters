import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['053'],
        model: 'HLC610',
        vendor: 'iLightsIn',
        description: '1-10V dimming LED controller',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
