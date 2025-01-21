import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['A11'],
        model: 'ZC05M',
        vendor: 'GIDEALED',
        description: 'Smart Zigbee RGB LED strip controller',
        extend: [m.light({colorTemp: {range: [153, 370]}, color: {modes: ['xy', 'hs']}})],
    },
];

export default definitions;
module.exports = definitions;
