import {Definition} from '../lib/types';
import {onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Socket Switch'],
        model: 'ZCC-3500',
        vendor: 'KlikAanKlikUit',
        description: 'Zigbee socket switch',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
