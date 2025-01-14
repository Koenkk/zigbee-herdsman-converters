import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['B1027EB0Z01'],
        model: 'B1027EB0Z01',
        vendor: 'LG Electronics',
        description: 'Smart bulb 1',
        extend: [m.light()],
    },
    {
        zigbeeModel: ['B1027EB0Z02'],
        model: 'B1027EB0Z02',
        vendor: 'LG Electronics',
        description: 'Smart bulb 2',
        extend: [m.light()],
    },
    {
        zigbeeModel: ['B1027EB4Z01'],
        model: 'B1027EB4Z01',
        vendor: 'LG Electronics',
        description: 'Smart bulb 3',
        extend: [m.light()],
    },
];

export default definitions;
module.exports = definitions;
