import {Definition} from '../lib/types';
import {commandsOnOff, deviceEndpoints, numeric, onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['alab.switch'],
        model: 'alab.switch',
        vendor: 'Alab',
        description: 'Four channel relay board with four inputs',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'in1': 5, 'in2': 6, 'in3': 7, 'in4': 8}}),
            onOff({
                powerOnBehavior: false,
                configureReporting: false,
                endpointNames: ['l1', 'l2', 'l3', 'l4']},
            ),
            commandsOnOff({endpointNames: ['l1', 'l2', 'l3', 'l4']}),
            numeric({
                name: 'input_state',
                cluster: 'genAnalogInput',
                attribute: 'presentValue',
                description: 'Input state',
                endpointNames: ['in1', 'in2', 'in3', 'in4'],
            }),
        ],
        meta: {'multiEndpoint': true},
    },
];

export default definitions;
module.exports = definitions;
