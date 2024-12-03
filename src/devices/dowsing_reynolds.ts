import {philipsLight} from '../lib/philips';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['DR3000'],
        model: 'DR3000',
        vendor: 'Dowsing & Reynolds',
        description: 'Automatically generated definition',
        extend: [philipsLight()],
        meta: {},
    },
];

export default definitions;
module.exports = definitions;
