import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'idinio'}],
        model: '0140302',
        vendor: 'Idinio',
        description: 'Zigbee LED foot dimmer',
        extend: [light({configureReporting: true})],
    },
];

export default definitions;
module.exports = definitions;
