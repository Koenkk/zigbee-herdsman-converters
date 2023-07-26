import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
const e = exposes.presets;

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
