import fz from '../converters/fromZigbee';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
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
