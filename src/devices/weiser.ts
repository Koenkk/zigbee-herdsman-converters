import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
import {Definition} from '../lib/types';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_10'],
        model: '9GED18000-009',
        vendor: 'Weiser',
        description: 'SmartCode 10',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery, fz.lock_programming_event, fz.lock_pin_code_response],
        toZigbee: [tz.lock, tz.pincode_lock],
        meta: {pinCodeCount: 30},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        // Note - Keypad triggered deletions do not cause a zigbee event, though Adds work fine.
        onEvent: async (type, data, device) => {
            // When we receive a code updated message, lets read the new value
            if (data.type === 'commandProgrammingEventNotification' &&
                data.cluster === 'closuresDoorLock' &&
                data.data &&
                data.data.userid !== undefined &&
                // Don't read RF events, we can do this with retrieve_state
                (data.data.programeventsrc === undefined || constants.lockSourceName[data.data.programeventsrc] != 'rf')
            ) {
                await device.endpoints[0].command('closuresDoorLock', 'getPinCode', {userid: data.data.userid}, {});
            }
        },
        exposes: [e.lock(), e.battery(), e.pincode(), e.lock_action(), e.lock_action_source_name(), e.lock_action_user()],
    },
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_10T'],
        model: '9GED21500-005',
        vendor: 'Weiser',
        description: 'SmartCode 10 Touch',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery, fz.lock_programming_event, fz.lock_pin_code_response],
        toZigbee: [tz.lock, tz.pincode_lock],
        meta: {pinCodeCount: 30},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        // Note - Keypad triggered deletions do not cause a zigbee event, though Adds work fine.
        onEvent: async (type, data, device) => {
            // When we receive a code updated message, lets read the new value
            if (data.type === 'commandProgrammingEventNotification' &&
                data.cluster === 'closuresDoorLock' &&
                data.data &&
                data.data.userid !== undefined &&
                // Don't read RF events, we can do this with retrieve_state
                (data.data.programeventsrc === undefined || constants.lockSourceName[data.data.programeventsrc] != 'rf')
            ) {
                await device.endpoints[0].command('closuresDoorLock', 'getPinCode', {userid: data.data.userid}, {});
            }
        },
        exposes: [e.lock(), e.battery(), e.pincode(), e.lock_action(), e.lock_action_source_name(), e.lock_action_user()],
    },
];

export default definitions;
module.exports = definitions;
