import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['MWM002'],
        model: 'MWM002',
        vendor: 'Modular',
        description: '0-10V Zigbee Dimmer',
        extend: [m.light()],
    },
];

export default definitions;
module.exports = definitions;
