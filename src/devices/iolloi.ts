import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
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
