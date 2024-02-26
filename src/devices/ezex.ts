import {Definition} from '../lib/types';
import {deviceEndpoints, onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['E220-KR3N0Z0-HA'],
        model: 'ECW-100-A03',
        vendor: 'eZEX',
        description: 'Zigbee switch 3 gang',
        extend: [
            deviceEndpoints({endpoints: {'top': 1, 'center': 2, 'bottom': 3}}),
            onOff({endpointNames: ['top', 'center', 'bottom']}),
        ],
    },
];

export default definitions;
module.exports = definitions;
