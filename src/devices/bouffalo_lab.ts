import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['Bouffalolab'],
        model: 'RMC002',
        vendor: 'Bouffalolab',
        description: 'US plug smart socket',
        extend: [m.onOff(), m.forcePowerSource({powerSource: 'Mains (single phase)'})],
    },
];

export default definitions;
module.exports = definitions;
