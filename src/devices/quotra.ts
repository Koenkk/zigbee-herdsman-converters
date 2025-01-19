import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['Dimmer_us'],
        model: 'B07CVL9SZF',
        vendor: 'Quotra',
        description: 'Dimmer',
        extend: [m.light()],
    },
    {
        zigbeeModel: ['QV-RGBCCT'],
        model: 'B07JHL6DRV',
        vendor: 'Quotra',
        description: 'RGB WW LED strip',
        extend: [m.light({colorTemp: {range: [150, 500]}, color: true, powerOnBehavior: false})],
    },
];

export default definitions;
module.exports = definitions;
