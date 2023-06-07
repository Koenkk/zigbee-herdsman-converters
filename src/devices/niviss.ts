import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['NIV-ZC-OFD'],
        model: 'PS-ZIGBEE-SMART-CONTROLER-1CH-DIMMABLE',
        vendor: 'Niviss',
        description: 'Zigbee smart controller',
        extend: extend.light_onoff_brightness(),
    },
];

module.exports = definitions;
