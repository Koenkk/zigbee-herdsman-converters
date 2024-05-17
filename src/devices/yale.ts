import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {Definition, Fz, ModernExtend, Reporting, Tz} from 'src/lib/types';
import {getFromLookup} from '../lib/utils';
import {KeyValue} from 'zigbee-herdsman/dist/controller/tstype';
import {battery, lock} from '../lib/modernExtend';
import {logger} from '../lib/logger';

const NS = 'zhc:yale';
const e = exposes.presets;
const ea = exposes.access;

const lockExtend = (meta={}, lockStateOptions: Reporting.Override|false=null, binds=['closuresDoorLock', 'genPowerCfg']): ModernExtend => {
    return {
        fromZigbee: [fz.lock, fz.battery, fz.lock_operation_event, fz.lock_programming_event, fz.lock_pin_code_response,
            fz.lock_user_status_response],
        toZigbee: [tz.lock, tz.pincode_lock, tz.lock_userstatus, tz.lock_auto_relock_time, tz.lock_sound_volume],
        meta: {pinCodeCount: 250, ...meta},
        exposes: [e.lock(), e.battery(), e.pincode(), e.lock_action(), e.lock_action_source_name(), e.lock_action_user(),
            e.auto_relock_time().withValueMin(0).withValueMax(3600), e.sound_volume(), e.battery_low()],
        configure: [async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            if (lockStateOptions !== false) {
                await reporting.lockState(endpoint, lockStateOptions);
            }
            await reporting.batteryPercentageRemaining(endpoint);
            try {
                await reporting.batteryAlarmState(endpoint);
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee-herdsman-converters/pull/5414
            }
        }],
        isModernExtend: true,
    };
};

