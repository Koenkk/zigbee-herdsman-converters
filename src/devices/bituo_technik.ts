import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['SPM01X001'],
        model: 'SPM01-D2TZ-U01',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy sensor',
        fromZigbee: [fz.electrical_measurement, fz.metering],
        toZigbee: [],
        exposes: [e.ac_frequency(), e.power(), e.power_reactive(), e.power_apparent(), e.current(),
            e.voltage(), e.power_factor(), e.energy(), e.produced_energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            await endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acPowerMultiplier: 1, acPowerDivisor: 1,
            });
        },
    },
];

export default definitions;
module.exports = definitions;
