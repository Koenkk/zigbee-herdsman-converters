import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['43023'],
        model: '43023',
        vendor: 'VBLED',
        description: 'ZigBee AC phase-cut dimmer',
        extend: [m.light({configureReporting: true})],
    },
];

export default definitions;
module.exports = definitions;
