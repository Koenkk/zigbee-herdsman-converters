import {Zcl} from 'zigbee-herdsman';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
import * as constants from '../lib/constants';
import * as ota from '../lib/ota';
import {Tz, Fz, Definition, KeyValue} from '../lib/types';
const e = exposes.presets;
const ea = exposes.access;

// Radiator Thermostat II
const boschManufacturer = {manufacturerCode: 0x1209};

// BMCT
const stateDeviceType = {
    'light': 0x04,
    'shutter': 0x01,
};
// BMCT
const stateMotor = {
    'idle': 0x00,
    'opening': 0x02,
    'closing': 0x01,
};
// BMCT
const stateSwitchType = {
    'button': 0x01,
    'button_key_change': 0x02,
    'rocker_switch': 0x03,
    'rocker_rwitch_key_change': 0x04,
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
const operatingModes = {
    'automatic': 0,
    'manual': 1,
    'pause': 5,
};

// Radiator Thermostat II
const stateOffOn = {
    'OFF': 0,
    'ON': 1,
};

// Radiator Thermostat II
const displayOrientation = {
    'normal': 0,
    'flipped': 1,
};

// Radiator Thermostat II
const displayedTemperature = {
    'target': 0,
    'measured': 1,
};

// Radiator Thermostat II
const tzLocal = {
    bmct: {
        key: [
            'device_type',
            'switch_type',
            'child_lock', 'child_lock_left', 'child_lock_right',
            'calibration_closing_time', 'calibration_opening_time',
            'state',
        ],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'state') {
                utils.assertString(value, 'state');
                const state = value.toLowerCase();
                utils.validateValue(state, ['toggle', 'off', 'on', 'open', 'close', 'stop']);
                if ( state === 'on' || state === 'off' || state === 'toggle') {
                    await entity.command('genOnOff', state, {}, utils.getOptions(meta.mapped, entity));
                    if (state === 'toggle') {
                        const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`];
                        return currentState ? {state: {state: currentState === 'OFF' ? 'ON' : 'OFF'}} : {};
                    } else {
                        return {state: {state: state.toUpperCase()}};
                    }
                } else if ( state === 'open' || state === 'close' || state === 'stop') {
                    const lookup = {'open': 'upOpen', 'close': 'downClose', 'stop': 'stop', 'on': 'upOpen', 'off': 'downClose'};
                    await entity.command('closuresWindowCovering', utils.getFromLookup(value, lookup), {}, utils.getOptions(meta.mapped, entity));
                }
            }
            if (key === 'device_type') {
                const index = utils.getFromLookup(value, stateDeviceType);
                await entity.write(0xFCA0, {0x0000: {value: index, type: 0x30}}, boschManufacturer);
                return {state: {device_type: value}};
            }
            if (key === 'switch_type') {
                const index = utils.getFromLookup(value, stateSwitchType);
                await entity.write(0xFCA0, {0x0001: {value: index, type: 0x30}}, boschManufacturer);
                return {state: {switch_type: value}};
            }
            if (key === 'child_lock') {
                const index = utils.getFromLookup(value, stateOffOn);
                await entity.write(0xFCA0, {0x0008: {value: index, type: 0x10}}, boschManufacturer);
                return {state: {child_lock: value}};
            }
            if (key === 'calibration_closing_time') {
                const number = utils.toNumber(value, 'calibration_closing_time');
                const index = number *10;
                await entity.write(0xFCA0, {0x0002: {value: index, type: 0x23}}, boschManufacturer);
                return {state: {calibration_closing_time: number}};
            }
            if (key === 'calibration_opening_time') {
                const number = utils.toNumber(value, 'calibration_opening_time');
                const index = number *10;
                await entity.write(0xFCA0, {0x0003: {value: index, type: 0x23}}, boschManufacturer);
                return {state: {calibration_opening_time: number}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'state':
                await entity.read('genOnOff', ['onOff']);
                break;
            case 'device_type':
                await entity.read(0xFCA0, [0x0000], boschManufacturer);
                break;
            case 'switch_type':
                await entity.read(0xFCA0, [0x0001], boschManufacturer);
                break;
            case 'child_lock':
                await entity.read(0xFCA0, [0x0008], boschManufacturer);
                break;
            case 'calibration_closing_time':
                await entity.read(0xFCA0, [0x0002], boschManufacturer);
                break;
            case 'calibration_opening_time':
                await entity.read(0xFCA0, [0x0003], boschManufacturer);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bcmt.convertGet ${key}`);
            }
        },
    } as Tz.Converter,
    bwa1: {
        key: ['alarm_on_motion', 'test'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'alarm_on_motion') {
                const index = utils.getFromLookup(value, stateOffOn);
                await entity.write(0xFCAC, {0x0003: {value: index, type: 0x10}}, boschManufacturer);
                return {state: {alarm_on_motion: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'alarm_on_motion':
                await entity.read(0xFCAC, [0x0003], boschManufacturer);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bosch_twinguard.convertGet ${key}`);
            }
        },
    } as Tz.Converter,
    bosch_thermostat: {
        key: ['window_open', 'boost', 'system_mode', 'pi_heating_demand', 'remote_temperature'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'window_open') {
                const index = utils.getFromLookup(value, stateOffOn);
                await entity.write('hvacThermostat', {0x4042: {value: index, type: Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {window_open: value}};
            }
            if (key === 'boost') {
                const index = utils.getFromLookup(value, stateOffOn);
                await entity.write('hvacThermostat', {0x4043: {value: index, type: Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {boost: value}};
            }
            if (key === 'system_mode') {
                // Map system_mode (Off/Auto/Heat) to Bosch operating mode
                utils.assertString(value, 'system_mode');
                value = value.toLowerCase();

                let opMode = operatingModes.manual; // OperatingMode 1 = Manual (Default)

                if (value=='off') {
                    opMode = operatingModes.pause; // OperatingMode 5 = Pause
                } else if (value == 'auto') {
                    opMode = operatingModes.automatic; // OperatingMode 0 = Automatic
                }
                await entity.write('hvacThermostat', {0x4007: {value: opMode, type: Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {system_mode: value}};
            }
            if (key === 'pi_heating_demand') {
                await entity.write('hvacThermostat',
                    {0x4020: {value: value, type: Zcl.DataType.enum8}},
                    boschManufacturer);
                return {state: {pi_heating_demand: value}};
            }
            if (key === 'remote_temperature') {
                const number = utils.toNumber(value, 'remote_temperature');
                const remoteTemperature = Number((Math.round(Number((number * 2).toFixed(1))) / 2).toFixed(1)) * 100;
                await entity.write('hvacThermostat',
                    {0x4040: {value: remoteTemperature, type: Zcl.DataType.int16}}, boschManufacturer);
                return {state: {remote_temperature: number}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'window_open':
                await entity.read('hvacThermostat', [0x4042], boschManufacturer);
                break;
            case 'boost':
                await entity.read('hvacThermostat', [0x4043], boschManufacturer);
                break;
            case 'system_mode':
                await entity.read('hvacThermostat', [0x4007], boschManufacturer);
                break;
            case 'pi_heating_demand':
                await entity.read('hvacThermostat', [0x4020], boschManufacturer);
                break;
            case 'remote_temperature':
                await entity.read('hvacThermostat', [0x4040], boschManufacturer);
                break;

            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bosch_thermostat.convertGet ${key}`);
            }
        },
    } as Tz.Converter,
    bosch_userInterface: {
        key: ['display_orientation', 'display_ontime', 'display_brightness', 'child_lock', 'displayed_temperature'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'display_orientation') {
                const index = utils.getFromLookup(value, displayOrientation);
                await entity.write('hvacUserInterfaceCfg', {0x400b: {value: index, type: Zcl.DataType.uint8}}, boschManufacturer);
                return {state: {display_orientation: value}};
            }
            if (key === 'display_ontime') {
                await entity.write('hvacUserInterfaceCfg', {0x403a: {value: value, type: Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {display_onTime: value}};
            }
            if (key === 'display_brightness') {
                await entity.write('hvacUserInterfaceCfg', {0x403b: {value: value, type: Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {display_brightness: value}};
            }
            if (key === 'child_lock') {
                const keypadLockout = Number(value === 'LOCK');
                await entity.write('hvacUserInterfaceCfg', {keypadLockout});
                return {state: {child_lock: value}};
            }
            if (key === 'displayed_temperature') {
                const index = utils.getFromLookup(value, displayedTemperature);
                await entity.write('hvacUserInterfaceCfg', {0x4039: {value: index, type: Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {displayed_temperature: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'display_orientation':
                await entity.read('hvacUserInterfaceCfg', [0x400b], boschManufacturer);
                break;
            case 'display_ontime':
                await entity.read('hvacUserInterfaceCfg', [0x403a], boschManufacturer);
                break;
            case 'display_brightness':
                await entity.read('hvacUserInterfaceCfg', [0x403b], boschManufacturer);
                break;
            case 'child_lock':
                await entity.read('hvacUserInterfaceCfg', ['keypadLockout']);
                break;
            case 'displayed_temperature':
                await entity.read('hvacUserInterfaceCfg', [0x4039], boschManufacturer);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bosch_userInterface.convertGet ${key}`);
            }
        },
    } as Tz.Converter,
    bosch_twinguard: {
        key: ['sensitivity', 'pre_alarm', 'self_test', 'alarm', 'heartbeat'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'sensitivity') {
                const index = utils.getFromLookup(value, smokeSensitivity);
                await entity.write('manuSpecificBosch', {0x4003: {value: index, type: 0x21}}, boschManufacturer);
                return {state: {sensitivity: value}};
            }
            if (key === 'pre_alarm') {
                const index = utils.getFromLookup(value, stateOffOn);
                await entity.write('manuSpecificBosch5', {0x4001: {value: index, type: 0x18}}, boschManufacturer);
                return {state: {pre_alarm: value}};
            }
            if (key === 'heartbeat') {
                const endpoint = meta.device.getEndpoint(12);
                const index = utils.getFromLookup(value, stateOffOn);
                await endpoint.write('manuSpecificBosch7', {0x5005: {value: index, type: 0x18}}, boschManufacturer);
                return {state: {heartbeat: value}};
            }
            if (key === 'self_test') {
                if (value) {
                    await entity.command('manuSpecificBosch', 'initiateTestMode', boschManufacturer);
                }
            }
            if (key === 'alarm') {
                const endpoint = meta.device.getEndpoint(12);
                const index = utils.getFromLookup(value, sirenState);
                utils.assertEndpoint(entity);
                if (index == 0) {
                    await entity.commandResponse('genAlarms', 'alarm', {alarmcode: 0x16, clusterid: 0xe000}, {direction: 1});
                    await entity.commandResponse('genAlarms', 'alarm', {alarmcode: 0x14, clusterid: 0xe000}, {direction: 1});
                    await endpoint.command('manuSpecificBosch8', 'burglarAlarm', {data: 0}, boschManufacturer);
                } else if (index == 1) {
                    await entity.commandResponse('genAlarms', 'alarm', {alarmcode: 0x11, clusterid: 0xe000}, {direction: 1});
                    return {state: {siren_state: 'pre-alarm'}};
                } else if (index == 2) {
                    await entity.commandResponse('genAlarms', 'alarm', {alarmcode: 0x10, clusterid: 0xe000}, {direction: 1});
                    return {state: {siren_state: 'fire'}};
                } else if (index == 3) {
                    await endpoint.command('manuSpecificBosch8', 'burglarAlarm', {data: 1}, boschManufacturer);
                }
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'sensitivity':
                await entity.read('manuSpecificBosch', [0x4003], boschManufacturer);
                break;
            case 'pre_alarm':
                await entity.read('manuSpecificBosch5', [0x4001], boschManufacturer);
                break;
            case 'heartbeat':
                await meta.device.getEndpoint(12).read('manuSpecificBosch7', [0x5005], boschManufacturer);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bosch_twinguard.convertGet ${key}`);
            }
        },
    } as Tz.Converter,
};


const fzLocal = {
    bmct: {
        cluster: '64672',
        type: ['attributeReport', 'readResponse'],
        options: [],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x0000)) {
                result.device_type = (Object.keys(stateDeviceType)[msg.data[0x0000]]);
            } else if (data.hasOwnProperty(0x0001)) {
                result.switch_type = (Object.keys(stateSwitchType)[msg.data[0x0001]]);
            } else if (data.hasOwnProperty(0x0002)) {
                result.calibration_closing_time = msg.data[0x0002];
            } else if (data.hasOwnProperty(0x0003)) {
                result.calibration_opening_time = msg.data[0x0003];
            } else if (data.hasOwnProperty(0x0013)) {
                result.motor_state = (Object.keys(stateMotor)[msg.data[0x0013]]);
            }
            return result;
        },
    } as Fz.Converter,
    bwa1_alarm_on_motion: {
        cluster: '64684',
        type: ['attributeReport', 'readResponse'],
        options: [],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x0003)) {
                result.alarm_on_motion = (Object.keys(stateOffOn)[msg.data[0x0003]]);
            }
            return result;
        },
    } as Fz.Converter,
    bosch_contact: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            const lookup: KeyValue = {0: 'none', 1: 'single', 2: 'long'};
            const result = {
                contact: !((zoneStatus & 1) > 0),
                battery_low: (zoneStatus & 1<<3) > 0,
                action: lookup[(zoneStatus >> 11) & 3],
            };
            if (result.action === 'none') delete result.action;
            return result;
        },
    } as Fz.Converter,
    bosch_ignore_dst: {
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
    } as Fz.Converter,
    bosch_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x4040)) {
                result.remote_temperature = utils.precisionRound(data[0x4040], 2) / 100;
            }
            if (data.hasOwnProperty(0x4042)) {
                result.window_open = (Object.keys(stateOffOn)[data[0x4042]]);
            }
            if (data.hasOwnProperty(0x4043)) {
                result.boost = (Object.keys(stateOffOn)[data[0x4043]]);
            }
            if (data.hasOwnProperty(0x4007)) {
                const opModes: KeyValue = {0: 'auto', 1: 'heat', 2: 'unknown_2', 3: 'unknown_3', 4: 'unknown_4', 5: 'off'};
                result.system_mode = opModes[data[0x4007]];
            }
            if (data.hasOwnProperty(0x4020)) {
                const demand = data[0x4020] as number;
                result.pi_heating_demand = demand;
                result.running_state = demand >= 10 ? 'heat' : 'idle';
            }

            return result;
        },
    } as Fz.Converter,
    bosch_userInterface: {
        cluster: 'hvacUserInterfaceCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x400b)) {
                result.display_orientation = (Object.keys(displayOrientation)[data[0x400b]]);
            }
            if (data.hasOwnProperty(0x4039)) {
                result.displayed_temperature = (Object.keys(displayedTemperature)[data[0x4039]]);
            }
            if (data.hasOwnProperty(0x403a)) {
                result.display_ontime = data[0x403a];
            }
            if (data.hasOwnProperty(0x403b)) {
                result.display_brightness = data[0x403b];
            }
            if (data.hasOwnProperty('keypadLockout')) {
                result.child_lock = (data['keypadLockout'] == 1 ? 'LOCK' : 'UNLOCK');
            }

            return result;
        },
    } as Fz.Converter,
    bosch_twinguard_sensitivity: {
        cluster: 'manuSpecificBosch',
        type: ['attributeReport', 'readResponse'],
        options: [],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty(0x4003)) {
                result.sensitivity = (Object.keys(smokeSensitivity)[msg.data[0x4003]]);
            }
            return result;
        },
    } as Fz.Converter,
    bosch_twinguard_measurements: {
        cluster: 'manuSpecificBosch3',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.precision('temperature'), exposes.options.calibration('temperature'),
            exposes.options.precision('humidity'), exposes.options.calibration('humidity'),
            exposes.options.calibration('illuminance_lux', 'percentual')],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('humidity')) {
                result.humidity = utils.calibrateAndPrecisionRoundOptions(msg.data['humidity'] / 100.0, options, 'humidity');
            }
            if (msg.data.hasOwnProperty('airpurity')) {
                result.co2 = msg.data['airpurity'] * 10.0 + 500.0;
            }
            if (msg.data.hasOwnProperty('temperature')) {
                result.temperature = utils.calibrateAndPrecisionRoundOptions(msg.data['temperature'] / 100.0, options, 'temperature');
            }
            if (msg.data.hasOwnProperty('illuminance_lux')) {
                result.illuminance_lux = utils.calibrateAndPrecisionRoundOptions(
                    msg.data['illuminance_lux'] / 2.0, options, 'illuminance_lux');
            }
            if (msg.data.hasOwnProperty('battery')) {
                result.battery = msg.data['battery'] / 2.0;
            }
            return result;
        },
    } as Fz.Converter,
    bosch_twinguard_pre_alarm: {
        cluster: 'manuSpecificBosch5',
        type: ['attributeReport', 'readResponse'],
        options: [],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('pre_alarm')) {
                result.pre_alarm = (Object.keys(stateOffOn)[msg.data['pre_alarm']]);
            }
            return result;
        },
    } as Fz.Converter,
    bosch_twinguard_heartbeat: {
        cluster: 'manuSpecificBosch7',
        type: ['attributeReport', 'readResponse'],
        options: [],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('heartbeat')) {
                result.heartbeat = (Object.keys(stateOffOn)[msg.data['heartbeat']]);
            }
            return result;
        },
    } as Fz.Converter,
    bosch_twinguard_alarm_state: {
        cluster: 'manuSpecificBosch8',
        type: ['attributeReport', 'readResponse'],
        options: [],
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
    } as Fz.Converter,
    bosch_twinguard_smoke_alarm_state: {
        cluster: 'genAlarms',
        type: ['commandAlarm', 'readResponse'],
        options: [],
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
    } as Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['RBSH-WS-ZB-EU'],
        model: 'BWA-1',
        vendor: 'Bosch',
        description: 'Zigbee smart water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery, fzLocal.bwa1_alarm_on_motion],
        toZigbee: [tzLocal.bwa1],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 64684]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
            await endpoint.configureReporting(0xFCAC, [{
                attribute: {ID: 0x0003, type: Zcl.DataType.boolean},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);
        },
        exposes: [
            e.water_leak(), e.battery(), e.tamper(),
            e.binary('alarm_on_motion', ea.ALL, 'ON', 'OFF').withDescription('Enable/Disable sound alarm on motion'),
        ],
    },
    {
        zigbeeModel: ['RBSH-SD-ZB-EU'],
        model: 'BSD-2',
        vendor: 'Bosch',
        description: 'Smoke alarm detector',
        fromZigbee: [fz.battery, fz.ias_smoke_alarm_1],
        toZigbee: [],
        meta: {},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 64684]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.smoke(), e.battery(), e.battery_low(), e.test()],
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
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
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
        configure: async (device, coordinatorEndpoint, logger) => {
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
        fromZigbee: [
            fz.thermostat,
            fz.battery,
            fzLocal.bosch_ignore_dst,
            fzLocal.bosch_thermostat,
            fzLocal.bosch_userInterface,
        ],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_keypad_lockout,
            tzLocal.bosch_thermostat,
            tzLocal.bosch_userInterface,
        ],
        exposes: [
            e.climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperatureCalibration(-5, 5, 0.1)
                .withSystemMode(['off', 'heat', 'auto'])
                .withPiHeatingDemand(ea.ALL)
                .withRunningState(['idle', 'heat'], ea.STATE),
            e.binary('boost', ea.ALL, 'ON', 'OFF')
                .withDescription('Activate Boost heating'),
            e.binary('window_open', ea.ALL, 'ON', 'OFF')
                .withDescription('Window open'),
            e.enum('display_orientation', ea.ALL, Object.keys(displayOrientation))
                .withDescription('Display orientation'),
            e.numeric('remote_temperature', ea.ALL)
                .withValueMin(0)
                .withValueMax(30)
                .withValueStep(0.1)
                .withUnit('°C')
                .withDescription('Input for remote temperature sensor. ' +
                    'Setting this will disable the internal temperature sensor until batteries are removed!'),
            e.numeric('display_ontime', ea.ALL)
                .withValueMin(5)
                .withValueMax(30)
                .withDescription('Specifies the diplay On-time'),
            e.numeric('display_brightness', ea.ALL)
                .withValueMin(0)
                .withValueMax(10)
                .withDescription('Specifies the brightness value of the display'),
            e.enum('displayed_temperature', ea.ALL, Object.keys(displayedTemperature))
                .withDescription('Temperature displayed on the thermostat'),
            e.child_lock().setAccess('state', ea.ALL),
            e.battery(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat', 'hvacUserInterfaceCfg']);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);

            // report operating_mode (system_mode)
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4007, type: Zcl.DataType.enum8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);
            // report pi_heating_demand (valve opening)
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4020, type: Zcl.DataType.enum8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);
            // report window_open
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4042, type: Zcl.DataType.enum8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);
            // report boost as it's disabled by thermostat after 5 minutes
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4043, type: Zcl.DataType.enum8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);

            await endpoint.read('hvacThermostat', ['localTemperatureCalibration']);
            await endpoint.read('hvacThermostat', [0x4007, 0x4020, 0x4040, 0x4042, 0x4043], boschManufacturer);

            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
            await endpoint.read('hvacUserInterfaceCfg', [0x400b, 0x4039, 0x403a, 0x403b], boschManufacturer);
        },
    },
    {
        zigbeeModel: ['RBSH-RTH0-BAT-ZB-EU'],
        model: 'BTH-RM',
        vendor: 'Bosch',
        description: 'Room thermostat II',
        fromZigbee: [fz.humidity, fz.thermostat, fz.battery, fzLocal.bosch_thermostat, fzLocal.bosch_userInterface],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature, tz.thermostat_keypad_lockout, tzLocal.bosch_thermostat, tzLocal.bosch_userInterface],
        exposes: [
            e.numeric('humidity', ea.STATE).withUnit('%').withDescription('Measured relative humidity'),
            e.climate()
                .withLocalTemperature()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperatureCalibration(-12, 12, 0.5)
                .withSystemMode(['off', 'heat', 'auto']),
            e.binary('window_open', ea.ALL, 'ON', 'OFF').withDescription('Window open'),
            e.child_lock().setAccess('state', ea.ALL),
            e.numeric('display_ontime', ea.ALL).withValueMin(5).withValueMax(30).withDescription('Specifies the diplay On-time'),
            e.numeric('display_brightness', ea.ALL).withValueMin(0).withValueMax(10).withDescription('Specifies the brightness value of the display'),
            e.battery_low(), e.battery_voltage(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat', 'hvacUserInterfaceCfg']);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.humidity(endpoint);
            await endpoint.read('hvacThermostat', ['localTemperatureCalibration']);
            await endpoint.read('hvacThermostat', [0x4007, 0x4042, 0x4043], boschManufacturer);
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
            await endpoint.read('hvacUserInterfaceCfg', [0x400b, 0x403a, 0x403b], boschManufacturer);
        },
    },
    {
        zigbeeModel: ['Champion'],
        model: '8750001213',
        vendor: 'Bosch',
        description: 'Twinguard',
        fromZigbee: [fzLocal.bosch_twinguard_measurements, fzLocal.bosch_twinguard_sensitivity,
            fzLocal.bosch_twinguard_pre_alarm, fzLocal.bosch_twinguard_alarm_state, fzLocal.bosch_twinguard_smoke_alarm_state,
            fzLocal.bosch_twinguard_heartbeat],
        toZigbee: [tzLocal.bosch_twinguard],
        configure: async (device, coordinatorEndpoint, logger) => {
            const coordinatorEndpointB = coordinatorEndpoint.getDevice().getEndpoint(1);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpointB, [0x0009]);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpointB, [0x0019]);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpointB, [0x0020]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpointB, [0xe000]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpointB, [0xe002]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpointB, [0xe004]);
            await reporting.bind(device.getEndpoint(12), coordinatorEndpointB, [0xe006]);
            await reporting.bind(device.getEndpoint(12), coordinatorEndpointB, [0xe007]);
            await device.getEndpoint(1).read('manuSpecificBosch5', ['unknown_attribute'], boschManufacturer); // Needed for pairing
            await device.getEndpoint(12).command('manuSpecificBosch7', 'pairingCompleted', boschManufacturer); // Needed for pairing
            await device.getEndpoint(1).write('manuSpecificBosch',
                {0x4003: {value: 0x0002, type: 0x21}}, boschManufacturer); // Setting defaults
            await device.getEndpoint(1).write('manuSpecificBosch5',
                {0x4001: {value: 0x01, type: 0x18}}, boschManufacturer); // Setting defaults
            await device.getEndpoint(12).write('manuSpecificBosch7',
                {0x5005: {value: 0x01, type: 0x18}}, boschManufacturer); // Setting defaults
            await device.getEndpoint(1).read('manuSpecificBosch', ['sensitivity'], boschManufacturer);
            await device.getEndpoint(1).read('manuSpecificBosch5', ['pre_alarm'], boschManufacturer);
            await device.getEndpoint(12).read('manuSpecificBosch7', ['heartbeat'], boschManufacturer);
        },
        exposes: [
            e.smoke(), e.temperature(), e.humidity(), e.co2(), e.illuminance_lux(), e.battery(),
            e.enum('alarm', ea.ALL, Object.keys(sirenState)).withDescription('Mode of the alarm (sound effect)'),
            e.text('siren_state', ea.STATE).withDescription('Siren state'),
            e.binary('self_test', ea.ALL, true, false).withDescription('Initiate self-test'),
            e.enum('sensitivity', ea.ALL, Object.keys(smokeSensitivity)).withDescription('Sensitivity of the smoke alarm'),
            e.enum('pre_alarm', ea.ALL, Object.keys(stateOffOn)).withDescription('Enable/disable pre-alarm'),
            e.enum('heartbeat', ea.ALL, Object.keys(stateOffOn)).withDescription('Enable/disable heartbeat'),
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
        configure: async (device, coordinatorEndpoint, logger) => {
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
        configure: async (device, coordinatorEndpoint, logger) => {
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
        fromZigbee: [fzLocal.bosch_contact],
        toZigbee: [],
        exposes: [e.battery_low(), e.contact(), e.action(['single', 'long'])],
    },
    {
        zigbeeModel: ['RBSH-MMS-ZB-EU'],
        model: 'BMCT-SLZ',
        vendor: 'Bosch',
        description: 'Light/shutter control unit II',
        fromZigbee: [fzLocal.bmct, fz.cover_position_tilt, fz.on_off, fz.power_on_behavior],
        toZigbee: [tzLocal.bmct, tz.cover_position_tilt, tz.on_off, tz.power_on_behavior],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 2, 'right': 3};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genIdentify', 'closuresWindowCovering', 64672]);
            await endpoint1.unbind('genOnOff', coordinatorEndpoint);
            await endpoint1.read(64672, [0x0000, 0x0001, 0x0002, 0x0003, 0x0008, 0x0013], boschManufacturer);
            const endpoint2 = device.getEndpoint(2);
            await endpoint2.read(64672, [0x0008], boschManufacturer);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genIdentify', 'genOnOff']);
            await reporting.onOff(endpoint2);
            const endpoint3 = device.getEndpoint(3);
            await endpoint3.read(64672, [0x0008], boschManufacturer);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genIdentify', 'genOnOff']);
            await reporting.onOff(endpoint3);
        },
        exposes: [
            // light
            e.enum('device_type', ea.ALL, Object.keys(stateDeviceType))
                .withDescription('Device type: '),
            e.enum('switch_type', ea.ALL, Object.keys(stateSwitchType))
                .withDescription('Module controlled by a rocker switch or a button'),
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.power_on_behavior().withEndpoint('right'),
            e.power_on_behavior().withEndpoint('left'),
            e.binary('child_lock', ea.ALL, 'ON', 'OFF').withEndpoint('left')
                .withDescription('Enable/Disable child lock'),
            e.binary('child_lock', ea.ALL, 'ON', 'OFF').withEndpoint('right')
                .withDescription('Enable/Disable child lock'),
            // cover
            e.cover_position().setAccess('state', ea.ALL),
            e.enum('motor_state', ea.STATE, Object.keys(stateMotor))
                .withDescription('Shutter motor actual state '),
            e.binary('child_lock', ea.ALL, 'ON', 'OFF').withDescription('Enable/Disable child lock'),
            e.numeric('calibration_closing_time', ea.ALL).withUnit('S')
                .withDescription('Calibration opening time').withValueMin(1).withValueMax(90),
            e.numeric('calibration_opening_time', ea.ALL).withUnit('S')
                .withDescription('Calibration closing time').withValueMin(1).withValueMax(90),
        ],
    },
];

module.exports = definitions;
