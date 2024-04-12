import {Definition} from '../lib/types';
import {light, onOff, electricityMeter} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['BoxDIM2 98425031', '98425031', 'BoxDIMZ 98425031'],
        model: '98425031',
        vendor: 'Nordtronic',
        description: 'Box Dimmer 2.0',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['BoxRelayZ 98423051'],
        model: '98423051',
        vendor: 'Nordtronic',
        description: 'Zigbee switch 400W',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['RotDIMZ 98424072'],
        model: '98424072',
        vendor: 'Nordtronic',
        description: 'Zigbee rotary dimmer',
        extend: [light({configureReporting: true}), electricityMeter()],
    },
];

export default definitions;
module.exports = definitions;
