import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
const ea = exposes.access;
import * as tuya from '../lib/tuya';
import {deviceEndpoints, onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_air9m6af'}, {modelID: 'TS011F', manufacturerName: '_TZ3000_9djocypn'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_bppxj3sf'}],
        zigbeeModel: ['JZ-ZB-005', 'E220-KR5N0Z0-HA', 'E220-KR5N0Z0-HA'],
        model: 'WP33-EU/WP34-EU',
        vendor: 'LELLKI',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (16A)',
        toZigbee: [tuya.tz.power_on_behavior_2],
        fromZigbee: [tuya.fz.power_on_behavior_2],
        exposes: [e.power_on_behavior()],
        configure: tuya.configureMagicPacket,
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5}}),
            onOff({endpointNames: ['l1', 'l2', 'l3', 'l4', 'l5'], powerOnBehavior: false}),
        ],
    },
    {
        zigbeeModel: ['JZ-ZB-001'],
        model: 'JZ-ZB-001',
        description: 'Smart plug (without power monitoring)',
        vendor: 'LELLKI',
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['JZ-ZB-003'],
        model: 'JZ-ZB-003',
        vendor: 'LELLKI',
        description: '3 gang switch',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3}}),
            onOff({endpointNames: ['l1', 'l2', 'l3']}),
        ],
    },
    {
        zigbeeModel: ['JZ-ZB-002'],
        model: 'JZ-ZB-002',
        vendor: 'LELLKI',
        description: '2 gang touch switch',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2}}),
            onOff({endpointNames: ['l1', 'l2']}),
        ],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_twqctvna'}],
        model: 'CM001',
        vendor: 'LELLKI',
        description: 'Circuit switch',
        extend: [onOff()],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_z6fgd73r'}],
        model: 'XF-EU-S100-1-M',
        description: 'Touch switch 1 gang (with power monitoring)',
        vendor: 'LELLKI',
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, electricalMeasurements: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        onEvent: (type, data, device, options) => tuya.onEventMeasurementPoll(type, data, device, options),
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_0yxeawjt'}],
        model: 'WK34-EU',
        description: 'Power socket EU (with power monitoring)',
        vendor: 'LELLKI',
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, electricalMeasurements: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        onEvent: (type, data, device, options) => tuya.onEventMeasurementPoll(type, data, device, options),
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_c7nc9w3c'}],
        model: 'WP30-EU',
        description: 'Power cord 4 sockets EU (with power monitoring)',
        vendor: 'LELLKI',
        fromZigbee: [fz.on_off_force_multiendpoint, fz.electrical_measurement, fz.metering, fz.ignore_basic_report,
            tuya.fz.power_outage_memory],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            for (const ep of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genOnOff']);
                await reporting.onOff(device.getEndpoint(ep));
            }
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'), e.power(), e.current(), e.voltage(),
            e.energy(), e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage')],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
        onEvent: (type, data, device, options) => tuya.onEventMeasurementPoll(type, data, device, options),
    },
];

export default definitions;
module.exports = definitions;
