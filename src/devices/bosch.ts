import {
    identify, light, onOff, quirkCheckinInterval,
    deviceAddCustomCluster, binary, numeric, enumLookup,
} from '../lib/modernExtend';
import {Zcl, ZSpec} from 'zigbee-herdsman';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
import * as constants from '../lib/constants';
import * as ota from '../lib/ota';
import * as globalStore from '../lib/store';
import {Tz, Fz, Definition, KeyValue, ModernExtend} from '../lib/types';
import {logger} from '../lib/logger';
const e = exposes.presets;
const ea = exposes.access;

const NS = 'zhc:bosch';
const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH};

const sirenVolume = {
    'low': 0x01,
    'medium': 0x02,
    'high': 0x03,
};

const sirenLight = {
    'only_light': 0x00,
    'only_siren': 0x01,
    'siren_and_light': 0x02,
};

const outdoorSirenState = {
    'ON': 0x07,
    'OFF': 0x00,
};

const sirenPowerSupply = {
    'solar_panel': 0x01,
    'ac_power_supply': 0x02,
    'dc_power_supply': 0x03,
};

// BMCT
const stateDeviceMode: KeyValue = {
    'light': 0x04,
    'shutter': 0x01,
    'disabled': 0x00,
};

// BMCT
const stateMotor: KeyValue = {
    'stopped': 0x00,
    'opening': 0x01,
    'closing': 0x02,
};

// BMCT
const stateSwitchType: KeyValue = {
    'button': 0x01,
    'button_key_change': 0x02,
    'rocker_switch': 0x03,
    'rocker_switch_key_change': 0x04,
};

// Twinguard
const smokeSensitivity = {
    'low': 3,
    'medium': 2,
    'high': 1,
};

// Twinguard
const sirenState = {
    'stop': 0,
    'pre_alarm': 1,
    'fire': 2,
    'burglar': 3,
};

// Radiator Thermostat II
const stateOffOn = {
    'OFF': 0,
    'ON': 1,
};

// Smoke detector II BSD-2
const smokeAlarmState: KeyValue = {
    'OFF': 0x0000,
    'ON': 0x3c00, // 15360 or 46080 works
};

// Smoke detector II BSD-2
const burglarAlarmState: KeyValue = {
    'OFF': 0x0001,
    'ON': 0xb401, // 46081
};

// Smoke detector II BSD-2
const smokeDetectorSensitivity: KeyValue = {
    'low': 0x0,
    'medium': 0x1,
    'high': 0x2,
};

// Smoke detector II BSD-2
const broadcastAlarmState: KeyValue = {
    'smoke_off': 0x0000,
    'smoke_on': 0x3c00,
    'burglar_off': 0x0001,
    'burglar_on': 0xb401,
};

// Radiator Thermostat II
const adaptationStatus = {
    'none': 0,
    'ready_to_calibrate': 1,
    'calibration_in_progress': 2,
    'error': 3,
    'success': 4,
};

// Universal Switch II
const buttonMap: {[key: string]: number} = {
    config_led_top_left_press: 0x10,
    config_led_top_right_press: 0x11,
    config_led_bottom_left_press: 0x12,
    config_led_bottom_right_press: 0x13,
    config_led_top_left_longpress: 0x20,
    config_led_top_right_longpress: 0x21,
    config_led_bottom_left_longpress: 0x22,
    config_led_bottom_right_longpress: 0x23,
};

// Universal Switch II
const labelShortPress = `Specifies LED color (rgb) and pattern on short press as hex string.
0-2: RGB value (e.g. ffffff = white)
3: Light position (01=top, 02=bottom, 00=full)
4-7: Durations for sequence fade-in -> on -> fade-out -> off (e.g. 01020102)
8: Number of Repetitions (01=1 to ff=255)
Example: ff1493000104010001`;

// Universal Switch II
const labelLongPress = `Specifies LED color (rgb) and pattern on long press as hex string.
0-2: RGB value (e.g. ffffff = white)
3: Light position (01=top, 02=bottom, 00=full)
4-7: Durations for sequence fade-in -> on -> fade-out -> off (e.g. 01020102)
8: Number of Repetitions (01=1 to ff=255)
Example: ff4200000502050001`;

// Universal Switch II
const labelConfirmation = `Specifies LED color (rgb) and pattern of the confirmation response as hex string.
0-2: RGB value (e.g. ffffff = white)
3: Light position (01=top, 02=bottom, 00=full)
4-7: Durations for sequence fade-in -> on -> fade-out -> off (e.g. 01020102)
8: Number of Repetitions (01=1 to ff=255)
Example: 30ff00000102010001`;

