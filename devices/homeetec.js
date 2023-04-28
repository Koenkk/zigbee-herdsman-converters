const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

const DP_KEYS = {
    Backlight: 'backlight',
    State: 'state',
    Calibration: 'calibration',
    Position: 'position',
    MotorSteering: 'motor_steering',
    Switch: 'switch',
    Switch1: 'switch_1',
    Switch2: 'switch_2',
    ChildLock: 'child_lock'
};

const SWITCH_DP = {
    [DP_KEYS.Backlight]: 16,
};

const COVER_DP = {
    [DP_KEYS.State]: 1,
    [DP_KEYS.Position]: 2,
    [DP_KEYS.Calibration]: 3,
    [DP_KEYS.Backlight]: 7,
    [DP_KEYS.MotorSteering]: 8,
    [DP_KEYS.Switch]: 101,
    [DP_KEYS.Switch1]: 102,
    [DP_KEYS.Switch2]: 101,
    [DP_KEYS.ChildLock]: 103
};

const DP_OPTIONS = {
    [COVER_DP[DP_KEYS.State]]: {'OPEN': 0, 'STOP': 1, 'CLOSE': 2},
    [COVER_DP[DP_KEYS.Calibration]]: {'START': 0, 'END': 1},
    [COVER_DP[DP_KEYS.MotorSteering]]: {'BACKWARD': 0, 'FORWARD': 1}
};

const getOnState = (value) => {
    return value ? 'ON' : 'OFF';
};

const isStateOn = (value) => {
    return value.toUpperCase() === 'ON';
};

tuya.tz.homeetec_switch_datapoints = {
    key: Object.keys(SWITCH_DP),
    options: [],
    convertSet: async (entity, key, value, meta) => {
        const dpId = SWITCH_DP[key];

        if (DP_OPTIONS[dpId] || false) {
            const options = DP_OPTIONS[dpId];
            const state = options[value.toUpperCase()];
            
            meta.logger.debug(`homeetec_switch_datapoints (TZ) by options, dpId: ${dpId}, key: ${key}, options: ${JSON.stringify(DP_OPTIONS[dpId])}, value: ${value}, state: ${state}`);
            await tuya.sendDataPointEnum(entity, dpId, state);
        } else {
            const state = isStateOn(value);
            meta.logger.debug(`homeetec_switch_datapoints (TZ) boolean, dpId: ${dpId}, key: ${key}, value: ${value}, state: ${state}`);
            await tuya.sendDataPointBool(entity, dpId, state);
        }
    },
};

tuya.tz.homeetec_cover = {
    key: Object.keys(COVER_DP),
    options: [],
    convertSet: async (entity, key, value, meta) => {
        const result = {};
        const dpId = COVER_DP[key];
        
        if (dpId !== undefined) {
            if (DP_OPTIONS[dpId] || false) {
                const options = DP_OPTIONS[dpId];
                const state = options[value.toUpperCase()];
                
                meta.logger.debug(`homeetec_cover (TZ) by options, dpId: ${dpId}, key: ${key}, options: ${JSON.stringify(DP_OPTIONS[dpId])}, value: ${value}, state: ${state}`);
                await tuya.sendDataPointEnum(entity, dpId, state);
            } else if (dpId === COVER_DP[DP_KEYS.Position]) {
                const COVER_MIN = 0;
                const COVER_MAX = 100;

                const isCoverInverted = tuya.isCoverInverted(meta.device.manufacturerName);
                const invert =  isCoverInverted ? !meta.options.invert_cover : meta.options.invert_cover;
                
                value = invert ? COVER_MAX - value : value;
                const isValid = value >= COVER_MIN && value <= COVER_MAX;
                
                if (isValid) {
                    meta.logger.debug(`homeetec_cover (TZ) position, dpId: ${dpId}, key: ${key}, value: ${value}`);
                await tuya.sendDataPointValue(entity, dpId, value);
                } else {
                    meta.logger.debug(`homeetec_cover (TZ) Invalid value provided for position: ${value}`)
                } 
            } else {
                const state = isStateOn(value);
                meta.logger.debug(`homeetec_cover (TZ) boolean, dpId: ${dpId}, key: ${key}, value: ${value}, state: ${state}`);
                await tuya.sendDataPointBool(entity, dpId, state);
            }

            result[key] = value;
        }

        meta.logger.debug(`homeetec_cover (TZ) DEBUG, key: ${key}, value: ${value}, dpId: ${JSON.stringify(dpId)}, result: ${JSON.stringify(result)}`);

        return result;
    },
    convertGet: async (entity, key, meta) => {
        if (key === DP_KEYS.Position) {
            await tuya.tz.homeetec_cover.convertSet(entity, DP_KEYS.State, 'STOP', meta);
        }
    }
};

