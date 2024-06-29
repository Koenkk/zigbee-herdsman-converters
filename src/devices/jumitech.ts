import {light} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
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
