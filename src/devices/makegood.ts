import {Definition, Fz} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as tuya from '../lib/tuya';
import * as utils from '../lib/utils';
const e = exposes.presets;

const fzLocal = {
    // MG-AUZG01 requires multiEndpoint only for on_off
    // https://github.com/Koenkk/zigbee2mqtt/issues/13190
    MGAUZG01_on_off: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                const endpointName = utils.getKey(model.endpoint(meta.device), msg.endpoint.ID);
                return {[`state_${endpointName}`]: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    } as Fz.Converter,
};

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_dd8wwzcy'}],
        model: 'MG-AUZG01',
        vendor: 'MakeGood',
        description: 'Double Zigbee power point',
        fromZigbee: [fzLocal.MGAUZG01_on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.power(), e.current(), e.voltage(),
            e.energy()],
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

module.exports = definitions;
