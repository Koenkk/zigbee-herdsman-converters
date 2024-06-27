import {onOff} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Socket Switch'],
        model: 'ZCC-3500',
        vendor: 'KlikAanKlikUit',
        description: 'Zigbee socket switch',
        extend: [onOff()],
    },
    {
        fingerprint: [{modelID: 'Built-in Switch', manufacturerName: 'KlikAanKlikUit'}],
        model: 'ZCM-1800',
        vendor: 'KlikAanKlikUit',
        description: 'Zigbee switch module',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
