import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['FB56-ZBW14LF1.4'],
        model: '322054',
        vendor: 'Lanesto',
        description: 'Dimmable led driver',
        extend: extend.light_onoff_brightness(),
    },
];

module.exports = definitions;
