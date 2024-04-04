import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['SP31           ', 'SP31'],
        model: 'N2G-SP',
        vendor: 'NET2GRID',
        description: 'White Net2Grid power outlet switch with power meter',
        fromZigbee: [fz.command_on, legacy.fz.genOnOff_cmdOn, fz.command_off, legacy.fz.genOnOff_cmdOff, fz.on_off, fz.metering],
        exposes: [e.switch(), e.power(), e.energy()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);

            const endpoint10 = device.getEndpoint(10);
            await reporting.bind(endpoint10, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint10);
            await reporting.instantaneousDemand(endpoint10);
            await reporting.currentSummDelivered(endpoint10);
            await reporting.currentSummReceived(endpoint10);
        },
    },
];

export default definitions;
module.exports = definitions;
