import {Zcl} from 'zigbee-herdsman';

import fz from '../converters/fromZigbee';
import * as constants from '../lib/constants';
import * as exposes from '../lib/exposes';
import {electricityMeter, onOff, ota} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend, Fz, Tz} from '../lib/types';
import * as utils from '../lib/utils';

const e = exposes.presets;
const ea = exposes.access;

// frient/develco specific cosntants
const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.DEVELCO};

// frient/develco specific convertors
const frient = {
    fz: {
        pulse_configuration: {
            cluster: 'seMetering',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: Record<string, unknown> = {};
                if (msg.data.hasOwnProperty('develcoPulseConfiguration')) {
                    result[utils.postfixWithEndpointName('pulse_configuration', msg, model, meta)] = msg.data['develcoPulseConfiguration'];
                }

                return result;
            },
        } satisfies Fz.Converter,
        interface_mode: {
            cluster: 'seMetering',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: Record<string, unknown> = {};
                if (msg.data.hasOwnProperty('develcoInterfaceMode')) {
                    result[utils.postfixWithEndpointName('interface_mode', msg, model, meta)] = constants.develcoInterfaceMode.hasOwnProperty(
                        msg.data['develcoInterfaceMode'],
                    )
                        ? constants.develcoInterfaceMode[msg.data['develcoInterfaceMode']]
                        : msg.data['develcoInterfaceMode'];
                }
                if (msg.data.hasOwnProperty('status')) {
                    result['battery_low'] = (msg.data.status & 2) > 0;
                    result['check_meter'] = (msg.data.status & 1) > 0;
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
        interface_mode: {
            key: ['interface_mode'],
            convertSet: async (entity, key, value, meta) => {
                const payload = {develcoInterfaceMode: utils.getKey(constants.develcoInterfaceMode, value, undefined, Number)};
                await entity.write('seMetering', payload, utils.getOptions(meta.mapped, entity));
                return {readAfterWriteTime: 200, state: {interface_mode: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('seMetering', ['develcoInterfaceMode'], manufacturerOptions);
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
        zigbeeModel: ['EMIZB-141'], // The model ID from: Device with modelID 'lumi.sens' is not supported.
        model: 'EMIZB-141', // Vendor model number, look on the device for a model number
        vendor: 'Frient A/S', // Vendor of the device (only used for documentation and startup logging)
        description: 'frient Electricity Meter Interface 2 LED', // Description of the device, copy from vendor site. (only used for documentation and startup logging)
        fromZigbee: [fz.metering, fz.battery, frient.fz.pulse_configuration, frient.fz.interface_mode],
        toZigbee: [frient.tz.pulse_configuration, frient.tz.interface_mode, frient.tz.current_summation],
        extend: [ota()],
        exposes: [
            e.power(),
            e.energy(),
            e.battery_low(),
            e
                .numeric('pulse_configuration', ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription('Pulses per kwh. Default 1000 imp/kWh. Range 0 to 65535'),
            e
                .enum('interface_mode', ea.ALL, ['electricity', 'gas', 'water', 'kamstrup-kmp', 'linky', 'IEC62056-21', 'DSMR-2.3', 'DSMR-4.0'])
                .withDescription('Operating mode/probe'),
            e
                .numeric('current_summation', ea.SET)
                .withDescription('Current summation value sent to the display. e.g. 570 = 0,570 kWh')
                .withValueMin(0)
                .withValueMax(268435455),
            e.binary('check_meter', ea.STATE, true, false).withDescription('Is true if communication problem with meter is experienced'),
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
