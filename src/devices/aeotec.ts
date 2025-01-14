import fz from '../converters/fromZigbee';
import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['WG001-Z01'],
        model: 'WG001',
        vendor: 'Aeotec',
        description: 'Range extender Zi',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['ZGA002'],
        model: 'ZGA002',
        vendor: 'Aeotec',
        description: 'Pico switch with power meter',
        extend: [
            m.deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3}, multiEndpointSkip: ['state', 'voltage', 'power', 'current', 'energy']}),
            m.deviceTemperature(),
            m.identify(),
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter(),
            m.commandsOnOff({endpointNames: ['2', '3']}),
            m.commandsLevelCtrl({endpointNames: ['2', '3']}),
        ],
    },
    {
        zigbeeModel: ['ZGA003'],
        model: 'ZGA003',
        vendor: 'Aeotec',
        description: 'Pico switch duo with power meter',
        extend: [
            m.deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3, '4': 4}}),
            m.deviceTemperature(),
            m.identify(),
            m.onOff({powerOnBehavior: false, endpointNames: ['1', '2']}),
            m.electricityMeter({endpointNames: ['1', '2']}),
            m.commandsOnOff({endpointNames: ['3', '4']}),
            m.commandsLevelCtrl({endpointNames: ['3', '4']}),
        ],
    },
    {
        zigbeeModel: ['ZGA004'],
        model: 'ZGA004',
        vendor: 'Aeotec',
        description: 'Pico shutter',
        extend: [
            m.deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5}}),
            m.deviceTemperature(),
            m.identify(),
            m.windowCovering({controls: ['lift', 'tilt']}),
            m.commandsWindowCovering({endpointNames: ['3']}),
            m.commandsOnOff({endpointNames: ['4', '5']}),
            m.commandsLevelCtrl({endpointNames: ['4', '5']}),
        ],
    },
];

export default definitions;
module.exports = definitions;
