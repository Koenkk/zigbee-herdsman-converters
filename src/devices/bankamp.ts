import {light} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Bankamp Dimm-Leuchte'],
        model: '2189/1-xx',
        vendor: 'Bankamp',
        description: 'Ceiling light (e.g. Grazia, Grand)',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
