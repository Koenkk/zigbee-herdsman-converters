import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Z10'],
        model: 'CGW-Z-0010',
        vendor: 'CEL',
        description: 'Cortet range extender',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
];

export default definitions;
module.exports = definitions;