const fzLocal = {
    c4_alarm: {
        cluster: 'genAlarms',
        type: ['commandAlarm'],
        convert: async (model, msg, publish, options, meta) => {
            let result: KeyValue = {};
            if (msg.data.clusterid == 64512) {
                const alarmcode = msg.data.alarmcode;
                const lookup = {
                    9: {state: 'UNLOCKED', lock_state: 'not_fully_locked', alarm: 'deadbolt_jammed'},
                    18: {action: 'keypad_lock', state: 'LOCKED', lock_state: 'locked'},
                    19: {action: 'keypad_unlock', state: 'UNLOCKED', lock_state: 'unlocked'},
                    21: {action: 'manual_lock_key_or_thumbturn', state: 'LOCKED', lock_state: 'locked'},
                    22: {action: 'manual_unlock_key_or_thumbturn', state: 'UNLOCKED', lock_state: 'unlocked'},
                    24: {action: 'lock_module', state: 'LOCKED', lock_state: 'locked'},
                    25: {action: 'unlock_module', state: 'UNLOCKED', lock_state: 'unlocked'},
                    27: {action: 'auto_lock', state: 'LOCKED', lock_state: 'locked'},
                    32: {action: 'manual_lock_touch', state: 'LOCKED', lock_state: 'locked'},
                    48: {alarm: 'lock_reset_to_factory_defaults'},
                    112: {alarm: 'master_code_changed'},
                    113: {alarm: 'duplicate_pin_code_error'},
                    128: {alarm: 'battery_replaced', battery_low: false},
                    129: {alarm: 'handing_cycle_completed_right'},
                    130: {alarm: 'rf_module_power_cycled'},
                    131: {alarm: 'handing_cycle_completed_left'},
                    161: {alarm: 'tamper_alarm_keypad_attempts', tamper: true},
                    162: {alarm: 'tamper_alarm_front_escutcheon', tamper: true},
                    167: {alarm: 'tamper_alarm_low_battery', tamper: true, battery_low: true},
                    168: {alarm: 'tamper_alarm_critical_battery', tamper: true, battery_low: true},
                    169: {alarm: 'low_battery', battery_low: true},
                };
                result = getFromLookup(alarmcode, lookup);
                // reset tamper and battery_low values as these will not self clear and will also be re-reported by device
                if (!('tamper' in result)) {
                    result.tamper = false;
                }
                if (!('battery_low' in result)) {
                    result.battery_low = false;
                }
            }
            // We need to read the lock attributes as these are not reported by the device
            try {
                await msg.endpoint.read('manuSpecificAssaDoorLock', ['batteryLevel']);
            } catch (error) {
                logger.warning(`Failed to read lock attributes`, NS);
            }
            return result;
        },
    } satisfies Fz.Converter,
    c4_assa_lock_attribute: {
        cluster: 'manuSpecificUbisysDeviceSetup',
        type: ['readResponse'],
        convert: async (model, msg, publish, options, meta) => {
            const data = msg.data;
            const result: KeyValue = {};
            if (data['18']) {
                const lookup = {
                    0: 'off',
                    30: '30seconds',
                    60: '60seconds',
                    120: '2minutes',
                    180: '3minutes',
                };
                result.auto_lock_time = getFromLookup(data['18'], lookup);
            }
            if (data['19']) {
                result.wrong_code_attempts = data['19'];
            }
            if (data['20']) {
                result.shutdown_time = data['20'];
            }
            if (data['21']) {
                result.battery = data['21'];
                result.battery_low = data['21'] <= 15 ? true : false;
            }
            if (data['22']) {
                result.inside_escutcheon_led = data['22'] == 1 ? true : false;
            }
            if (data['23']) {
                const lookup = {
                    1: 'silent',
                    2: 'low',
                    3: 'high',
                };
                result.volume = getFromLookup(data['23'], lookup);
            }
            if (data['24']) {
                const lookup = {
                    0: 'normal',
                    1: 'vacation',
                    2: 'privacy',
                };
                result.lock_mode = getFromLookup(data['24'], lookup);
            }
            if (data['25']) {
                const lookup = {
                    1: 'english',
                    2: 'spanish',
                    3: 'french',
                };
                result.lock_mode = getFromLookup(data['25'], lookup);
            }
            if (data['26']) {
                result.all_codes_lockout = data['26'];
            }
            if (data['27']) {
                result.one_touch_locking = data['27'];
            }
            if (data['28']) {
                result.privacy_button = data['28'];
            }
            if (data['33']) {
                result.number_log_records_supported = data['33'];
            }
            if (data['48']) {
                result.number_pins_supported = data['48'];
            }
            if (data['64']) {
                result.number_schedule_slots_per_user = data['64'];
            }
            if (data['80']) {
                result.alarm_mask = data['80'];
            }
            return result;
        },
    } satisfies Fz.Converter,
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
                if (!(alarmcode in lookup)) {
                    result.action = 'unknown';
                    logger.warning(`Unrecognized Operation Event (${alarmcode})`, NS);
                    // We need to read the lock state as the alarm code is unknown
                    try {
                        await msg.endpoint.read('closuresDoorLock', ['lockState']);
                    } catch (error) {
                        logger.warning(`Failed to read lock state`, NS);
                    }
                } else {
                    result = getFromLookup(alarmcode, lookup);
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    auto_lock_time: {
        key: ['auto_lock_time'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {
                'off': 0,
                '30seconds': 30,
                '60seconds': 60,
                '2minutes': 120,
                '3minutes': 180,
            };
            await entity.write('manuSpecificAssaDoorLock', {'autoLockTime': getFromLookup(value, lookup)}, {disableDefaultResponse: true});
            return {state: {auto_lock_time: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificAssaDoorLock', ['autoLockTime']);
        },
    } satisfies Tz.Converter,
    volume: {
        key: ['volume'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {
                'silent': 1,
                'low': 2,
                'high': 3,
            };
            await entity.write('manuSpecificAssaDoorLock', {'volume': getFromLookup(value, lookup)}, {disableDefaultResponse: true});
            return {state: {volume: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificAssaDoorLock', ['volume']);
        },
    } satisfies Tz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['YRD446 BLE TSDB'],
        model: 'YRD426NRSC',
        vendor: 'Yale',
        description: 'Assure lock',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['YRD226 TSDB', 'YRD226L TSDB'],
        model: 'YRD226HA2619',
        vendor: 'Yale',
        description: 'Assure lock',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['YRD256 TSDB', 'YRD256L TSDB'],
        model: 'YRD256HA20BP',
        vendor: 'Yale',
        description: 'Assure lock SL',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['YRD256-TSDB'],
        model: 'YAYRD256HA2619',
        vendor: 'Yale',
        description: 'Assure lock SL',
        fromZigbee: [fzLocal.c4_lock_operation_event],
        extend: [lockExtend({}, false)],
    },
    {
        zigbeeModel: ['YRD652 TSDB', 'YRD652L TSDB'],
        model: 'YRD652HA20BP',
        vendor: 'Yale',
        description: 'Assure lock SL',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['0600000001'],
        model: 'YMF30',
        vendor: 'Yale',
        description: 'Digital lock',
        extend: [lockExtend({battery: {dontDividePercentage: true}})],
    },
    {
        zigbeeModel: ['iZBModule01', '0700000001'],
        model: 'YMF40/YDM4109+/YDF40',
        vendor: 'Yale',
        description: 'Real living lock / Intelligent biometric digital lock',
        extend: [lockExtend({battery: {dontDividePercentage: true}})],
    },
    {
        zigbeeModel: ['YRD210 PB DB'],
        model: 'YRD210-HA-605',
        vendor: 'Yale',
        description: 'Real living keyless push button deadbolt lock',
        extend: [lockExtend({battery: {dontDividePercentage: true}})],
    },
    {
        zigbeeModel: ['YRL220 TS LL'],
        // The zigbee module card indicate that the module will work on YRD 221 and YRD 221RL also
        model: 'YRL-220L',
        vendor: 'Yale',
        description: 'Real living keyless leveler lock',
        extend: [lockExtend({battery: {dontDividePercentage: true}})],
    },
    {
        zigbeeModel: ['YRD226/246 TSDB'],
        model: 'YRD226/246 TSDB',
        vendor: 'Yale',
        description: 'Assure lock',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['YRD220/240 TSDB'],
        model: 'YRD220/YRD221',
        vendor: 'Yale',
        description: 'Lockwood keyless push button deadbolt lock',
        extend: [lockExtend({battery: {dontDividePercentage: true}})],
    },
    {
        zigbeeModel: ['YRD246 TSDB'],
        model: 'YRD246HA20BP',
        vendor: 'Yale',
        description: 'Assure lock key free deadbolt with Zigbee',
        extend: [lockExtend({battery: {dontDividePercentage: true}})],
    },
    {
        zigbeeModel: ['YRM476 TS BLE'],
        model: 'YRM476',
        vendor: 'Yale',
        description: 'Assure lock',
        extend: [battery(), lock({pinCodeCount: 250})],
    },
    {
        zigbeeModel: ['YRD216 PBDB'],
        model: 'YRD216-HA2-619',
        vendor: 'Yale',
        description: 'Real living keyless push button deadbolt lock',
        extend: [lockExtend({battery: {dontDividePercentage: true}})],
    },
    {
        zigbeeModel: ['YRL226L TS'],
        model: 'YRL226L TS',
        vendor: 'Yale',
        description: 'Assure lock SL',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['YRL226 TS'],
        model: 'YRL226 TS',
        vendor: 'Yale',
        description: 'Assure lock SL',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['YRD410 TS', 'YRD410 PB'],
        model: 'YRD410-BLE',
        vendor: 'Yale',
        description: 'Assure lock 2',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['YRD420 TS'],
        model: 'YRD420-BLE',
        vendor: 'Yale',
        description: 'Assure lock 2',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['YRD430 TS', 'YRD430 PB'],
        model: 'YRD430-BLE',
        vendor: 'Yale',
        description: 'Assure lock 2',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['YRD450 TS'],
        model: 'YRD450-BLE',
        vendor: 'Yale',
        description: 'Assure lock 2',
        extend: [lockExtend()],
    },
    {
        // Appears to be a slightly rebranded Assure lock SL
        // Just with Lockwood | Assa Abloy branding instead of Yale
        // Appears to have been part of a deal with Telstra, hence the T-Lock name
        zigbeeModel: ['YDD-D4F0 TSDB'],
        model: 'YDD-D4F0-TSDB',
        vendor: 'Yale',
        description: 'Lockwood T-Lock',
        extend: [lockExtend()],
    },
    {
        zigbeeModel: ['c700000202', '06ffff2029'],
        model: 'YDF40',
        vendor: 'Yale',
        description: 'Real living lock / Intelligent biometric digital lock',
        extend: [lockExtend({battery: {dontDividePercentage: true}}, {max: 900}, ['closuresDoorLock'])],
    },
    {
        zigbeeModel: ['06ffff2027', '06e01d220c'],
        model: 'YMF40A RL',
        vendor: 'Yale',
        description: 'Real living lock / Intelligent biometric digital lock',
        extend: [lockExtend({battery: {dontDividePercentage: true}})],
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
        fromZigbee: [fz.lock, fzLocal.c4_alarm, fzLocal.c4_assa_lock_attribute],
        toZigbee: [tz.lock, tzLocal.auto_lock_time, tzLocal.volume],
        exposes: [
            e.lock(),
            e.lock_action(),
            e.battery(),
            e.battery_low(),
            e.enum('auto_lock_time', ea.ALL, ['off', '30seconds', '60seconds', '2minutes', '3minutes']),
            e.enum('volume', ea.ALL, ['silent', 'low', 'high']),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('closuresDoorLock', ['lockState']);
            await endpoint.read('manuSpecificAssaDoorLock', ['autoLockTime', 'wrongCodeAttempts', 'shutdownTime', 'batteryLevel', 'volume']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['manuSpecificAssaDoorLock']);
        },
    },
];

export default definitions;
module.exports = definitions;
