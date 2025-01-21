import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['050-0131558M'],
        model: '050-0131558M',
        vendor: 'XAL',
        description: 'Spotlight for Just MOVE IT 25 track',
        extend: [m.light()],
    },
    {
        zigbeeModel: ['050-1212558H'],
        model: '050-1212558H',
        vendor: 'XAL',
        description: 'Opal floodlight for Just MOVE IT 25 track',
        extend: [m.light()],
    },
    {
        zigbeeModel: ['050-0511558F'],
        model: '050-0511558F',
        vendor: 'XAL',
        description: 'Cable suspended spotlight for Just MOVE IT 25 track',
        extend: [m.light()],
    },
];

export default definitions;
module.exports = definitions;
