import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {electricityMeter} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend, Fz, KeyValueAny} from '../lib/types';
import * as utils from '../lib/utils';
import {postfixWithEndpointName, precisionRound} from '../lib/utils';

const e = exposes.presets;
const ea = exposes.access;

const bituo_fz = {
    electrical_measurement: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const getFactor = (key: string) => {
                const multiplier = msg.endpoint.getClusterAttributeValue('haElectricalMeasurement', `${key}Multiplier`) as number;
                const divisor = msg.endpoint.getClusterAttributeValue('haElectricalMeasurement', `${key}Divisor`) as number;
                const factor = multiplier && divisor ? multiplier / divisor : 1;
                return factor;
            };

            const lookup = [
                {key: 'rmsCurrent', name: 'current', factor: 'acCurrent'},
                {key: 'rmsCurrentPhB', name: 'current_phase_b', factor: 'acCurrent'},
                {key: 'rmsCurrentPhC', name: 'current_phase_c', factor: 'acCurrent'},
                {key: 'rmsVoltage', name: 'voltage', factor: 'acVoltage'},
                {key: 'rmsVoltagePhB', name: 'voltage_phase_b', factor: 'acVoltage'},
                {key: 'rmsVoltagePhC', name: 'voltage_phase_c', factor: 'acVoltage'},
                {key: 'acFrequency', name: 'ac_frequency', factor: 'acFrequency'},
                {key: 'dcPower', name: 'power', factor: 'dcPower'},
                {key: 'dcCurrent', name: 'current', factor: 'dcCurrent'},
                {key: 'dcVoltage', name: 'voltage', factor: 'dcVoltage'},
            ];
            // Treat all power type parameters separately and forcibly set the factor to 1
            const powerLookup = [
                {key: 'activePower', name: 'power'},
                {key: 'activePowerPhB', name: 'power_phase_b'},
                {key: 'activePowerPhC', name: 'power_phase_c'},
                {key: 'apparentPower', name: 'power_apparent'},
                {key: 'apparentPowerPhB', name: 'power_apparent_phase_b'},
                {key: 'apparentPowerPhC', name: 'power_apparent_phase_c'},
                {key: 'reactivePower', name: 'power_reactive'},
                {key: 'reactivePowerPhB', name: 'power_reactive_phase_b'},
                {key: 'reactivePowerPhC', name: 'power_reactive_phase_c'},
                {key: 'totalActivePower', name: 'total_power'},
                {key: 'totalApparentPower', name: 'total_power_apparent'},
                {key: 'totalReactivePower', name: 'total_power_reactive'},
            ];

            const payload: KeyValueAny = {};
            for (const entry of lookup) {
                if (msg.data[entry.key] !== undefined) {
                    const factor = getFactor(entry.factor);
                    const property = postfixWithEndpointName(entry.name, msg, model, meta);
                    const value = msg.data[entry.key] * factor;
                    payload[property] = value;
                }
            }
            for (const entry of powerLookup) {
                if (msg.data[entry.key] !== undefined) {
                    const factor = 1;
                    const property = postfixWithEndpointName(entry.name, msg, model, meta);
                    const value = msg.data[entry.key] * factor;
                    payload[property] = value;
                }
            }
            if (msg.data.powerFactor !== undefined) {
                const property = postfixWithEndpointName('power_factor', msg, model, meta);
                payload[property] = precisionRound(msg.data['powerFactor'] / 100, 2);
            }
            if (msg.data.powerFactorPhB !== undefined) {
                const property = postfixWithEndpointName('power_factor_phase_b', msg, model, meta);
                payload[property] = precisionRound(msg.data['powerFactorPhB'] / 100, 2);
            }
            if (msg.data.powerFactorPhC !== undefined) {
                const property = postfixWithEndpointName('power_factor_phase_c', msg, model, meta);
                payload[property] = precisionRound(msg.data['powerFactorPhC'] / 100, 2);
            }
            return payload;
        },
    } satisfies Fz.Converter,
};
const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SPM01X001', 'SPM01X'],
        model: 'SPM01-U01',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy monitor for 1P+N system',

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
        },
        extend: [
            electricityMeter({
                fzMetering: fz.metering,
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
                power: {divisor: 1, multiplier: 1},
            }),
        ],
        exposes: [e.power_apparent()],
    },
    {
        zigbeeModel: ['SPM02X001', 'SPM02X'],
        model: 'SPM02-U01',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy monitor for 3P+N system',

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
        },
        extend: [
            electricityMeter({
                fzMetering: fz.metering,
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
                threePhase: true,
                power: {divisor: 1, multiplier: 1},
            }),
        ],
        exposes: [
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_reactive_phase_c(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.power_apparent_phase_c(),
            e.power_factor_phase_b(),
            e.power_factor_phase_c(),
            e.numeric('total_power', ea.STATE).withUnit('W').withDescription('Total active power'),
            e.numeric('total_power_reactive', ea.STATE).withUnit('VAR').withDescription('Total active power'),
            e.numeric('total_power_apparent', ea.STATE).withUnit('VA').withDescription('Total active power'),
        ],
    },
    {
        zigbeeModel: ['SPM01'],
        model: 'SPM01-U02',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy monitor for 1P+N system',

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            const overrides = {min: 5, max: 5, change: 0};
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('acFrequency', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsVoltage', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsCurrent', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('activePower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('apparentPower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('powerFactor', 5, 5, 0, overrides));
            await reporting.currentSummDelivered(endpoint, {min: 5, max: 5, change: 0});
            await reporting.currentSummReceived(endpoint, {min: 5, max: 5, change: 0});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
        },
        extend: [
            electricityMeter({
                fzMetering: fz.metering,
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
                power: {divisor: 1, multiplier: 1},
            }),
        ],
        exposes: [e.power_apparent()],
    },
    {
        zigbeeModel: ['SDM02'],
        model: 'SDM02-U02',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy monitor for 2P+N system',
        fromZigbee: [fz.electrical_measurement, fz.metering],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            const overrides = {min: 5, max: 5, change: 0};
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('acFrequency', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsVoltage', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsVoltagePhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsCurrent', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsCurrentPhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('activePower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('activePowerPhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('reactivePower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('reactivePowerPhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('apparentPower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('apparentPowerPhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('powerFactor', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('powerFactorPhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('totalActivePower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('totalReactivePower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('totalApparentPower', 5, 5, 0, overrides));
            await reporting.currentSummDelivered(endpoint, {min: 5, max: 5, change: 0});
            await reporting.currentSummReceived(endpoint, {min: 5, max: 5, change: 0});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
        },
        extend: [
            electricityMeter({
                fzMetering: fz.metering,
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
                power: {divisor: 1, multiplier: 1},
            }),
        ],
        exposes: [
            e.power_phase_b(),
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.current_phase_b(),
            e.voltage_phase_b(),
            e.power_factor_phase_b(),
            e.numeric('total_power', ea.STATE).withUnit('W').withDescription('Total active power'),
            e.numeric('total_power_reactive', ea.STATE).withUnit('VAR').withDescription('Total active power'),
            e.numeric('total_power_apparent', ea.STATE).withUnit('VA').withDescription('Total active power'),
        ],
    },
    {
        zigbeeModel: ['SPM02'],
        model: 'SPM02-U02',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy monitor for 3P+N system',
        fromZigbee: [fz.electrical_measurement, fz.metering],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            const overrides = {min: 5, max: 5, change: 0};
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('acFrequency', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsVoltage', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsVoltagePhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsVoltagePhC', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsCurrent', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsCurrentPhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('rmsCurrentPhC', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('activePower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('activePowerPhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('activePowerPhC', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('reactivePower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('reactivePowerPhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('reactivePowerPhC', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('apparentPower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('apparentPowerPhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('apparentPowerPhC', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('powerFactor', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('powerFactorPhB', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('powerFactorPhC', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('totalActivePower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('totalReactivePower', 5, 5, 0, overrides));
            await endpoint.configureReporting('haElectricalMeasurement', reporting.payload('totalApparentPower', 5, 5, 0, overrides));
            await reporting.currentSummDelivered(endpoint, {min: 5, max: 5, change: 0});
            await reporting.currentSummReceived(endpoint, {min: 5, max: 5, change: 0});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
        },
        extend: [
            electricityMeter({
                fzMetering: fz.metering,
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
                threePhase: true,
                power: {divisor: 1, multiplier: 1},
            }),
        ],
        exposes: [
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_reactive_phase_c(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.power_apparent_phase_c(),
            e.power_factor_phase_b(),
            e.power_factor_phase_c(),
            e.numeric('total_power', ea.STATE).withUnit('W').withDescription('Total active power'),
            e.numeric('total_power_reactive', ea.STATE).withUnit('VAR').withDescription('Total active power'),
            e.numeric('total_power_apparent', ea.STATE).withUnit('VA').withDescription('Total active power'),
        ],
    },
];

export default definitions;
module.exports = definitions;
