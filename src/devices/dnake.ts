import {onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
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
