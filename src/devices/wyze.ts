import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Ford'],
        model: 'WLCKG1',
        vendor: 'Wyze',
        description: 'Lock',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.endpoints[0];
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
];

export default definitions;
module.exports = definitions;
