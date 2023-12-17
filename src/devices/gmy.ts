import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['CCT box'],
        model: 'B07KG5KF5R',
        vendor: 'GMY Smart Bulb',
        description: 'GMY Smart bulb, 470lm, vintage dimmable, 2700-6500k, E27',
        extend: [light({colorTemp: {range: undefined}})],
    },
];

export default definitions;
module.exports = definitions;
