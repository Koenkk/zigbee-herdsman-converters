import {onOff} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Lamp_01'],
        model: 'KS-SM001',
        vendor: 'Ksentry Electronics',
        description: 'Zigbee on/off controller',
        extend: [onOff({powerOnBehavior: false})],
    },
];

export default definitions;
module.exports = definitions;
