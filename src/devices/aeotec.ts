import fz from '../converters/fromZigbee';
import {
    commandsLevelCtrl,
    commandsOnOff,
    commandsWindowCovering,
    deviceEndpoints,
    deviceTemperature,
    electricityMeter,
    identify,
    onOff,
    windowCovering,
} from '../lib/modernExtend';
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
            deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3}, multiEndpointSkip: ['state', 'voltage', 'power', 'current', 'energy']}),
            deviceTemperature(),
            identify(),
            onOff({powerOnBehavior: false}),
            electricityMeter(),
            commandsOnOff({endpointNames: ['2', '3']}),
            commandsLevelCtrl({endpointNames: ['2', '3']}),
        ],
    },
    {
        zigbeeModel: ['ZGA003'],
        model: 'ZGA003',
        vendor: 'Aeotec',
        description: 'Pico switch duo with power meter',
        extend: [
            deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3, '4': 4}}),
            deviceTemperature(),
            identify(),
            onOff({powerOnBehavior: false, endpointNames: ['1', '2']}),
            electricityMeter({endpointNames: ['1', '2']}),
            commandsOnOff({endpointNames: ['3', '4']}),
            commandsLevelCtrl({endpointNames: ['3', '4']}),
        ],
    },
    {
        zigbeeModel: ['ZGA004'],
        model: 'ZGA004',
        vendor: 'Aeotec',
        description: 'Pico shutter',
        extend: [
            deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5}}),
            deviceTemperature(),
            identify(),
            windowCovering({controls: ['lift', 'tilt']}),
            commandsWindowCovering({endpointNames: ['3']}),
            commandsOnOff({endpointNames: ['4', '5']}),
            commandsLevelCtrl({endpointNames: ['4', '5']}),
        ],
    },
];

export default definitions;
module.exports = definitions;
