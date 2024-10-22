import {electricityMeter, identify, light, onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['C205'],
        model: 'C205',
        vendor: 'Candeo',
        description: 'Switch module',
        extend: [onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['HK-DIM-A', 'Candeo Zigbee Dimmer', 'HK_DIM_A'],
        fingerprint: [
            {modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'Candeo'},
            {modelID: 'HK_DIM_A', manufacturerName: 'Shyugj'},
        ],
        model: 'C202.1',
        vendor: 'Candeo',
        description: 'Zigbee LED smart dimmer switch',
        extend: [light({configureReporting: true})],
    },
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerID: 4098}],
        model: 'C210',
        vendor: 'Candeo',
        description: 'Zigbee dimming smart plug',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['C204', 'C-ZB-DM204'],
        model: 'C204',
        vendor: 'Candeo',
        description: 'Zigbee micro smart dimmer',
        extend: [light({configureReporting: true}), electricityMeter()],
    },
    {
        zigbeeModel: ['C202'],
        fingerprint: [
            {modelID: 'Candeo Zigbee Dimmer', softwareBuildID: '1.04', dateCode: '20230828'},
            {modelID: 'Candeo Zigbee Dimmer', softwareBuildID: '1.20', dateCode: '20240813'},
        ],
        model: 'C202',
        vendor: 'Candeo',
        description: 'Smart rotary dimmer',
        extend: [
            light({
                configureReporting: true,
                levelConfig: {disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'execute_if_off']},
                powerOnBehavior: true,
            }),
        ],
    },
    {
        zigbeeModel: ['C201'],
        model: 'C201',
        vendor: 'Candeo',
        description: 'Smart dimmer module',
        extend: [
            light({
                configureReporting: true,
                levelConfig: {disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'execute_if_off']},
                powerOnBehavior: true,
            }),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-LC20-CCT', manufacturerName: 'Candeo'}],
        model: 'C-ZB-LC20-CCT',
        vendor: 'Candeo',
        description: 'Smart LED controller (CCT mode)',
        extend: [
            light({
                colorTemp: {range: [158, 500]},
                configureReporting: true,
                levelConfig: {
                    disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'],
                },
                powerOnBehavior: true,
            }),
            identify(),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-LC20-Dim', manufacturerName: 'Candeo'}],
        model: 'C-ZB-LC20-Dim',
        vendor: 'Candeo',
        description: 'Smart LED controller (dimmer mode)',
        extend: [
            light({
                configureReporting: true,
                levelConfig: {
                    disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'],
                },
                powerOnBehavior: true,
            }),
            identify(),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-LC20-RGB', manufacturerName: 'Candeo'}],
        model: 'C-ZB-LC20-RGB',
        vendor: 'Candeo',
        description: 'Smart LED controller (RGB mode)',
        extend: [
            light({
                color: {modes: ['xy', 'hs'], enhancedHue: true},
                configureReporting: true,
                levelConfig: {
                    disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'],
                },
                powerOnBehavior: true,
            }),
            identify(),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-LC20-RGBCCT', manufacturerName: 'Candeo'}],
        model: 'C-ZB-LC20-RGBCCT',
        vendor: 'Candeo',
        description: 'Smart LED controller (RGBCCT mode)',
        extend: [
            light({
                colorTemp: {range: [158, 500]},
                color: {modes: ['xy', 'hs'], enhancedHue: true},
                configureReporting: true,
                levelConfig: {
                    disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'],
                },
                powerOnBehavior: true,
            }),
            identify(),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-LC20-RGBW', manufacturerName: 'Candeo'}],
        model: 'C-ZB-LC20-RGBW',
        vendor: 'Candeo',
        description: 'Smart LED controller (RGBW mode)',
        extend: [
            light({
                colorTemp: {range: [158, 500]},
                color: {modes: ['xy', 'hs'], enhancedHue: true},
                configureReporting: true,
                levelConfig: {
                    disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'],
                },
                powerOnBehavior: true,
            }),
            identify(),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-SM205-2G', manufacturerName: 'Candeo'}],
        model: 'C-ZB-SM205-2G',
        vendor: 'Candeo',
        description: 'Smart 2 gang switch module',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior, fz.ignore_genOta],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.power_on_behavior(['off', 'on', 'previous']).withEndpoint('l1'),
            e.power_on_behavior(['off', 'on', 'previous']).withEndpoint('l2')
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint2);
            await endpoint1.read('genOnOff', [0x0000]);
            await endpoint2.read('genOnOff', [0x0000]);
            await endpoint1.write('genOnOff', {0x4003: {value: 0xFF, type: 0x30}});
            await endpoint1.read('genOnOff', [0x4003]);
            await endpoint2.write('genOnOff', {0x4003: {value: 0xFF, type: 0x30}});
            await endpoint2.read('genOnOff', [0x4003]);
            const endpoint11 = device.getEndpoint(11);
            await reporting.bind(endpoint11, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint11);
            await reporting.activePower(endpoint11, {min: 10, change: 50, max: 600});
            await reporting.rmsCurrent(endpoint11, {min: 10, change: 100, max: 600});
            await reporting.rmsVoltage(endpoint11, {min: 10, change: 10, max: 600});
            await reporting.readMeteringMultiplierDivisor(endpoint11);
            await reporting.currentSummDelivered(endpoint11, {min: 10, change: 360000, max: 600});
            await endpoint11.read('haElectricalMeasurement', ['activePower']);
            await endpoint11.read('haElectricalMeasurement', ['rmsCurrent']);
            await endpoint11.read('haElectricalMeasurement', ['rmsVoltage']);
            await endpoint11.read('seMetering', ['currentSummDelivered']);
        },
    }
];

export default definitions;
module.exports = definitions;
