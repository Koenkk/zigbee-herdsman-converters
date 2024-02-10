import {Definition} from '../lib/types';
import {light, onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['91-947'],
        model: '200403V2-B',
        vendor: 'LightSolutions',
        description: 'Mini dimmer 200W',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['91-948'],
        model: '200106V3',
        vendor: 'LightSolutions',
        description: 'Zigbee switch 200W',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['42-032'],
        model: '42-032',
        vendor: 'LightSolutions',
        description: 'LED driver CCT 12V - 30W - CCT',
        extend: [light({colorTemp: {range: [160, 450]}})],
    },
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'Light Solutions'}],
        model: '3004482/3137308/3137309',
        vendor: 'Light Solutions',
        description: 'Zigbee dimmer for wire',
        extend: [light({configureReporting: true})],
    },
];

export default definitions;
module.exports = definitions;
