import {Zcl} from 'zigbee-herdsman';

import {develcoModernExtend} from '../lib/develco';
import * as exposes from '../lib/exposes';
import {battery, electricityMeter, onOff, ota} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend, Fz, Tz} from '../lib/types';
import * as utils from '../lib/utils';

const e = exposes.presets;
const ea = exposes.access;

// NOTE! Develco and Frient is the same company, therefore we use develco specific things in here.

// frient/develco specific constants
const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.DEVELCO};

// frient/develco specific convertors
const frient = {
    fz: {
        pulse_configuration: {
            cluster: 'seMetering',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: Record<string, unknown> = {};
                if (msg.data?.develcoPulseConfiguration) {
                    result[utils.postfixWithEndpointName('pulse_configuration', msg, model, meta)] = msg.data['develcoPulseConfiguration'];
                }

                return result;
            },
        } satisfies Fz.Converter,
    },
    tz: {
        pulse_configuration: {
            key: ['pulse_configuration'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('seMetering', {develcoPulseConfiguration: value}, utils.getOptions(meta.mapped, entity));
                return {readAfterWriteTime: 200, state: {pulse_configuration: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('seMetering', ['develcoPulseConfiguration'], manufacturerOptions);
            },
        } satisfies Tz.Converter,
        current_summation: {
            key: ['current_summation'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('seMetering', {develcoCurrentSummation: value}, utils.getOptions(meta.mapped, entity));
                return {state: {current_summation: value}};
            },
        } satisfies Tz.Converter,
    },
};

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['EMIZB-141'],
        model: 'EMIZB-141',
        vendor: 'Frient A/S',
        description: 'frient Electricity Meter Interface 2 LED',
        fromZigbee: [frient.fz.pulse_configuration],
        toZigbee: [frient.tz.pulse_configuration, frient.tz.current_summation],
        extend: [
            ota(),
            electricityMeter({cluster: 'metering', power: {divisor: 1000, multiplier: 1}, energy: {divisor: 1000, multiplier: 1}}),
            battery(),
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
        ],
        exposes: [
            e
                .numeric('pulse_configuration', ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription('Pulses per kwh. Default 1000 imp/kWh. Range 0 to 65535'),
            e
                .numeric('current_summation', ea.SET)
                .withDescription('Current summation value sent to the display. e.g. 570 = 0,570 kWh')
                .withValueMin(0)
                .withValueMax(268435455),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering', 'genPowerCfg']);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
    {
        zigbeeModel: ['SMRZB-153'],
        model: 'SMRZB-153',
        vendor: 'Frient',
        description: 'Smart Cable - Power switch with power measurement',
        extend: [onOff({configureReporting: false}), electricityMeter()],
        endpoint: (device) => {
            return {default: 2};
        },
    },
];

export default definitions;
module.exports = definitions;
