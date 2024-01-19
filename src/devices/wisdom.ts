import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['HK-DIM-SW'],
        model: 'DMZ250',
        vendor: 'Wisdom',
        description: 'Zigbee led dimmer 5-250 Watt',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
