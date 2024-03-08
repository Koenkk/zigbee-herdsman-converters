import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import fz from '../converters/fromZigbee';
import {Definition} from '../lib/types';
const e = exposes.presets;


const definitions: Definition[] = [
    {
        zigbeeModel: ['SPM01X001'],
        model: 'SPM01-U01',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy sensor',
        fromZigbee: [fz.electrical_measurement, fz.metering],
        toZigbee: [],
        exposes: [e.ac_frequency(), e.power().withUnit('kW'), e.power_reactive().withUnit('kW'), e.power_apparent().withUnit('kW'), e.current(),
            e.voltage(), e.power_factor(), e.energy(), e.produced_energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
        },
    },
    {
        zigbeeModel: ['SPM02X001'],
        model: 'SPM02-U01',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy sensor',
        fromZigbee: [fz.electrical_measurement, fz.metering],
        toZigbee: [],
        exposes: [e.ac_frequency(), e.energy(), e.produced_energy(),
            e.power().withUnit('kW'), e.power_phase_b().withUnit('kW'), e.power_phase_c().withUnit('kW'),
            e.power_reactive().withUnit('kVAR'), e.power_reactive_phase_b().withUnit('kVAR'), e.power_reactive_phase_c().withUnit('kVAR'),
            e.power_apparent().withUnit('kVA'), e.power_apparent_phase_b().withUnit('kVA'), e.power_apparent_phase_c().withUnit('kVA'),
            e.current(), e.current_phase_b(), e.current_phase_c(),
            e.voltage(), e.voltage_phase_b(), e.voltage_phase_c(),
            e.power_factor(), e.power_factor_phase_b(), e.power_factor_phase_c(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
