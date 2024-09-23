import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
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
