import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        fingerprint: [{type: 'Router', manufacturerName: 'Heatit Controls AB', modelID: 'Dimmer-Switch-ZB3.0'}],
        model: 'Zig Dim 250W',
        vendor: 'Heatit',
        description: 'Zigbee dimmer 250W',
        extend: extend.light_onoff_brightness({disablePowerOnBehavior: true}),
    },
];

module.exports = definitions;
