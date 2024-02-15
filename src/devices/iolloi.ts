import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'HZC'}],
        model: 'ID-UK21FW09',
        vendor: 'Iolloi',
        description: 'Zigbee LED smart dimmer switch',
        extend: [light({effect: false, configureReporting: true})],
        whiteLabel: [{vendor: 'Iolloi', model: 'ID-EU20FW09'}],
    },
];

export default definitions;
module.exports = definitions;
