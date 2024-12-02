import {philipsLight} from '../lib/philips';

const definition = {
    zigbeeModel: ['DR3000'],
    model: 'DR3000',
    vendor: 'Dowsing & Reynolds',
    description: 'Automatically generated definition',
    extend: [philipsLight()],
    meta: {},
};

export default definition;
module.exports = definition;