const boschExtend = {
    valveAdaptProcess: (): ModernExtend => {
        const exposes = e.binary('valve_adapt_process', ea.ALL, true, false)
            .withLabel('Trigger adaptation process')
            .withDescription('Trigger the valve adaptation process. Only possible when adaptation status ' +
            'is "ready_to_calibrate" or "error".')
            .withCategory('config');
        const fromZigbee: Fz.Converter[] = [{
            cluster: 'hvacThermostat',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                const data = msg.data;
                if (data.hasOwnProperty('valveAdaptStatus')) {
                    if (data['valveAdaptStatus'] === adaptationStatus.calibration_in_progress) {
                        result.valve_adapt_process = true;
                    } else {
                        result.valve_adapt_process = false;
                    }
                }
                return result;
            },
        }];
        const toZigbee: Tz.Converter[] = [{
            key: ['valve_adapt_process'],
            convertSet: async (entity, key, value, meta) => {
                if (value == true) {
                    const adaptStatus = utils.getFromLookup(meta.state.valve_adapt_status, adaptationStatus);
                    switch (adaptStatus) {
                    case adaptationStatus.ready_to_calibrate:
                    case adaptationStatus.error:
                        await entity.command('hvacThermostat', 'calibrateValve', {}, manufacturerOptions);
                        break;
                    default:
                        throw new Error('Valve adaptation process not possible right now.');
                    }
                }
                return {state: {valve_adapt_process: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('hvacThermostat', ['valveAdaptStatus'], manufacturerOptions);
            },
        }];
        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    heatingDemand: (): ModernExtend => {
        const fromZigbee: Fz.Converter[] = [{
            cluster: 'hvacThermostat',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                const data = msg.data;
                if (data.hasOwnProperty('heatingDemand')) {
                    const demand = data['heatingDemand'] as number;
                    result.pi_heating_demand = demand;
                    result.running_state = demand > 0 ? 'heat' : 'idle';
                }
                return result;
            },
        }];
        const toZigbee: Tz.Converter[] = [{
            key: ['pi_heating_demand'],
            convertSet: async (entity, key, value, meta) => {
                if (key === 'pi_heating_demand') {
                    let demand = utils.toNumber(value, key);
                    demand = utils.numberWithinRange(demand, 0, 100);
                    await entity.write('hvacThermostat', {heatingDemand: demand}, manufacturerOptions);
                    return {state: {pi_heating_demand: demand}};
                }
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('hvacThermostat', ['heatingDemand'], manufacturerOptions);
            },
        }, {
            key: ['running_state'],
            convertGet: async (entity, key, meta) => {
                await entity.read('hvacThermostat', ['heatingDemand'], manufacturerOptions);
            },
        }];
        return {
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    ignoreDst: (): ModernExtend => {
        const fromZigbee: Fz.Converter[] = [{
            cluster: 'genTime',
            type: 'read',
            convert: async (model, msg, publish, options, meta) => {
                if (msg.data.includes('dstStart', 'dstEnd', 'dstShift')) {
                    const response = {
                        'dstStart': {attribute: 0x0003, status: Zcl.Status.SUCCESS, value: 0x00},
                        'dstEnd': {attribute: 0x0004, status: Zcl.Status.SUCCESS, value: 0x00},
                        'dstShift': {attribute: 0x0005, status: Zcl.Status.SUCCESS, value: 0x00},
                    };
                    await msg.endpoint.readResponse(msg.cluster, msg.meta.zclTransactionSequenceNumber, response);
                }
            },
        }];
        return {
            fromZigbee,
            isModernExtend: true,
        };
    },
};
const tzLocal = {
    broadcast_alarm: {
        key: ['broadcast_alarm'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'broadcast_alarm') {
                const index = utils.getFromLookup(value, broadcastAlarmState);
                utils.assertEndpoint(entity);
                await entity.zclCommandBroadcast(
                    255, ZSpec.BroadcastAddress.SLEEPY,
                    Zcl.Clusters.ssIasZone.ID, 'boschSmokeDetectorSiren',
                    {data: index}, manufacturerOptions,
                );
                return;
            }
        },
    } satisfies Tz.Converter,
    bsd2: {
        key: ['alarm_smoke', 'alarm_burglar', 'sensitivity'],
        convertSet: async (entity, key, value: string, meta) => {
            if (key === 'alarm_smoke') {
                const index = utils.getFromLookup(value, smokeAlarmState);
                await entity.command('ssIasZone', 'boschSmokeDetectorSiren', {data: index}, manufacturerOptions);
                return {state: {alarm_smoke: value}};
            }
            if (key === 'alarm_burglar') {
                const index = utils.getFromLookup(value, burglarAlarmState);
                await entity.command('ssIasZone', 'boschSmokeDetectorSiren', {data: index}, manufacturerOptions);
                return {state: {alarm_burglar: value}};
            }
            if (key === 'sensitivity') {
                const index = utils.getFromLookup(value, smokeDetectorSensitivity);
                await entity.write('ssIasZone', {currentZoneSensitivityLevel: index});
                return {state: {sensitivity: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'alarm_smoke':
            case 'alarm_burglar':
            case 'zone_status':
                await entity.read('ssIasZone', ['zoneStatus']);
                break;
            case 'sensitivity':
                await entity.read('ssIasZone', ['currentZoneSensitivityLevel']);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bsd2.convertGet ${key}`);
            }
        },
    } satisfies Tz.Converter,
    rbshoszbeu: {
        key: ['light_delay', 'siren_delay', 'light_duration', 'siren_duration', 'siren_volume', 'alarm_state', 'power_source', 'siren_and_light'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'light_delay') {
                const index = value;
                await entity.write(0x0502, {0xa004: {value: index, type: 0x21}}, manufacturerOptions);
                return {state: {light_delay: value}};
            }
            if (key === 'siren_delay') {
                const index = value;
                await entity.write(0x0502, {0xa003: {value: index, type: 0x21}}, manufacturerOptions);
                return {state: {siren_delay: value}};
            }
            if (key === 'light_duration') {
                const index = value;
                await entity.write(0x0502, {0xa005: {value: index, type: 0x20}}, manufacturerOptions);
                return {state: {light_duration: value}};
            }
            if (key === 'siren_duration') {
                const index = value;
                await entity.write(0x0502, {0xa000: {value: index, type: 0x20}}, manufacturerOptions);
                return {state: {siren_duration: value}};
            }
            if (key === 'siren_and_light') {
                const index = utils.getFromLookup(value, sirenLight);
                await entity.write(0x0502, {0xa001: {value: index, type: 0x20}}, manufacturerOptions);
                return {state: {siren_and_light: value}};
            }
            if (key === 'siren_volume') {
                const index = utils.getFromLookup(value, sirenVolume);
                await entity.write(0x0502, {0xa002: {value: index, type: 0x20}}, manufacturerOptions);
                return {state: {siren_volume: value}};
            }
            if (key === 'power_source') {
                const index = utils.getFromLookup(value, sirenPowerSupply);
                await entity.write(0x0001, {0xa002: {value: index, type: 0x20}}, manufacturerOptions);
                return {state: {power_source: value}};
            }
            if (key === 'alarm_state') {
                const endpoint = meta.device.getEndpoint(1);
                const index = utils.getFromLookup(value, outdoorSirenState);
                if (index == 0) {
                    await endpoint.command(0x0502, 0xf0, {data: 0}, manufacturerOptions);
                    return {state: {alarm_state: value}};
                } else {
                    await endpoint.command(0x0502, 0xf0, {data: 7}, manufacturerOptions);
                    return {state: {alarm_state: value}};
                }
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'light_delay':
                await entity.read(0x0502, [0xa004], manufacturerOptions);
                break;
            case 'siren_delay':
                await entity.read(0x0502, [0xa003], manufacturerOptions);
                break;
            case 'light_duration':
                await entity.read(0x0502, [0xa005], manufacturerOptions);
                break;
            case 'siren_duration':
                await entity.read(0x0502, [0xa000], manufacturerOptions);
                break;
            case 'siren_and_light':
                await entity.read(0x0502, [0xa001], manufacturerOptions);
                break;
            case 'siren_volume':
                await entity.read(0x0502, [0xa002], manufacturerOptions);
                break;
            case 'alarm_state':
                await entity.read(0x0502, [0xf0], manufacturerOptions);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.rbshoszbeu.convertGet ${key}`);
            }
        },
    } satisfies Tz.Converter,
    bmct: {
        key: [
            'device_mode',
            'switch_type',
            'child_lock',
            'calibration', 'calibration_closing_time', 'calibration_opening_time',
            'state',
            'on_time',
            'off_wait_time',
        ],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'state') {
                if ('ID' in entity && entity.ID === 1) {
                    await tz.cover_state.convertSet(entity, key, value, meta);
                } else {
                    await tz.on_off.convertSet(entity, key, value, meta);
                }
            }
            if (key === 'on_time' || key === 'on_wait_time') {
                if ('ID' in entity && entity.ID !== 1) {
                    await tz.on_off.convertSet(entity, key, value, meta);
                }
            }
            if (key === 'device_mode') {
                const index = utils.getFromLookup(value, stateDeviceMode);
                await entity.write('manuSpecificBosch10', {deviceMode: index});
                await entity.read('manuSpecificBosch10', ['deviceMode']);
                return {state: {device_mode: value}};
            }
            if (key === 'switch_type') {
                const index = utils.getFromLookup(value, stateSwitchType);
                await entity.write('manuSpecificBosch10', {switchType: index});
                return {state: {switch_type: value}};
            }
            if (key === 'child_lock') {
                const index = utils.getFromLookup(value, stateOffOn);
                await entity.write('manuSpecificBosch10', {childLock: index});
                return {state: {child_lock: value}};
            }
            if (key === 'calibration_opening_time') {
                const number = utils.toNumber(value, 'calibration_opening_time');
                const index = number * 10;
                await entity.write('manuSpecificBosch10', {calibrationOpeningTime: index});
                return {state: {calibration_opening_time: number}};
            }
            if (key === 'calibration_closing_time') {
                const number = utils.toNumber(value, 'calibration_closing_time');
                const index = number * 10;
                await entity.write('manuSpecificBosch10', {calibrationClosingTime: index});
                return {state: {calibration_closing_time: number}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'state':
            case 'on_time':
            case 'off_wait_time':
                if ('ID' in entity && entity.ID !== 1) {
                    await entity.read('genOnOff', ['onOff']);
                }
                break;
            case 'device_mode':
                await entity.read('manuSpecificBosch10', ['deviceMode']);
                break;
            case 'switch_type':
                await entity.read('manuSpecificBosch10', ['switchType']);
                break;
            case 'child_lock':
                await entity.read('manuSpecificBosch10', ['childLock']);
                break;
            case 'calibration_opening_time':
                await entity.read('manuSpecificBosch10', ['calibrationOpeningTime']);
                break;
            case 'calibration_closing_time':
                await entity.read('manuSpecificBosch10', ['calibrationClosingTime']);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bcmt.convertGet ${key}`);
            }
        },
    } satisfies Tz.Converter,
    bwa1_alarm_on_motion: {
        key: ['alarm_on_motion'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'alarm_on_motion') {
                const index = utils.getFromLookup(value, stateOffOn);
                await entity.write('manuSpecificBosch11', {alarmOnMotion: index}, manufacturerOptions);
                return {state: {alarm_on_motion: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'alarm_on_motion':
                await entity.read('manuSpecificBosch11', ['alarmOnMotion'], manufacturerOptions);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bwa1_alarm_on_motion.convertGet ${key}`);
            }
        },
    } satisfies Tz.Converter,
    bosch_twinguard: {
        key: ['sensitivity', 'pre_alarm', 'self_test', 'alarm', 'heartbeat'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'sensitivity') {
                const index = utils.getFromLookup(value, smokeSensitivity);
                await entity.write('manuSpecificBosch', {sensitivity: index}, manufacturerOptions);
                return {state: {sensitivity: value}};
            }
            if (key === 'pre_alarm') {
                const index = utils.getFromLookup(value, stateOffOn);
                await entity.write('manuSpecificBosch5', {pre_alarm: index}, manufacturerOptions);
                return {state: {pre_alarm: value}};
            }
            if (key === 'heartbeat') {
                const endpoint = meta.device.getEndpoint(12);
                const index = utils.getFromLookup(value, stateOffOn);
                await endpoint.write('manuSpecificBosch7', {heartbeat: index}, manufacturerOptions);
                return {state: {heartbeat: value}};
            }
            if (key === 'self_test') {
                if (value) {
                    await entity.command('manuSpecificBosch', 'initiateTestMode', manufacturerOptions);
                }
            }
            if (key === 'alarm') {
                const endpoint = meta.device.getEndpoint(12);
                const index = utils.getFromLookup(value, sirenState);
                utils.assertEndpoint(entity);
                if (index == 0) {
                    await entity.commandResponse('genAlarms', 'alarm', {alarmcode: 0x16, clusterid: 0xe000}, {direction: 1});
                    await entity.commandResponse('genAlarms', 'alarm', {alarmcode: 0x14, clusterid: 0xe000}, {direction: 1});
                    await endpoint.command('manuSpecificBosch8', 'burglarAlarm', {data: 0}, manufacturerOptions);
                } else if (index == 1) {
                    await entity.commandResponse('genAlarms', 'alarm', {alarmcode: 0x11, clusterid: 0xe000}, {direction: 1});
                    return {state: {siren_state: 'pre-alarm'}};
                } else if (index == 2) {
                    await entity.commandResponse('genAlarms', 'alarm', {alarmcode: 0x10, clusterid: 0xe000}, {direction: 1});
                    return {state: {siren_state: 'fire'}};
                } else if (index == 3) {
                    await endpoint.command('manuSpecificBosch8', 'burglarAlarm', {data: 1}, manufacturerOptions);
                }
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'sensitivity':
                await entity.read('manuSpecificBosch', ['sensitivity'], manufacturerOptions);
                break;
            case 'pre_alarm':
                await entity.read('manuSpecificBosch5', ['pre_alarm'], manufacturerOptions);
                break;
            case 'heartbeat':
                await meta.device.getEndpoint(12).read('manuSpecificBosch7', ['heartbeat'], manufacturerOptions);
                break;
            case 'alarm':
            case 'self_test':
                await meta.device.getEndpoint(12).read('manuSpecificBosch8', ['alarm_status'], manufacturerOptions);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bosch_twinguard.convertGet ${key}`);
            }
        },
    } satisfies Tz.Converter,
    bhius_config: {
        key: Object.keys(buttonMap),
        convertGet: async (entity, key, meta) => {
            if (!buttonMap.hasOwnProperty(key)) {
                throw new Error(`Unknown key ${key}`);
            }
            await entity.read('manuSpecificBosch9', [buttonMap[key as keyof typeof buttonMap]], manufacturerOptions);
        },
        convertSet: async (entity, key, value, meta) => {
            if (!buttonMap.hasOwnProperty(key) ) {
                return;
            }

            const buffer = Buffer.from(value as string, 'hex');
            if (buffer.length !== 9) throw new Error(`Invalid configuration length: ${buffer.length} (should be 9)`);

            const payload: {[key: number | string]: KeyValue} = {};
            payload[buttonMap[key as keyof typeof buttonMap]] = {value: buffer, type: 65};
            await entity.write('manuSpecificBosch9', payload, manufacturerOptions);

            const result:{[key: number | string]: string} = {};
            result[key] = value as string;
            return {state: result};
        },
    } satisfies Tz.Converter,
};


const fzLocal = {
    bsd2: {
        cluster: 'ssIasZone',
        type: ['commandStatusChangeNotification', 'attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const data = msg.data;
            const lookup: KeyValue = {0: 'low', 1: 'medium', 2: 'high'};
            if (data.hasOwnProperty('zoneStatus') || data.hasOwnProperty('zonestatus')) {
                const zoneStatus = msg.type === 'commandStatusChangeNotification' ? msg.data.zonestatus : msg.data.zoneStatus;
                return {
                    smoke: (zoneStatus & 1) > 0,
                    alarm_smoke: (zoneStatus & 1<<1) > 0,
                    battery_low: (zoneStatus & 1<<3) > 0,
                    supervision_reports: (zoneStatus & 1<<4) > 0,
                    restore_reports: (zoneStatus & 1<<5) > 0,
                    alarm_burglar: (zoneStatus & 1<<7) > 0,
                    test: (zoneStatus & 1<<8) > 0,
                    alarm_silenced: (zoneStatus & 1<<11) > 0,
                };
            }
            if (data.hasOwnProperty('currentZoneSensitivityLevel')) {
                const value = data.currentZoneSensitivityLevel;
                return {sensitivity: lookup[value]};
            }
        },
    } satisfies Fz.Converter,
    bmct: {
        cluster: 'manuSpecificBosch10',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const data = msg.data;
            if (data.hasOwnProperty('deviceMode')) {
                result.device_mode = Object.keys(stateDeviceMode).find((key) => stateDeviceMode[key] === msg.data['deviceMode']);
                const deviceMode = msg.data['deviceMode'];
                if (deviceMode !== meta.device.meta.deviceMode) {
                    meta.device.meta.deviceMode = deviceMode;
                    meta.deviceExposesChanged();
                }
            }
            if (data.hasOwnProperty('switchType')) {
                result.switch_type = Object.keys(stateSwitchType).find((key) => stateSwitchType[key] === msg.data['switchType']);
            }
            if (data.hasOwnProperty('calibrationOpeningTime')) {
                result.calibration_opening_time = msg.data['calibrationOpeningTime']/10;
            }
            if (data.hasOwnProperty('calibrationClosingTime')) {
                result.calibration_closing_time = msg.data['calibrationClosingTime']/10;
            }
            if (data.hasOwnProperty('childLock')) {
                const property = utils.postfixWithEndpointName('child_lock', msg, model, meta);
                result[property] = msg.data['childLock'] === 1 ? 'ON' : 'OFF';
            }
            if (data.hasOwnProperty('motorState')) {
                result.motor_state = Object.keys(stateMotor).find((key) => stateMotor[key] === msg.data['motorState']);
            }
            return result;
        },
    } satisfies Fz.Converter,
    bwa1_alarm_on_motion: {
        cluster: 'manuSpecificBosch11',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('alarmOnMotion')) {
                result.alarm_on_motion = (Object.keys(stateOffOn)[msg.data['alarmOnMotion']]);
            }
            return result;
        },
    } satisfies Fz.Converter,
    bosch_contact: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            const lookup: KeyValue = {0: 'none', 1: 'single', 2: 'long'};
            const result = {
                contact: !((zoneStatus & 1) > 0),
                vibration: (zoneStatus & 1<<1) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
                action: lookup[(zoneStatus >> 11) & 3],
            };
            if (result.action === 'none') delete result.action;
            return result;
        },
    } satisfies Fz.Converter,
    bosch_twinguard_sensitivity: {
        cluster: 'manuSpecificBosch',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('sensitivity')) {
                result.sensitivity = (Object.keys(smokeSensitivity)[msg.data['sensitivity']]);
            }
            return result;
        },
    } satisfies Fz.Converter,
    bosch_twinguard_measurements: {
        cluster: 'manuSpecificBosch3',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('humidity')) {
                const humidity = parseFloat(msg.data['humidity']) / 100.0;
                if (humidity >= 0 && humidity <= 100) {
                    result.humidity = humidity;
                }
            }
            if (msg.data.hasOwnProperty('airpurity')) {
                const iaq = parseInt(msg.data['airpurity']);
                result.aqi = iaq;
                result.co2 = ((iaq * 10) + 500);
                let factor = 6;
                if ((iaq >= 51) && (iaq <= 100)) {
                    factor = 10;
                } else if ((iaq >= 101) && (iaq <= 150)) {
                    factor = 20;
                } else if ((iaq >= 151) && (iaq <= 200)) {
                    factor = 50;
                } else if ((iaq >= 201) && (iaq <= 250)) {
                    factor = 100;
                } else if (iaq >= 251) {
                    factor = 100;
                }
                result.voc = (iaq * factor);
            }
            if (msg.data.hasOwnProperty('temperature')) {
                result.temperature = parseFloat(msg.data['temperature']) / 100.0;
            }
            if (msg.data.hasOwnProperty('illuminance_lux')) {
                result.illuminance_lux = utils.precisionRound((msg.data['illuminance_lux'] / 2), 2);
            }
            if (msg.data.hasOwnProperty('battery')) {
                result.battery = utils.precisionRound((msg.data['battery'] / 2), 2);
            }
            return result;
        },
    } satisfies Fz.Converter,
    bosch_twinguard_pre_alarm: {
        cluster: 'manuSpecificBosch5',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('pre_alarm')) {
                result.pre_alarm = (Object.keys(stateOffOn)[msg.data['pre_alarm']]);
            }
            return result;
        },
    } satisfies Fz.Converter,
    bosch_twinguard_heartbeat: {
        cluster: 'manuSpecificBosch7',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('heartbeat')) {
                result.heartbeat = (Object.keys(stateOffOn)[msg.data['heartbeat']]);
            }
            return result;
        },
    } satisfies Fz.Converter,
    bosch_twinguard_alarm_state: {
        cluster: 'manuSpecificBosch8',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const lookup: KeyValue = {
                0x00200020: 'clear',
                0x01200020: 'self_test',
                0x02200020: 'burglar',
                0x00200082: 'pre-alarm',
                0x00200081: 'fire',
                0x00200040: 'silenced',
            };
            if (msg.data.hasOwnProperty('alarm_status')) {
                result.self_test = (msg.data['alarm_status'] & 1<<24) > 0;
                result.smoke = (msg.data['alarm_status'] & 1<<7) > 0;
                result.siren_state = lookup[msg.data['alarm_status']];
            }
            return result;
        },
    } satisfies Fz.Converter,
    bosch_twinguard_smoke_alarm_state: {
        cluster: 'genAlarms',
        type: ['commandAlarm', 'readResponse'],
        convert: async (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const lookup: KeyValue = {
                0x10: 'fire',
                0x11: 'pre-alarm',
                0x14: 'clear',
                0x16: 'silenced',
            };
            result.siren_state = lookup[msg.data.alarmcode];
            if (msg.data.alarmcode == 0x10 || msg.data.alarmcode == 0x11) {
                await msg.endpoint.commandResponse('genAlarms', 'alarm',
                    {alarmcode: msg.data.alarmcode, clusterid: 0xe000}, {direction: 1});
            }
            return result;
        },
    } satisfies Fz.Converter,
    bhius_button_press: {
        cluster: 'manuSpecificBosch9',
        type: 'raw',
        options: [e.text('led_response', ea.ALL).withLabel('LED config (confirmation response)').withDescription(labelConfirmation)],
        convert: async (model, msg, publish, options, meta) => {
            const sequenceNumber= msg.data.readUInt8(3);
            const buttonId = msg.data.readUInt8(4);
            const longPress = msg.data.readUInt8(5);
            const duration = msg.data.readUInt16LE(6);
            let buffer;
            if (options.hasOwnProperty('led_response')) {
                buffer = Buffer.from(options.led_response as string, 'hex');
                if (buffer.length !== 9) {
                    logger.error(`Invalid length of led_response: ${buffer.length} (should be 9)`, NS);
                    buffer = Buffer.from('30ff00000102010001', 'hex');
                }
            } else {
                buffer = Buffer.from('30ff00000102010001', 'hex');
            }

            if (utils.hasAlreadyProcessedMessage(msg, model, sequenceNumber)) return;
            const buttons: {[key: number]: string} = {0: 'top_left', 1: 'top_right', 2: 'bottom_left', 3: 'bottom_right'};

            let command = '';
            if (buttonId in buttons) {
                if (longPress && duration > 0) {
                    if (globalStore.hasValue(msg.endpoint, buttons[buttonId])) return;
                    globalStore.putValue(msg.endpoint, buttons[buttonId], duration);
                    command = 'longpress';
                } else {
                    globalStore.clearValue(msg.endpoint, buttons[buttonId]);
                    command = longPress ? 'longpress_release': 'release';
                    msg.endpoint.command('manuSpecificBosch9', 'confirmButtonPressed', {data: buffer}, {sendPolicy: 'immediate'})
                        .catch((error) => {});
                }
                return {action: `button_${buttons[buttonId]}_${command}`};
            } else {
                logger.error(`Received message with unknown command ID ${buttonId}. Data: 0x${msg.data.toString('hex')}`, NS);
            }
        },
    } satisfies Fz.Converter,
    bhius_config: {
        cluster: 'manuSpecificBosch9',
        type: ['attributeReport', 'readResponse'],
        convert: async (model, msg, publish, options, meta) => {
            const result: {[key: number | string]: string} = {};
            for (const id of Object.values(buttonMap)) {
                if (msg.data.hasOwnProperty(id)) {
                    result[Object.keys(buttonMap).find((key) => buttonMap[key] === id)] = msg.data[id].toString('hex');
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['RBSH-OS-ZB-EU'],
        model: 'BSIR-EZ',
        vendor: 'Bosch',
        description: 'Outdoor siren',
        fromZigbee: [fz.ias_alarm_only_alarm_1, fz.battery, fz.power_source],
        toZigbee: [tzLocal.rbshoszbeu, tz.warning],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 4200}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'ssIasWd', 'genBasic']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read(0x0502, [0xa000, 0xa001, 0xa002, 0xa003, 0xa004, 0xa005], manufacturerOptions);
            await endpoint.unbind('genPollCtrl', coordinatorEndpoint);
        },
        exposes: [
            e.binary('alarm_state', ea.ALL, 'ON', 'OFF').withDescription('Alarm turn ON/OFF'),
            e.numeric('light_delay', ea.ALL).withValueMin(0).withValueMax(30).withValueStep(1)
                .withUnit('s').withDescription('Flashing light delay').withUnit('s'),
            e.numeric('siren_delay', ea.ALL).withValueMin(0).withValueMax(30).withValueStep(1)
                .withUnit('s').withDescription('Siren alarm delay').withUnit('s'),
            e.numeric('siren_duration', ea.ALL).withValueMin(1).withValueMax(15).withValueStep(1)
                .withUnit('m').withDescription('Duration of the alarm siren').withUnit('m'),
            e.numeric('light_duration', ea.ALL).withValueMin(1).withValueMax(15).withValueStep(1)
                .withUnit('m').withDescription('Duration of the alarm light').withUnit('m'),
            e.enum('siren_volume', ea.ALL, Object.keys(sirenVolume)).withDescription('Volume of the alarm'),
            e.enum('siren_and_light', ea.ALL, Object.keys(sirenLight)).withDescription('Siren and Light behaviour during alarm '),
            e.enum('power_source', ea.ALL, Object.keys(sirenPowerSupply)).withDescription('Siren power source'),
            e.warning()
                .removeFeature('strobe_level')
                .removeFeature('strobe')
                .removeFeature('strobe_duty_cycle')
                .removeFeature('level')
                .removeFeature('duration'),
            e.test(), e.tamper(), e.battery(), e.battery_voltage(), e.battery_low(),
            e.binary('ac_status', ea.STATE, true, false).withDescription('Is the device plugged in'),
        ],
        extend: [
            quirkCheckinInterval(0),
        ],
    },
    {
        zigbeeModel: ['RBSH-WS-ZB-EU'],
        model: 'BWA-1',
        vendor: 'Bosch',
        description: 'Zigbee smart water leak detector',
        fromZigbee: [
            fz.battery,
            fz.ias_water_leak_alarm_1,
            fzLocal.bwa1_alarm_on_motion,
        ],
        toZigbee: [
            tzLocal.bwa1_alarm_on_motion,
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg',
                'genPollCtrl',
            ]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read('manuSpecificBosch11', ['alarmOnMotion'], manufacturerOptions);
        },
        exposes: [
            e.water_leak(),
            e.tamper(),
            e.battery(),
            e.battery_low(),
            e.binary('alarm_on_motion', ea.ALL, 'ON', 'OFF').withDescription('Enable/Disable sound alarm on motion'),
        ],
    },
    {
        zigbeeModel: ['RBSH-SD-ZB-EU'],
        model: 'BSD-2',
        vendor: 'Bosch',
        description: 'Smoke alarm II',
        fromZigbee: [
            fz.battery,
            fzLocal.bsd2,
        ],
        toZigbee: [
            tzLocal.bsd2,
            tzLocal.broadcast_alarm,
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg',
                'genPollCtrl',
            ]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read('ssIasZone', ['zoneStatus']);
        },
        exposes: [
            e.smoke(),
            e.battery(),
            e.battery_low(),
            e.test(),
            e.binary('alarm_burglar', ea.ALL, 'ON', 'OFF').withDescription('Toggle the burglar alarm on or off'),
            e.binary('alarm_smoke', ea.ALL, 'ON', 'OFF').withDescription('Toggle the smoke alarm on or off'),
            e.enum('sensitivity', ea.ALL, Object.keys(smokeDetectorSensitivity)).withDescription('Sensitivity of the smoke alarm'),
            e.enum('broadcast_alarm', ea.SET, Object.keys(broadcastAlarmState)).withDescription('Set alarm state of all BSD-2 via broadcast'),
        ],
    },
    {
        zigbeeModel: ['RFDL-ZB', 'RFDL-ZB-EU', 'RFDL-ZB-H', 'RFDL-ZB-K', 'RFDL-ZB-CHI', 'RFDL-ZB-MS', 'RFDL-ZB-ES', 'RFPR-ZB',
            'RFPR-ZB-EU', 'RFPR-ZB-CHI', 'RFPR-ZB-ES', 'RFPR-ZB-MS'],
        model: 'RADON TriTech ZB',
        vendor: 'Bosch',
        description: 'Wireless motion detector',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.illuminance],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg', 'msIlluminanceMeasurement']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.illuminance(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper(), e.illuminance(), e.illuminance_lux()],
    },
    {
        zigbeeModel: ['ISW-ZPR1-WP13'],
        model: 'ISW-ZPR1-WP13',
        vendor: 'Bosch',
        description: 'Motion sensor',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.ignore_iaszone_report],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['RBSH-TRV0-ZB-EU'],
        model: 'BTH-RA',
        vendor: 'Bosch',
        description: 'Radiator thermostat II',
        ota: ota.zigbeeOTA,
        exposes: [
            e.climate()
                .withLocalTemperature(ea.STATE_GET, 'Temperature used by the heating algorithm. ' +
                'This is the temperature measured on the device (by default) or the remote temperature (if set within the last 30 min).')
                .withLocalTemperatureCalibration(-5, 5, 0.1)
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSystemMode(['heat'])
                .withPiHeatingDemand(ea.ALL)
                .withRunningState(['idle', 'heat'], ea.STATE_GET),
            e.battery(),
            e.battery_low(),
        ],
        fromZigbee: [
            fz.battery,
            fz.thermostat,
        ],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature,
            tz.thermostat_keypad_lockout,
        ],
        extend: [
            deviceAddCustomCluster(
                'hvacThermostat',
                {
                    ID: 0x201,
                    attributes: {
                        operatingMode: {
                            ID: 0x4007,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        heatingDemand: {
                            ID: 0x4020,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        valveAdaptStatus: {
                            ID: 0x4022,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        remoteTemperature: {
                            ID: 0x4040,
                            type: Zcl.DataType.INT16,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        windowDetection: {
                            ID: 0x4042,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        boostHeating: {
                            ID: 0x4043,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                    },
                    commands: {
                        calibrateValve: {
                            ID: 0x41,
                            parameters: [],
                        },
                    },
                    commandsResponse: {},
                },
            ),
            deviceAddCustomCluster(
                'hvacUserInterfaceCfg',
                {
                    ID: 0x204,
                    attributes: {
                        displayOrientation: {
                            ID: 0x400b,
                            type: Zcl.DataType.UINT8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        displayedTemperature: {
                            ID: 0x4039,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        displayOntime: {
                            ID: 0x403a,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        displayBrightness: {
                            ID: 0x403b,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                    },
                    commands: {},
                    commandsResponse: {},
                },
            ),
            enumLookup({
                name: 'operating_mode',
                cluster: 'hvacThermostat',
                attribute: 'operatingMode',
                description: 'Bosch-specific operating mode (overrides system mode)',
                lookup: {'schedule': 0, 'manual': 1, 'pause': 5},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            binary({
                name: 'window_detection',
                cluster: 'hvacThermostat',
                attribute: 'windowDetection',
                description: 'Enable/disable window open (Lo.) mode',
                valueOn: ['ON', 0x01],
                valueOff: ['OFF', 0x00],
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            binary({
                name: 'boost_heating',
                cluster: 'hvacThermostat',
                attribute: 'boostHeating',
                description: 'Activate boost heating (5 min.)',
                valueOn: ['ON', 0x01],
                valueOff: ['OFF', 0x00],
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            numeric({
                name: 'remote_temperature',
                cluster: 'hvacThermostat',
                attribute: 'remoteTemperature',
                description: 'Input for remote temperature sensor. ' +
                    'Required at least every 30 min. to prevent fallback to internal sensor!',
                valueMin: 0.0,
                valueMax: 35.0,
                valueStep: 0.01,
                unit: '°C',
                scale: 100,
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            enumLookup({
                name: 'setpoint_change_source',
                cluster: 'hvacThermostat',
                attribute: 'setpointChangeSource',
                description: 'Source of the current setpoint temperature',
                lookup: {'manual': 0, 'schedule': 1, 'externally': 2},
                access: 'STATE_GET',
            }),
            binary({
                name: 'child_lock',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'keypadLockout',
                description: 'Enables/disables physical input on the device',
                valueOn: ['LOCK', 0x01],
                valueOff: ['UNLOCK', 0x00],
            }),
            numeric({
                name: 'display_ontime',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'displayOntime',
                description: 'Sets the display on-time',
                valueMin: 5,
                valueMax: 30,
                unit: 's',
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            numeric({
                name: 'display_brightness',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'displayBrightness',
                description: 'Sets brightness of the display',
                valueMin: 0,
                valueMax: 10,
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            enumLookup({
                name: 'display_orientation',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'displayOrientation',
                description: 'Sets orientation of the display',
                lookup: {'normal': 0, 'flipped': 1},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            enumLookup({
                name: 'displayed_temperature',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'displayedTemperature',
                description: 'Temperature displayed on the TRV',
                lookup: {'target': 0, 'measured': 1},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            enumLookup({
                name: 'valve_adapt_status',
                cluster: 'hvacThermostat',
                attribute: 'valveAdaptStatus',
                description: 'Specifies the current status of the valve adaptation',
                lookup: {
                    'none': 0,
                    'ready_to_calibrate': 1,
                    'calibration_in_progress': 2,
                    'error': 3,
                    'success': 4,
                },
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
                access: 'STATE_GET',
            }),
            boschExtend.valveAdaptProcess(),
            boschExtend.heatingDemand(),
            boschExtend.ignoreDst(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPollCtrl', 'genPowerCfg', 'msRelativeHumidity', 'hvacThermostat', 'hvacUserInterfaceCfg',
            ]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {
                min: constants.repInterval.SECONDS_10,
                max: constants.repInterval.HOUR,
                change: 50,
            });
            await reporting.thermostatKeypadLockMode(endpoint);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'setpointChangeSource',
                minimumReportInterval: constants.repInterval.SECONDS_10,
                maximumReportInterval: constants.repInterval.MAX,
                reportableChange: null,
            }]);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'operatingMode',
                minimumReportInterval: constants.repInterval.SECONDS_10,
                maximumReportInterval: constants.repInterval.MAX,
                reportableChange: null,
            }], manufacturerOptions);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'boostHeating',
                minimumReportInterval: constants.repInterval.SECONDS_10,
                maximumReportInterval: constants.repInterval.MAX,
                reportableChange: null,
            }], manufacturerOptions);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'valveAdaptStatus',
                minimumReportInterval: constants.repInterval.SECONDS_10,
                maximumReportInterval: constants.repInterval.MAX,
                reportableChange: null,
            }], manufacturerOptions);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'heatingDemand',
                minimumReportInterval: constants.repInterval.SECONDS_10,
                maximumReportInterval: constants.repInterval.MAX,
                reportableChange: null,
            }], manufacturerOptions);
            await endpoint.read('hvacThermostat', ['localTemperatureCalibration', 'setpointChangeSource']);
            await endpoint.read('hvacThermostat', [
                'operatingMode', 'heatingDemand', 'valveAdaptStatus', 'remoteTemperature', 'windowDetection', 'boostHeating',
            ], manufacturerOptions);
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
            await endpoint.read('hvacUserInterfaceCfg', [
                'displayOrientation', 'displayedTemperature', 'displayOntime', 'displayBrightness',
            ], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ['RBSH-RTH0-BAT-ZB-EU'],
        model: 'BTH-RM',
        vendor: 'Bosch',
        description: 'Room thermostat II (Battery model)',
        meta: {battery: {voltageToPercentage: {min: 4400, max: 6400}}},
        exposes: [
            e.climate()
                .withLocalTemperature()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('occupied_cooling_setpoint', 5, 30, 0.5)
                .withLocalTemperatureCalibration(-12, 12, 0.1)
                .withSystemMode(['off', 'heat', 'cool'])
                .withRunningState(['idle', 'heat', 'cool']),
            e.humidity(),
            e.battery(),
            e.battery_low(),
            e.battery_voltage(),
        ],
        fromZigbee: [
            fz.battery,
            fz.humidity,
            fz.thermostat,
            fz.hvac_user_interface,
        ],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_programming_operation_mode, // NOTE: Only 0x0 & 0x1 supported
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_display_mode,
        ],
        extend: [
            deviceAddCustomCluster(
                'hvacThermostat',
                {
                    ID: 0x201,
                    attributes: {
                        operatingMode: {
                            ID: 0x4007,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        heatingDemand: {
                            ID: 0x4020,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        valveAdaptStatus: {
                            ID: 0x4022,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        remoteTemperature: {
                            ID: 0x4040,
                            type: Zcl.DataType.INT16,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        windowDetection: {
                            ID: 0x4042,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        boostHeating: {
                            ID: 0x4043,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                    },
                    commands: {
                        calibrateValve: {
                            ID: 0x41,
                            parameters: [],
                        },
                    },
                    commandsResponse: {},
                },
            ),
            deviceAddCustomCluster(
                'hvacUserInterfaceCfg',
                {
                    ID: 0x204,
                    attributes: {
                        displayOrientation: {
                            ID: 0x400b,
                            type: Zcl.DataType.UINT8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        displayedTemperature: {
                            ID: 0x4039,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        displayOntime: {
                            ID: 0x403a,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        displayBrightness: {
                            ID: 0x403b,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                    },
                    commands: {},
                    commandsResponse: {},
                },
            ),
            enumLookup({
                name: 'operating_mode',
                cluster: 'hvacThermostat',
                attribute: 'operatingMode',
                description: 'Sets Bosch-specific operating mode (overrides system mode)',
                lookup: {'schedule': 0, 'manual': 1, 'pause': 5},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            binary({
                name: 'window_detection',
                cluster: 'hvacThermostat',
                attribute: 'windowDetection',
                description: 'Enable/disable window open (Lo.) mode',
                valueOn: ['ON', 0x01],
                valueOff: ['OFF', 0x00],
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            binary({
                name: 'boost_heating',
                cluster: 'hvacThermostat',
                attribute: 'boostHeating',
                description: 'Activate boost heating',
                valueOn: ['ON', 0x01],
                valueOff: ['OFF', 0x00],
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            binary({
                name: 'child_lock',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'keypadLockout',
                description: 'Enables/disables physical input on the device',
                valueOn: ['LOCK', 0x01],
                valueOff: ['UNLOCK', 0x00],
            }),
            numeric({
                name: 'display_ontime',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'displayOntime',
                description: 'Sets the display on-time',
                valueMin: 5,
                valueMax: 30,
                unit: 's',
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            numeric({
                name: 'display_brightness',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'displayBrightness',
                description: 'Sets brightness of the display',
                valueMin: 0,
                valueMax: 10,
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPollCtrl', 'genPowerCfg', 'msRelativeHumidity', 'hvacThermostat', 'hvacUserInterfaceCfg',
            ]);
            await reporting.humidity(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {
                min: constants.repInterval.SECONDS_10,
                max: constants.repInterval.HOUR,
                change: 50,
            });
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint, {
                min: constants.repInterval.SECONDS_10,
                max: constants.repInterval.HOUR,
                change: 50,
            });
            await reporting.thermostatKeypadLockMode(endpoint);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'operatingMode',
                minimumReportInterval: constants.repInterval.SECONDS_10,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }], manufacturerOptions);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'boostHeating',
                minimumReportInterval: constants.repInterval.SECONDS_10,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }], manufacturerOptions);
            await endpoint.read('hvacThermostat', ['localTemperatureCalibration']);
            await endpoint.read('hvacThermostat', ['operatingMode', 'windowDetection', 'boostHeating'], manufacturerOptions);
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
            await endpoint.read('hvacUserInterfaceCfg', ['displayOntime', 'displayBrightness'], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ['RBSH-RTH0-ZB-EU'],
        model: 'BTH-RM230Z',
        vendor: 'Bosch',
        description: 'Room thermostat II 230V',
        exposes: [
            e.climate()
                .withLocalTemperature()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('occupied_cooling_setpoint', 5, 30, 0.5)
                .withLocalTemperatureCalibration(-12, 12, 0.1)
                .withSystemMode(['off', 'heat', 'cool'])
                .withRunningState(['idle', 'heat', 'cool']),
            e.humidity(),
        ],
        fromZigbee: [
            fz.humidity,
            fz.thermostat,
            fz.hvac_user_interface,
        ],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_programming_operation_mode, // NOTE: Only 0x0 & 0x1 supported
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_display_mode,
        ],
        extend: [
            deviceAddCustomCluster(
                'hvacThermostat',
                {
                    ID: 0x201,
                    attributes: {
                        operatingMode: {
                            ID: 0x4007,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        heatingDemand: {
                            ID: 0x4020,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        valveAdaptStatus: {
                            ID: 0x4022,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        remoteTemperature: {
                            ID: 0x4040,
                            type: Zcl.DataType.INT16,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        windowDetection: {
                            ID: 0x4042,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        boostHeating: {
                            ID: 0x4043,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                    },
                    commands: {
                        calibrateValve: {
                            ID: 0x41,
                            parameters: [],
                        },
                    },
                    commandsResponse: {},
                },
            ),
            deviceAddCustomCluster(
                'hvacUserInterfaceCfg',
                {
                    ID: 0x204,
                    attributes: {
                        displayOrientation: {
                            ID: 0x400b,
                            type: Zcl.DataType.UINT8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        displayedTemperature: {
                            ID: 0x4039,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        displayOntime: {
                            ID: 0x403a,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                        displayBrightness: {
                            ID: 0x403b,
                            type: Zcl.DataType.ENUM8,
                            manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                        },
                    },
                    commands: {},
                    commandsResponse: {},
                },
            ),
            enumLookup({
                name: 'operating_mode',
                cluster: 'hvacThermostat',
                attribute: 'operatingMode',
                description: 'Sets Bosch-specific operating mode (overrides system mode)',
                lookup: {'schedule': 0, 'manual': 1, 'pause': 5},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            binary({
                name: 'window_detection',
                cluster: 'hvacThermostat',
                attribute: 'windowDetection',
                description: 'Enable/disable window open (Lo.) mode',
                valueOn: ['ON', 0x01],
                valueOff: ['OFF', 0x00],
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            binary({
                name: 'boost_heating',
                cluster: 'hvacThermostat',
                attribute: 'boostHeating',
                description: 'Activate boost heating',
                valueOn: ['ON', 0x01],
                valueOff: ['OFF', 0x00],
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            binary({
                name: 'child_lock',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'keypadLockout',
                description: 'Enables/disables physical input on the device',
                valueOn: ['LOCK', 0x01],
                valueOff: ['UNLOCK', 0x00],
            }),
            numeric({
                name: 'display_ontime',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'displayOntime',
                description: 'Sets the display on-time',
                valueMin: 5,
                valueMax: 30,
                unit: 's',
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
            numeric({
                name: 'display_brightness',
                cluster: 'hvacUserInterfaceCfg',
                attribute: 'displayBrightness',
                description: 'Sets brightness of the display',
                valueMin: 0,
                valueMax: 10,
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH},
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msRelativeHumidity', 'hvacThermostat', 'hvacUserInterfaceCfg',
            ]);
            await reporting.humidity(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {
                min: constants.repInterval.SECONDS_10,
                max: constants.repInterval.HOUR,
                change: 50,
            });
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint, {
                min: constants.repInterval.SECONDS_10,
                max: constants.repInterval.HOUR,
                change: 50,
            });
            await reporting.thermostatKeypadLockMode(endpoint);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'operatingMode',
                minimumReportInterval: constants.repInterval.SECONDS_10,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }], manufacturerOptions);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'boostHeating',
                minimumReportInterval: constants.repInterval.SECONDS_10,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }], manufacturerOptions);
            await endpoint.read('hvacThermostat', ['localTemperatureCalibration']);
            await endpoint.read('hvacThermostat', ['operatingMode', 'windowDetection', 'boostHeating'], manufacturerOptions);
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
            await endpoint.read('hvacUserInterfaceCfg', ['displayOntime', 'displayBrightness'], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ['Champion'],
        model: '8750001213',
        vendor: 'Bosch',
        description: 'Twinguard',
        fromZigbee: [
            fzLocal.bosch_twinguard_measurements,
            fzLocal.bosch_twinguard_sensitivity,
            fzLocal.bosch_twinguard_pre_alarm,
            fzLocal.bosch_twinguard_alarm_state,
            fzLocal.bosch_twinguard_smoke_alarm_state,
            fzLocal.bosch_twinguard_heartbeat,
        ],
        toZigbee: [
            tzLocal.bosch_twinguard,
        ],
        configure: async (device, coordinatorEndpoint) => {
            const coordinatorEndpointB = coordinatorEndpoint.getDevice().getEndpoint(1);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpointB, ['genAlarms']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpointB, ['genPollCtrl']);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpointB, ['manuSpecificBosch']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpointB, ['manuSpecificBosch3']);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpointB, ['manuSpecificBosch5']);
            await reporting.bind(device.getEndpoint(12), coordinatorEndpointB, ['manuSpecificBosch7']);
            await reporting.bind(device.getEndpoint(12), coordinatorEndpointB, ['manuSpecificBosch8']);
            await device.getEndpoint(1).read('manuSpecificBosch5', ['unknown_attribute'], manufacturerOptions); // Needed for pairing
            await device.getEndpoint(12).command('manuSpecificBosch7', 'pairingCompleted', manufacturerOptions); // Needed for pairing
            await device.getEndpoint(1).write('manuSpecificBosch', {sensitivity: 0x0002}, manufacturerOptions); // Setting defaults
            await device.getEndpoint(1).write('manuSpecificBosch5', {pre_alarm: 0x01}, manufacturerOptions); // Setting defaults
            await device.getEndpoint(12).write('manuSpecificBosch7', {heartbeat: 0x01}, manufacturerOptions); // Setting defaults
            await device.getEndpoint(1).read('manuSpecificBosch', ['sensitivity'], manufacturerOptions);
            await device.getEndpoint(1).read('manuSpecificBosch5', ['pre_alarm'], manufacturerOptions);
            await device.getEndpoint(12).read('manuSpecificBosch7', ['heartbeat'], manufacturerOptions);
        },
        exposes: [
            e.smoke(),
            e.temperature().withValueMin(0).withValueMax(65).withValueStep(0.1),
            e.humidity().withValueMin(0).withValueMax(100).withValueStep(0.1),
            e.voc().withValueMin(0).withValueMax(35610).withValueStep(1),
            e.co2().withValueMin(500).withValueMax(5500).withValueStep(1),
            e.aqi().withValueMin(0).withValueMax(500).withValueStep(1),
            e.illuminance_lux(),
            e.battery(),
            e.enum('alarm', ea.ALL, Object.keys(sirenState)).withDescription('Mode of the alarm (sound effect)'),
            e.text('siren_state', ea.STATE).withDescription('Siren state'),
            e.binary('self_test', ea.ALL, true, false).withDescription('Initiate self-test'),
            e.enum('sensitivity', ea.ALL, Object.keys(smokeSensitivity)).withDescription('Sensitivity of the smoke alarm'),
            e.binary('pre_alarm', ea.ALL, 'ON', 'OFF').withDescription('Enable/disable pre-alarm'),
            e.binary('heartbeat', ea.ALL, 'ON', 'OFF').withDescription('Enable/disable heartbeat'),
        ],
    },
    {
        zigbeeModel: ['RFPR-ZB-SH-EU'],
        model: 'RFPR-ZB-SH-EU',
        vendor: 'Bosch',
        description: 'Wireless motion detector',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['RBSH-SP-ZB-EU', 'RBSH-SP-ZB-FR', 'RBSH-SP-ZB-GB'],
        model: 'BSP-FZ2',
        vendor: 'Bosch',
        description: 'Plug compact EU',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fz.power_on_behavior, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genOnOff', ['onOff', 'startUpOnOff']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 1]});
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint);
        },
        exposes: [e.switch(), e.power_on_behavior(), e.power(), e.energy()],
        whiteLabel: [
            {vendor: 'Bosch', model: 'BSP-EZ2', description: 'Plug compact FR', fingerprint: [{modelID: 'RBSH-SP-ZB-FR'}]},
            {vendor: 'Bosch', model: 'BSP-GZ2', description: 'Plug compact UK', fingerprint: [{modelID: 'RBSH-SP-ZB-GB'}]},
        ],
    },
    {
        zigbeeModel: ['RBSH-SWD-ZB'],
        model: 'BSEN-C2',
        vendor: 'Bosch',
        description: 'Door/window contact II',
        fromZigbee: [
            fz.battery,
            fzLocal.bosch_contact,
        ],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg',
                'genPollCtrl',
            ]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [
            e.battery(),
            e.battery_low(),
            e.contact(),
            e.action(['single', 'long']),
        ],
    },
    {
        zigbeeModel: ['RBSH-SWDV-ZB'],
        model: 'BSEN-CV',
        vendor: 'Bosch',
        description: 'Door/window contact II plus',
        fromZigbee: [
            fz.battery,
            fzLocal.bosch_contact,
        ],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg',
                'genPollCtrl',
            ]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [
            e.battery(),
            e.battery_low(),
            e.contact(),
            e.vibration(),
            e.action(['single', 'long']),
        ],
    },
    {
        zigbeeModel: ['RBSH-MMD-ZB-EU'],
        model: 'BMCT-DZ',
        vendor: 'Bosch',
        description: 'Phase-cut dimmer',
        ota: ota.zigbeeOTA,
        extend: [identify(), light({configureReporting: true, effect: false})],
    },
    {
        zigbeeModel: ['RBSH-MMR-ZB-EU'],
        model: 'BMCT-RZ',
        vendor: 'Bosch',
        description: 'Relay, potential free',
        extend: [onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['RBSH-MMS-ZB-EU'],
        model: 'BMCT-SLZ',
        vendor: 'Bosch',
        description: 'Light/shutter control unit II',
        fromZigbee: [
            fz.on_off,
            fz.power_on_behavior,
            fz.cover_position_tilt,
            fzLocal.bmct,
        ],
        toZigbee: [
            tz.power_on_behavior,
            tz.cover_position_tilt,
            tzLocal.bmct,
        ],
        meta: {
            multiEndpoint: true,
        },
        endpoint: (device) => {
            return {'left': 2, 'right': 3};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genIdentify', 'closuresWindowCovering', 'manuSpecificBosch10']);
            await reporting.currentPositionLiftPercentage(endpoint1);
            await endpoint1.read('manuSpecificBosch10', ['deviceMode', 'switchType',
                'calibrationOpeningTime', 'calibrationClosingTime', 'childLock', 'motorState']).catch((e) => {});
            const endpoint2 = device.getEndpoint(2);
            await endpoint2.read('manuSpecificBosch10', ['childLock']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genIdentify', 'genOnOff']).catch((e) => {});
            await reporting.onOff(endpoint2);
            const endpoint3 = device.getEndpoint(3);
            await endpoint3.read('manuSpecificBosch10', ['childLock']).catch((e) => {});
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genIdentify', 'genOnOff']);
            await reporting.onOff(endpoint3);
        },
        exposes: (device, options) => {
            const commonExposes = [
                e.enum('switch_type', ea.ALL, Object.keys(stateSwitchType))
                    .withDescription('Module controlled by a rocker switch or a button'),
                e.linkquality(),
            ];
            const lightExposes = [
                e.switch().withEndpoint('left'),
                e.switch().withEndpoint('right'),
                e.power_on_behavior().withEndpoint('right'),
                e.power_on_behavior().withEndpoint('left'),
                e.binary('child_lock', ea.ALL, 'ON', 'OFF').withEndpoint('left')
                    .withDescription('Enable/Disable child lock'),
                e.binary('child_lock', ea.ALL, 'ON', 'OFF').withEndpoint('right')
                    .withDescription('Enable/Disable child lock'),
            ];
            const coverExposes = [
                e.cover_position(),
                e.enum('motor_state', ea.STATE, Object.keys(stateMotor))
                    .withDescription('Shutter motor actual state '),
                e.binary('child_lock', ea.ALL, 'ON', 'OFF').withDescription('Enable/Disable child lock'),
                e.numeric('calibration', ea.ALL).withUnit('s').withEndpoint('closing_time')
                    .withDescription('Calibration closing time').withValueMin(1).withValueMax(90),
                e.numeric('calibration', ea.ALL).withUnit('s').withEndpoint('opening_time')
                    .withDescription('Calibration opening time').withValueMin(1).withValueMax(90),
            ];

            if (device) {
                const deviceModeKey = device.getEndpoint(1).getClusterAttributeValue('manuSpecificBosch10', 'deviceMode');
                const deviceMode = Object.keys(stateDeviceMode).find((key) => stateDeviceMode[key] === deviceModeKey);

                if (deviceMode === 'light') {
                    return [...commonExposes, ...lightExposes];
                } else if (deviceMode === 'shutter') {
                    return [...commonExposes, ...coverExposes];
                }
            }
            return [e.enum('device_mode', ea.ALL, Object.keys(stateDeviceMode)).withDescription('Device mode'),
                e.linkquality()];
        },
    },
    {
        zigbeeModel: ['RBSH-US4BTN-ZB-EU'],
        model: 'BHI-US',
        vendor: 'Bosch',
        description: 'Universal Switch II',
        ota: ota.zigbeeOTA,
        fromZigbee: [fzLocal.bhius_button_press, fzLocal.bhius_config, fz.battery],
        toZigbee: [tzLocal.bhius_config],
        exposes: [
            e.battery_low(),
            e.battery_voltage(),
            e.text('config_led_top_left_press', ea.ALL).withLabel('LED config (top left short press)')
                .withDescription(labelShortPress)
                .withCategory('config'),
            e.text('config_led_top_right_press', ea.ALL).withLabel('LED config (top right short press)')
                .withDescription(labelShortPress)
                .withCategory('config'),
            e.text('config_led_bottom_left_press', ea.ALL).withLabel('LED config (bottom left short press)')
                .withDescription(labelShortPress)
                .withCategory('config'),
            e.text('config_led_bottom_right_press', ea.ALL).withLabel('LED config (bottom right short press)')
                .withDescription(labelShortPress)
                .withCategory('config'),
            e.text('config_led_top_left_longpress', ea.ALL).withLabel('LED config (top left long press)')
                .withDescription(labelLongPress)
                .withCategory('config'),
            e.text('config_led_top_right_longpress', ea.ALL).withLabel('LED config (top right long press)')
                .withDescription(labelLongPress)
                .withCategory('config'),
            e.text('config_led_bottom_left_longpress', ea.ALL).withLabel('LED config (bottom left long press)')
                .withDescription(labelLongPress)
                .withCategory('config'),
            e.text('config_led_bottom_right_longpress', ea.ALL).withLabel('LED config (bottom right long press)')
                .withDescription(labelLongPress)
                .withCategory('config'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);

            // Read default LED configuration
            await endpoint.read('manuSpecificBosch9', [0x0010, 0x0011, 0x0012, 0x0013], {...manufacturerOptions, sendPolicy: 'immediate'})
                .catch((error) => {});
            await endpoint.read('manuSpecificBosch9', [0x0020, 0x0021, 0x0022, 0x0023], {...manufacturerOptions, sendPolicy: 'immediate'})
                .catch((error) => {});

            // We also have to read this one. Value reads 0x0f, looks like a bitmap
            await endpoint.read('manuSpecificBosch9', [0x0024], {...manufacturerOptions, sendPolicy: 'immediate'});

            await endpoint.command('manuSpecificBosch9', 'pairingCompleted', {data: Buffer.from([0x00])}, {sendPolicy: 'immediate'});

            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genBasic', 'manuSpecificBosch9']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
