import {battery, windowCovering} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SmartShades3'],
        model: 'SmartShades3',
        vendor: 'SOMA',
        description: 'Smart shades 3',
        extend: [battery(), windowCovering({controls: ['lift', 'tilt']})],
    },
];

export default definitions;
module.exports = definitions;
