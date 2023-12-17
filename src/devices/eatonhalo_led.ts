import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Halo_RL5601'],
        model: 'RL460WHZHA69', // The 4" CAN variant presents as 5/6" zigbeeModel.
        vendor: 'Eaton/Halo LED',
        description: 'Wireless Controlled LED retrofit downlight',
        extend: [light({colorTemp: {range: [200, 370]}})],
    },
];

export default definitions;
module.exports = definitions;
