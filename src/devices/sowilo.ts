import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['L258'],
        model: 'L258',
        vendor: 'Sowilo DS',
        description: 'Heimdall Pro 5 channel RGBWW controller',
        extend: [m.light({colorTemp: {range: [150, 575]}, color: {modes: ['xy', 'hs']}, turnsOffAtBrightness1: true})],
    },
];

export default definitions;
module.exports = definitions;
