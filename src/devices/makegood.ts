import {Definition} from '../lib/types';
import * as reporting from '../lib/reporting';
import * as tuya from '../lib/tuya';

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_dd8wwzcy']),
        model: 'MG-AUZG01',
        vendor: 'MakeGood',
        description: 'Double Zigbee power point',
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, indicatorMode: true, endpoints: ['l1', 'l2'], electricalMeasurements: true})],
        meta: {multiEndpointSkip: ['power', 'current', 'voltage', 'energy'], multiEndpoint: true},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
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
