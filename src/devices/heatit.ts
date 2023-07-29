import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        fingerprint: [{type: 'Router', manufacturerName: 'Heatit Controls AB', modelID: 'Dimmer-Switch-ZB3.0'}],
        model: '1444420',
        vendor: 'Heatit',
        description: 'Zig Dim 250W',
        extend: extend.light_onoff_brightness({disablePowerOnBehavior: true}),
    },
];

module.exports = definitions;
