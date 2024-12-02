import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['TS0505'],
        model: 'TS0505',
        vendor: 'zbeacon',
        description: 'GU10 Zigbee LED bulb',
        extend: [light({colorTemp: {range: [153, 500]}, color: {modes: ['xy', 'hs']}})],
    },
];

export default definitions;
module.exports = definitions;
