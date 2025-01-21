import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['C205'],
        model: 'C205',
        vendor: 'Candeo',
        description: 'Switch module',
        extend: [m.onOff({powerOnBehavior: false})],
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
        extend: [m.light({configureReporting: true, powerOnBehavior: false})],
    },
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerID: 4098}],
        model: 'C210',
        vendor: 'Candeo',
        description: 'Zigbee dimming smart plug',
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['C204'],
        model: 'C204',
        vendor: 'Candeo',
        description: 'Zigbee micro smart dimmer',
        extend: [m.light({configureReporting: true}), m.electricityMeter()],
    },
    {
        zigbeeModel: ['C-ZB-DM204'],
        model: 'C-ZB-DM204',
        vendor: 'Candeo',
        description: 'Zigbee micro smart dimmer',
        extend: [m.light({configureReporting: true}), m.electricityMeter()],
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
            m.light({
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
            m.light({
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
            m.light({
                colorTemp: {range: [158, 500]},
                configureReporting: true,
                levelConfig: {
                    disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'],
                },
                powerOnBehavior: true,
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-LC20-Dim', manufacturerName: 'Candeo'}],
        model: 'C-ZB-LC20-Dim',
        vendor: 'Candeo',
        description: 'Smart LED controller (dimmer mode)',
        extend: [
            m.light({
                configureReporting: true,
                levelConfig: {
                    disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'],
                },
                powerOnBehavior: true,
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-LC20-RGB', manufacturerName: 'Candeo'}],
        model: 'C-ZB-LC20-RGB',
        vendor: 'Candeo',
        description: 'Smart LED controller (RGB mode)',
        extend: [
            m.light({
                color: {modes: ['xy', 'hs'], enhancedHue: true},
                configureReporting: true,
                levelConfig: {
                    disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'],
                },
                powerOnBehavior: true,
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-LC20-RGBCCT', manufacturerName: 'Candeo'}],
        model: 'C-ZB-LC20-RGBCCT',
        vendor: 'Candeo',
        description: 'Smart LED controller (RGBCCT mode)',
        extend: [
            m.light({
                colorTemp: {range: [158, 500]},
                color: {modes: ['xy', 'hs'], enhancedHue: true},
                configureReporting: true,
                levelConfig: {
                    disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'],
                },
                powerOnBehavior: true,
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-LC20-RGBW', manufacturerName: 'Candeo'}],
        model: 'C-ZB-LC20-RGBW',
        vendor: 'Candeo',
        description: 'Smart LED controller (RGBW mode)',
        extend: [
            m.light({
                colorTemp: {range: [158, 500]},
                color: {modes: ['xy', 'hs'], enhancedHue: true},
                configureReporting: true,
                levelConfig: {
                    disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'],
                },
                powerOnBehavior: true,
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: 'C-ZB-SM205-2G', manufacturerName: 'Candeo'}],
        model: 'C-ZB-SM205-2G',
        vendor: 'Candeo',
        description: 'Smart 2 gang switch module',
        extend: [
            m.deviceEndpoints({
                endpoints: {l1: 1, l2: 2},
                multiEndpointSkip: ['power', 'current', 'voltage', 'energy'],
            }),
            m.onOff({endpointNames: ['l1', 'l2']}),
            m.electricityMeter(),
        ],
        meta: {},
    },
    {
        fingerprint: [{modelID: 'C-RFZB-SM1'}],
        model: 'C-RFZB-SM1',
        vendor: 'Candeo',
        description: 'Zigbee & RF Switch Module',
        extend: [m.onOff({powerOnBehavior: true})],
    },
    {
        fingerprint: [{modelID: 'C203', manufacturerName: 'Candeo'}],
        model: 'C203',
        vendor: 'Candeo',
        description: 'Zigbee micro smart dimmer',
        extend: [m.light({configureReporting: true})],
    },
];

export default definitions;
module.exports = definitions;
