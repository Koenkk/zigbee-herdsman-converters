import {Definition} from '../lib/types';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Bouffalolab'],
        model: 'RMC002',
        vendor: 'Bouffalolab',
        description: 'US plug smart socket',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
            // Reports itself as unknown which is not correct
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
];

module.exports = definitions;
