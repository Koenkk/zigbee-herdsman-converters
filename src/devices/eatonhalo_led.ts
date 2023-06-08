import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Halo_RL5601'],
        model: 'RL460WHZHA69', // The 4" CAN variant presents as 5/6" zigbeeModel.
        vendor: 'Eaton/Halo LED',
        description: 'Wireless Controlled LED retrofit downlight',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [200, 370]}),
    },
];

module.exports = definitions;
