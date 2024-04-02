import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as ota from '../lib/ota';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['V3-BTZB', 'V3-BTZBE'],
        model: 'V3-BTZB/V3-BTZBE',
        vendor: 'Danalock',
        description: 'BT/ZB smartlock',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery, fz.lock_programming_event, fz.lock_pin_code_response],
        toZigbee: [tz.lock, tz.pincode_lock, tz.lock_userstatus],
        meta: {pinCodeCount: 20},
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery(), e.pincode(), e.lock_action(), e.lock_action_source_name(), e.lock_action_user()],
    },
];

export default definitions;
module.exports = definitions;
