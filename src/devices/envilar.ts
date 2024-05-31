import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
const e = exposes.presets;
import fz from '../converters/fromZigbee';
import {deviceEndpoints, light, onOff, identify, electricityMeter} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZG_LED_DRIVER42CC'],
        model: 'ZG_LED_DRIVER42CC',
        vendor: 'Envilar',
        description: 'Zigbee LED driver',
        extend: [light()],
    },
    {
        zigbeeModel: ['ZG50CC-CCT-DRIVER', 'HK-CCT'],
        model: 'ZG50CC-CCT-DRIVER',
        vendor: 'Envilar',
        description: 'Zigbee CCT LED driver',
        extend: [light({colorTemp: {range: [160, 450]}})],
    },
    {
        zigbeeModel: ['ZGR904-S'],
        model: 'ZGR904-S',
        vendor: 'Envilar',
        description: 'Touchlink remote',
        meta: {battery: {dontDividePercentage: true}},
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        exposes: [e.battery(),
            e.action(['recall_1', 'recall_2', 'on', 'off', 'brightness_stop', 'brightness_move_up', 'brightness_move_down'])],
    },
    {
        zigbeeModel: ['ZG102-BOX-UNIDIM'],
        model: 'ZG102-BOX-UNIDIM',
        vendor: 'Envilar',
        description: 'ZigBee AC phase-cut dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['ZG302-BOX-RELAY'],
        model: 'ZG302-BOX-RELAY',
        vendor: 'Envilar',
        description: 'Zigbee AC in wall switch',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['2CH-ZG-BOX-RELAY'],
        model: '2CH-ZG-BOX-RELAY',
        vendor: 'Envilar',
        description: '2 channel box relay',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2}}),
            onOff({endpointNames: ['l1', 'l2']}),
        ],
    },
    {
        zigbeeModel: ['7853'],
        model: '1CH-HP-RELAY-7853',
        vendor: 'Envilar',
        description: '1 channel high power box relay',
        extend: [onOff({powerOnBehavior: true}), identify(), electricityMeter()],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9101SAC-HP-SWITCH-B'}],
    },
];

export default definitions;
module.exports = definitions;
