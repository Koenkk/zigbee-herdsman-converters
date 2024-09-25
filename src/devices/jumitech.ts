import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['J2182548'],
        model: 'J2182548',
        vendor: 'JUMITECH APS',
        description: 'ZigBee AC phase-cut dimmer single-line',
        extend: [light({configureReporting: true})],
    },
];

export default definitions;
module.exports = definitions;
