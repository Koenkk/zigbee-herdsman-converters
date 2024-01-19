import {Definition} from '../lib/types';
import {forcePowerSource, onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Bouffalolab'],
        model: 'RMC002',
        vendor: 'Bouffalolab',
        description: 'US plug smart socket',
        extend: [onOff(), forcePowerSource({powerSource: 'Mains (single phase)'})],
    },
];

export default definitions;
module.exports = definitions;
