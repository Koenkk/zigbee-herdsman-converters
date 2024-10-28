import {deviceEndpoints, onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['1719SP-PS1-02'],
        model: 'SP-PS1-02',
        vendor: 'Spotmau',
        description: 'Smart wall switch - 1 gang',
        extend: [deviceEndpoints({endpoints: {left: 16}}), onOff({endpointNames: ['left']})],
    },
    {
        zigbeeModel: ['1719SP-PS2-02'],
        model: 'SP-PS2-02',
        vendor: 'Spotmau',
        description: 'Smart wall switch - 2 gang',
        extend: [deviceEndpoints({endpoints: {left: 16, center: 17}}), onOff({endpointNames: ['left', 'center']})],
    },
    {
    zigbeeModel: ['1719SP-PS3-02'],
    model: 'SP-PS3-02',
    vendor: 'Spotmau',
    description: 'Smart wall switch - 3 gang',
    extend: [deviceEndpoints({endpoints: {left: 16, center: 17, right: 18}}), onOff({endpointNames: ['left', 'center', 'right']})],
    },
    {
        zigbeeModel: ['1719SP-WS-02'],
        model: 'SP-WS-02',
        vendor: 'Spotmau',
        description: 'Smart wall switch - Socket',
        extend: [deviceEndpoints({endpoints: {left: 16}}), onOff({endpointNames: ['left']})],
    },
];

export default definitions;
module.exports = definitions;
