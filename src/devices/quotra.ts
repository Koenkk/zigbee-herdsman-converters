import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Dimmer_us'],
        model: 'B07CVL9SZF',
        vendor: 'Quotra',
        description: 'Dimmer',
        extend: [light()],
    },
    {
        zigbeeModel: ['QV-RGBCCT'],
        model: 'B07JHL6DRV',
        vendor: 'Quotra',
        description: 'RGB WW LED strip',
        extend: [light({colorTemp: {range: [150, 500]}, color: true, powerOnBehavior: false})],
    },
];

export default definitions;
module.exports = definitions;
