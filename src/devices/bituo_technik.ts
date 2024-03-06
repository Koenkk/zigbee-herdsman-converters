import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
import {
    precisionRound,
    postfixWithEndpointName, calibrateAndPrecisionRoundOptions,
} from '../lib/utils';
import {KeyValueAny, Fz, Definition} from '../lib/types';
const e = exposes.presets;

const fzLocal = {
    seMetering: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const payload: KeyValueAny = {};
            const multiplier = msg.endpoint.getClusterAttributeValue('seMetering', 'multiplier') as number;
            const divisor = msg.endpoint.getClusterAttributeValue('seMetering', 'divisor') as number;
            const factor = multiplier && divisor ? multiplier / divisor : null;

            if (factor != null && (msg.data.hasOwnProperty('currentSummDelivered') ||
                msg.data.hasOwnProperty('currentSummReceived'))) {
                let energy = 0;
                let producedEnergy = 0;
                if (msg.data.hasOwnProperty('currentSummDelivered')) {
                    const data = msg.data['currentSummDelivered'];
                    const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                    energy = value * factor;
                }
                if (msg.data.hasOwnProperty('currentSummReceived')) {
                    const data = msg.data['currentSummReceived'];
                    const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                    producedEnergy = value * factor;
                }
                payload.energy = calibrateAndPrecisionRoundOptions(energy, options, 'energy');
                payload.producedEnergy = calibrateAndPrecisionRoundOptions(producedEnergy, options, 'energy');
            }
            return payload;
        },
    } satisfies Fz.Converter,
    electrical_measurement: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        options: [
            exposes.options.precision('ac_frequency'),
            exposes.options.calibration('power', 'percentual'), exposes.options.precision('power'),
            exposes.options.precision('power_phase_b'), exposes.options.precision('power_phase_c'),
            exposes.options.precision('power_apparent'),
            exposes.options.precision('power_apparent_phase_b'), exposes.options.precision('power_apparent_phase_c'),
            exposes.options.precision('power_reactive'),
            exposes.options.precision('power_reactive_phase_b'), exposes.options.precision('power_reactive_phase_c'),
            exposes.options.calibration('current', 'percentual'), exposes.options.precision('current'),
            exposes.options.calibration('voltage', 'percentual'), exposes.options.precision('voltage'),
        ],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const getFactor = (key: string) => {
                const multiplier = msg.endpoint.getClusterAttributeValue('haElectricalMeasurement', `${key}Multiplier`) as number;
                const divisor = msg.endpoint.getClusterAttributeValue('haElectricalMeasurement', `${key}Divisor`) as number;
                const factor = multiplier && divisor ? multiplier / divisor : 1;
                return factor;
            };

            const lookup = [
                {key: 'activePower', name: 'power', factor: 'acPower'},
                {key: 'activePowerPhB', name: 'power_phase_b', factor: 'acPower'},
                {key: 'activePowerPhC', name: 'power_phase_c', factor: 'acPower'},
                {key: 'apparentPower', name: 'power_apparent', factor: 'acPower'},
                {key: 'apparentPowerPhB', name: 'power_apparent_phase_b', factor: 'acPower'},
                {key: 'apparentPowerPhC', name: 'power_apparent_phase_c', factor: 'acPower'},
                {key: 'reactivePower', name: 'power_reactive', factor: 'acPower'},
                {key: 'reactivePowerPhB', name: 'power_reactive_phase_b', factor: 'acPower'},
                {key: 'reactivePowerPhC', name: 'power_reactive_phase_c', factor: 'acPower'},
                {key: 'rmsCurrent', name: 'current', factor: 'acCurrent'},
                {key: 'rmsCurrentPhB', name: 'current_phase_b', factor: 'acCurrent'},
                {key: 'rmsCurrentPhC', name: 'current_phase_c', factor: 'acCurrent'},
                {key: 'rmsVoltage', name: 'voltage', factor: 'acVoltage'},
                {key: 'rmsVoltagePhB', name: 'voltage_phase_b', factor: 'acVoltage'},
                {key: 'rmsVoltagePhC', name: 'voltage_phase_c', factor: 'acVoltage'},
                {key: 'acFrequency', name: 'ac_frequency', factor: 'acFrequency'},
            ];

            const payload: KeyValueAny= {};
            for (const entry of lookup) {
                if (msg.data.hasOwnProperty(entry.key)) {
                    const factor = getFactor(entry.factor);
                    const property = postfixWithEndpointName(entry.name, msg, model, meta);
                    const value = msg.data[entry.key] * factor;
                    payload[property] =value;
                }
            }

            if (msg.data.hasOwnProperty('powerFactor')) {
                payload.power_factor = precisionRound(msg.data['powerFactor'], 2);
            }
            if (msg.data.hasOwnProperty('powerFactorPhB')) {
                payload.power_factor_phase_b = precisionRound(msg.data['powerFactorPhB'], 2);
            }
            if (msg.data.hasOwnProperty('powerFactorPhC')) {
                payload.power_factor_phase_c = precisionRound(msg.data['powerFactorPhC'], 2);
            }
            return payload;
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['SPM01X001'],
        model: 'SPM01-U01',
        vendor: 'BITUO TECHNIK',
        description: 'Smart energy sensor',
        fromZigbee: [fzLocal.electrical_measurement, fzLocal.seMetering],
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
        fromZigbee: [fzLocal.electrical_measurement, fzLocal.seMetering],
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