tuya.fz.homeetec_switch_datapoints = {
    cluster: 'manuSpecificTuya',
    type: ['commandDataResponse', 'commandDataReport', 'commandActiveStatusReport', 'commandActiveStatusReportAlt'],
    options: [],
    convert: (model, msg, publish, options, meta) => {
        const dpValue = tuya.firstDpValue(msg, meta, 'homeetec_switch_datapoints');
        const dp = dpValue.dp;
        const value = tuya.getDataValue(dpValue);

        const result = {};
        const key = Object.keys(SWITCH_DP).find((d) => SWITCH_DP[d] === dp);

        if (key || false) {
            result[key] = getOnState(value);
        }
        
        meta.logger.debug(`homeetec_switch_datapoints (FZ) DEBUG, key: ${key}, value: ${value}, dpValue: ${JSON.stringify(dpValue)}, result: ${JSON.stringify(result)}`);

        if (Object.keys(result).length > 0) {
            return result;
        }
    },
};

tuya.fz.homeetec_cover = {
    cluster: 'manuSpecificTuya',
    type: ['commandDataResponse', 'commandDataReport', 'commandActiveStatusReport', 'commandActiveStatusReportAlt'],
    options: [],
    convert: (model, msg, publish, options, meta) => {
        const dpValue = tuya.firstDpValue(msg, meta, 'homeetec_cover');
        const dp = dpValue.dp;
        const value = tuya.getDataValue(dpValue);
        const modelMeta = model.meta || {};
        const tuyaDatapoints = modelMeta.tuyaDatapoints || [];
        const tuyaDatapoint = tuyaDatapoints.find((d) => d[0] === dp);

        const result = {};
            
        const key = tuyaDatapoint ? tuyaDatapoint[1] : Object.keys(COVER_DP).find((d) => COVER_DP[d] === dp);

        if (DP_OPTIONS[dp] || false) {
            const options = DP_OPTIONS[dp];
            const selectedOption = Object.keys(options).find((d) => options[d].toString() === value.toString());

            if (selectedOption || false) {
                result[key] = selectedOption;
                meta.logger.debug(`homeetec_cover (FZ) DEBUG options, dp: ${dp}, key: ${key}, value: ${value}, options: ${JSON.stringify(options)}, dpValue: ${JSON.stringify(dpValue)}, result: ${JSON.stringify(result)}`);
            } else {
                meta.logger.debug(`homeetec_cover (FZ) Invalid value '${value}' provided for DP#${dp}, options: ${JSON.stringify(options)}`);
            }

        } else if (key === DP_KEYS.Position) {
            const invert = tuya.isCoverInverted(meta.device.manufacturerName) ? !options.invert_cover : options.invert_cover;
            const position = invert ? 100 - (value & 0xff) : value & 0xff;
            result[key] = position;
            meta.logger.debug(`homeetec_cover (FZ) DEBUG position, dp: ${dp}, key: ${key}, value: ${value}, dpValue: ${JSON.stringify(dpValue)}, result: ${JSON.stringify(result)}`);
            
        } else if ([DP_KEYS.Backlight, DP_KEYS.ChildLock, DP_KEYS.Switch, DP_KEYS.Switch1, DP_KEYS.Switch2].includes(key)) {
            result[key] = getOnState(value);
            meta.logger.debug(`homeetec_cover (FZ) DEBUG boolean, dp: ${dp}, key: ${key}, value: ${value}, dpValue: ${JSON.stringify(dpValue)}, result: ${JSON.stringify(result)}`);
        }
        
        if (Object.keys(result).length > 0) {
            return result;
        }
    },
};

