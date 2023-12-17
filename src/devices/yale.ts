import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {Extend, Definition, Fz, Reporting} from 'src/lib/types';
import {getFromLookup} from '../lib/utils';
import {KeyValue} from 'zigbee-herdsman/dist/controller/tstype';
const e = exposes.presets;

const lockExtend = (meta={}, lockStateOptions: Reporting.Override=null, binds=['closuresDoorLock', 'genPowerCfg']): Extend => {
    return {
        fromZigbee: [fz.lock, fz.battery, fz.lock_operation_event, fz.lock_programming_event, fz.lock_pin_code_response,
            fz.lock_user_status_response],
        toZigbee: [tz.lock, tz.pincode_lock, tz.lock_userstatus, tz.lock_auto_relock_time, tz.lock_sound_volume],
        meta: {pinCodeCount: 250, ...meta},
        exposes: [e.lock(), e.battery(), e.pincode(), e.lock_action(), e.lock_action_source_name(), e.lock_action_user(),
            e.auto_relock_time().withValueMin(0).withValueMax(3600), e.sound_volume(), e.battery_low()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.lockState(endpoint, lockStateOptions);
            await reporting.batteryPercentageRemaining(endpoint);
            try {
                await reporting.batteryAlarmState(endpoint);
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee-herdsman-converters/pull/5414
            }
        },
    };
};

