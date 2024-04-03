import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Sonesse Ultra 30 WF Li-Ion Rolle'],
        model: 'SOMFY-1241752',
        vendor: 'SOMFY',
        description: 'Blinds from vendors using this roller',
        fromZigbee: [fz.battery, fz.power_source, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(232);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.cover_position(), e.battery()],
    },
    {
        zigbeeModel: ['1822647'],
        model: '1822647A',
        vendor: 'SOMFY',
        description: 'Zigbee smart plug',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(12);
            await reporting.bind(ep, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff', 'seMetering']);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
            await reporting.currentSummReceived(ep);
        },
    },
];

export default definitions;
module.exports = definitions;
