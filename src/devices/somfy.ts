import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import {battery, iasZoneAlarm, identify, windowCovering} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['Sonesse Ultra 30 WF Li-Ion Rolle'],
        model: 'SOMFY-1241752',
        vendor: 'SOMFY',
        description: 'Blinds',
        extend: [windowCovering({controls: ['lift']}), battery()],
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
    {
        zigbeeModel: ['1811680'],
        model: '1811680',
        vendor: 'SOMFY',
        description: 'Zigbee opening sensor',
        extend: [identify(), iasZoneAlarm({zoneType: 'generic', zoneAttributes: ['alarm_1', 'battery_low']}), battery()],
    },
    {
        zigbeeModel: ['1811681'],
        model: '1811681',
        vendor: 'SOMFY',
        description: 'Zigbee motion sensor',
        extend: [identify(), iasZoneAlarm({zoneType: 'occupancy', zoneAttributes: ['alarm_1', 'battery_low']}), battery()],
    },
];

export default definitions;
module.exports = definitions;
