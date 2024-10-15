import { electricityMeter, light, identify, onOff } from '../lib/modernExtend';
import { DefinitionWithExtend } from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['C205'],
        model: 'C205',
        vendor: 'Candeo',
        description: 'Switch module',
        extend: [onOff({ powerOnBehavior: false })],
    },
    {
        zigbeeModel: ['HK-DIM-A', 'Candeo Zigbee Dimmer', 'HK_DIM_A'],
        fingerprint: [
            { modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'Candeo' },
            { modelID: 'HK_DIM_A', manufacturerName: 'Shyugj' },
        ],
        model: 'C202.1',
        vendor: 'Candeo',
        description: 'Zigbee LED smart dimmer switch',
        extend: [light({ configureReporting: true })],
    },
    {
        fingerprint: [{ modelID: 'Dimmer-Switch-ZB3.0', manufacturerID: 4098 }],
        model: 'C210',
        vendor: 'Candeo',
        description: 'Zigbee dimming smart plug',
        extend: [light({ configureReporting: true })],
    },
    {
        zigbeeModel: ['C204', 'C-ZB-DM204'],
        model: 'C204',
        vendor: 'Candeo',
        description: 'Zigbee micro smart dimmer',
        extend: [light({ configureReporting: true }), electricityMeter()],
    },
    {
        zigbeeModel: ['C202'],
        fingerprint: [
            { modelID: 'C202', manufacturerName: 'Candeo' },
            { modelID: 'Candeo Zigbee Dimmer', softwareBuildID: '1.04', dateCode: '20230828' },
            { modelID: 'Candeo Zigbee Dimmer', softwareBuildID: '1.20', dateCode: '20240813' },
        ],
        model: 'C202',
        vendor: 'Candeo',
        description: 'Smart Rotary Dimmer',
        extend: [light({ configureReporting: true, levelConfig: { disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'execute_if_off'] }, powerOnBehavior: true })],
    },
    {
        zigbeeModel: ['C201'],
        fingerprint: [{ modelID: 'C201', manufacturerName: 'Candeo' }],
        model: 'C201',
        vendor: 'Candeo',
        description: 'Smart Dimmer Module',
        extend: [light({ configureReporting: true, levelConfig: { disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'execute_if_off'] }, powerOnBehavior: true })],
    },
    {
        fingerprint: [{ modelID: 'C-ZB-LC20-CCT', manufacturerName: 'Candeo' }],
        model: 'C-ZB-LC20-CCT',
        vendor: 'Candeo',
        description: 'Candeo C-ZB-LC20 Smart LED Controller (CCT Mode)',
        extend: [light({ colorTemp: { range: [158, 500] }, configureReporting: true, levelConfig: { disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'] }, 'powerOnBehavior': true }), identify()],
        meta: {},
    },
    {
        fingerprint: [{ modelID: 'C-ZB-LC20-Dim', manufacturerName: 'Candeo' }],
        model: 'C-ZB-LC20-Dim',
        vendor: 'Candeo',
        description: 'Candeo C-ZB-LC20 Smart LED Controller (Dimmer Mode)',
        extend: [light({ configureReporting: true, levelConfig: { disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'] }, 'powerOnBehavior': true }), identify()],
        meta: {},
    },
    {
        fingerprint: [{ modelID: 'C-ZB-LC20-RGB', manufacturerName: 'Candeo' }],
        model: 'C-ZB-LC20-RGB',
        vendor: 'Candeo',
        description: 'Candeo C-ZB-LC20 Smart LED Controller (RGB Mode)',
        extend: [light({ color: { modes: ['xy', 'hs'], enhancedHue: true }, configureReporting: true, levelConfig: { disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'] }, 'powerOnBehavior': true }), identify()],
        meta: {},
    },
    {
        fingerprint: [{ modelID: 'C-ZB-LC20-RGBCCT', manufacturerName: 'Candeo' }],
        model: 'C-ZB-LC20-RGBCCT',
        vendor: 'Candeo',
        description: 'Candeo C-ZB-LC20 Smart LED Controller (RGBCCT Mode)',
        extend: [light({ colorTemp: { range: [158, 500] }, color: { modes: ['xy', 'hs'], enhancedHue: true }, configureReporting: true, levelConfig: { disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'] }, 'powerOnBehavior': true }), identify()],
        meta: {},
    },
    {
        fingerprint: [{ modelID: 'C-ZB-LC20-RGBW', manufacturerName: 'Candeo' }],
        model: 'C-ZB-LC20-RGBW',
        vendor: 'Candeo',
        description: 'Candeo C-ZB-LC20 Smart LED Controller (RGBW Mode)',
        extend: [light({ colorTemp: { range: [158, 500] }, color: { modes: ['xy', 'hs'], enhancedHue: true }, configureReporting: true, levelConfig: { disabledFeatures: ['on_transition_time', 'off_transition_time', 'on_off_transition_time', 'on_level', 'execute_if_off'] }, 'powerOnBehavior': true }), identify()],
        meta: {},
    }
];

export default definitions;
module.exports = definitions;
