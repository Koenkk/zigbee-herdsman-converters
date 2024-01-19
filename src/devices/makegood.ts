import {Definition} from '../lib/types';
import * as reporting from '../lib/reporting';
import * as tuya from '../lib/tuya';

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_8nyaanzb', '_TZ3000_dd8wwzcy', '_TZ3000_rgpqqmbj', '_TZ3000_iy2c3n6p']),
        model: 'MG-AUZG01',
        vendor: 'MakeGood',
        description: 'Double Zigbee power point',
        extend: tuya.extend.switch({powerOutageMemory: true, indicatorMode: true, endpoints: ['l1', 'l2'], electricalMeasurements: true}),
        meta: {multiEndpointSkip: ['power', 'current', 'voltage', 'energy']},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
    },
];

export default definitions;
module.exports = definitions;
