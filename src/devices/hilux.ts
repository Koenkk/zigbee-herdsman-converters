import {light} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Hilux DZ8'],
        model: 'DZ8',
        vendor: 'Hilux',
        description: 'Spot 7W',
        extend: [light({colorTemp: {range: [153, 370]}, powerOnBehavior: false})],
    },
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'Hilux'}],
        zigbeeModel: ['Dimmer-Switch-ZB3.0'],
        model: 'Dimmer-Switch-ZB3.0',
        vendor: 'Hilux',
        description: 'Zigbee LED dimmer smart switch',
        extend: [light({configureReporting: true})],
    },
];

export default definitions;
module.exports = definitions;