const fzLocal = {
    c4_lock_operation_event: {
        cluster: 'genAlarms',
        type: ['commandAlarm'],
        convert: async (model, msg, publish, options, meta) => {
            let result: KeyValue = {};
            if (msg.data.clusterid == 64512) {
                const alarmcode = msg.data.alarmcode;
                const lookup = {
                    9: {action: 'error_jammed', state: 'UNLOCK', lock_state: 'not_fully_locked'},
                    21: {action: 'manual_lock', state: 'LOCK', lock_state: 'locked'},
                    22: {action: 'manual_unlock', state: 'UNLOCK', lock_state: 'unlocked'},
                    24: {action: 'lock', state: 'LOCK', lock_state: 'locked'},
                    25: {action: 'unlock', state: 'UNLOCK', lock_state: 'unlocked'},
                    27: {action: 'auto_lock', state: 'LOCK', lock_state: 'locked'},
                };
                if (!getFromLookup(alarmcode, lookup)) {
                    result.action = 'unknown';
                    meta.logger.warn(`zigbee-herdsman-converters:Yale Lock: Unrecognized Operation Event (${alarmcode})`);
                    // We need to read the lock state as the alarm code is unknown
                    try {
                        await msg.endpoint.read('closuresDoorLock', ['lockState']);
                    } catch (error) {
                        meta.logger.warn(`zigbee-herdsman-converters:Yale Lock: failed to read lock state`);
                    }
                } else {
                    result = getFromLookup(alarmcode, lookup);
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['YRD446 BLE TSDB'],
        model: 'YRD426NRSC',
        vendor: 'Yale',
        description: 'Assure lock',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['YRD226 TSDB', 'YRD226L TSDB'],
        model: 'YRD226HA2619',
        vendor: 'Yale',
        description: 'Assure lock',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['YRD256 TSDB', 'YRD256L TSDB'],
        model: 'YRD256HA20BP',
        vendor: 'Yale',
        description: 'Assure lock SL',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['YRD652 TSDB', 'YRD652L TSDB'],
        model: 'YRD652HA20BP',
        vendor: 'Yale',
        description: 'Assure lock SL',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['0600000001'],
        model: 'YMF30',
        vendor: 'Yale',
        description: 'Digital lock',
        extend: lockExtend({battery: {dontDividePercentage: true}}),
    },
    {
        zigbeeModel: ['iZBModule01', '0700000001'],
        model: 'YMF40/YDM4109+/YDF40',
        vendor: 'Yale',
        description: 'Real living lock / Intelligent biometric digital lock',
        extend: lockExtend({battery: {dontDividePercentage: true}}),
    },
    {
        zigbeeModel: ['YRD210 PB DB'],
        model: 'YRD210-HA-605',
        vendor: 'Yale',
        description: 'Real living keyless push button deadbolt lock',
        extend: lockExtend({battery: {dontDividePercentage: true}}),
    },
    {
        zigbeeModel: ['YRL220 TS LL'],
        // The zigbee module card indicate that the module will work on YRD 221 and YRD 221RL also
        model: 'YRL-220L',
        vendor: 'Yale',
        description: 'Real living keyless leveler lock',
        extend: lockExtend({battery: {dontDividePercentage: true}}),
    },
    {
        zigbeeModel: ['YRD226/246 TSDB'],
        model: 'YRD226/246 TSDB',
        vendor: 'Yale',
        description: 'Assure lock',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['YRD220/240 TSDB'],
        model: 'YRD220/YRD221',
        vendor: 'Yale',
        description: 'Lockwood keyless push button deadbolt lock',
        extend: lockExtend({battery: {dontDividePercentage: true}}),
    },
    {
        zigbeeModel: ['YRD246 TSDB'],
        model: 'YRD246HA20BP',
        vendor: 'Yale',
        description: 'Assure lock key free deadbolt with Zigbee',
        extend: lockExtend({battery: {dontDividePercentage: true}}),
    },
    {
        zigbeeModel: ['YRD216 PBDB'],
        model: 'YRD216-HA2-619',
        vendor: 'Yale',
        description: 'Real living keyless push button deadbolt lock',
        extend: lockExtend({battery: {dontDividePercentage: true}}),
    },
    {
        zigbeeModel: ['YRL226L TS'],
        model: 'YRL226L TS',
        vendor: 'Yale',
        description: 'Assure lock SL',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['YRL226 TS'],
        model: 'YRL226 TS',
        vendor: 'Yale',
        description: 'Assure lock SL',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['YRD410 TS'],
        model: 'YRD410-BLE',
        vendor: 'Yale',
        description: 'Assure lock 2',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['YRD420 TS'],
        model: 'YRD420-BLE',
        vendor: 'Yale',
        description: 'Assure lock 2',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['YRD430 TS', 'YRD430 PB'],
        model: 'YRD430-BLE',
        vendor: 'Yale',
        description: 'Assure lock 2',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['YRD450 TS'],
        model: 'YRD450-BLE',
        vendor: 'Yale',
        description: 'Assure lock 2',
        extend: lockExtend(),
    },
    {
        // Appears to be a slightly rebranded Assure lock SL
        // Just with Lockwood | Assa Abloy branding instead of Yale
        // Appears to have been part of a deal with Telstra, hence the T-Lock name
        zigbeeModel: ['YDD-D4F0 TSDB'],
        model: 'YDD-D4F0-TSDB',
        vendor: 'Yale',
        description: 'Lockwood T-Lock',
        extend: lockExtend(),
    },
    {
        zigbeeModel: ['c700000202', '06ffff2029'],
        model: 'YDF40',
        vendor: 'Yale',
        description: 'Real living lock / Intelligent biometric digital lock',
        extend: lockExtend({battery: {dontDividePercentage: true}}, {max: 900}, ['closuresDoorLock']),
    },
    {
        zigbeeModel: ['06ffff2027'],
        model: 'YMF40A RL',
        vendor: 'Yale',
        description: 'Real living lock / Intelligent biometric digital lock',
        extend: lockExtend({battery: {dontDividePercentage: true}}),
    },
    {
        fingerprint: [{
            type: 'EndDevice',
            manufacturerName: 'Yale',
            manufacturerID: 43690,
            powerSource: 'Battery',
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 10, inputClusters: [0, 9, 10, 257, 64512, 1], outputClusters: []},
                {ID: 196, profileID: 260, deviceID: 10, inputClusters: [1], outputClusters: []},
            ]},
        ],
        model: 'ZYA-C4-MOD-S',
        vendor: 'Yale',
        description: 'Control4 module for Yale KeyFree/Keyless/Doorman/Assure/nexTouch locks',
        fromZigbee: [fz.lock, fzLocal.c4_lock_operation_event],
        toZigbee: [tz.lock],
        exposes: [e.lock(), e.lock_action()],
    },
];

export default definitions;
module.exports = definitions;
