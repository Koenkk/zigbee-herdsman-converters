import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Connected A-19 60W Equivalent ', 'Connected A-19 60W Equivalent   '],
        model: 'B00TN589ZG',
        vendor: 'CREE',
        description: 'Connected bulb',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
