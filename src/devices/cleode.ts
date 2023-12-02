import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZPLUG'],
        model: 'ZPLUG_Boost',
        vendor: 'CLEODE',
        description: 'ZPlug boost',
        extend: extend.switch(),
        exposes: [e.switch(), e.power()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
