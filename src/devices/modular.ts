import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['MWM002'],
        model: 'MWM002',
        vendor: 'Modular',
        description: '0-10V Zigbee Dimmer',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
