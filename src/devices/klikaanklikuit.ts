import {Definition} from '../lib/types';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Socket Switch'],
        model: 'ZCC-3500',
        vendor: 'KlikAanKlikUit',
        description: 'Zigbee socket switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
];

module.exports = definitions;
