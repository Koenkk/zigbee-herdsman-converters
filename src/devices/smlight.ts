import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import {forcePowerSource} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['SLZB-06M'],
        model: 'SLZB-06M',
        vendor: 'SMLIGHT',
        description: 'Router',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
        extend: [forcePowerSource({powerSource: 'Mains (single phase)'})],
    },
];

export default definitions;
module.exports = definitions;
