import {onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SE-SW'],
        model: 'SEHAZB-DR-SWITCH-2',
        vendor: 'SolarEdge',
        description: 'Smart energy switch',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
