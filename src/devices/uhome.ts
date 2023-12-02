import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import * as ota from '../lib/ota';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TWV', manufacturerName: 'UHome'}],
        model: 'TWV',
        vendor: 'UHome',
        description: 'Smart valve',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fz.battery],
        toZigbee: [tz.on_off],
        exposes: [e.battery(), e.switch()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.onOff(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
