const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const constants = require('zigbee-herdsman-converters/lib/constants');
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    PC321_metering: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {};
            if (msg.data.hasOwnProperty('owonL1Energy')) {
                payload.energy_l1 = msg.data['owonL1Energy'][1] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL2Energy')) {
                payload.energy_l2 = msg.data['owonL2Energy'][1] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL3Energy')) {
                payload.energy_l3 = msg.data['owonL3Energy'][1] / 1000.0;
            }
            
            if (msg.data.hasOwnProperty('owonL1ReactiveEnergy')) {
                payload.reactive_energy_l1 = msg.data['owonL1ReactiveEnergy'][1] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL2ReactiveEnergy')) {
                payload.reactive_energy_l2 = msg.data['owonL2ReactiveEnergy'][1] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL3ReactiveEnergy')) {
                payload.reactive_energy_l3 = msg.data['owonL3ReactiveEnergy'][1] / 1000.0;
            }
            
            if (msg.data.hasOwnProperty('owonL1PhasePower')) {
                payload.power_l1 = msg.data['owonL1PhasePower'];
            }
            if (msg.data.hasOwnProperty('owonL2PhasePower')) {
                payload.power_l2 = msg.data['owonL2PhasePower'];
            }
            if (msg.data.hasOwnProperty('owonL3PhasePower')) {
                payload.power_l3 = msg.data['owonL3PhasePower'];
            }
            
             if (msg.data.hasOwnProperty('owonL1PhaseReactivePower')) {
                payload.reactive_power_l1 = msg.data['owonL1PhaseReactivePower'];
            }
            if (msg.data.hasOwnProperty('owonL2PhaseReactivePower')) {
                payload.reactive_power_l2 = msg.data['owonL2PhaseReactivePower'];
            }
            if (msg.data.hasOwnProperty('owonL3PhaseReactivePower')) {
                payload.reactive_power_l3 = msg.data['owonL3PhaseReactivePower'];
            }
            
            if (msg.data.hasOwnProperty('owonL1PhaseVoltage')) {
                payload.voltage_l1 = msg.data['owonL1PhaseVoltage'] / 10.0;
            }
            if (msg.data.hasOwnProperty('owonL2PhaseVoltage')) {
                payload.voltage_l2 = msg.data['owonL2PhaseVoltage'] / 10.0;
            }
            if (msg.data.hasOwnProperty('owonL3PhaseVoltage')) {
                payload.voltage_l3 = msg.data['owonL3PhaseVoltage'] / 10.0;
            }
            
            if (msg.data.hasOwnProperty('owonL1PhaseCurrent')) {
                payload.current_l1 = msg.data['owonL1PhaseCurrent'] / 1000.0;
            }
            
            if (msg.data.hasOwnProperty('owonL2PhaseCurrent')) {
                payload.current_l2 = msg.data['owonL2PhaseCurrent'] / 1000.0;
            }
            
            if (msg.data.hasOwnProperty('owonL3PhaseCurrent')) {
                payload.current_l3 = msg.data['owonL3PhaseCurrent'] / 1000.0;
            }
            
            if (msg.data.hasOwnProperty('owonFrequency')) {
                payload.frequency = msg.data['owonFrequency'];
            }
            
            if (msg.data.hasOwnProperty('owonReactiveEnergySum')) {
                payload.reactive_energy_sum = msg.data['owonReactiveEnergySum'];
            }
            
            
            return payload;
        },
    },
};

const definition = {
    zigbeeModel: ['PC321'], // The model ID from: Device with modelID 'lumi.sens' is not supported.
    model: 'PC321', // Vendor model number, look on the device for a model number
    vendor: 'OWON', // Vendor of the device (only used for documentation and startup logging)
    description: '3-Phase Clamp Power Meter', // Description of the device, copy from vendor site. (only used for documentation and startup logging)
    fromZigbee: [fz.metering, fzLocal.PC321_metering],
    toZigbee: [], // Should be empty, unless device can be controlled (e.g. lights, switches).
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
        await reporting.readMeteringMultiplierDivisor(endpoint);
        //const payload = [{
        //        attribute: 'owonL2Energy',
        //        minimumReportInterval: 5,
        //        maximumReportInterval: 3600,
        //        reportableChange: 0,
        //    }];
            await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
	exposes: [e.energy(),
	exposes.numeric('voltage_l1',ea.STATE).withUnit('V').withDescription('Phase 1 Voltage'),
	exposes.numeric('voltage_l2',ea.STATE).withUnit('V').withDescription('Phase 2 Voltage'),
	exposes.numeric('voltage_l3',ea.STATE).withUnit('V').withDescription('Phase 3 Voltage'),
	exposes.numeric('current_l1',ea.STATE).withUnit('A').withDescription('Phase 1 Current'),
	exposes.numeric('current_l2',ea.STATE).withUnit('A').withDescription('Phase 2 Current'),
	exposes.numeric('current_l3',ea.STATE).withUnit('A').withDescription('Phase 3 Current'),
	exposes.numeric('energy_l1',ea.STATE).withUnit('kWh').withDescription('Phase 1 Energy'),
	exposes.numeric('energy_l2',ea.STATE).withUnit('kWh').withDescription('Phase 2 Energy'),
	exposes.numeric('energy_l3',ea.STATE).withUnit('kWh').withDescription('Phase 3 Energy'),
	exposes.numeric('reactive_energy_l1',ea.STATE).withUnit('kVArh').withDescription('Phase 1 Reactive Energy'),
	exposes.numeric('reactive_energy_l2',ea.STATE).withUnit('kVArh').withDescription('Phase 2 Reactive Energy'),
	exposes.numeric('reactive_energy_l3',ea.STATE).withUnit('kVArh').withDescription('Phase 3 Reactive Energy'),
	exposes.numeric('power_l1',ea.STATE).withUnit('W').withDescription('Phase 1 Power'),
	exposes.numeric('power_l2',ea.STATE).withUnit('W').withDescription('Phase 2 Power'),
	exposes.numeric('power_l3',ea.STATE).withUnit('W').withDescription('Phase 3 Power'),
	exposes.numeric('reactive_power_l1',ea.STATE).withUnit('VAr').withDescription('Phase 1 Reactive Power'),
	exposes.numeric('reactive_power_l2',ea.STATE).withUnit('VAr').withDescription('Phase 2 Reactive Power'),
	exposes.numeric('reactive_power_l3',ea.STATE).withUnit('VAr').withDescription('Phase 3 Reactive Power'),
	exposes.numeric('frequency',ea.STATE).withUnit('Hz').withDescription('Frequency'),
	exposes.numeric('reactive_energy_sum',ea.STATE).withUnit('kVArh').withDescription('Reactive Energy Sum'),
	],
	
};

module.exports = definition;