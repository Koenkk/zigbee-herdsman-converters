import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';

const definitions: Definition[] = [
    {
        zigbeeModel: ['SLZB-06M'],
        model: 'SLZB-06M',
        vendor: 'SMLIGHT',
        description: 'Router',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
];

export default definitions;
module.exports = definitions;
