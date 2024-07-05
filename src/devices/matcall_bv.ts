import {light} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZG 401224'],
        model: 'ZG401224',
        vendor: 'Matcall',
        description: 'LED dimmer driver',
        extend: [light()],
    },
    {
        zigbeeModel: ['ZG 430700', 'ZG  430700'],
        model: 'ZG430700',
        vendor: 'Matcall',
        description: 'LED dimmer driver',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
