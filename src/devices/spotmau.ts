import {Definition} from '../lib/types';
import {deviceEndpoints, onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['1719SP-PS1-02'],
        model: 'SP-PS1-02',
        vendor: 'Spotmau',
        description: 'Smart wall switch - 1 gang',
        extend: [onOff()],
        endpoint: (device) => {
            return {default: 16};
        },
    },
    {
        zigbeeModel: ['1719SP-PS2-02'],
        model: 'SP-PS2-02',
        vendor: 'Spotmau',
        description: 'Smart wall switch - 2 gang',
        extend: [
            deviceEndpoints({endpoints: {'left': 16, 'right': 17}}),
            onOff({endpointNames: ['left', 'right']}),
        ],
    },
];

export default definitions;
module.exports = definitions;
