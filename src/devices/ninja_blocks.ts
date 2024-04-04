import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Ninja Smart Plug'],
        model: 'Z809AF',
        vendor: 'Ninja Blocks',
        description: 'Zigbee smart plug with power meter',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
];

export default definitions;
module.exports = definitions;
