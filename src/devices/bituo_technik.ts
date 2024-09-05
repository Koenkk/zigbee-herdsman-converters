import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SPM01X001'],
        model: 'SPM01-U01',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy sensor',
        fromZigbee: [fz.electrical_measurement, fz.metering],
        toZigbee: [],
        exposes: [
            e.ac_frequency(),
            e.power(),
            e.power_reactive(),
            e.power_apparent(),
            e.current(),
            e.voltage(),
            e.power_factor(),
            e.energy(),
            e.produced_energy(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            // {change: 0} Ensure that energy and produced energy report parameters correctly during initialization instead of showing null
            await reporting.currentSummDelivered(endpoint, {change: 0});
            await reporting.currentSummReceived(endpoint, {change: 0});
            await endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
        },
    },
    {
        zigbeeModel: ['SPM02X001'],
        model: 'SPM02-U01',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy sensor',
        fromZigbee: [fz.electrical_measurement, fz.metering],
        toZigbee: [],
        exposes: [
            e.ac_frequency(),
            e.energy(),
            e.produced_energy(),
            e.power(),
            e.power_phase_b(),
            e.power_phase_c(),
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_reactive_phase_c(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.power_apparent_phase_c(),
            e.current(),
            e.current_phase_b(),
            e.current_phase_c(),
            e.voltage(),
            e.voltage_phase_b(),
            e.voltage_phase_c(),
            e.power_factor(),
            e.power_factor_phase_b(),
            e.power_factor_phase_c(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            // {change: 0} Ensure that energy and produced energy report parameters correctly during initialization instead of showing null
            await reporting.currentSummDelivered(endpoint, {change: 0});
            await reporting.currentSummReceived(endpoint, {change: 0});
            await endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
        },
    },
];

export default definitions;
module.exports = definitions;
