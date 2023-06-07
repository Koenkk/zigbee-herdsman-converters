import {Definition} from '../lib/types';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Lamp_01'],
        model: 'KS-SM001',
        vendor: 'Ksentry Electronics',
        description: 'Zigbee on/off controller',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
];

module.exports = definitions;
