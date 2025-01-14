import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['LUBEEZ-12AB'],
        model: '12AB',
        vendor: 'Lubeez',
        description: 'zigbee 3.0 AC dimmer',
        extend: [m.light({configureReporting: true})],
    },
];

export default definitions;
module.exports = definitions;
