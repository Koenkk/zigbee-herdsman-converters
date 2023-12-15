import {Definition} from '../lib/types';
import extend from '../lib/extend';
import * as reporting from '../lib/reporting';

const definitions: Definition[] = [
    {
        fingerprint: [{type: 'Router', manufacturerName: 'Heatit Controls AB', modelID: 'Dimmer-Switch-ZB3.0'}],
        model: '1444420',
        vendor: 'Heatit',
        description: 'Zig Dim 250W',
        extend: extend.light_onoff_brightness({noConfigure: true, disablePowerOnBehavior: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
