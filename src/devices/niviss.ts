import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['NIV-ZC-OFD'],
        model: 'PS-ZIGBEE-SMART-CONTROLER-1CH-DIMMABLE',
        vendor: 'Niviss',
        description: 'Zigbee smart controller',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
