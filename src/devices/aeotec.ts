import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';

const definitions: Definition[] = [
    {
        zigbeeModel: ['WG001-Z01'],
        model: 'WG001',
        vendor: 'Aeotec',
        description: 'Range extender Zi',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
];

export default definitions;
module.exports = definitions;
