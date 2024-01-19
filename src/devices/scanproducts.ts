import {Definition} from '../lib/types';
import {light, onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['12501'],
        model: '12501',
        vendor: 'Scan Products',
        description: 'Zigbee push dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['12502'],
        model: '12502',
        vendor: 'Scan Products',
        description: 'Zigbee 3.0 switch',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
