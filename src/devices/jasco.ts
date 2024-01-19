import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import * as exposes from '../lib/exposes';
import {light} from '../lib/modernExtend';

const e = exposes.presets;


const definitions: Definition[] = [
    {
        zigbeeModel: ['35938'],
        model: 'ZB3102',
        vendor: 'Jasco Products',
        description: 'Zigbee plug-in smart dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43132'],
        model: '43132',
        vendor: 'Jasco',
        description: 'Zigbee smart outlet',
        extend: extend.switch(),
        fromZigbee: [...extend.switch().fromZigbee, fz.metering],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['43095'],
        model: '43095',
        vendor: 'Jasco Products',
        description: 'Zigbee smart plug-in switch with energy metering',
        fromZigbee: [fz.command_on_state, fz.command_off_state, fz.metering],
        extend: extend.switch(),
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint1);
            await reporting.instantaneousDemand(endpoint1);
            await reporting.readMeteringMultiplierDivisor(endpoint1);
        },
    },
];

export default definitions;
module.exports = definitions;
