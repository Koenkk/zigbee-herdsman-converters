import {battery, windowCovering} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['TQL25-2211'],
        model: 'TQL25-2211',
        vendor: 'Raex',
        description: 'Tubular motor',
        extend: [battery(), windowCovering({controls: ['lift']})],
    },
];

export default definitions;
module.exports = definitions;
