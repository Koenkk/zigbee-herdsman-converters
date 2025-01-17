import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SRB01', 'SRB01A'],
        model: 'SRB01',
        vendor: 'Evvr',
        description: 'In-wall relay switch',
        extend: [m.onOff()],
    },
];

export default definitions;
module.exports = definitions;
