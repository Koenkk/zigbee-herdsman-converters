import {battery, humidity, temperature} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SNZB-02'],
        model: 'NAS-TH07B2',
        vendor: 'NEO',
        description: 'Temperature & humidity sensor',
        extend: [temperature(), humidity(), battery()],
    },
];

export default definitions;
module.exports = definitions;