const getDefintions = (model = null) => {
    const definitions = [
        {
            fingerprint: [{
                modelID: 'TS0001',
                manufacturerName: '_TZ3000_bmqxalil',
            }],
            model: 'TS0001_switch_1_gang',
            vendor: 'TuYa',
            description: '1-Gang switch with backlight',
            fromZigbee: [fz.on_off, tuya.fz.power_on_behavior_2, tuya.fz.backlight_mode_off_on],
            toZigbee: [tz.on_off, tuya.tz.power_on_behavior_2, tuya.tz.backlight_indicator_mode_2],
            exposes: [
                e.switch(),
                e.power_on_behavior(),
                exposes.binary('backlight_mode', ea.STATE_SET, 'on', 'off').withDescription('Backlight mode'),
            ],
            configure: async (device, coordinatorEndpoint, logger) => {
                await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
                await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            },
        },
        {
            fingerprint: [{
                modelID: 'TS0002',
                manufacturerName: '_TZ3000_in5qxhtt',
            }],
            model: 'TS0002_switch_2_gang',
            vendor: 'TuYa',
            description: '2-Gang switch with backlight',
            fromZigbee: [fz.on_off, tuya.fz.power_on_behavior_2, tuya.fz.backlight_mode_off_on],
            toZigbee: [tz.on_off, tuya.tz.power_on_behavior_2, tuya.tz.backlight_indicator_mode_2],
            exposes: [
                e.switch().withEndpoint('l1'),
                e.switch().withEndpoint('l2'),
                e.power_on_behavior(),
                exposes.binary('backlight_mode', ea.STATE_SET, 'on', 'off').withDescription('Backlight mode'),
            ],
            endpoint: (device) => {
                return {'l1': 1, 'l2': 2};
            },
            meta: {multiEndpoint: true, disableDefaultResponse: false},
            configure: async (device, coordinatorEndpoint, logger) => {
                await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
                await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
                await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            },
        },
        {
            fingerprint: [{
                modelID: 'TS0003',
                manufacturerName: '_TZ3000_pv4puuxi',
            }],
            model: 'TS0003_switch_3_gang',
            vendor: 'TuYa',
            description: '3-Gang switch with backlight',
            fromZigbee: [fz.on_off, tuya.fz.power_on_behavior_2, tuya.fz.backlight_mode_off_on],
            toZigbee: [tz.on_off, tuya.tz.power_on_behavior_2, tuya.tz.backlight_indicator_mode_2],
            exposes: [
                e.switch().withEndpoint('left'),
                e.switch().withEndpoint('center'),
                e.switch().withEndpoint('right'),
                e.power_on_behavior(),
                exposes.binary('backlight_mode', ea.STATE_SET, 'on', 'off').withDescription('Backlight mode'),
            ],
            endpoint: (device) => {
                return {'left': 1, 'center': 2, 'right': 3};
            },
            meta: {multiEndpoint: true},
            configure: async (device, coordinatorEndpoint, logger) => {
                await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
                await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
                await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
                await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            },
        },
        {
            fingerprint: [{
                modelID: 'TS0601', 
                manufacturerName: '_TZE200_hewlydpz'
            }],
            model: 'TS0601_switch_4_gang_2',
            vendor: 'TuYa',
            description: '4-Gang switch with backlight',
            fromZigbee: [fz.tuya_switch, tuya.fz.homeetec_switch_datapoints],
            toZigbee: [tuya.tz.homeetec_switch_datapoints, tz.tuya_switch_state],
            exposes: [
                e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET), 
                e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET), 
                e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
                e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET),
                exposes.binary(DP_KEYS.Backlight, ea.STATE_SET, 'ON', 'OFF').withDescription('Backlight mode'),
            ],
            endpoint: (device) => {
                return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
            },
            meta: {
                multiEndpoint: true
            }
        },
        {
            fingerprint: [
                {modelID: 'TS0601', manufacturerName: '_TZE200_p6vz3wzt'},
            ],
            model: 'TS0601_cover_5',
            vendor: 'TuYa',
            description: 'Curtain / Blind switch',
            fromZigbee: [tuya.fz.homeetec_cover],
            toZigbee: [tuya.tz.homeetec_cover],
            exposes: [
                e.cover_position(),
                exposes.enum(DP_KEYS.Calibration, ea.STATE_SET, ['START', 'END']).withDescription('Calibration'),
                exposes.binary(DP_KEYS.Backlight, ea.STATE_SET, 'ON', 'OFF').withDescription('Backlight'),
                exposes.enum(DP_KEYS.MotorSteering, ea.STATE_SET, ['FORWARD', 'BACKWARD']).withDescription('Motor Steering'),
                exposes.binary(DP_KEYS.ChildLock, ea.STATE_SET, 'ON', 'OFF').withDescription('Child Lock'),
            ],
        },
        {
            fingerprint: [
                {modelID: 'TS0601', manufacturerName: '_TZE200_jhkttplm'},
            ],
            model: 'TS0601_cover_with_1_switch',
            vendor: 'TuYa',
            description: 'Curtain / Blind switch with 1 Gang switch',
            fromZigbee: [tuya.fz.homeetec_cover],
            toZigbee: [tuya.tz.homeetec_cover],
            exposes: [                
                e.cover_position(),
                exposes.binary(DP_KEYS.Switch, ea.STATE_SET, 'ON', 'OFF').withDescription('Switch On/Off'),
                exposes.enum(DP_KEYS.Calibration, ea.STATE_SET, ['START', 'END']).withDescription('Calibration'),
                exposes.binary(DP_KEYS.Backlight, ea.STATE_SET, 'ON', 'OFF').withDescription('Backlight'),
                exposes.enum(DP_KEYS.MotorSteering, ea.STATE_SET, ['FORWARD', 'BACKWARD']).withDescription('Motor Steering'),
                exposes.binary(DP_KEYS.ChildLock, ea.STATE_SET, 'ON', 'OFF').withDescription('Child Lock'),
            ],
            meta: {
                tuyaDatapoints: [
                    [COVER_DP[DP_KEYS.Switch], DP_KEYS.Switch, tuya.valueConverter.onOff],
                ],
            },
        },
        {
            fingerprint: [
                {modelID: 'TS0601', manufacturerName: '_TZE200_5nldle7w'},
            ],
            model: 'TS0601_cover_with_2_switch',
            vendor: 'TuYa',
            description: 'Curtain / Blind switch with 2 Gang switch',
            options: [exposes.options.invert_cover()],
            fromZigbee: [tuya.fz.homeetec_cover],
            toZigbee: [tuya.tz.homeetec_cover],
            exposes: [                
                e.cover_position(),
                exposes.binary(DP_KEYS.Switch1, ea.STATE_SET, 'ON', 'OFF').withDescription('Switch Top On/Off'),
                exposes.binary(DP_KEYS.Switch2, ea.STATE_SET, 'ON', 'OFF').withDescription('Switch Bottom On/Off'),
                exposes.enum(DP_KEYS.Calibration, ea.STATE_SET, ['START', 'END']).withDescription('Calibration'),
                exposes.binary(DP_KEYS.Backlight, ea.STATE_SET, 'ON', 'OFF').withDescription('Backlight'),
                exposes.enum(DP_KEYS.MotorSteering, ea.STATE_SET, ['FORWARD', 'BACKWARD']).withDescription('Motor Steering'),
                exposes.binary(DP_KEYS.ChildLock, ea.STATE_SET, 'ON', 'OFF').withDescription('Child Lock'),
            ],
            meta: {
                tuyaDatapoints: [
                    [COVER_DP[DP_KEYS.Switch2], DP_KEYS.Switch2, tuya.valueConverter.onOff],
                    [COVER_DP[DP_KEYS.Switch1], DP_KEYS.Switch1, tuya.valueConverter.onOff],                    
                ],
            }
        },
    ]

    return definitions;
};

module.exports = getDefintions('TS0003_switch_1_gang');