import {Buffer} from 'node:buffer';
import {
    batteryVoltageToPercentage,
    postfixWithEndpointName,
    precisionRound,
    assertNumber,
    getFromLookup,
    getKey,
    printNumbersAsHexSequence,
    toNumber,
    assertEndpoint,
    assertString,
    hasAlreadyProcessedMessage,
    isLegacyEnabled,
    noOccupancySince,
    isObject,
    isString,
    getOptions,
    assertObject,
    calibrateAndPrecisionRoundOptions,
} from './utils';

import * as ota from './ota';
import fz from '../converters/fromZigbee';
import * as globalStore from './store';
import {
    Fz, Definition, KeyValue, KeyValueAny, Tz, ModernExtend, Range,
    KeyValueNumberString, OnEvent, Expose, Configure,
} from './types';
import * as modernExtend from './modernExtend';
import * as exposes from './exposes';
import {logger} from './logger';

const NS = 'zhc:lumi';
const legacyFromZigbeeStore: KeyValueAny = {};
const e = exposes.presets;
const ea = exposes.access;

declare type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface TrvScheduleConfigEvent {
    time: number;
    temperature: number;
}

export interface TrvScheduleConfig {
    days: Day[];
    events: TrvScheduleConfigEvent[];
}

export const buffer2DataObject = (model: Definition, buffer: Buffer) => {
    const dataObject: KeyValue = {};

    if (buffer !== null && Buffer.isBuffer(buffer)) {
        // Lumi struct parsing
        for (let i = 0; i < buffer.length - 1; i++) {
            const index = buffer[i];
            let value = null;

            switch (buffer[i + 1]) {
            case 16:
            case 32:
                // 0x10 ZclBoolean
                // 0x20 Zcl8BitUint
                value = buffer.readUInt8(i + 2);
                i += 2;
                break;
            case 33:
                // 0x21 Zcl16BitUint
                value = buffer.readUInt16LE(i + 2);
                i += 3;
                break;
            case 34:
                // 0x22 Zcl24BitUint
                value = buffer.readUIntLE(i + 2, 3);
                i += 4;
                break;
            case 35:
                // 0x23 Zcl32BitUint
                value = buffer.readUInt32LE(i + 2);
                i += 5;
                break;
            case 36:
                // 0x24 Zcl40BitUint
                value = buffer.readUIntLE(i + 2, 5);
                i += 6;
                break;
            case 37:
                // 0x25 Zcl48BitUint
                value = buffer.readUIntLE(i + 2, 6);
                i += 7;
                break;
            case 38:
                // 0x26 Zcl56BitUint
                value = buffer.readUIntLE(i + 2, 7);
                i += 8;
                break;
            case 39:
                // 0x27 Zcl64BitUint
                value = buffer.readBigUInt64BE(i + 2);
                i += 9;
                break;
            case 40:
                // 0x28 Zcl8BitInt
                value = buffer.readInt8(i + 2);
                i += 2;
                break;
            case 41:
                // 0x29 Zcl16BitInt
                value = buffer.readInt16LE(i + 2);
                i += 3;
                break;
            case 42:
                // 0x2A Zcl24BitInt
                value = buffer.readIntLE(i + 2, 3);
                i += 4;
                break;
            case 43:
                // 0x2B Zcl32BitInt
                value = buffer.readInt32LE(i+2);
                i += 5;
                break;
            case 44:
                // 0x2C Zcl40BitInt
                value = buffer.readIntLE(i + 2, 5);
                i += 6;
                break;
            case 45:
                // 0x2D Zcl48BitInt
                value = buffer.readIntLE(i + 2, 6);
                i += 7;
                break;
            case 46:
                // 0x2E Zcl56BitInt
                value = buffer.readIntLE(i + 2, 7);
                i += 8;
                break;
            case 47:
                // 0x2F Zcl64BitInt
                value = buffer.readBigInt64BE(i + 2);
                i += 9;
                break;
            case 57:
                // 0x39 ZclSingleFloat
                value = buffer.readFloatLE(i + 2);
                i += 5;
                break;
            case 58:
                // 0x3a ZclDoubleFloat
                value = buffer.readDoubleLE(i + 2);
                i += 5;
                break;
            case 66:
                // 0x42 unknown, length taken from what seems correct in the logs, maybe is wrong
                logger.debug(`${model.model}: unknown vtype=${buffer[i+1]}, pos=${i+1}, moving length 1`, NS);
                i += 2;
                break;
            case 95:
                // 0x5f unknown, length taken from what seems correct in the logs, maybe is wrong
                logger.debug(`${model.model}: unknown vtype=${buffer[i+1]}, pos=${i+1}, moving length 4`, NS);
                i += 5;
                break;
            default:
                logger.debug(`${model.model}: unknown vtype=${buffer[i + 1]}, pos=${i + 1}`, NS);
            }

            if (value != null) {
                dataObject[index] = value;
            }
        }
    }

    logger.debug(
        `${model.model}: Processed buffer into data \
            ${JSON.stringify(dataObject, (key, value) => typeof value === 'bigint' ? value.toString() : value)}`,
        NS,
    );


    return dataObject;
};

export const numericAttributes2Payload = async (msg: Fz.Message, meta: Fz.Meta, model: Definition, options: KeyValue, dataObject: KeyValue) => {
    let payload: KeyValue = {};

    for (const [key, value] of Object.entries(dataObject)) {
        switch (key) {
        case '0':
            payload.detection_period = value;
            break;
        case '1':
            payload.voltage = value;
            if (model.meta && model.meta.battery && model.meta.battery.voltageToPercentage) {
                assertNumber(value);
                payload.battery = batteryVoltageToPercentage(value, model.meta.battery.voltageToPercentage);
            }
            break;
        case '2':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                assertNumber(value);
                payload.power_outage_count = value - 1;
            }
            break;
        case '3':
            if (['WXCJKG11LM', 'WXCJKG12LM', 'WXCJKG13LM', 'MCCGQ14LM', 'GZCGQ01LM', 'JY-GZ-01AQ', 'CTP-R01'].includes(model.model)) {
                // The temperature value is constant 25 °C and does not change, so we ignore it
                // https://github.com/Koenkk/zigbee2mqtt/issues/11126
                // https://github.com/Koenkk/zigbee-herdsman-converters/pull/3585
                // https://github.com/Koenkk/zigbee2mqtt/issues/13253
            } else {
                assertNumber(value);
                payload.device_temperature = value; // 0x03
            }
            break;
        case '4':
            if (['WS-USC01', 'WS-USC02', 'WS-EUK01', 'WS-EUK02', 'QBKG27LM', 'QBKG28LM', 'QBKG29LM',
                'QBKG25LM', 'QBKG38LM', 'QBKG39LM', 'ZNQBKG42LM', 'ZNQBKG43LM', 'ZNQBKG44LM', 'ZNQBKG45LM'].includes(model.model)) {
                payload.mode_switch = getFromLookup(value, {4: 'anti_flicker_mode', 1: 'quick_mode'});
            }
            break;
        case '5':
            assertNumber(value);
            payload.power_outage_count = value - 1;
            break;
        case '6':
            if (['MCCGQ11LM', 'SJCGQ11LM'].includes(model.model) && Array.isArray(value)) {
                assertNumber(value[1]);
                let count = value[1];
                // Sometimes, especially when the device is connected through another lumi router, the sensor
                // send random values after 16 bit (>65536), so we truncate and read this as 16BitUInt.
                count = parseInt(count.toString(16).slice(-4), 16);
                payload.trigger_count = count - 1;
            }
            break;
        case '8':
            if (['ZNLDP13LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            }
            break;
        case '9':
            if (['ZNLDP13LM', 'ZNXDD01LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            }
            break;
        case '10':
            // Value 29146 is received for SSM-U02 sometimes here:
            // https://github.com/Koenkk/zigbee2mqtt/issues/17961#issuecomment-1616170548
            if (['SSM-U01', 'DLKZMK11LM', 'SSM-U02', 'DLKZMK12LM'].includes(model.model) && (value === 1 || value === 2)) {
                payload.switch_type = getFromLookup(value, {1: 'toggle', 2: 'momentary'});
            }
            break;
        case '11':
            if (['RTCGQ11LM'].includes(model.model)) {
                assertNumber(value);
                payload.illuminance = value;
                // DEPRECATED: remove illuminance_lux here.
                payload.illuminance_lux = value;
            }
            break;
        case '12':
            if (['ZNLDP13LM', 'ZNXDD01LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            }
            break;
        case '13':
            if (['ZNXDD01LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            } else if (['ZNCLBL01LM'].includes(model.model)) {
                // Overwrite version advertised by `genBasic` and `genOta` with correct version:
                // https://github.com/Koenkk/zigbee2mqtt/issues/15745
                assertNumber(value);
                meta.device.meta.lumiFileVersion = value;
                meta.device.softwareBuildID = trv.decodeFirmwareVersionString(value);
                meta.device.save();
            }
            break;
        case '17':
            if (['ZNXDD01LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            }
            break;
        case '100':
            if (['QBKG18LM', 'QBKG20LM', 'QBKG31LM', 'QBKG39LM', 'QBKG41LM', 'QBCZ15LM', 'LLKZMK11LM', 'QBKG12LM', 'QBKG03LM', 'QBKG25LM']
                .includes(model.model)) {
                let mapping;
                switch (model.model) {
                case 'QBCZ15LM':
                    mapping = 'relay';
                    break;
                case 'LLKZMK11LM':
                    mapping = 'l1';
                    break;
                default:
                    mapping = 'left';
                }
                payload[`state_${mapping}`] = value === 1 ? 'ON' : 'OFF';
            } else if (['WXKG14LM', 'WXKG16LM', 'WXKG17LM'].includes(model.model)) {
                payload.click_mode = getFromLookup(value, {1: 'fast', 2: 'multi'});
            } else if (['WXCJKG11LM', 'WXCJKG12LM', 'WXCJKG13LM', 'ZNMS12LM', 'ZNCLBL01LM', 'RTCGQ12LM', 'RTCGQ13LM',
                'RTCGQ14LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
                // https://github.com/Koenkk/zigbee2mqtt/issues/11126
                // https://github.com/Koenkk/zigbee2mqtt/issues/12279
            } else if (['RTCGQ15LM'].includes(model.model)) {
                payload.occupancy = value;
            } else if (['WSDCGQ01LM', 'WSDCGQ11LM', 'WSDCGQ12LM', 'VOCKQJK11LM'].includes(model.model)) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/798
                // Sometimes the sensor publishes non-realistic vales, filter these
                // @ts-expect-error
                const temperature = parseFloat(value) / 100.0;
                if (temperature > -65 && temperature < 65) {
                    payload.temperature = temperature;
                }
            } else if (['RTCGQ11LM'].includes(model.model)) {
                // It contains the occupancy, but in z2m we use a custom timer to do it, so we ignore it
                // payload.occupancy = value === 1;
            } else if (['MCCGQ11LM', 'MCCGQ14LM'].includes(model.model)) {
                payload.contact = value === 0;
            } else if (['SJCGQ11LM'].includes(model.model)) {
                // Ignore the message. It seems not reliable. See discussion here https://github.com/Koenkk/zigbee2mqtt/issues/12018
                // payload.water_leak = value === 1;
            } else if (['SJCGQ13LM'].includes(model.model)) {
                payload.water_leak = value === 1;
            } else if (['JTYJ-GD-01LM/BW'].includes(model.model)) {
                payload.smoke_density = value;
            } else if (['GZCGQ01LM'].includes(model.model)) {
                // DEPRECATED: change illuminance_lux -> illuminance
                assertNumber(value);
                payload.illuminance_lux = value;
            } else {
                payload.state = value === 1 ? 'ON' : 'OFF';
            }
            break;
        case '101':
            if (['QBKG18LM', 'QBKG20LM', 'QBKG31LM', 'QBKG39LM', 'QBKG41LM', 'QBCZ15LM', 'QBKG25LM', 'QBKG33LM', 'QBKG34LM', 'LLKZMK11LM', 'QBKG12LM',
                'QBKG03LM']
                .includes(model.model)) {
                let mapping;
                switch (model.model) {
                case 'QBCZ15LM':
                    mapping = 'usb';
                    break;
                case 'QBKG25LM':
                case 'QBKG33LM':
                case 'QBKG34LM':
                    mapping = 'center';
                    break;
                case 'LLKZMK11LM':
                    mapping = 'l2';
                    break;
                default:
                    mapping = 'right';
                }
                payload[`state_${mapping}`] = value === 1 ? 'ON' : 'OFF';
            } else if (['RTCGQ12LM', 'RTCGQ14LM', 'RTCGQ15LM'].includes(model.model)) {
                // Sometimes RTCGQ14LM reports high illuminance values in the dark
                // https://github.com/Koenkk/zigbee2mqtt/issues/12596
                assertNumber(value);
                const illuminance = value > 65000 ? 0 : value;
                payload.illuminance = illuminance;
            } else if (['WSDCGQ01LM', 'WSDCGQ11LM', 'WSDCGQ12LM', 'VOCKQJK11LM'].includes(model.model)) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/798
                // Sometimes the sensor publishes non-realistic vales, filter these
                // @ts-expect-error
                const humidity = parseFloat(value) / 100.0;
                if (humidity >= 0 && humidity <= 100) {
                    payload.humidity = humidity;
                }
            } else if (['ZNJLBL01LM', 'ZNCLDJ12LM'].includes(model.model)) {
                payload.battery = value;
            } else if (['ZNCLBL01LM'].includes(model.model)) {
                assertNumber(value);
                const battery = value / 2;
                payload.battery = precisionRound(battery, 2);
            } else if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.presence = getFromLookup(value, {0: false, 1: true, 255: null});
            } else if (['ZNXDD01LM'].includes(model.model)) {
                payload.brightness = value;
            }
            break;
        case '102':
            if (['QBKG25LM', 'QBKG33LM', 'QBKG34LM'].includes(model.model)) {
                payload.state_right = value === 1 ? 'ON' : 'OFF';
            } else if (['WSDCGQ01LM', 'WSDCGQ11LM'].includes(model.model)) {
                assertNumber(value);
                payload.pressure = value/100.0;
            } else if (['WSDCGQ12LM'].includes(model.model)) {
                // This pressure value is ignored because it is less accurate than reported in the 'scaledValue' attribute
                // of the 'msPressureMeasurement' cluster
            } else if (['RTCZCGQ11LM'].includes(model.model)) {
                if (meta.device.applicationVersion < 50) {
                    payload.presence_event = getFromLookup(value, {0: 'enter', 1: 'leave', 2: 'left_enter', 3: 'right_leave', 4: 'right_enter',
                        5: 'left_leave', 6: 'approach', 7: 'away', 255: null});
                } else {
                    payload.motion_sensitivity = getFromLookup(value, {1: 'low', 2: 'medium', 3: 'high'});
                }
            } else if (['ZNXDD01LM'].includes(model.model)) {
                payload.color_temp = value;
            }
            break;
        case '103':
            if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.monitoring_mode = getFromLookup(value, {0: 'undirected', 1: 'left_right'});
            } else if (['ZNXDD01LM'].includes(model.model)) {
                // const color_temp_min = (value & 0xffff); // 2700
                // const color_temp_max = (value >> 16) & 0xffff; // 6500
            }
            break;
        case '105':
            if (['RTCGQ13LM'].includes(model.model)) {
                payload.motion_sensitivity = getFromLookup(value, {1: 'low', 2: 'medium', 3: 'high'});
            } else if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.approach_distance = getFromLookup(value, {0: 'far', 1: 'medium', 2: 'near'});
            } else if (['RTCGQ14LM'].includes(model.model)) {
                payload.detection_interval = value;
            }
            break;
        case '106':
            if (['RTCGQ14LM'].includes(model.model)) {
                payload.motion_sensitivity = getFromLookup(value, {1: 'low', 2: 'medium', 3: 'high'});
            }
            break;
        case '107':
            if (['RTCGQ14LM'].includes(model.model)) {
                payload.trigger_indicator = value === 1;
            } else if (['ZNCLBL01LM'].includes(model.model)) {
                assertNumber(value);
                const position = options.invert_cover ? 100 - value : value;
                payload.position = position;
                payload.state = options.invert_cover ? (position > 0 ? 'CLOSE' : 'OPEN') : (position > 0 ? 'OPEN' : 'CLOSE');
            }
            break;
        case '149':
            assertNumber(value);
            payload.energy = value; // 0x95
            if (['LLKZMK12LM'].includes(model.model)) {
                assertNumber(payload.energy);
                payload.energy = payload.energy / 1000;
            }
            // Consumption is deprecated
            payload.consumption = payload.energy;
            break;
        case '150':
            if (!['JTYJ-GD-01LM/BW'].includes(model.model)) {
                assertNumber(value);
                payload.voltage = value * 0.1; // 0x96
            }
            break;
        case '151':
            if (['LLKZMK11LM'].includes(model.model)) {
                assertNumber(value);
                payload.current = value;
            } else {
                assertNumber(value);
                payload.current = value * 0.001;
            }
            break;
        case '152':
            if (['DJT11LM'].includes(model.model)) {
                // We don't know what implies for this device, it contains values like 30, 50,... that don't seem to change
            } else {
                assertNumber(value);
                payload.power = value; // 0x98
            }
            break;
        case '154':
            if (['ZNLDP13LM', 'ZNXDD01LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            }
            break;
        case '159':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.gas_sensitivity = getFromLookup(value, {1: '15%LEL', 2: '10%LEL'});
            } else if (['MCCGQ13LM'].includes(model.model)) {
                payload.detection_distance = getFromLookup(value, {1: '10mm', 2: '20mm', 3: '30mm'});
            }
            break;
        case '160':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.gas = value === 1;
            } else if (['JY-GZ-01AQ'].includes(model.model)) {
                payload.smoke = value === 1;
            }
            break;
        case '161':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.gas_density = value;
            } else if (['JY-GZ-01AQ'].includes(model.model)) {
                payload.smoke_density = value;
                payload.smoke_density_dbm = getFromLookup(value, {0: 0, 1: 0.085, 2: 0.088, 3: 0.093, 4: 0.095, 5: 0.100, 6: 0.105, 7: 0.110,
                    8: 0.115, 9: 0.120, 10: 0.125});
            }
            break;
        case '162':
            if (['JT-BZ-01AQ/A', 'JY-GZ-01AQ'].includes(model.model)) {
                payload.test = value === 1;
            }
            break;
        case '163':
            if (['JT-BZ-01AQ/A', 'JY-GZ-01AQ'].includes(model.model)) {
                payload.buzzer_manual_mute = value === 1;
            }
            break;
        case '164':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.state = getFromLookup(value, {0: 'work', 1: 'preparation'});
            } else if (['JY-GZ-01AQ'].includes(model.model)) {
                payload.heartbeat_indicator = value === 1;
            }
            break;
        case '165':
            if (['JY-GZ-01AQ'].includes(model.model)) {
                payload.linkage_alarm = value === 1;
            }
            break;
        case '166':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.linkage_alarm = value === 1;
            }
            break;
        case '238':
            if (['ZNXDD01LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            } else if (['ZNCLBL01LM'].includes(model.model)) {
                // Overwrite version advertised by `genBasic` and `genOta` with correct version:
                // https://github.com/Koenkk/zigbee2mqtt/issues/15745
                assertNumber(value);
                meta.device.meta.lumiFileVersion = value;
                meta.device.softwareBuildID = trv.decodeFirmwareVersionString(value);
                meta.device.save();
            }
            break;
        case '240':
            payload.flip_indicator_light = value === 1 ? 'ON' : 'OFF';
            break;
        case '247':
            {
                const dataObject247 = buffer2DataObject(model, value as Buffer);
                if (['CTP-R01'].includes(model.model)) {
                    // execute pending soft switch of operation_mode, if exists
                    const opModeSwitchTask = globalStore.getValue(meta.device, 'opModeSwitchTask');
                    if (opModeSwitchTask) {
                        const {callback, newMode} = opModeSwitchTask;
                        try {
                            await callback();
                            payload.operation_mode = newMode;
                            globalStore.putValue(meta.device, 'opModeSwitchTask', null);
                        } catch (error) {
                            // do nothing when callback fails
                        }
                    } else {
                        payload.operation_mode = getFromLookup(dataObject247[155], {0: 'action_mode', 1: 'scene_mode'});
                    }
                }
                const payload247 = await numericAttributes2Payload(msg, meta, model, options, dataObject247);
                payload = {...payload, ...payload247};
            }
            break;
        case '258':
            payload.detection_interval = value;
            break;
        case '268':
            if (['RTCGQ13LM', 'RTCGQ14LM', 'RTCZCGQ11LM'].includes(model.model)) {
                payload.motion_sensitivity = getFromLookup(value, {1: 'low', 2: 'medium', 3: 'high'});
            } else if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.gas_sensitivity = getFromLookup(value, {1: '15%LEL', 2: '10%LEL'});
            }
            break;
        case '293':
            payload.click_mode = getFromLookup(value, {1: 'fast', 2: 'multi'});
            break;
        case '294':
            if (['JT-BZ-01AQ/A', 'JY-GZ-01AQ'].includes(model.model)) {
                payload.buzzer_manual_mute = value === 1;
            }
            break;
        case '295':
            if (['JT-BZ-01AQ/A', 'JY-GZ-01AQ'].includes(model.model)) {
                payload.test = value === 1;
            }
            break;
        case '313':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.state = getFromLookup(value, {0: 'work', 1: 'preparation'});
            }
            break;
        case '314':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.gas = value === 1;
            } else if (['JY-GZ-01AQ'].includes(model.model)) {
                payload.smoke = value === 1;
            }
            break;
        case '315':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.gas_density = value;
            } else if (['JY-GZ-01AQ'].includes(model.model)) {
                payload.smoke_density = value;
                payload.smoke_density_dbm = getFromLookup(value, {0: 0, 1: 0.085, 2: 0.088, 3: 0.093, 4: 0.095, 5: 0.100, 6: 0.105, 7: 0.110,
                    8: 0.115, 9: 0.120, 10: 0.125});
            }
            break;
        case '316':
            if (['JY-GZ-01AQ'].includes(model.model)) {
                payload.heartbeat_indicator = value === 1;
            }
            break;
        case '317':
            if (['JT-BZ-01AQ/A', 'JY-GZ-01AQ'].includes(model.model)) {
                payload.buzzer_manual_alarm = value === 1;
            }
            break;
        case '320':
            if (['MCCGQ13LM'].includes(model.model)) {
                payload.tamper = getFromLookup(value, {0: false, 1: true});
            }
            break;
        case '322':
            if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.presence = getFromLookup(value, {0: false, 1: true, 255: null});
            }
            break;
        case '323':
            if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.presence_event = getFromLookup(value, {0: 'enter', 1: 'leave', 2: 'left_enter', 3: 'right_leave', 4: 'right_enter',
                    5: 'left_leave', 6: 'approach', 7: 'away'});
            }
            break;
        case '324':
            if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.monitoring_mode = getFromLookup(value, {0: 'undirected', 1: 'left_right'});
            }
            break;
        case '326':
            if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.approach_distance = getFromLookup(value, {0: 'far', 1: 'medium', 2: 'near'});
            }
            break;
        case '328':
            if (['CTP-R01'].includes(model.model)) {
                // detected hard switch of operation_mode (attribute 0x148[328])
                payload.operation_mode = getFromLookup(msg.data[328], {0: 'action_mode', 1: 'scene_mode'});
            }
            break;
        case '329':
            if (['CTP-R01'].includes(model.model)) {
                // side_up attribute report (attribute 0x149[329])
                payload.action = 'side_up';
                payload.side = msg.data[329] + 1;
            }
            break;
        case '331':
            if (['JT-BZ-01AQ/A', 'JY-GZ-01AQ'].includes(model.model)) {
                payload.linkage_alarm = value === 1;
            }
            break;
        case '332':
            if (['JT-BZ-01AQ/A', 'JY-GZ-01AQ'].includes(model.model)) {
                payload.linkage_alarm_state = value === 1;
            }
            break;
        case '338':
            if (['RTCGQ14LM'].includes(model.model)) {
                payload.trigger_indicator = value === 1;
            }
            break;
        case '512':
            if (['ZNCZ15LM', 'QBCZ14LM', 'QBCZ15LM', 'SP-EUC01'].includes(model.model)) {
                payload.button_lock = value === 1 ? 'OFF' : 'ON';
            } else {
                const mode = getFromLookup(value, {0x01: 'control_relay', 0x00: 'decoupled'});
                payload[postfixWithEndpointName('operation_mode', msg, model, meta)] = mode;
            }
            break;
        case '513':
            payload.power_outage_memory = value === 1;
            break;
        case '514':
            payload.auto_off = value === 1;
            break;
        case '515':
            payload.led_disabled_night = value === 1;
            break;
        case '519':
            payload.consumer_connected = value === 1;
            break;
        case '523':
            assertNumber(value);
            payload.overload_protection = precisionRound(value, 2);
            break;
        case '550':
            payload.button_switch_mode = value === 1 ? 'relay_and_usb' : 'relay';
            break;
        case '645':
            // aqara z1 lock relay
            payload.lock_relay = value === 1;
            break;
        case '1025':
            if (['ZNCLBL01LM'].includes(model.model)) {
                payload.hand_open = !value;
            } else {
                // next values update only when curtain finished initial setup and knows current position
                // @ts-expect-error
                payload.options = {...payload.options, reverse_direction: value[2] == '\u0001', hand_open: value[5] == '\u0000'};
            }
            break;
        case '1028':
            payload = {...payload,
                motor_state: getFromLookup(value, (options.invert_cover ? {0: 'stopped', 1: 'closing', 2: 'opening'} :
                    {0: 'stopped', 1: 'opening', 2: 'closing'})),
                running: !!value,
            };
            break;
        case '1032':
            if (['ZNJLBL01LM'].includes(model.model)) {
                payload.motor_speed = getFromLookup(value, {0: 'low', 1: 'medium', 2: 'high'});
            }
            break;
        case '1033':
            if (['ZNJLBL01LM'].includes(model.model)) {
                payload.charging_status = value === 1;
            }
            break;
        case '1034':
            if (['ZNJLBL01LM'].includes(model.model)) {
                payload.battery = value;
            }
            break;
        case '1035':
            if (['ZNCLBL01LM'].includes(model.model)) {
                payload.voltage = value;
            }
            break;
        case '1055':
            if (['ZNCLBL01LM'].includes(model.model)) {
                assertNumber(value);
                payload.target_position = options.invert_cover ? 100 - value : value;
            }
            break;
        case '1056':
            if (['ZNCLBL01LM'].includes(model.model)) {
                // This is the "target_state" attribute, which takes the following values: 0: 'OPEN', 1: 'CLOSE', 2: 'STOP'.
                // It is not used because the values 0 and 1 are not always reported.
                // https://github.com/Koenkk/zigbee-herdsman-converters/pull/4307
            }
            break;
        case '1057':
            if (['ZNCLBL01LM'].includes(model.model)) {
                payload.motor_state = getFromLookup(value, (options.invert_cover ? {0: 'opening', 1: 'closing', 2: 'stopped'} :
                    {0: 'closing', 1: 'opening', 2: 'stopped'}));
                assertNumber(value);
                payload.running = value < 2 ? true : false;
            }
            break;
        case '1061':
            if (['ZNCLBL01LM'].includes(model.model)) {
                payload.action = getFromLookup(value, (options.invert_cover ? {1: 'manual_close', 2: 'manual_open'} :
                    {1: 'manual_open', 2: 'manual_close'}));
            }
            break;
        case '1063':
            if (['ZNCLBL01LM'].includes(model.model)) {
                getFromLookup(value, {0: 'UNLOCK', 1: 'LOCK'});
            }
            break;
        case '1064':
            if (['ZNCLBL01LM'].includes(model.model)) {
                payload.hooks_state = getFromLookup(value, {0: 'unlocked', 1: 'locked', 2: 'locking', 3: 'unlocking'});
                payload.hooks_lock = getFromLookup(value, {0: 'UNLOCK', 1: 'LOCK', 2: 'UNLOCK', 3: 'LOCK'});
            }
            break;
        case '1065':
            if (['ZNCLBL01LM'].includes(model.model)) {
                assertNumber(value);
                payload.illuminance_lux = value * 50;
            }
            break;
        case '1289':
            payload.dimmer_mode = getFromLookup(value, {3: 'rgbw', 1: 'dual_ct'});
            break;
        case '1299':
            if (['ZNXDD01LM'].includes(model.model)) {
                // maximum color temp (6500)
            }
            break;
        case '1300':
            if (['ZNXDD01LM'].includes(model.model)) {
                // minimum color temp (2700)
            }
            break;
        case '65281':
            {
                // @ts-expect-error
                const payload65281 = await numericAttributes2Payload(msg, meta, model, options, value);
                payload = {...payload, ...payload65281};
            }
            break;
        case '65282':
            // This is a a complete structure with attributes, like element 0 for state, element 1 for voltage...
            // At this moment we only extract what we are sure, for example, position 0 seems to be always 1 for a
            // occupancy sensor, so we ignore it at this moment
            // @ts-expect-error
            payload.voltage = value[1].elmVal;
            if (model.meta && model.meta.battery && model.meta.battery.voltageToPercentage) {
                assertNumber(payload.voltage);
                payload.battery = batteryVoltageToPercentage(payload.voltage, model.meta.battery.voltageToPercentage);
            }
            // @ts-expect-error
            payload.power_outage_count = value[4].elmVal - 1;
            break;
        case 'mode':
            assertNumber(value);
            payload.operation_mode = ['command', 'event'][value];
            break;
        case 'modelId':
            // We ignore it, but we add it here to not shown an unknown key in the log
            break;
        case 'illuminance':
            // It contains the illuminance and occupancy, but in z2m we use a custom timer to do it, so we ignore it
            break;
        case 'displayUnit':
            // Use lumiDisplayUnit modernExtend, but we add it here to not shown an unknown key in the log
            break;
        case 'airQuality':
            // Use lumiAirQuality modernExtend, but we add it here to not shown an unknown key in the log
            break;
        default:
            logger.debug(`${model.model}: unknown key ${key} with value ${value}`, NS);
        }
    }

    logger.debug(`${model.model}: Processed data into payload ${JSON.stringify(payload)}`, NS);

    return payload;
};

const numericAttributes2Lookup = async (model: Definition, dataObject: KeyValue) => {
    let result: KeyValue = {};
    for (const [key, value] of Object.entries(dataObject)) {
        switch (key) {
        case '247':
            {
                const dataObject247 = buffer2DataObject(model, value as Buffer);
                const result247 = await numericAttributes2Lookup(model, dataObject247);
                result = {...result, ...result247};
            }
            break;
        case '65281':
            {
                const result65281 = await numericAttributes2Lookup(model, value as KeyValue);
                result = {...result, ...result65281};
            }
            break;
        default:
            result[key] = value;
        }
    }

    return result;
};

type LumiPresenceRegionZone = {x: number, y: number}

const lumiPresenceConstants = {
    region_event_key: 0x0151,
    region_event_types: {
        Enter: 1,
        Leave: 2,
        Occupied: 4,
        Unoccupied: 8,
    },
    region_config_write_attribute: 0x0150,
    region_config_write_attribute_type: 0x41,
    region_config_cmds: {
        /**
         * Creates new region (or force replaces existing one)
         * with new zones definition.
         */
        create: 1,
        /**
         * Modifies existing region.
         * Note: unused, as it seems to break existing regions
         * (region stops reporting new detection events).
         * Use "create" instead, as it replaces existing region with new one.
         */
        modify: 2,
        /**
         * Deletes existing region.
         */
        delete: 3,
    },
    region_config_regionId_min: 1,
    region_config_regionId_max: 10,
    region_config_zoneY_min: 1,
    region_config_zoneY_max: 7,
    region_config_zoneX_min: 1,
    region_config_zoneX_max: 4,
    region_config_cmd_suffix_upsert: 0xff,
    region_config_cmd_suffix_delete: 0x00,
};
const lumiPresenceMappers = {
    lumi_presence: {
        region_event_type_names: {
            [lumiPresenceConstants.region_event_types.Enter]: 'enter',
            [lumiPresenceConstants.region_event_types.Leave]: 'leave',
            [lumiPresenceConstants.region_event_types.Occupied]: 'occupied',
            [lumiPresenceConstants.region_event_types.Unoccupied]: 'unoccupied',
        },
    },
};
export const presence = {
    constants: lumiPresenceConstants,
    mappers: lumiPresenceMappers,

    encodeXCellsDefinition: (xCells?: number[]): number => {
        if (!xCells?.length) {
            return 0;
        }
        return [...xCells.values()].reduce((accumulator, marker) => accumulator + presence.encodeXCellIdx(marker), 0);
    },
    encodeXCellIdx: (cellXIdx: number): number => {
        return 2 ** (cellXIdx - 1);
    },
    parseAqaraFp1RegionDeleteInput: (input: KeyValueAny) => {
        if (!input || typeof input !== 'object') {
            return presence.failure({reason: 'NOT_OBJECT'});
        }

        if (!('region_id' in input) || !presence.isAqaraFp1RegionId(input.region_id)) {
            return presence.failure({reason: 'INVALID_REGION_ID'});
        }

        return {
            isSuccess: true,
            payload: {
                command: {
                    region_id: input.region_id,
                },
            },
        };
    },

    parseAqaraFp1RegionUpsertInput: (input: KeyValueAny) => {
        if (!input || typeof input !== 'object') {
            return presence.failure({reason: 'NOT_OBJECT'});
        }

        if (!('region_id' in input) || !presence.isAqaraFp1RegionId(input.region_id)) {
            return presence.failure({reason: 'INVALID_REGION_ID'});
        }

        if (!('zones' in input) || !Array.isArray(input.zones) || !input.zones.length) {
            return presence.failure({reason: 'ZONES_LIST_EMPTY'});
        }

        if (!input.zones.every(presence.isAqaraFp1RegionZoneDefinition)) {
            return presence.failure({reason: 'INVALID_ZONES'});
        }

        return {
            isSuccess: true,
            payload: {
                command: {
                    region_id: input.region_id,
                    zones: input.zones,
                },
            },
        };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isAqaraFp1RegionId: (value: any): value is number => {
        return (
            typeof value === 'number' &&
            value >= presence.constants.region_config_regionId_min &&
            value <= presence.constants.region_config_regionId_max
        );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isAqaraFp1RegionZoneDefinition: (value: any): value is LumiPresenceRegionZone => {
        return (
            value &&
            typeof value === 'object' &&
            'x' in value &&
            'y' in value &&
            typeof value.x === 'number' &&
            typeof value.y === 'number' &&
            value.x >= presence.constants.region_config_zoneX_min &&
            value.x <= presence.constants.region_config_zoneX_max &&
            value.y >= presence.constants.region_config_zoneY_min &&
            value.y <= presence.constants.region_config_zoneY_max
        );
    },

    failure: (error: {reason: string}): { isSuccess: false, error: {reason: string} } => {
        return {
            isSuccess: false,
            error,
        };
    },
};

function readTemperature(buffer: Buffer, offset: number): number {
    return buffer.readUint16BE(offset) / 100;
}

function writeTemperature(buffer: Buffer, offset: number, temperature: number): void {
    buffer.writeUint16BE(temperature * 100, offset);
}

const dayNames: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function readDaySelection(buffer: Buffer, offset: number): Day[] {
    const selectedDays: Day[] = [];

    dayNames.forEach((day, index) => {
        if ((buffer[offset] >> index + 1) % 2 !== 0) {
            selectedDays.push(day);
        }
    });

    return selectedDays;
}

function validateDaySelection(selectedDays: Day[]) {
    selectedDays.filter((selectedDay) => !dayNames.includes(selectedDay)).forEach((invalidValue) => {
        throw new Error(`The value "${invalidValue}" is not a valid day (available values: ${dayNames.join(', ')})`);
    });
}

function writeDaySelection(buffer: Buffer, offset: number, selectedDays: Day[]) {
    validateDaySelection(selectedDays);

    const bitMap = dayNames.reduce((repeat, dayName, index) => {
        const isDaySelected = selectedDays.includes(dayName);
        // @ts-expect-error
        return repeat | isDaySelected << index + 1;
    }, 0);

    buffer.writeUInt8(bitMap, offset);
}

const timeNextDayFlag = 1 << 15;

function readTime(buffer: Buffer, offset: number): number {
    const minutesWithDayFlag = buffer.readUint16BE(offset);
    return minutesWithDayFlag & ~timeNextDayFlag;
}

function validateTime(time: number): void {
    const isPositiveInteger = (value: number) => typeof value === 'number' && Number.isInteger(value) && value >= 0;

    if (!isPositiveInteger(time)) {
        throw new Error(`Time must be a positive integer number`);
    }

    if (time >= 24 * 60) {
        throw new Error(`Time must be between 00:00 and 23:59`);
    }
}

function writeTime(buffer: Buffer, offset: number, time: number, isNextDay: boolean): void {
    validateTime(time);

    let minutesWithDayFlag = time;

    if (isNextDay) {
        minutesWithDayFlag = minutesWithDayFlag | timeNextDayFlag;
    }

    buffer.writeUint16BE(minutesWithDayFlag, offset);
}

/**
 * Formats a number of minutes into a user-readable 24-hour time notation in the form hh:mm.
 */
function formatTime(timeMinutes: number): string {
    const hours = Math.floor(timeMinutes / 60);
    const minutes = timeMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Parses a 24-hour time notation string in the form hh:mm into a number of minutes.
 */
function parseTime(timeString: string): number {
    const parts = timeString.split(':');

    if (parts.length !== 2) {
        throw new Error(`Cannot parse time string ${timeString}`);
    }

    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);

    return hours * 60 + minutes;
}

const stringifiedScheduleFragmentSeparator = '|';
const stringifiedScheduleValueSeparator = ',';

export const trv = {
    decodeFirmwareVersionString(value: number) {
        // Add prefix to follow Aqara's versioning schema: https://www.aqara.com/en/version/radiator-thermostat-e1
        const firmwareVersionPrefix = '0.0.0_';

        // Reinterpret from LE integer to byte sequence(e.g., `[25,8,0,0]` corresponds to 0.0.0_0825)
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(value);
        const firmwareVersionNumber = toNumber(buffer.reverse().subarray(1).join(''), 'firmwareVersionNumber').toString().padStart(4, '0');

        return firmwareVersionPrefix + firmwareVersionNumber;
    },

    decodePreset(value: number) {
        // Setup mode is the initial device state after powering it ("F11" on display) and not a real preset that can be deliberately
        // set by users, therefore it is exposed as a separate flag.
        return {
            setup: value === 3,
            preset: {2: 'away', 1: 'auto', 0: 'manual'}[value],
        };
    },

    decodeHeartbeat(meta: Fz.Meta, model: Definition, messageBuffer: Buffer) {
        const data = buffer2DataObject(model, messageBuffer);
        const payload: KeyValue = {};

        Object.entries(data).forEach(([key, value]) => {
            switch (parseInt(key)) {
            case 3:
                payload.device_temperature = value;
                break;
            case 5:
                assertNumber(value);
                payload.power_outage_count = value - 1;
                break;
            case 10:
                // unidentified number, e.g. 32274, 3847
                break;
            case 13:
                assertNumber(value);
                payload.firmware_version = trv.decodeFirmwareVersionString(value);
                break;
            case 17:
                // unidentified flag/enum, e.g. 1
                break;
            case 101:
                assertNumber(value);
                Object.assign(payload, trv.decodePreset(value));
                break;
            case 102:
                assertNumber(value);
                payload.local_temperature = value / 100;
                break;
            case 103:
                // This takes the following values:
                //  - `occupied_heating_setpoint` if `system_mode` is `heat` and `preset` is `manual`
                //  - `away_preset_temperature` if `system_mode` is `heat` and `preset` is `away`
                //  - `5` if `system_mode` is `off`
                // It thus behaves similar to `occupied_heating_setpoint` except in `off` mode. Due to this difference,
                // this value is written to another property to avoid an inconsistency of the `occupied_heating_setpoint`.
                // TODO How to handle this value? Find better name?
                assertNumber(value);
                payload.internal_heating_setpoint = value / 100;
                break;
            case 104:
                payload.valve_alarm = value === 1;
                break;
            case 105:
                payload.battery = value;
                break;
            case 106:
                // unidentified flag/enum, e.g. 0
                break;
            }
        });

        return payload;
    },

    /**
     * Decode a Zigbee schedule configuration message into a schedule configuration object.
     */
    decodeSchedule(buffer: Buffer): TrvScheduleConfig {
        return {
            days: readDaySelection(buffer, 1),
            events: [
                {time: readTime(buffer, 2), temperature: readTemperature(buffer, 6)},
                {time: readTime(buffer, 8), temperature: readTemperature(buffer, 12)},
                {time: readTime(buffer, 14), temperature: readTemperature(buffer, 18)},
                {time: readTime(buffer, 20), temperature: readTemperature(buffer, 24)},
            ],
        };
    },

    validateSchedule(schedule: TrvScheduleConfig): void {
        const eventCount = 4;

        if (typeof schedule !== 'object') {
            throw new Error('The provided value must be a schedule object');
        }

        if (schedule.days == null || !Array.isArray(schedule.days) || schedule.days.length === 0) {
            throw new Error(`The schedule object must contain an array of days with at least one entry`);
        }

        validateDaySelection(schedule.days);

        if (schedule.events == null || !Array.isArray(schedule.events) || schedule.events.length !== eventCount) {
            throw new Error(`The schedule object must contain an array of ${eventCount} time/temperature events`);
        }

        schedule.events.forEach((event) => {
            if (typeof event !== 'object') {
                throw new Error('The provided time/temperature event must be an object');
            }

            validateTime(event.time);

            if (typeof event.temperature !== 'number') {
                throw new Error(`The provided time/temperature entry must contain a numeric temperature`);
            }

            if (event.temperature < 5 || event.temperature > 30) {
                throw new Error(`The temperature must be between 5 and 30 °C`);
            }
        });

        // Calculate time durations between events
        const durations = schedule.events
            .map((entry, index, entries) => {
                if (index === 0) {
                    return 0;
                }

                const time = entry.time;
                const fullDay = 24 * 60;
                const previousTime = entries[index - 1].time;
                const isNextDay = time < previousTime;

                if (isNextDay) {
                    return (fullDay - previousTime) + time;
                } else {
                    return time - previousTime;
                }
            })
            // Remove first entry which is not a duration
            .slice(1);

        const minDuration = 60;
        const hasInvalidDurations = durations.some((duration) => duration < minDuration);

        if (hasInvalidDurations) {
            throw new Error(`The individual times must be at least 1 hour apart`);
        }

        const maxTotalDuration = 24 * 60;
        const totalDuration = durations.reduce((total, duration) => total + duration, 0);

        if (totalDuration > maxTotalDuration) {
            // this implicitly also makes sure that there is at most one "next day" switch
            throw new Error(`The start and end times must be at most 24 hours apart`);
        }
    },

    /**
     * Encodes a schedule object into Zigbee message format.
     */
    encodeSchedule(schedule: TrvScheduleConfig): Buffer {
        const buffer = Buffer.alloc(26);
        buffer.writeUInt8(0x04);

        writeDaySelection(buffer, 1, schedule.days);

        schedule.events.forEach((event: KeyValueAny, index: number, events: KeyValueAny) => {
            const offset = 2 + index * 6;
            const isNextDay = index > 0 && event.time < events[index - 1].time;

            writeTime(buffer, offset, event.time, isNextDay);
            writeTemperature(buffer, offset + 4, event.temperature);
        });

        return buffer;
    },

    stringifySchedule(schedule: TrvScheduleConfig) {
        const stringifiedScheduleFragments = [schedule.days.join(stringifiedScheduleValueSeparator)];

        for (const event of schedule.events) {
            const formattedTemperature = Number.isInteger(event.temperature) ?
                event.temperature.toFixed(1) : // add ".0" for usability to signal that floats can be used
                String(event.temperature);

            const entryFragments = [formatTime(event.time), formattedTemperature];

            stringifiedScheduleFragments.push(entryFragments.join(stringifiedScheduleValueSeparator));
        }

        return stringifiedScheduleFragments.join(stringifiedScheduleFragmentSeparator);
    },

    // Parses a schedule configuration string into a configuration object.
    parseSchedule(stringifiedSchedule: string): TrvScheduleConfig {
        const schedule: TrvScheduleConfig = {days: [], events: []};

        if (!stringifiedSchedule) {
            return schedule;
        }

        const stringifiedScheduleFragments = stringifiedSchedule.split(stringifiedScheduleFragmentSeparator);

        stringifiedScheduleFragments.forEach((fragment, index) => {
            if (index === 0) {
                // @ts-expect-error
                schedule.days.push(...fragment.split(stringifiedScheduleValueSeparator));
            } else {
                const entryFragments = fragment.split(stringifiedScheduleValueSeparator);
                const entry = {time: parseTime(entryFragments[0]), temperature: parseFloat(entryFragments[1])};
                schedule.events.push(entry);
            }
        });

        return schedule;
    },
};

export const manufacturerCode = 0x115f;
const manufacturerOptions = {
    lumi: {manufacturerCode: manufacturerCode, disableDefaultResponse: true},
};

export const lumiModernExtend = {
    lumiLight: (args?: Omit<modernExtend.LightArgs, 'colorTemp'> & {colorTemp?: true, powerOutageMemory?: 'switch' | 'light' | 'enum',
        deviceTemperature?: boolean, powerOutageCount?: boolean}) => {
        args = {powerOutageCount: true, deviceTemperature: true, ...args};
        const colorTemp: {range: Range, startup: boolean} = args.colorTemp ? {startup: false, range: [153, 370]} : undefined;
        const result = modernExtend.light({effect: false, powerOnBehavior: false, ...args, colorTemp});
        result.fromZigbee.push(
            fromZigbee.lumi_bulb_interval, fz.ignore_occupancy_report, fz.ignore_humidity_report,
            fz.ignore_pressure_report, fz.ignore_temperature_report, fromZigbee.lumi_specific,
        );

        if (args.powerOutageCount) result.exposes.push(e.power_outage_count());
        if (args.deviceTemperature) result.exposes.push(e.device_temperature());

        if (args.powerOutageMemory === 'switch') {
            result.toZigbee.push(toZigbee.lumi_switch_power_outage_memory);
            result.exposes.push(e.power_outage_memory());
        } else if (args.powerOutageMemory === 'light') {
            result.toZigbee.push(toZigbee.lumi_light_power_outage_memory);
            result.exposes.push(e.power_outage_memory().withAccess(ea.STATE_SET));
        } else if (args.powerOutageMemory === 'enum') {
            const extend = lumiModernExtend.lumiPowerOnBehavior({lookup: {'on': 0, 'previous': 1, 'off': 2}});
            result.toZigbee.push(...extend.toZigbee);
            result.exposes.push(...extend.exposes);
        }

        return result;
    },
    lumiOnOff: (args?: modernExtend.OnOffArgs & {operationMode?: boolean, powerOutageMemory?: 'binary' | 'enum', lockRelay?: boolean}) => {
        args = {operationMode: false, lockRelay: false, ...args};
        const result = modernExtend.onOff({powerOnBehavior: false, ...args});
        result.fromZigbee.push(fromZigbee.lumi_specific);
        result.exposes.push(e.device_temperature(), e.power_outage_count());
        if (args.powerOutageMemory === 'binary') {
            const extend = lumiModernExtend.lumiPowerOutageMemory();
            result.toZigbee.push(...extend.toZigbee);
            result.exposes.push(...extend.exposes);
        } else if (args.powerOutageMemory === 'enum') {
            const extend = lumiModernExtend.lumiPowerOnBehavior();
            result.toZigbee.push(...extend.toZigbee);
            result.exposes.push(...extend.exposes);
        }
        if (args.operationMode === true) {
            const extend = lumiModernExtend.lumiOperationMode({description: 'Decoupled mode for a button'});
            if (args.endpointNames) {
                args.endpointNames.forEach(function(ep) {
                    const epExtend = lumiModernExtend.lumiOperationMode({
                        description: 'Decoupled mode for ' + ep.toString() + ' button',
                        endpointName: ep,
                    });
                    result.toZigbee.push(...epExtend.toZigbee);
                    result.exposes.push(...epExtend.exposes);
                });
            } else {
                result.toZigbee.push(...extend.toZigbee);
                result.exposes.push(...extend.exposes);
            }
        }
        if (args.lockRelay) {
            const extend = lumiModernExtend.lumiLockRelay();
            if (args.endpointNames) {
                args.endpointNames.forEach(function(ep) {
                    const epExtend = lumiModernExtend.lumiLockRelay({
                        description: 'Locks ' + ep.toString() + ' relay and prevents it from operating',
                        endpointName: ep,
                    });
                    result.toZigbee.push(...epExtend.toZigbee);
                    result.exposes.push(...epExtend.exposes);
                });
            } else {
                result.toZigbee.push(...extend.toZigbee);
                result.exposes.push(...extend.exposes);
            }
        }
        return result;
    },
    lumiSwitchType: (args?: Partial<modernExtend.EnumLookupArgs>) => modernExtend.enumLookup({
        name: 'switch_type',
        lookup: {'toggle': 1, 'momentary': 2, 'none': 3},
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x000a, type: 0x20},
        description: 'External switch type',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiMotorSpeed: (args?: Partial<modernExtend.EnumLookupArgs>) => modernExtend.enumLookup({
        name: 'motor_speed',
        lookup: {'low': 0, 'medium': 1, 'high': 2},
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x0408, type: 0x20},
        description: 'Controls the motor speed',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiPowerOnBehavior: (args?: Partial<modernExtend.EnumLookupArgs>) => modernExtend.enumLookup({
        name: 'power_on_behavior',
        lookup: {'on': 0, 'previous': 1, 'off': 2, 'inverted': 3},
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x0517, type: 0x20},
        description: 'Controls the behavior when the device is powered on after power loss',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiPowerOutageMemory: (args? :Partial<modernExtend.BinaryArgs>) => modernExtend.binary({
        name: 'power_outage_memory',
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x0201, type: 0x10},
        valueOn: [true, 1],
        valueOff: [false, 0],
        description: 'Controls the behavior when the device is powered on after power loss',
        access: 'ALL',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiOperationMode: (args?: Partial<modernExtend.EnumLookupArgs>) => modernExtend.enumLookup({
        name: 'operation_mode',
        lookup: {'decoupled': 0, 'control_relay': 1},
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x0200, type: 0x20},
        description: 'Decoupled mode for relay',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiAction: (args?: Partial<modernExtend.ActionEnumLookupArgs>) => modernExtend.actionEnumLookup({
        actionLookup: {'single': 1},
        cluster: 'genMultistateInput',
        attribute: 'presentValue',
        ...args,
    }),
    lumiVoc: (args?: Partial<modernExtend.NumericArgs>) => modernExtend.numeric({
        name: 'voc',
        cluster: 'genAnalogInput',
        attribute: 'presentValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 5},
        description: 'Measured VOC value',
        unit: 'ppb',
        access: 'STATE_GET',
        ...args,
    }),
    lumiAirQuality: (args?: Partial<modernExtend.EnumLookupArgs>) => modernExtend.enumLookup({
        name: 'air_quality',
        lookup: {'excellent': 1, 'good': 2, 'moderate': 3, 'poor': 4, 'unhealthy': 5, 'unknown': 0},
        cluster: 'manuSpecificLumi',
        attribute: 'airQuality',
        zigbeeCommandOptions: {disableDefaultResponse: true},
        description: 'Measured air quality',
        access: 'STATE_GET',
        ...args,
    }),
    lumiDisplayUnit: (args?: Partial<modernExtend.EnumLookupArgs>) => modernExtend.enumLookup({
        name: 'display_unit',
        lookup: {
            'mgm3_celsius': 0x00, // mg/m³, °C (default)
            'ppb_celsius': 0x01, // ppb, °C
            'mgm3_fahrenheit': 0x10, // mg/m³, °F
            'ppb_fahrenheit': 0x11, // ppb, °F
        },
        cluster: 'manuSpecificLumi',
        attribute: 'displayUnit',
        zigbeeCommandOptions: {disableDefaultResponse: true},
        description: 'Units to show on the display',
        entityCategory: 'config',
        ...args,
    }),
    lumiOutageCountRestoreBindReporting: (): ModernExtend => {
        const fromZigbee: Fz.Converter[] = [{
            cluster: 'manuSpecificLumi',
            type: ['attributeReport', 'readResponse'],
            convert: async (model, msg, publish, options, meta) => {
                // At least the Aqara TVOC sensor does not send a deviceAnnounce after comming back online.
                // The reconfigureReportingsOnDeviceAnnounce modernExtend is not usable because of this,
                //  there is however an outage counter published in the 'special' buffer  data reported
                //  under the manuSpecificLumi cluster as attribute 247, we simple decode and grab value with ID 5.
                // Normal attribute publishing and decoding will be left to the classic fromZigbee or modernExtends.
                if (msg.data.hasOwnProperty('247')) {
                    const dataDecoded = buffer2DataObject(model, msg.data['247']);
                    if (dataDecoded.hasOwnProperty('5')) {
                        assertNumber(dataDecoded['5']);

                        const currentOutageCount = dataDecoded['5'] - 1;
                        const previousOutageCount = meta.device?.meta?.outageCount ? meta.device.meta.outageCount : 0;

                        if (currentOutageCount > previousOutageCount) {
                            logger.debug('Restoring binding and reporting, device came back after losing power.', NS);
                            for (const endpoint of meta.device.endpoints) {
                                // restore bindings
                                for (const b of endpoint.binds) {
                                    await endpoint.bind(b.cluster.name, b.target);
                                }

                                // restore reporting
                                for (const c of endpoint.configuredReportings) {
                                    await endpoint.configureReporting(c.cluster.name, [{
                                        attribute: c.attribute.name, minimumReportInterval: c.minimumReportInterval,
                                        maximumReportInterval: c.maximumReportInterval, reportableChange: c.reportableChange,
                                    }]);
                                }
                            }

                            // update outageCount in database
                            meta.device.meta.outageCount = currentOutageCount;
                            meta.device.save();
                        }
                    }
                }
            },
        }];

        return {fromZigbee, isModernExtend: true};
    },
    lumiZigbeeOTA: (): ModernExtend => {
        // Many Lumi devices miss OTA on endpoint 1 even while supporting it.
        // https://github.com/Koenkk/zigbee2mqtt/issues/10660
        const result = modernExtend.quirkAddEndpointCluster({
            endpointID: 1,
            outputClusters: ['genOta'],
        });
        result.ota = ota.zigbeeOTA;
        return result;
    },
    lumiPower: (args?: Partial<modernExtend.NumericArgs>) => modernExtend.numeric({
        name: 'power',
        cluster: 'genAnalogInput',
        attribute: 'presentValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 5},
        description: 'Instantaneous measured power',
        unit: 'W',
        access: 'STATE',
        entityCategory: 'diagnostic',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiElectricityMeter: (): ModernExtend => {
        const exposes = [
            e.energy(),
            e.voltage(),
            e.current(),
        ];
        const fromZigbee: Fz.Converter[] = [{
            cluster: 'manuSpecificLumi',
            type: ['attributeReport', 'readResponse'],
            convert: async (model, msg, publish, options, meta) => {
                return await numericAttributes2Payload(msg, meta, model, options, msg.data);
            },
        }];

        return {exposes, fromZigbee, isModernExtend: true};
    },
    lumiOverloadProtection: (args?: Partial<modernExtend.NumericArgs>) => modernExtend.numeric({
        name: 'overload_protection',
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x020b, type: 0x39},
        description: 'Maximum allowed load, turns off if exceeded',
        valueMin: 100,
        valueMax: 3840,
        unit: 'W',
        access: 'ALL',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiLedIndicator: (args? :Partial<modernExtend.BinaryArgs>) => modernExtend.binary({
        name: 'led_indicator',
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x0203, type: 0x10},
        valueOn: ['ON', 1],
        valueOff: ['OFF', 0],
        description: 'LED indicator',
        access: 'ALL',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiLedDisabledNight: (args? :Partial<modernExtend.BinaryArgs>) => modernExtend.binary({
        name: 'led_disabled_night',
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x0203, type: 0x10},
        valueOn: [true, 1],
        valueOff: [false, 0],
        description: 'Enables/disables LED indicator at night',
        access: 'ALL',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiButtonLock: (args? :Partial<modernExtend.BinaryArgs>) => modernExtend.binary({
        name: 'button_lock',
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x0200, type: 0x20},
        valueOn: ['ON', 0],
        valueOff: ['OFF', 1],
        description: 'Disables the physical switch button',
        access: 'ALL',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiFlipIndicatorLight: (args? :Partial<modernExtend.BinaryArgs>) => modernExtend.binary({
        name: 'flip_indicator_light',
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x00F0, type: 0x20},
        valueOn: ['ON', 1],
        valueOff: ['OFF', 0],
        description: 'After turn on, the indicator light turns on while switch is off, and vice versa',
        access: 'ALL',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiPreventReset: (): ModernExtend => {
        const onEvent: OnEvent = async (type, data, device) => {
            if (
                // options.allow_reset ||
                type !== 'message' ||
                data.type !== 'attributeReport' ||
                data.cluster !== 'genBasic' ||
                !data.data[0xfff0] ||
                // eg: [0xaa, 0x10, 0x05, 0x41, 0x87, 0x01, 0x01, 0x10, 0x00]
                !data.data[0xFFF0].slice(0, 5).equals(Buffer.from([0xaa, 0x10, 0x05, 0x41, 0x87]))
            ) {
                return;
            }
            const payload = {
                [0xfff0]: {
                    value: [0xaa, 0x10, 0x05, 0x41, 0x47, 0x01, 0x01, 0x10, 0x01],
                    type: 0x41,
                },
            };
            await device.getEndpoint(1).write('genBasic', payload, {manufacturerCode});
        };
        return {onEvent, isModernExtend: true};
    },
    lumiClickMode: (args?: Partial<modernExtend.EnumLookupArgs>) => modernExtend.enumLookup({
        name: 'click_mode',
        lookup: {'fast': 1, 'multi': 2},
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x0125, type: 0x20},
        description: 'Click mode for wireless button. fast: only supports single click but allows faster reponse time.' +
            'multi: supports multiple types of clicks but is slower, because it awaits multiple clicks.',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiSlider: (): ModernExtend => {
        const fromZigbee: Fz.Converter[] = [{
            cluster: 'manuSpecificLumi',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty(652)) {
                    const actionLookup: KeyValueNumberString = {
                        1: 'slider_single',
                        2: 'slider_double',
                        3: 'slider_hold',
                        4: 'slider_up',
                        5: 'slider_down',
                    };
                    return {
                        action_slide_time: msg.data[561],
                        action_slide_speed: msg.data[562],
                        action_slide_relative_displacement: msg.data[563],
                        action: actionLookup[msg.data[652]],
                        action_slide_time_delta: msg.data[769],
                    };
                }
            },
        }];

        const exposes: Expose[] = [
            e.numeric('action_slide_time', ea.STATE).withUnit('ms').withCategory('diagnostic'),
            e.numeric('action_slide_speed', ea.STATE).withUnit('mm/s').withCategory('diagnostic'),
            e.numeric('action_slide_relative_displacement', ea.STATE).withCategory('diagnostic'),
            e.numeric('action_slide_time_delta', ea.STATE).withUnit('ms').withCategory('diagnostic'),
            // action is exposed from extraActions inside lumiAction
        ];

        return {fromZigbee, exposes, isModernExtend: true};
    },
    lumiLockRelay: (args? :Partial<modernExtend.BinaryArgs>) => modernExtend.binary({
        name: 'lock_relay',
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x0285, type: 0x20},
        valueOn: [true, 1],
        valueOff: [false, 0],
        description: 'Locks relay and prevents it from operating',
        access: 'ALL',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiSetEventMode: (): ModernExtend => {
        // I have no idea, why it is used everywhere, even if not supported
        // modes:
        // 0 - 'command' mode. keys send commands. useful for binding
        // 1 - 'event' mode. keys send events. useful for handling
        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
            },
        ];
        return {configure, isModernExtend: true};
    },
    lumiSwitchMode: (args?: Partial<modernExtend.EnumLookupArgs>) => modernExtend.enumLookup({
        name: 'mode_switch',
        lookup: {'quick_mode': 1, 'anti_flicker_mode': 4},
        cluster: 'manuSpecificLumi',
        attribute: {ID: 0x0004, type: 0x21},
        description: 'Anti flicker mode can be used to solve blinking issues of some lights.' +
            'Quick mode makes the device respond faster.',
        entityCategory: 'config',
        zigbeeCommandOptions: {manufacturerCode},
        ...args,
    }),
    lumiVibration: (): ModernExtend => {
        const exposes: Expose[] = [e.action(['shake', 'triple_strike'])];

        const fromZigbee: Fz.Converter[] = [{
            cluster: 'ssIasZone',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty(45)) {
                    const zoneStatus = msg.data[45];
                    const actionLookup: KeyValueNumberString = {1: 'shake', 2: 'triple_strike'};
                    return {action: actionLookup[zoneStatus]};
                }
            },
        }];

        return {exposes, fromZigbee, isModernExtend: true};
    },
    lumiMiscellaneous: (args?: {
        cluster: 'genBasic' | 'manuSpecificLumi',
        deviceTemperatureAttribute?: number,
        powerOutageCountAttribute?: number,
        resetsWhenPairing?: boolean,
    }): ModernExtend => {
        args = {cluster: 'manuSpecificLumi', deviceTemperatureAttribute: 3, powerOutageCountAttribute: 5, resetsWhenPairing: false, ...args};
        const exposes: Expose[] = [e.device_temperature(), e.power_outage_count(args.resetsWhenPairing)];

        const fromZigbee: Fz.Converter[] = [
            {
                cluster: args.cluster,
                type: ['attributeReport', 'readResponse'],
                convert: (model, msg, publish, options, meta) => {
                    const payload: KeyValueAny = {};
                    if (msg.data.hasOwnProperty(args.deviceTemperatureAttribute)) {
                        const value = msg.data[args.deviceTemperatureAttribute];
                        assertNumber(value);
                        payload['device_temperature'] = value;
                    }
                    if (msg.data.hasOwnProperty(args.powerOutageCountAttribute)) {
                        const value = msg.data[args.powerOutageCountAttribute];
                        assertNumber(value);
                        payload['power_outage_count'] = value - 1;
                    }
                    return payload;
                },
            },
        ];

        return {exposes, fromZigbee, isModernExtend: true};
    },
    lumiKnobRotation: (): ModernExtend => {
        const exposes: Expose[] = [
            e.action(['start_rotating', 'rotation', 'stop_rotating']),
            e.enum('action_rotation_button_state', ea.STATE, ['released', 'pressed'])
                .withDescription('Button state during rotation').withCategory('diagnostic'),
            e.numeric('action_rotation_angle', ea.STATE)
                .withUnit('*').withDescription('Rotation angle').withCategory('diagnostic'),
            e.numeric('action_rotation_angle_speed', ea.STATE)
                .withUnit('*').withDescription('Rotation angle speed').withCategory('diagnostic'),
            e.numeric('action_rotation_percent', ea.STATE).withUnit('%')
                .withDescription('Rotation percent').withCategory('diagnostic'),
            e.numeric('action_rotation_percent_speed', ea.STATE)
                .withUnit('%').withDescription('Rotation percent speed').withCategory('diagnostic'),
            e.numeric('action_rotation_time', ea.STATE)
                .withUnit('ms').withDescription('Rotation time').withCategory('diagnostic'),
        ];

        const fromZigbee: Fz.Converter[] = [{
            cluster: 'manuSpecificLumi',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty(570)) {
                    const act: KeyValueNumberString = {1: 'start_rotating', 2: 'rotation', 3: 'stop_rotating'};
                    const state: KeyValueNumberString = {0: 'released', 128: 'pressed'};
                    return {
                        action: act[msg.data[570] & ~128],
                        action_rotation_button_state: state[msg.data[570] & 128],
                        action_rotation_angle: msg.data[558],
                        action_rotation_angle_speed: msg.data[560],
                        action_rotation_percent: msg.data[563],
                        action_rotation_percent_speed: msg.data[562],
                        action_rotation_time: msg.data[561],
                    };
                }
            },
        }];

        return {exposes, fromZigbee, isModernExtend: true};
    },
    lumiCommandMode: (args?: {setEventMode: boolean}): ModernExtend => {
        args = {setEventMode: true, ...args};
        const exposes: Expose[] = [
            e.enum('operation_mode', ea.ALL, ['event', 'command'])
                .withDescription('Command mode is usefull for binding. Event mode is usefull for processing.'),
        ];

        const toZigbee: Tz.Converter[] = [{
            key: ['operation_mode'],
            convertSet: async (entity, key, value, meta) => {
                assertString(value);
                // modes:
                // 0 - 'command' mode. keys send commands. useful for binding
                // 1 - 'event' mode. keys send events. useful for handling
                const lookup = {command: 0, event: 1};
                const endpoint = meta.device.getEndpoint(1);
                await endpoint.write('manuSpecificLumi', {'mode': getFromLookup(value.toLowerCase(), lookup)},
                    {manufacturerCode: manufacturerOptions.lumi.manufacturerCode});
                return {state: {operation_mode: value.toLowerCase()}};
            },
            convertGet: async (entity, key, meta) => {
                const endpoint = meta.device.getEndpoint(1);
                await endpoint.read('manuSpecificLumi', ['mode'], {manufacturerCode: manufacturerOptions.lumi.manufacturerCode});
            },
        }];
        const result: ModernExtend = {exposes, toZigbee, isModernExtend: true};

        if (args.setEventMode) {
            result.configure = lumiModernExtend.lumiSetEventMode().configure;
        }

        return result;
    },
    lumiBattery: (args?: {
        cluster?: 'genBasic' | 'manuSpecificLumi',
        voltageToPercentage?: string | {min: number, max: number},
        percentageAtrribute?: number,
        voltageAttribute?: number,
    }): ModernExtend => {
        args = {
            cluster: 'manuSpecificLumi',
            percentageAtrribute: 1,
            voltageAttribute: 1,
            ...args,
        };
        const exposes: Expose[] = [e.battery(), e.battery_voltage()];

        const fromZigbee: Fz.Converter[] = [
            {
                cluster: args.cluster,
                type: ['attributeReport', 'readResponse'],
                convert: (model, msg, publish, options, meta) => {
                    const payload: KeyValueAny = {};
                    const lookup: KeyValueAny = numericAttributes2Lookup(model, msg.data);
                    if (lookup[args.percentageAtrribute.toString()]) {
                        const value = lookup[args.percentageAtrribute];
                        assertNumber(value);
                        if (!args.voltageToPercentage) payload.battery = value;
                    }
                    if (lookup[args.voltageAttribute.toString()]) {
                        const value = lookup[args.voltageAttribute];
                        assertNumber(value);
                        payload.voltage = value;
                        if (args.voltageToPercentage) payload.battery = batteryVoltageToPercentage(value, args.voltageToPercentage);
                    }
                    return payload;
                },
            },
        ];

        return {exposes, fromZigbee, isModernExtend: true};
    },
};

export {lumiModernExtend as modernExtend};

const feederDaysLookup = {
    0x7f: 'everyday',
    0x1f: 'workdays',
    0x60: 'weekend',
    0x01: 'mon',
    0x02: 'tue',
    0x04: 'wed',
    0x08: 'thu',
    0x10: 'fri',
    0x20: 'sat',
    0x40: 'sun',
    0x55: 'mon-wed-fri-sun',
    0x2a: 'tue-thu-sat',
};

export const fromZigbee = {
    // lumi generic
    lumi_basic: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: async (model, msg, publish, options, meta) => {
            return await numericAttributes2Payload(msg, meta, model, options, msg.data);
        },
    } satisfies Fz.Converter,
    lumi_basic_raw: {
        cluster: 'genBasic',
        type: ['raw'],
        convert: async (model, msg, publish, options, meta) => {
            let payload = {};
            if (Buffer.isBuffer(msg.data)) {
                const dataObject = buffer2DataObject(model, msg.data);
                payload = await numericAttributes2Payload(msg, meta, model, options, dataObject);
            }
            return payload;
        },
    } satisfies Fz.Converter,
    lumi_specific: {
        cluster: 'manuSpecificLumi',
        type: ['attributeReport', 'readResponse'],
        convert: async (model, msg, publish, options, meta) => {
            return await numericAttributes2Payload(msg, meta, model, options, msg.data);
        },
    } satisfies Fz.Converter,
    lumi_co2: {
        cluster: 'msCO2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {co2: Math.floor(msg.data.measuredValue)};
        },
    } satisfies Fz.Converter,
    lumi_pm25: {
        cluster: 'pm25Measurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['measuredValue']) {
                return {pm25: msg.data['measuredValue']};
            }
        },
    } satisfies Fz.Converter,
    lumi_contact: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {contact: msg.data['onOff'] === 0};
        },
    } satisfies Fz.Converter,
    lumi_power: {
        cluster: 'genAnalogInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {power: msg.data['presentValue']};
        },
    } satisfies Fz.Converter,
    lumi_action: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (['QBKG04LM', 'QBKG11LM', 'QBKG21LM', 'QBKG03LM', 'QBKG12LM', 'QBKG22LM'].includes(model.model) && msg.data['61440']) {
                return;
            }

            if (model.model === 'WXKG11LM') {
                let clicks;
                if (msg.data.onOff) {
                    clicks = 1;
                } else if (msg.data['32768']) {
                    clicks = msg.data['32768'];
                }

                const actionLookup: KeyValueAny = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                if (actionLookup[clicks]) {
                    return {action: actionLookup[clicks]};
                }
                return;
            }

            if (['QBKG21LM', 'QBKG04LM'].includes(model.model) && msg.endpoint.ID !== 4) return;

            let mapping: KeyValueNumberString = null;
            if (['QBKG03LM', 'QBKG12LM', 'QBKG22LM'].includes(model.model)) mapping = {4: 'left', 5: 'right', 6: 'both'};
            if (['WXKG02LM_rev1', 'WXKG02LM_rev2', 'WXKG07LM'].includes(model.model)) mapping = {1: 'left', 2: 'right', 3: 'both'};

            // Maybe other QKBG also support release/hold?
            const actionLookup: KeyValueAny = !isLegacyEnabled(options) && ['QBKG03LM', 'QBKG22LM', 'QBKG04LM', 'QBKG21LM'].includes(model.model) ?
                {0: 'hold', 1: 'release', 2: 'double'} : {0: 'single', 1: 'single'};

            const action = actionLookup[msg.data['onOff']];
            const button = mapping && mapping[msg.endpoint.ID] ? `_${mapping[msg.endpoint.ID]}` : '';

            if (action === 'release') {
                const anotherAction = globalStore.getValue(msg.endpoint, 'hold', false) ? 'hold_release' : 'single';
                publish({action: `${anotherAction}${button}`});
            }
            globalStore.putValue(msg.endpoint, 'hold', action === 'hold');

            return {action: `${action}${button}`};
        },
    } satisfies Fz.Converter,
    lumi_action_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;

            // cubes
            if (model.model === 'MFKZQ01LM') {
                /*
                Source: https://github.com/kirovilya/ioBroker.zigbee
                    +---+
                    | 2 |
                +---+---+---+
                | 4 | 0 | 1 |
                +---+---+---+
                    |M5I|
                    +---+
                    | 3 |
                    +---+
                Side 5 is with the MI logo, side 3 contains the battery door.
                presentValue = 0 = shake
                presentValue = 2 = wakeup
                presentValue = 3 = fly/fall
                presentValue = y + x * 8 + 64 = 90º Flip from side x on top to side y on top
                presentValue = x + 128 = 180º flip to side x on top
                presentValue = x + 256 = push/slide cube while side x is on top
                presentValue = x + 512 = double tap while side x is on top
                */
                const value = msg.data['presentValue'];
                let result = null;

                if (value === 0) result = {action: 'shake'};
                else if (value === 1) result = {action: 'throw'};
                else if (value === 2) result = {action: 'wakeup'};
                else if (value === 3) result = {action: 'fall'};
                else if (value >= 512) result = {action: 'tap', side: value-512};
                else if (value >= 256) result = {action: 'slide', side: value-256};
                else if (value >= 128) result = {action: 'flip180', side: value-128};
                else if (value >= 64) {
                    result = {
                        action: 'flip90', action_from_side: Math.floor((value-64) / 8), action_to_side: value % 8, action_side: value % 8,
                        from_side: Math.floor((value-64) / 8), to_side: value % 8, side: value % 8,
                    };
                }

                if (result && !isLegacyEnabled(options)) {
                    delete result.to_side;
                    delete result.from_side;
                }

                return result ? result : null;
            }
            if (model.model === 'CTP-R01') {
                const value = msg.data['presentValue'];
                let payload;
                if (value === 0) payload = {action: 'shake'};
                else if (value === 1) payload = {action: 'throw'};
                else if (value === 2) payload = {action: '1_min_inactivity'};
                else if (value === 4) payload = {action: 'hold'};
                else if (value >= 1024) payload = {action: 'flip_to_side', side: value - 1023};
                else if (value >= 512) payload = {action: 'tap', side: value - 511};
                else if (value >= 256) payload = {action: 'slide', side: value - 255};
                else if (value >= 128) {
                    payload = {
                        action: 'flip180', side: value - 127,
                        action_from_side: 7 - value + 127,
                    };
                } else if (value >= 64) {
                    payload = {
                        action: 'flip90', side: value % 8 + 1,
                        action_from_side: Math.floor((value - 64) / 8) + 1,
                    };
                } else {
                    logger.debug(`${model.model}: unknown action with value ${value}`, NS);
                }
                return payload;
            }

            let actionLookup: KeyValueAny = {0: 'hold', 1: 'single', 2: 'double', 3: 'triple', 255: 'release'};

            // mini switches and opple
            if (model.model === 'WXKG12LM') {
                actionLookup = {...actionLookup, 16: 'hold', 17: 'release', 18: 'shake'};
            }
            if (['WXKG13LM', 'WXKG04LM', 'WXCJKG11LM', 'WXCJKG12LM', 'WXCJKG13LM'].includes(model.model)) {
                actionLookup = {...actionLookup, 5: 'quintuple', 6: 'many'};
            }

            // wall switches
            let buttonLookup: KeyValueNumberString = null;
            if (['WXKG02LM_rev2', 'WXKG07LM', 'WXKG15LM', 'WXKG17LM', 'WXKG22LM'].includes(model.model)) {
                buttonLookup = {1: 'left', 2: 'right', 3: 'both'};
            }
            if (['QBKG12LM', 'QBKG24LM'].includes(model.model)) buttonLookup = {5: 'left', 6: 'right', 7: 'both'};
            if (['QBKG39LM', 'QBKG41LM', 'WS-EUK02', 'WS-EUK04', 'QBKG18LM', 'QBKG20LM', 'QBKG28LM', 'QBKG31LM', 'ZNQBKG25LM']
                .includes(model.model)) {
                buttonLookup = {41: 'left', 42: 'right', 51: 'both'};
            }
            if (['QBKG25LM', 'QBKG26LM', 'QBKG29LM', 'QBKG32LM', 'QBKG33LM', 'QBKG34LM', 'ZNQBKG31LM', 'ZNQBKG26LM'].includes(model.model)) {
                buttonLookup = {
                    41: 'left', 42: 'center', 43: 'right',
                    51: 'left_center', 52: 'left_right', 53: 'center_right',
                    61: 'all',
                };
            }
            // Z1 switches, ZNQBKG38LM only 1 button, so not add buttonLookup
            if (['ZNQBKG39LM'].includes(model.model)) {
                buttonLookup = {1: 'top', 2: 'bottom'};
            }
            if (['ZNQBKG40LM'].includes(model.model)) {
                buttonLookup = {1: 'top', 2: 'center', 3: 'bottom'};
            }
            if (['ZNQBKG41LM'].includes(model.model)) {
                buttonLookup = {1: 'top', 2: 'center', 3: 'bottom', 4: 'wireless'};
            }
            if (['WS-USC02', 'WS-USC04'].includes(model.model)) {
                buttonLookup = {41: 'top', 42: 'bottom', 51: 'both'};
            }

            const action = actionLookup[msg.data['presentValue']];

            if (['WXKG04LM', 'WXCJKG11LM', 'WXCJKG12LM', 'WXCJKG13LM'].includes(model.model)) {
                clearTimeout(globalStore.getValue(msg.endpoint, 'timer'));
                // 0 = hold
                const button = msg.endpoint.ID;
                if (msg.data.presentValue === 0) {
                    // Aqara Opple does not generate a release event when pressed for more than 5 seconds
                    // After 5 seconds of not releasing we assume release.
                    const timer = setTimeout(() => publish({action: `button_${button}_release`}), 5000);
                    globalStore.putValue(msg.endpoint, 'timer', timer);
                }
                return {action: `button_${button}_${action}`};
            }

            if (buttonLookup) {
                const button = buttonLookup[msg.endpoint.ID];
                if (button) {
                    return {action: `${action}_${button}`};
                }
            } else {
                return {action};
            }
        },
    } satisfies Fz.Converter,
    lumi_action_analog: {
        cluster: 'genAnalogInput',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (model.model === 'MFKZQ01LM') {
                /*
                Source: https://github.com/kirovilya/ioBroker.zigbee
                presentValue = rotation angle left < 0, right > 0
                */
                const value = msg.data['presentValue'];
                const result: KeyValueAny = {
                    action: value < 0 ? 'rotate_left' : 'rotate_right',
                    angle: Math.floor(value * 100) / 100,
                    action_angle: Math.floor(value * 100) / 100,
                };

                if (!isLegacyEnabled(options)) delete result.angle;
                return result;
            }
            if (model.model === 'CTP-R01') {
                const value = msg.data['presentValue'];
                return {
                    action: value < 0 ? 'rotate_left' : 'rotate_right',
                    action_angle: Math.floor(value * 100) / 100,
                };
            }
        },
    } satisfies Fz.Converter,
    lumi_temperature: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const temperature = parseFloat(msg.data['measuredValue']) / 100.0;

            // https://github.com/Koenkk/zigbee2mqtt/issues/798
            // Sometimes the sensor publishes non-realistic vales.
            if (temperature > -65 && temperature < 65) {
                return {temperature};
            }
        },
    } satisfies Fz.Converter,
    lumi_pressure: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: async (model, msg, publish, options, meta) => {
            const result = await fz.pressure.convert(model, msg, publish, options, meta);
            if (result && result.pressure > 500 && result.pressure < 2000) {
                return result;
            }
        },
    } satisfies Fz.Converter,

    // lumi class specific
    lumi_feeder: {
        cluster: 'manuSpecificLumi',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            Object.entries(msg.data).forEach(([key, value]) => {
                switch (parseInt(key)) {
                case 0xfff1: {
                    // @ts-expect-error
                    if (value.length < 8) {
                        logger.debug(`Cannot handle ${value}, frame too small`, 'zhc:lumi:feeder');
                        return;
                    }
                    // @ts-expect-error
                    const attr = value.slice(3, 7);
                    // @ts-expect-error
                    const len = value.slice(7, 8).readUInt8();
                    // @ts-expect-error
                    const val = value.slice(8, 8 + len);
                    switch (attr.readInt32BE()) {
                    case 0x04150055: // feeding
                        result['feed'] = '';
                        break;
                    case 0x041502bc: { // feeding report
                        const report = val.toString();
                        result['feeding_source'] = {0: 'schedule', 1: 'manual', 2: 'remote'}[parseInt(report.slice(0, 2))];
                        result['feeding_size'] = parseInt(report.slice(3, 4));
                        break;
                    }
                    case 0x0d680055: // portions per day
                        result['portions_per_day'] = val.readUInt16BE();
                        break;
                    case 0x0d690055: // weight per day
                        result['weight_per_day'] = val.readUInt32BE();
                        break;
                    case 0x0d0b0055: // error ?
                        result['error'] = getFromLookup(val.readUInt8(), {1: true, 0: false});
                        break;
                    case 0x080008c8: { // schedule string
                        const schlist = val.toString().split(',');
                        const schedule: unknown[] = [];
                        schlist.forEach((str: string) => { // 7f13000100
                            if (str !== '//') {
                                const feedtime = Buffer.from(str, 'hex');
                                schedule.push({
                                    'days': getFromLookup(feedtime[0], feederDaysLookup),
                                    'hour': feedtime[1],
                                    'minute': feedtime[2],
                                    'size': feedtime[3],
                                });
                            }
                        });
                        result['schedule'] = schedule;
                        break;
                    }
                    case 0x04170055: // indicator
                        result['led_indicator'] = getFromLookup(val.readUInt8(), {1: 'ON', 0: 'OFF'});
                        break;
                    case 0x04160055: // child lock
                        result['child_lock'] = getFromLookup(val.readUInt8(), {1: 'LOCK', 0: 'UNLOCK'});
                        break;
                    case 0x04180055: // mode
                        result['mode'] = getFromLookup(val.readUInt8(), {1: 'schedule', 0: 'manual'});
                        break;
                    case 0x0e5c0055: // serving size
                        result['serving_size'] = val.readUInt8();
                        break;
                    case 0x0e5f0055: // portion weight
                        result['portion_weight'] = val.readUInt8();
                        break;
                    case 0x080007d1: // ? 64
                    case 0x0d090055: // ? 00
                        logger.debug(`Unhandled attribute ${attr} = ${val}`, 'zhc:lumi:feeder');
                        break;
                    default:
                        logger.debug(`Unknown attribute ${attr} = ${val}`, 'zhc:lumi:feeder');
                    }
                    break;
                }
                case 0x00ff: // 80:13:58:91:24:33:20:24:58:53:44:07:05:97:75:17
                case 0x0007: // 00:00:00:00:1d:b5:a6:ed
                case 0x00f7: // 05:21:14:00:0d:23:21:25:00:00:09:21:00:01
                    logger.debug(`Unhandled key ${key} = ${value}`, 'zhc:lumi:feeder');
                    break;
                default:
                    logger.debug(`Unknown key ${key} = ${value}`, 'zhc:lumi:feeder');
                }
            });
            return result;
        },
    } satisfies Fz.Converter,
    lumi_trv: {
        cluster: 'manuSpecificLumi',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            Object.entries(msg.data).forEach(([key, value]) => {
                switch (parseInt(key)) {
                case 0x0271:
                    result['system_mode'] = getFromLookup(value, {1: 'heat', 0: 'off'});
                    break;
                case 0x0272:
                    // @ts-expect-error
                    Object.assign(result, trv.decodePreset(value));
                    break;
                case 0x0273:
                    result['window_detection'] = getFromLookup(value, {1: true, 0: false});
                    break;
                case 0x0274:
                    result['valve_detection'] = getFromLookup(value, {1: true, 0: false});
                    break;
                case 0x0277:
                    result['child_lock'] = getFromLookup(value, {1: true, 0: false});
                    break;
                case 0x0279:
                    assertNumber(value);
                    result['away_preset_temperature'] = (value / 100).toFixed(1);
                    break;
                case 0x027b:
                    result['calibrated'] = getFromLookup(value, {1: true, 0: false});
                    break;
                case 0x027e:
                    result['sensor'] = getFromLookup(value, {1: 'external', 0: 'internal'});
                    break;
                case 0x040a:
                    result['battery'] = value;
                    break;
                case 0x027a:
                    result['window_open'] = getFromLookup(value, {1: true, 0: false});
                    break;
                case 0x0275:
                    result['valve_alarm'] = getFromLookup(value, {1: true, 0: false});
                    break;
                case 247: {
                    // @ts-expect-error
                    const heartbeat = trv.decodeHeartbeat(meta, model, value);

                    logger.debug(`${model.model}: Processed heartbeat message into payload ${JSON.stringify(heartbeat)}`, 'zhc:lumi:trv');

                    if (heartbeat.firmware_version) {
                        // Overwrite the "placeholder" version `0.0.0_0025` advertised by `genBasic`
                        // with the correct version from the heartbeat.
                        // This is not reflected in the frontend unless the device is reconfigured
                        // or the whole service restarted.
                        // See https://github.com/Koenkk/zigbee-herdsman-converters/pull/5363#discussion_r1081477047
                        // @ts-expect-error
                        meta.device.softwareBuildID = heartbeat.firmware_version;
                        delete heartbeat.firmware_version;
                    }

                    Object.assign(result, heartbeat);
                    break;
                }
                case 0x027d:
                    result['schedule'] = getFromLookup(value, {1: true, 0: false});
                    break;
                case 0x0276: {
                    const buffer = value as Buffer;
                    // Buffer is empty first message after pairing
                    // https://github.com/Koenkk/zigbee-herdsman-converters/issues/7128
                    if (buffer.length) {
                        const schedule = trv.decodeSchedule(buffer);
                        result['schedule_settings'] = trv.stringifySchedule(schedule);
                    }
                    break;
                }
                case 0x00EE: {
                    meta.device.meta.lumiFileVersion = value;
                    meta.device.save();
                    break;
                }
                case 0xfff2:
                case 0x00ff: // 4e:27:49:bb:24:b6:30:dd:74:de:53:76:89:44:c4:81
                case 0x027c: // 0x00
                case 0x0280: // 0x00/0x01
                    logger.debug(`Unhandled key ${key} = ${value}`, 'zhc:lumi:trv');
                    break;
                default:
                    logger.warning(`Unknown key ${key} = ${value}`, 'zhc:lumi:trv');
                }
            });
            return result;
        },
    } satisfies Fz.Converter,
    lumi_presence_region_events: {
        cluster: 'manuSpecificLumi',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValue = {};

            Object.entries(msg.data).forEach(([key, value]) => {
                const eventKey = parseInt(key);

                switch (eventKey) {
                case presence.constants.region_event_key: {
                    if (
                        !Buffer.isBuffer(value) ||
                        !(typeof value[0] === 'string' || typeof value[0] === 'number') ||
                        !(typeof value[1] === 'string' || typeof value[1] === 'number')
                    ) {
                        logger.warning(`Action: Unrecognized payload structure '${JSON.stringify(value)}'`, NS);
                        break;
                    }

                    const [regionIdRaw, eventTypeCodeRaw] = value;
                    // @ts-expect-error
                    const regionId = parseInt(regionIdRaw, 10);
                    // @ts-expect-error
                    const eventTypeCode = parseInt(eventTypeCodeRaw, 10);

                    if (Number.isNaN(regionId)) {
                        logger.warning(`Action: Invalid regionId "${regionIdRaw}"`, NS);
                        break;
                    }
                    if (!Object.values(presence.constants.region_event_types).includes(eventTypeCode)) {
                        logger.warning(`Action: Unknown region event type "${eventTypeCode}"`, NS);
                        break;
                    }

                    const eventTypeName = presence.mappers.lumi_presence.region_event_type_names[eventTypeCode];
                    logger.debug(`Action: Triggered event (region "${regionId}", type "${eventTypeName}")`, NS);
                    payload.action = `region_${regionId}_${eventTypeName}`;
                    break;
                }
                }
            });

            return payload;
        },
    } satisfies Fz.Converter,
    lumi_lock_report: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['65328']) {
                const data = msg.data['65328'];
                const state = data.substr(2, 2);
                const action = data.substr(4, 2);
                const keynum = data.substr(6, 2);
                if (state == 11) {
                    if (action == 1) {
                        // unknown key
                        return {keyerror: true, inserted: 'unknown'};
                    }
                    if (action == 3) {
                        // explicitly disabled key (i.e. reported lost)
                        return {keyerror: true, inserted: keynum};
                    }
                    if (action == 7) {
                        // strange object introduced into the cylinder (e.g. a lock pick)
                        return {keyerror: true, inserted: 'strange'};
                    }
                }
                if (state == 12) {
                    if (action == 1) {
                        return {inserted: keynum};
                    }
                    if (action == 11) {
                        return {forgotten: keynum};
                    }
                }
            }
        },
    } satisfies Fz.Converter,
    lumi_occupancy_illuminance: {
        // This is for occupancy sensor that only send a message when motion detected,
        // but do not send a motion stop.
        // Therefore we need to publish the no_motion detected by ourselves.
        cluster: 'manuSpecificLumi',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.occupancy_timeout_2(), exposes.options.no_occupancy_since_true()],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('illuminance')) {
                // The occupancy sensor only sends a message when motion detected.
                // Therefore we need to publish the no_motion detected by ourselves.
                let timeout = meta && meta.state && meta.state.hasOwnProperty('detection_interval') ?
                    Number(meta.state.detection_interval) : ['RTCGQ14LM'].includes(model.model) ? 30 : 60;
                timeout = options && options.hasOwnProperty('occupancy_timeout') && Number(options.occupancy_timeout) >= timeout ?
                    Number(options.occupancy_timeout) : timeout + 2;

                // Stop existing timers because motion is detected and set a new one.
                clearTimeout(globalStore.getValue(msg.endpoint, 'occupancy_timer', null));

                if (timeout !== 0) {
                    const timer = setTimeout(() => {
                        publish({occupancy: false});
                    }, timeout * 1000);

                    globalStore.putValue(msg.endpoint, 'occupancy_timer', timer);
                }

                // Sometimes RTCGQ14LM reports high illuminance values in the dark
                // https://github.com/Koenkk/zigbee2mqtt/issues/12596
                const illuminance = msg.data['illuminance'] > 130536 ? 0 : msg.data['illuminance'] - 65536;

                const payload = {occupancy: true, illuminance};
                noOccupancySince(msg.endpoint, options, publish, 'start');
                return payload;
            }
        },
    } satisfies Fz.Converter,
    lumi_curtain_position: {
        cluster: 'genAnalogOutput',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.invert_cover()],
        convert: (model, msg, publish, options, meta) => {
            if ((model.model === 'ZNCLDJ12LM') &&
              msg.type === 'attributeReport' && [0, 2].includes(msg.data['presentValue'])) {
                // Incorrect reports from the device, ignore (re-read by onEvent of ZNCLDJ12LM)
                // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1427#issuecomment-663862724
                return;
            }

            let position = precisionRound(msg.data['presentValue'], 2);
            position = options.invert_cover ? 100 - position : position;
            return {position};
        },
    } satisfies Fz.Converter,
    lumi_curtain_position_tilt: {
        cluster: 'closuresWindowCovering',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.invert_cover()],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            const invert = model.meta && model.meta.coverInverted ? !options.invert_cover : options.invert_cover;
            if (msg.data.hasOwnProperty('currentPositionLiftPercentage') && msg.data['currentPositionLiftPercentage'] <= 100) {
                const value = msg.data['currentPositionLiftPercentage'];
                const position = invert ? 100 - value : value;
                const state = invert ? (position > 0 ? 'CLOSE' : 'OPEN') : (position > 0 ? 'OPEN' : 'CLOSE');
                result[postfixWithEndpointName('position', msg, model, meta)] = position;
                result[postfixWithEndpointName('state', msg, model, meta)] = state;
            }
            if (msg.data.hasOwnProperty('currentPositionTiltPercentage') && msg.data['currentPositionTiltPercentage'] <= 100) {
                const value = msg.data['currentPositionTiltPercentage'];
                result[postfixWithEndpointName('tilt', msg, model, meta)] = invert ? 100 - value : value;
            }
            return result;
        },
    } satisfies Fz.Converter,
    lumi_operation_mode_basic: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValueAny = {};

            if (model.meta && !model.meta.multiEndpoint) {
                const mappingMode: KeyValueNumberString = {0x12: 'control_relay', 0xFE: 'decoupled'};
                const key = 0xFF22;
                if (msg.data.hasOwnProperty(key)) {
                    payload.operation_mode = mappingMode[msg.data[key]];
                }
            } else {
                const mappingButton: KeyValueNumberString = {0xFF22: 'left', 0xFF23: 'right'};
                const mappingMode: KeyValueNumberString = {0x12: 'control_left_relay', 0x22: 'control_right_relay', 0xFE: 'decoupled'};
                for (const key in mappingButton) {
                    if (msg.data.hasOwnProperty(key)) {
                        payload[`operation_mode_${mappingButton[key]}`] = mappingMode[msg.data[key]];
                    }
                }
            }

            return payload;
        },
    } satisfies Fz.Converter,
    lumi_bulb_interval: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['65281']) {
                const data = msg.data['65281'];
                return {
                    state: data['100'] === 1 ? 'ON' : 'OFF',
                    brightness: data['101'],
                    color_temp: data['102'],
                };
            }
        },
    } satisfies Fz.Converter,
    lumi_on_off: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // Lumi wall switches use endpoint 4, 5 or 6 to indicate an action on the button so we have to skip that.
            if (msg.data.hasOwnProperty('onOff') && ![4, 5, 6].includes(msg.endpoint.ID)) {
                const property = postfixWithEndpointName('state', msg, model, meta);
                return {[property]: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    } satisfies Fz.Converter,
    lumi_curtain_status: {
        cluster: 'genMultistateOutput',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            let running = false;
            const data = msg.data;
            let lookup: KeyValueAny = {};

            // For lumi.curtain.hagl04 and lumi.curtain.hagl07
            if (['ZNCLDJ12LM', 'ZNCLDJ14LM'].includes(model.model)) lookup = {0: 'closing', 1: 'opening', 2: 'stopped'};
            // for lumi.curtain.acn002
            if (['ZNJLBL01LM'].includes(model.model)) lookup = {0: 'closing', 1: 'opening', 2: 'stopped', 3: 'blocked'};

            if (data && data.hasOwnProperty('presentValue')) {
                const value = data['presentValue'];
                if (value < 2) {
                    running = true;
                }
                return {
                    motor_state: lookup[value],
                    running: running,
                };
            }
        },
    } satisfies Fz.Converter,
    lumi_curtain_options: {
        cluster: 'manuSpecificLumi',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('curtainHandOpen')) {
                return {hand_open: msg.data['curtainHandOpen'] === 0};
            } else if (msg.data.hasOwnProperty('curtainReverse')) {
                return {reverse_direction: msg.data['curtainReverse'] === 1};
            } else if (msg.data.hasOwnProperty('curtainCalibrated')) {
                return {limits_calibration: (msg.data['curtainCalibrated'] === 1) ? 'calibrated' : 'recalibrate'};
            }
        },
    } satisfies Fz.Converter,
    lumi_vibration_analog: {
        cluster: 'closuresDoorLock',
        type: ['attributeReport', 'readResponse'],
        options: [
            exposes.options.vibration_timeout(),
            exposes.options.calibration('x'),
            exposes.options.calibration('y'),
            exposes.options.calibration('z'),
        ],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};

            if (msg.data['85']) {
                const vibrationLookup: KeyValueAny = {1: 'vibration', 2: 'tilt', 3: 'drop'};
                result.action = vibrationLookup[msg.data['85']];

                // Device only sends a message when vibration is detected.
                // Therefore we need to publish a no_vibration message on our own.
                if (result.action === 'vibration') {
                    result.vibration = true;

                    const timeout = options && options.hasOwnProperty('vibration_timeout') ? Number(options.vibration_timeout) : 90;

                    // Stop any existing timer cause vibration detected
                    clearTimeout(globalStore.getValue(msg.endpoint, 'vibration_timer', null));
                    globalStore.putValue(msg.endpoint, 'vibration_timer', null);

                    // Set new timer to publish no_vibration message
                    if (timeout !== 0) {
                        const timer = setTimeout(() => {
                            publish({vibration: false});
                        }, timeout * 1000);

                        globalStore.putValue(msg.endpoint, 'vibration_timer', timer);
                    }
                }
            }

            if (msg.data['1283']) {
                result.angle = msg.data['1283'];
            }

            if (msg.data['1285']) {
                // https://github.com/dresden-elektronik/deconz-rest-plugin/issues/748#issuecomment-419669995
                // Only first 2 bytes are relevant.
                const data = (msg.data['1285'] >> 8);
                // Swap byte order
                result.strength = ((data & 0xFF) << 8) | ((data >> 8) & 0xFF);
            }

            if (msg.data['1288']) {
                const data = msg.data['1288'];

                // array interpretation:
                // 12 bit two's complement sign extended integer
                // data[1][bit0..bit15] : x
                // data[1][bit16..bit31]: y
                // data[0][bit0..bit15] : z
                // left shift first to preserve sign extension for 'x'
                let x = ((data['1'] << 16) >> 16);
                let y = (data['1'] >> 16);
                // left shift first to preserve sign extension for 'z'
                let z = ((data['0'] << 16) >> 16);

                // simple offset calibration
                x=calibrateAndPrecisionRoundOptions(x, options, 'x');
                y=calibrateAndPrecisionRoundOptions(y, options, 'y');
                z=calibrateAndPrecisionRoundOptions(z, options, 'z');

                // calibrated accelerometer values
                result.x_axis=x;
                result.y_axis=y;
                result.z_axis=z;

                // calculate angle
                result.angle_x = Math.round(Math.atan(x/Math.sqrt(y*y+z*z)) * 180 / Math.PI);
                result.angle_y = Math.round(Math.atan(y/Math.sqrt(x*x+z*z)) * 180 / Math.PI);
                result.angle_z = Math.round(Math.atan(z/Math.sqrt(x*x+y*y)) * 180 / Math.PI);

                // calculate absolute angle
                const R = Math.sqrt(x * x + y * y + z * z);
                result.angle_x_absolute = Math.round((Math.acos(x / R)) * 180 / Math.PI);
                result.angle_y_absolute = Math.round((Math.acos(y / R)) * 180 / Math.PI);
            }

            return result;
        },
    } satisfies Fz.Converter,
    lumi_illuminance: {
        cluster: 'msIlluminanceMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // also trigger movement, because there is no illuminance without movement
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1925
            msg.data.occupancy = 1;
            const payload = fz.occupancy_with_timeout.convert(model, msg, publish, options, meta) as KeyValueAny;
            if (payload) {
                // DEPRECATED: remove illuminance_lux here.
                const illuminance = msg.data['measuredValue'];
                payload.illuminance = illuminance;
                payload.illuminance_lux = illuminance;
            }
            return payload;
        },
    } satisfies Fz.Converter,
    lumi_occupancy: {
        // This is for occupancy sensor that only send a message when motion detected,
        // but do not send a motion stop.
        // Therefore we need to publish the no_motion detected by ourselves.
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.occupancy_timeout_2(), exposes.options.no_occupancy_since_true()],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.occupancy !== 1) {
                // In case of 0 no occupancy is reported.
                // https://github.com/Koenkk/zigbee2mqtt/issues/467
                return;
            }

            // The occupancy sensor only sends a message when motion detected.
            // Therefore we need to publish the no_motion detected by ourselves.
            let timeout: number = meta && meta.state && meta.state.hasOwnProperty('detection_interval') ?
                Number(meta.state.detection_interval) : 60;
            timeout = options && options.hasOwnProperty('occupancy_timeout') && Number(options.occupancy_timeout) >= timeout ?
                Number(options.occupancy_timeout) : timeout + 2;

            // Stop existing timers because motion is detected and set a new one.
            clearTimeout(globalStore.getValue(msg.endpoint, 'occupancy_timer', null));

            if (timeout !== 0) {
                const timer = setTimeout(() => {
                    publish({occupancy: false});
                }, timeout * 1000);

                globalStore.putValue(msg.endpoint, 'occupancy_timer', timer);
            }

            const payload = {occupancy: true};
            noOccupancySince(msg.endpoint, options, publish, 'start');
            return payload;
        },
    } satisfies Fz.Converter,
    lumi_smoke: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const result = fz.ias_smoke_alarm_1.convert(model, msg, publish, options, meta);
            const zoneStatus = msg.data.zonestatus;
            if (result) result.test = (zoneStatus & 1<<1) > 0;
            return result;
        },
    } satisfies Fz.Converter,
    lumi_gas_density: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const data = msg.data;
            if (data && data['65281']) {
                const basicAttrs = data['65281'];
                if (basicAttrs.hasOwnProperty('100')) {
                    return {gas_density: basicAttrs['100']};
                }
            }
        },
    } satisfies Fz.Converter,
    lumi_gas_sensitivity: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const data = msg.data;
            const lookup: KeyValueAny = {'1': 'low', '2': 'medium', '3': 'high'};

            if (data && data.hasOwnProperty('65520')) {
                const value = data['65520'];
                if (value && value.startsWith('0x020')) {
                    return {
                        sensitivity: lookup[value.charAt(5)],
                    };
                }
            }
        },
    } satisfies Fz.Converter,
    lumi_door_lock_low_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('batteryAlarmMask')) {
                return {battery_low: msg.data['batteryAlarmMask'] === 1};
            }
        },
    } satisfies Fz.Converter,
    lumi_door_lock_report: {
        cluster: 'closuresDoorLock',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            const lockStatusLookup: KeyValueAny = {
                1: 'finger_not_match',
                2: 'password_not_match',
                3: 'reverse_lock', // disable open from outside
                4: 'reverse_lock_cancel', // enable open from outside
                5: 'locked',
                6: 'lock_opened',
                7: 'finger_add',
                8: 'finger_delete',
                9: 'password_add',
                10: 'password_delete',
                11: 'lock_opened_inside', // Open form inside reverse lock enable
                12: 'lock_opened_outside', // Open form outside reverse lock disable
                13: 'ring_bell',
                14: 'change_language_to',
                15: 'finger_open',
                16: 'password_open',
                17: 'door_closed',
            };

            if (model.model === 'ZNMS11LM') {
                if (msg.data['65296']) { // finger/password success
                    const data = msg.data['65296'].toString(16);
                    const command = data.substr(0, 1); // 1 finger open, 2 password open
                    const userId = data.substr(5, 2);
                    const userType = data.substr(1, 1); // 1 admin, 2 user
                    result.data = data;
                    result.action = (lockStatusLookup[14+parseInt(command, 16)] +
                        (userType === '1' ? '_admin' : '_user') + '_id' + parseInt(userId, 16).toString());
                    result.action_user = parseInt(userId, 16);
                } else if (msg.data['65297']) { // finger, password failed or bell
                    const data = msg.data['65297'].toString(16);
                    const times = data.substr(0, 1);
                    const type = data.substr(5, 2); // 00 bell, 02 password, 40 error finger
                    result.data = data;
                    if (type === '40') {
                        result.action_action = lockStatusLookup[1];
                        result.action_repeat = parseInt(times, 16);
                    } else if (type === '02') {
                        result.action = lockStatusLookup[2];
                        result.action_repeat = parseInt(times, 16);
                    } else if (type === '00') {
                        result.action = lockStatusLookup[13];
                    }
                } else if (msg.data['65281'] && msg.data['65281']['1']) { // user added/delete
                    const data = msg.data['65281']['1'].toString(16);
                    const command = data.substr(0, 1); // 1 add, 2 delete
                    const userId = data.substr(5, 2);
                    result.data = data;
                    result.action = lockStatusLookup[6+parseInt(command, 16)];
                    result.action_user = parseInt(userId, 16);
                }

                if (isLegacyEnabled(options)) {
                    result.repeat = result.action_repeat;
                    result.user = result.action_user;
                } else {
                    delete result.data;
                }
            }
            if (['ZNMS12LM', 'ZNMS13LM'].includes(model.model)) {
                if (msg.data['65526']) { // lock final status
                    // Convert data back to hex to decode
                    const data = Buffer.from(msg.data['65526'], 'ascii').toString('hex');
                    const command = data.substr(6, 4);
                    if (
                        command === '0301' || // ZNMS12LM
                            command === '0341' // ZNMS13LM
                    ) {
                        result.action = lockStatusLookup[4];
                        result.state = 'UNLOCK';
                        result.reverse = 'UNLOCK';
                    } else if (
                        command === '0311' || // ZNMS12LM
                            command === '0351' // ZNMS13LM
                    ) {
                        result.action = lockStatusLookup[4];
                        result.state = 'LOCK';
                        result.reverse = 'UNLOCK';
                    } else if (
                        command === '0205' || // ZNMS12LM
                            command === '0245' // ZNMS13LM
                    ) {
                        result.action = lockStatusLookup[3];
                        result.state = 'UNLOCK';
                        result.reverse = 'LOCK';
                    } else if (
                        command === '0215' || // ZNMS12LM
                            command === '0255' || // ZNMS13LM
                            command === '1355' // ZNMS13LM
                    ) {
                        result.action = lockStatusLookup[3];
                        result.state = 'LOCK';
                        result.reverse = 'LOCK';
                    } else if (
                        command === '0111' || // ZNMS12LM
                            command === '1351' || // ZNMS13LM locked from inside
                            command === '1451' // ZNMS13LM locked from outside
                    ) {
                        result.action = lockStatusLookup[5];
                        result.state = 'LOCK';
                        result.reverse = 'UNLOCK';
                    } else if (
                        command === '0b00' || // ZNMS12LM
                            command === '0640' || // ZNMS13LM
                            command === '0600' // ZNMS13LM

                    ) {
                        result.action = lockStatusLookup[12];
                        result.state = 'UNLOCK';
                        result.reverse = 'UNLOCK';
                    } else if (
                        command === '0c00' || // ZNMS12LM
                            command === '2300' || // ZNMS13LM
                            command === '0540' || // ZNMS13LM
                            command === '0440' // ZNMS13LM
                    ) {
                        result.action = lockStatusLookup[11];
                        result.state = 'UNLOCK';
                        result.reverse = 'UNLOCK';
                    } else if (
                        command === '2400' || // ZNMS13LM door closed from insed
                            command === '2401' // ZNMS13LM door closed from outside
                    ) {
                        result.action = lockStatusLookup[17];
                        result.state = 'UNLOCK';
                        result.reverse = 'UNLOCK';
                    }
                } else if (msg.data['65296']) { // finger/password success
                    const data = Buffer.from(msg.data['65296'], 'ascii').toString('hex');
                    const command = data.substr(6, 2); // 1 finger open, 2 password open
                    const userId = data.substr(12, 2);
                    const userType = data.substr(8, 1); // 1 admin, 2 user
                    result.action = (lockStatusLookup[14+parseInt(command, 16)] +
                        (userType === '1' ? '_admin' : '_user') + '_id' + parseInt(userId, 16).toString());
                    result.action_user = parseInt(userId, 16);
                } else if (msg.data['65297']) { // finger, password failed or bell
                    const data = Buffer.from(msg.data['65297'], 'ascii').toString('hex');
                    const times = data.substr(6, 2);
                    const type = data.substr(12, 2); // 00 bell, 02 password, 40 error finger
                    if (type === '40') {
                        result.action = lockStatusLookup[1];
                        result.action_repeat = parseInt(times, 16);
                    } else if (type === '00') {
                        result.action = lockStatusLookup[13];
                        result.action_repeat = null;
                    } else if (type === '02') {
                        result.action = lockStatusLookup[2];
                        result.action_repeat = parseInt(times, 16);
                    }
                } else if (msg.data['65281']) { // password added/delete
                    const data = Buffer.from(msg.data['65281'], 'ascii').toString('hex');
                    const command = data.substr(18, 2); // 1 add, 2 delete
                    const userId = data.substr(12, 2);
                    result.action = lockStatusLookup[6+parseInt(command, 16)];
                    result.action_user = parseInt(userId, 16);
                } else if (msg.data['65522']) { // set language
                    const data = Buffer.from(msg.data['65522'], 'ascii').toString('hex');
                    const langId = data.substr(6, 2); // 1 chinese, 2: english
                    result.action = (lockStatusLookup[14])+ (langId==='2'?'_english':'_chinese');
                }

                if (isLegacyEnabled(options)) {
                    result.repeat = result.action_repeat;
                    result.user = result.action_user;
                }
            }

            return result;
        },
    } satisfies Fz.Converter,
    lumi_action_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            return {action: 'button_2_single'};
        },
    } satisfies Fz.Converter,
    lumi_action_off: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            return {action: 'button_1_single'};
        },
    } satisfies Fz.Converter,
    lumi_action_step: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const button = msg.data.stepmode === 0 ? '4' : '3';
            return {action: `button_${button}_single`};
        },
    } satisfies Fz.Converter,
    lumi_action_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            if (globalStore.hasValue(msg.endpoint, 'button')) {
                const value = globalStore.getValue(msg.endpoint, 'button');
                const duration = Date.now() - value.start;
                const payload = {action: `button_${value.button}_release`, duration, action_duration: duration};
                if (!isLegacyEnabled(options)) delete payload.duration;
                return payload;
            }
        },
    } satisfies Fz.Converter,
    lumi_action_move: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const button = msg.data.movemode === 0 ? '4' : '3';
            globalStore.putValue(msg.endpoint, 'button', {button, start: Date.now()});
            return {action: `button_${button}_hold`};
        },
    } satisfies Fz.Converter,
    lumi_action_step_color_temp: {
        cluster: 'lightingColorCtrl',
        type: 'commandStepColorTemp',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            let action;
            if (model.model === 'WXCJKG12LM') {
                // for WXCJKG12LM model it's double click event on buttons 3 and 4
                action = (msg.data.stepmode === 1) ? '3_double' : '4_double';
            } else {
                // but for WXCJKG13LM model it's single click event on buttons 5 and 6
                action = (msg.data.stepmode === 1) ? '5_single' : '6_single';
            }
            return {action: `button_${action}`};
        },
    } satisfies Fz.Converter,
    lumi_action_move_color_temp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveColorTemp',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const stop = msg.data.movemode === 0;
            let result = null;
            if (stop) {
                const button = globalStore.getValue(msg.endpoint, 'button').button;
                const duration = Date.now() - globalStore.getValue(msg.endpoint, 'button').start;
                result = {action: `button_${button}_release`, duration, action_duration: duration};
                if (!isLegacyEnabled(options)) delete result.duration;
            } else {
                const button = msg.data.movemode === 3 ? '6' : '5';
                result = {action: `button_${button}_hold`};
                globalStore.putValue(msg.endpoint, 'button', {button, start: Date.now()});
            }
            return result;
        },
    } satisfies Fz.Converter,

    // lumi device specific
    lumi_action_WXKG01LM: {
        // Unique converter
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        options: [
            e.numeric('hold_timeout', ea.SET).withValueMin(0).withDescription(`The WXKG01LM only reports a button press and release.` +
                `By default, a hold action is published when there is at least 1000 ms between both events. It could be that due to ` +
                `delays in the network the release message is received late. This causes a single click to be identified as a hold ` +
                `action. If you are experiencing this you can try experimenting with this option (e.g. set it to 2000) (value is in ms).`),
            e.numeric('hold_timeout_expire', ea.SET).withValueMin(0).withDescription(`Sometimes it happens that the button does not send a ` +
                `release. To avoid problems a release is automatically send after a timeout. The default timeout is 4000 ms, you can ` +
                `increase it with this option (value is in ms).`),
        ],
        convert: (model, msg, publish, options: KeyValueAny, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const state = msg.data['onOff'];

            // 0 = click down, 1 = click up, else = multiple clicks
            if (state === 0) {
                const timer = setTimeout(() => {
                    publish({action: 'hold'});
                    globalStore.putValue(msg.endpoint, 'timer', null);
                    globalStore.putValue(msg.endpoint, 'hold', Date.now());
                    const holdTimer = setTimeout(() => {
                        globalStore.putValue(msg.endpoint, 'hold', false);
                    }, options.hold_timeout_expire || 4000);
                    globalStore.putValue(msg.endpoint, 'hold_timer', holdTimer);
                    // After 4000 milliseconds of not receiving release we assume it will not happen.
                }, options.hold_timeout || 1000); // After 1000 milliseconds of not releasing we assume hold.
                globalStore.putValue(msg.endpoint, 'timer', timer);
            } else if (state === 1) {
                if (globalStore.getValue(msg.endpoint, 'hold')) {
                    const duration = Date.now() - globalStore.getValue(msg.endpoint, 'hold');
                    publish({action: 'release', duration: duration});
                    globalStore.putValue(msg.endpoint, 'hold', false);
                }

                if (globalStore.getValue(msg.endpoint, 'timer')) {
                    clearTimeout(globalStore.getValue(msg.endpoint, 'timer'));
                    globalStore.putValue(msg.endpoint, 'timer', null);
                    publish({action: 'single'});
                }
            } else {
                const clicks = msg.data['32768'];
                const actionLookup: KeyValueAny = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                const payload = actionLookup[clicks] ? actionLookup[clicks] : 'many';
                publish({action: payload});
            }
        },
    } satisfies Fz.Converter,
    lumi_smart_panel_ZNCJMB14LM: {
        cluster: 'manuSpecificLumi',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if (msg.data.hasOwnProperty(0x0215)) {
                const lookup: KeyValueAny = {0: 'classic', 1: 'concise'};
                result.theme = lookup[msg.data[0x0215]];
            }
            if (msg.data.hasOwnProperty(0x0214)) {
                const lookup: KeyValueAny = {1: 'classic', 2: 'analog clock'};
                result.screen_saver_style = lookup[msg.data[0x0214]];
            }
            if (msg.data.hasOwnProperty(0x0213)) {
                result.standby_enabled = msg.data[0x0213] & 1 ? true : false;
            }
            if (msg.data.hasOwnProperty(0x0212)) {
                const lookup: KeyValueAny = {0: 'mute', 1: 'low', 2: 'medium', 3: 'high'};
                result.beep_volume = lookup[msg.data[0x0212]];
            }
            if (msg.data.hasOwnProperty(0x0211)) {
                result.lcd_brightness = msg.data[0x0211];
            }
            if (msg.data.hasOwnProperty(0x022b)) {
                const lookup: KeyValueAny = {0: 'none', 1: '1', 2: '2', 3: '1 and 2', 4: '3', 5: '1 and 3', 6: '2 and 3', 7: 'all'};
                result.available_switches = lookup[msg.data[0x022b]];
            }
            if (msg.data.hasOwnProperty(0x217)) {
                const lookup: KeyValueAny = {3: 'small', 4: 'medium', 5: 'large'};
                result.font_size = lookup[msg.data[0x217]];
            }
            if (msg.data.hasOwnProperty(0x219)) {
                const lookup: KeyValueAny = {0: 'scene', 1: 'feel', 2: 'thermostat', 3: 'switch'};
                result.homepage = lookup[msg.data[0x219]];
            }
            if (msg.data.hasOwnProperty(0x210)) {
                const lookup: KeyValueAny = {0: 'chinese', 1: 'english'};
                result.language = lookup[msg.data[0x210]];
            }
            if (msg.data.hasOwnProperty(0x216)) {
                result.standby_time = msg.data[0x216];
            }
            if (msg.data.hasOwnProperty(0x218)) {
                result.lcd_auto_brightness_enabled = msg.data[0x218] & 1 ? true : false;
            }
            if (msg.data.hasOwnProperty(0x221)) {
                result.screen_saver_enabled = msg.data[0x221] & 1 ? true : false;
            }
            if (msg.data.hasOwnProperty(0x222)) {
                result.standby_lcd_brightness = msg.data[0x222];
            }
            if (msg.data.hasOwnProperty(0x223)) {
                const lookup: KeyValueAny = {1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: '11'};
                const textarr = msg.data[0x223].slice(1, msg.data[0x223].length);
                result.switch_1_icon = lookup[msg.data[0x223][0]];
                result.switch_1_text = String.fromCharCode(...textarr);
            }
            if (msg.data.hasOwnProperty(0x224)) {
                const lookup: KeyValueAny = {1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: '11'};
                const textarr = msg.data[0x224].slice(1, msg.data[0x224].length);
                result.switch_2_icon = lookup[msg.data[0x224][0]];
                result.switch_2_text = String.fromCharCode(...textarr);
            }
            if (msg.data.hasOwnProperty(0x225)) {
                const lookup: KeyValueAny = {1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: '11'};
                const textarr = msg.data[0x225].slice(1, msg.data[0x225].length);
                result.switch_3_icon = lookup[msg.data[0x225][0]];
                result.switch_3_text = String.fromCharCode(...textarr);
            }
            return result;
        },
    } satisfies Fz.Converter,
};

export const toZigbee = {
    // lumi generic
    lumi_power: {
        key: ['power'],
        convertGet: async (entity, key, meta) => {
            const endpoint = meta.device.endpoints.find((e) => e.supportsInputCluster('genAnalogInput'));
            await endpoint.read('genAnalogInput', ['presentValue']);
        },
    } satisfies Tz.Converter,
    lumi_led_disabled_night: {
        key: ['led_disabled_night'],
        convertSet: async (entity, key, value, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (['ZNCZ04LM', 'ZNCZ12LM', 'ZNCZ15LM', 'QBCZ14LM', 'QBCZ15LM', 'QBKG17LM', 'QBKG18LM', 'QBKG19LM', 'QBKG20LM', 'QBKG25LM', 'QBKG26LM',
                'QBKG27LM', 'QBKG28LM', 'QBKG29LM', 'QBKG30LM', 'QBKG31LM', 'QBKG32LM', 'QBKG33LM', 'QBKG34LM', 'DLKZMK11LM', 'SSM-U01', 'WS-EUK01',
                'WS-EUK02', 'WS-EUK03', 'WS-EUK04', 'SP-EUC01', 'ZNQBKG24LM', 'ZNQBKG25LM',
                'ZNQBKG38LM', 'ZNQBKG39LM', 'ZNQBKG40LM', 'ZNQBKG41LM'].includes(meta.mapped.model)) {
                await entity.write('manuSpecificLumi', {0x0203: {value: value ? 1 : 0, type: 0x10}}, manufacturerOptions.lumi);
            } else if (['ZNCZ11LM'].includes(meta.mapped.model)) {
                const payload = value ?
                    [0xaa, 0x80, 0x05, 0xd1, 0x47, 0x00, 0x03, 0x10, 0x00] :
                    [0xaa, 0x80, 0x05, 0xd1, 0x47, 0x01, 0x03, 0x10, 0x01];

                await entity.write('genBasic', {0xFFF0: {value: payload, type: 0x41}}, manufacturerOptions.lumi);
            } else {
                throw new Error('Not supported');
            }
            return {state: {led_disabled_night: value}};
        },
        convertGet: async (entity, key, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (['ZNCZ04LM', 'ZNCZ12LM', 'ZNCZ15LM', 'QBCZ15LM', 'QBCZ14LM', 'QBKG17LM', 'QBKG18LM', 'QBKG19LM', 'QBKG20LM', 'QBKG25LM', 'QBKG26LM',
                'QBKG27LM', 'QBKG28LM', 'QBKG29LM', 'QBKG30LM', 'QBKG31LM', 'QBKG32LM', 'QBKG33LM', 'QBKG34LM', 'DLKZMK11LM', 'SSM-U01', 'WS-EUK01',
                'WS-EUK02', 'WS-EUK03', 'WS-EUK04', 'SP-EUC01', 'ZNQBKG24LM', 'ZNQBKG25LM',
                'ZNQBKG38LM', 'ZNQBKG39LM', 'ZNQBKG40LM', 'ZNQBKG41LM'].includes(meta.mapped.model)) {
                await entity.read('manuSpecificLumi', [0x0203], manufacturerOptions.lumi);
            } else {
                throw new Error('Not supported');
            }
        },
    } satisfies Tz.Converter,
    lumi_flip_indicator_light: {
        key: ['flip_indicator_light'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'OFF': 0, 'ON': 1};
            await entity.write('manuSpecificLumi', {0x00F0: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
            return {state: {flip_indicator_light: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x00F0], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_power_outage_count: {
        key: ['power_outage_count'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0002], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,

    // lumi class specific
    lumi_feeder: {
        key: ['feed', 'schedule', 'led_indicator', 'child_lock', 'mode', 'serving_size', 'portion_weight'],
        convertSet: async (entity, key, value, meta) => {
            const sendAttr = async (attrCode: number, value: number, length: number) => {
                // @ts-expect-error
                entity.sendSeq = ((entity.sendSeq || 0)+1) % 256;
                // @ts-expect-error
                const val = Buffer.from([0x00, 0x02, entity.sendSeq, 0, 0, 0, 0, 0]);
                // @ts-expect-error
                entity.sendSeq += 1;
                val.writeInt32BE(attrCode, 3);
                val.writeUInt8(length, 7);
                let v = Buffer.alloc(length);
                switch (length) {
                case 1:
                    v.writeUInt8(value);
                    break;
                case 2:
                    v.writeUInt16BE(value);
                    break;
                case 4:
                    v.writeUInt32BE(value);
                    break;
                default:
                    // @ts-expect-error
                    v = value;
                }
                await entity.write('manuSpecificLumi', {0xfff1: {value: Buffer.concat([val, v]), type: 0x41}},
                    {manufacturerCode: manufacturerCode});
            };
            switch (key) {
            case 'feed':
                await sendAttr(0x04150055, 1, 1);
                break;
            case 'schedule': {
                const schedule: string[] = [];
                // @ts-expect-error
                value.forEach((item) => {
                    const schedItem = Buffer.from([
                        getKey(feederDaysLookup, item.days, 0x7f),
                        item.hour,
                        item.minute,
                        item.size,
                        0,
                    ]);
                    schedule.push(schedItem.toString('hex'));
                });
                const val = Buffer.concat([Buffer.from(schedule.join(',')), Buffer.from([0])]);
                // @ts-expect-error
                await sendAttr(0x080008c8, val, val.length);
                break;
            }
            case 'led_indicator':
                await sendAttr(0x04170055, getFromLookup(value, {'ON': 0, 'OFF': 1}), 1);
                break;
            case 'child_lock':
                await sendAttr(0x04160055, getFromLookup(value, {'UNLOCK': 0, 'LOCK': 1}), 1);
                break;
            case 'mode':
                await sendAttr(0x04180055, getFromLookup(value, {'manual': 0, 'schedule': 1}), 1);
                break;
            case 'serving_size':
                // @ts-expect-error
                await sendAttr(0x0e5c0055, value, 4);
                break;
            case 'portion_weight':
                // @ts-expect-error
                await sendAttr(0x0e5f0055, value, 4);
                break;
            default: // Unknown key
                logger.warning(`Unhandled key ${key}`, 'zhc:lumi:feeder');
            }
            return {state: {[key]: value}};
        },
    } satisfies Tz.Converter,
    lumi_detection_distance: {
        key: ['detection_distance'],
        convertSet: async (entity, key, value, meta) => {
            assertString(value, 'detection_distance');
            value = value.toLowerCase();
            const lookup = {'10mm': 1, '20mm': 2, '30mm': 3};
            await entity.write('manuSpecificLumi', {0x010C: {value: getFromLookup(value, lookup), type: 0x20}}, {manufacturerCode});
            return {state: {detection_distance: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x010C], {manufacturerCode});
        },
    } satisfies Tz.Converter,
    lumi_trv: {
        key: ['system_mode', 'preset', 'window_detection', 'valve_detection', 'child_lock', 'away_preset_temperature',
            'calibrate', 'sensor', 'external_temperature_input', 'identify', 'schedule', 'schedule_settings'],
        convertSet: async (entity, key, value, meta) => {
            const lumiHeader = (counter: number, params: number[], action: number) => {
                const header = [0xaa, 0x71, params.length + 3, 0x44, counter];
                const integrity = 512 - header.reduce((sum, elem) => sum + elem, 0);
                return [...header, integrity, action, 0x41, params.length];
            };
            const sensor = Buffer.from('00158d00019d1b98', 'hex');

            switch (key) {
            case 'system_mode':
                await entity.write('manuSpecificLumi', {0x0271: {value: getFromLookup(value, {'off': 0, 'heat': 1}), type: 0x20}},
                    {manufacturerCode: manufacturerCode});
                break;
            case 'preset':
                await entity.write('manuSpecificLumi', {0x0272: {value: getFromLookup(value, {'manual': 0, 'auto': 1, 'away': 2}), type: 0x20}},
                    {manufacturerCode: manufacturerCode});
                break;
            case 'window_detection':
                await entity.write('manuSpecificLumi', {
                    0x0273: {value: getFromLookup(value, {'false': 0, 'true': 1}, undefined, true), type: 0x20},
                }, {manufacturerCode: manufacturerCode});
                break;
            case 'valve_detection':
                await entity.write('manuSpecificLumi', {
                    0x0274: {value: getFromLookup(value, {'false': 0, 'true': 1}, undefined, true), type: 0x20},
                }, {manufacturerCode: manufacturerCode});
                break;
            case 'child_lock':
                await entity.write('manuSpecificLumi', {
                    0x0277: {value: getFromLookup(value, {'false': 0, 'true': 1}, undefined, true), type: 0x20},
                }, {manufacturerCode: manufacturerCode});
                break;
            case 'away_preset_temperature':
                await entity.write('manuSpecificLumi', {
                    0x0279: {value: Math.round(toNumber(value, 'away_preset_temperature') * 100), type: 0x23},
                }, {manufacturerCode: manufacturerCode});
                break;
            case 'sensor': {
                assertEndpoint(entity);
                const device = Buffer.from(entity.deviceIeeeAddress.substring(2), 'hex');
                const timestamp = Buffer.alloc(4);
                timestamp.writeUint32BE(Date.now()/1000);

                if (value === 'external') {
                    const params1 = [
                        ...timestamp,
                        0x3d, 0x04,
                        ...device,
                        ...sensor,
                        0x00, 0x01, 0x00, 0x55,
                        0x13, 0x0a, 0x02, 0x00, 0x00, 0x64, 0x04, 0xce, 0xc2, 0xb6, 0xc8,
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x3d,
                        0x64,
                        0x65,
                    ];
                    const params2 = [
                        ...timestamp,
                        0x3d, 0x05,
                        ...device,
                        ...sensor,
                        0x08, 0x00, 0x07, 0xfd,
                        0x16, 0x0a, 0x02, 0x0a, 0xc9, 0xe8, 0xb1, 0xb8, 0xd4, 0xda, 0xcf, 0xdf, 0xc0, 0xeb,
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x3d,
                        0x04,
                        0x65,
                    ];

                    const val1 = [...(lumiHeader(0x12, params1, 0x02)), ...params1];
                    const val2 = [...(lumiHeader(0x13, params2, 0x02)), ...params2];

                    await entity.write('manuSpecificLumi', {0xfff2: {value: val1, type: 0x41}}, {manufacturerCode: manufacturerCode});
                    await entity.write('manuSpecificLumi', {0xfff2: {value: val2, type: 0x41}}, {manufacturerCode: manufacturerCode});
                } else if (value === 'internal') {
                    const params1 = [
                        ...timestamp,
                        0x3d, 0x05,
                        ...device,
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    ];
                    const params2 = [
                        ...timestamp,
                        0x3d, 0x04,
                        ...device,
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    ];

                    const val1 = [...(lumiHeader(0x12, params1, 0x04)), ...params1];
                    const val2 = [...(lumiHeader(0x13, params2, 0x04)), ...params2];

                    await entity.write('manuSpecificLumi', {0xfff2: {value: val1, type: 0x41}}, {manufacturerCode: manufacturerCode});
                    await entity.write('manuSpecificLumi', {0xfff2: {value: val2, type: 0x41}}, {manufacturerCode: manufacturerCode});

                    await entity.read('hvacThermostat', ['localTemp']);
                }
                break;
            }
            case 'external_temperature_input':
                if (meta.state['sensor'] === 'external') {
                    const temperatureBuf = Buffer.alloc(4);
                    const number = toNumber(value);
                    temperatureBuf.writeFloatBE(Math.round(number * 100));

                    const params = [...sensor, 0x00, 0x01, 0x00, 0x55, ...temperatureBuf];
                    const data = [...(lumiHeader(0x12, params, 0x05)), ...params];

                    await entity.write('manuSpecificLumi', {0xfff2: {value: data, type: 0x41}}, {manufacturerCode: manufacturerCode});
                }
                break;
            case 'calibrate':
                await entity.write('manuSpecificLumi', {0x0270: {value: 1, type: 0x20}}, {manufacturerCode: manufacturerCode});
                break;
            case 'identify':
                await entity.command('genIdentify', 'identify', {identifytime: 5}, {});
                break;
            case 'schedule':
                await entity.write('manuSpecificLumi', {
                    0x027d: {value: getFromLookup(value, {'false': 0, 'true': 1}, undefined, true), type: 0x20},
                }, {manufacturerCode: manufacturerCode});
                break;
            case 'schedule_settings': {
                // @ts-expect-error
                const schedule = trv.parseSchedule(value);
                trv.validateSchedule(schedule);
                const buffer = trv.encodeSchedule(schedule);
                await entity.write('manuSpecificLumi', {0x0276: {value: buffer, type: 0x41}}, {manufacturerCode: manufacturerCode});
                break;
            }
            default: // Unknown key
                logger.warning(`Unhandled key ${key}`, 'zhc:lumi:trv');
            }
        },
        convertGet: async (entity, key, meta) => {
            const dict = {'system_mode': 0x0271, 'preset': 0x0272, 'window_detection': 0x0273, 'valve_detection': 0x0274,
                'child_lock': 0x0277, 'away_preset_temperature': 0x0279, 'calibrated': 0x027b, 'sensor': 0x027e,
                'schedule': 0x027d, 'schedule_settings': 0x0276};

            if (dict.hasOwnProperty(key)) {
                await entity.read('manuSpecificLumi', [getFromLookup(key, dict)], {manufacturerCode: manufacturerCode});
            }
        },
    } satisfies Tz.Converter,
    lumi_presence_region_upsert: {
        key: ['region_upsert'],
        convertSet: async (entity, key, value, meta) => {
            const commandWrapper = presence.parseAqaraFp1RegionUpsertInput(value);

            if (!commandWrapper.isSuccess) {
                logger.warning(
                    // @ts-expect-error untyped
                    `Encountered an error (${commandWrapper.error.reason}) while parsing configuration commands (input: ${JSON.stringify(value)})`,
                    NS,
                );

                return;
            }

            const command = commandWrapper.payload.command;

            logger.debug(`Trying to create region ${command.region_id}`, NS);

            const sortedZonesAccumulator = {};
            const sortedZonesWithSets: {[s: number]: [number]} = command.zones
                .reduce(
                    (accumulator: {[s: number]: Set<number>}, zone: {x: number, y: number}) => {
                        if (!accumulator[zone.y]) {
                            accumulator[zone.y] = new Set<number>();
                        }

                        accumulator[zone.y].add(zone.x);

                        return accumulator;
                    },
                    sortedZonesAccumulator,
                );
            const sortedZones = Object.entries(sortedZonesWithSets).reduce((acc, [key, value]) => {
                const numKey = parseInt(key, 10); // Convert string key back to number
                acc[numKey] = Array.from(value);
                return acc;
            }, {} as {[s: number]: number[]});

            const deviceConfig = new Uint8Array(7);

            // Command parameters
            deviceConfig[0] = presence.constants.region_config_cmds.create;
            deviceConfig[1] = command.region_id;
            deviceConfig[6] = presence.constants.region_config_cmd_suffix_upsert;
            // Zones definition
            deviceConfig[2] |= presence.encodeXCellsDefinition(sortedZones['1']);
            deviceConfig[2] |= presence.encodeXCellsDefinition(sortedZones['2']) << 4;
            deviceConfig[3] |= presence.encodeXCellsDefinition(sortedZones['3']);
            deviceConfig[3] |= presence.encodeXCellsDefinition(sortedZones['4']) << 4;
            deviceConfig[4] |= presence.encodeXCellsDefinition(sortedZones['5']);
            deviceConfig[4] |= presence.encodeXCellsDefinition(sortedZones['6']) << 4;
            deviceConfig[5] |= presence.encodeXCellsDefinition(sortedZones['7']);

            logger.info( `Create region ${command.region_id} ${printNumbersAsHexSequence([...deviceConfig], 2)}`, NS);

            const payload = {
                [presence.constants.region_config_write_attribute]: {
                    value: deviceConfig,
                    type: presence.constants.region_config_write_attribute_type,
                },
            };

            await entity.write('manuSpecificLumi', payload, {manufacturerCode});
        },
    } satisfies Tz.Converter,
    lumi_presence_region_delete: {
        key: ['region_delete'],
        convertSet: async (entity, key, value, meta) => {
            const commandWrapper = presence.parseAqaraFp1RegionDeleteInput(value);

            if (!commandWrapper.isSuccess) {
                logger.warning(
                    // @ts-expect-error
                    `Encountered an error (${commandWrapper.error.reason}) while parsing configuration commands (input: ${JSON.stringify(value)})`,
                    NS,
                );
                return;
            }
            const command = commandWrapper.payload.command;

            logger.debug(`trying to delete region ${command.region_id}`, NS);

            const deviceConfig = new Uint8Array(7);

            // Command parameters
            deviceConfig[0] = presence.constants.region_config_cmds.delete;
            deviceConfig[1] = command.region_id;
            deviceConfig[6] = presence.constants.region_config_cmd_suffix_delete;
            // Zones definition
            deviceConfig[2] = 0;
            deviceConfig[3] = 0;
            deviceConfig[4] = 0;
            deviceConfig[5] = 0;

            logger.info(`Delete region ${command.region_id} (${printNumbersAsHexSequence([...deviceConfig], 2)})`, NS);

            const payload = {
                [presence.constants.region_config_write_attribute]: {
                    value: deviceConfig,
                    type: presence.constants.region_config_write_attribute_type,
                },
            };

            await entity.write('manuSpecificLumi', payload, {manufacturerCode});
        },
    } satisfies Tz.Converter,
    lumi_cube_operation_mode: {
        key: ['operation_mode'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {action_mode: 0, scene_mode: 1};
            /**
             * schedule the callback to run when the configuration window comes
             */
            const callback = async () => {
                await entity.write(
                    'manuSpecificLumi',
                    {0x0148: {value: getFromLookup(value, lookup), type: 0x20}},
                    {manufacturerCode: manufacturerCode, disableDefaultResponse: true},
                );
                logger.info('operation_mode switch success!', 'zhc:lumi:cube');
            };
            globalStore.putValue(meta.device, 'opModeSwitchTask', {callback, newMode: value});
            logger.info('Now give your cube a forceful throw motion (Careful not to drop it)!', 'zhc:lumi:cube');
        },
    } satisfies Tz.Converter,
    lumi_switch_operation_mode_basic: {
        key: ['operation_mode'],
        convertSet: async (entity, key, value, meta) => {
            assertEndpoint(entity);
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            let targetValue = isObject(value) && value.hasOwnProperty('state') ? value.state : value;

            // 1/2 gang switches using genBasic on endpoint 1.
            let attrId;
            let attrValue: number;
            if (meta.mapped.meta && meta.mapped.meta.multiEndpoint) {
                attrId = {left: 0xFF22, right: 0xFF23}[meta.endpoint_name];
                // Allow usage of control_relay for 2 gang switches by mapping it to the default side.
                if (targetValue === 'control_relay') {
                    targetValue = `control_${meta.endpoint_name}_relay`;
                }
                attrValue = getFromLookup(targetValue, {control_left_relay: 0x12, control_right_relay: 0x22, decoupled: 0xFE});

                if (attrId == null) {
                    throw new Error(`Unsupported endpoint ${meta.endpoint_name} for changing operation_mode.`);
                }
            } else {
                attrId = 0xFF22;
                attrValue = getFromLookup(targetValue, {control_relay: 0x12, decoupled: 0xFE});
            }

            if (attrValue == null) {
                throw new Error('Invalid operation_mode value');
            }

            const endpoint = entity.getDevice().getEndpoint(1);
            const payload: KeyValueAny = {};
            payload[attrId] = {value: attrValue, type: 0x20};
            await endpoint.write('genBasic', payload, manufacturerOptions.lumi);

            return {state: {operation_mode: targetValue}};
        },
        convertGet: async (entity, key, meta) => {
            let attrId;
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (meta.mapped.meta && meta.mapped.meta.multiEndpoint) {
                attrId = {left: 0xFF22, right: 0xFF23}[meta.endpoint_name];
                if (attrId == null) {
                    throw new Error(`Unsupported endpoint ${meta.endpoint_name} for getting operation_mode.`);
                }
            } else {
                attrId = 0xFF22;
            }
            await entity.read('genBasic', [attrId], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_switch_operation_mode_opple: {
        key: ['operation_mode'],
        convertSet: async (entity, key, value, meta) => {
            // Support existing syntax of a nested object just for the state field. Though it's quite silly IMO.
            const targetValue = isObject(value) && value.hasOwnProperty('state') ? value.state : value;
            // Switches using manuSpecificLumi 0x0200 on the same endpoints as the onOff clusters.
            const lookupState = {control_relay: 0x01, decoupled: 0x00};
            await entity.write('manuSpecificLumi', {0x0200:
                {value: getFromLookup(targetValue, lookupState), type: 0x20}}, manufacturerOptions.lumi);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0200], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_detection_interval: {
        key: ['detection_interval'],
        convertSet: async (entity, key, value, meta) => {
            assertNumber(value, key);
            value *= 1;
            await entity.write('manuSpecificLumi', {0x0102: {value: [value], type: 0x20}}, manufacturerOptions.lumi);
            return {state: {detection_interval: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0102], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_overload_protection: {
        key: ['overload_protection'],
        convertSet: async (entity, key, value, meta) => {
            assertNumber(value, key);
            value *= 1;
            await entity.write('manuSpecificLumi', {0x020b: {value: [value], type: 0x39}}, manufacturerOptions.lumi);
            return {state: {overload_protection: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x020b], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_switch_mode_switch: {
        key: ['mode_switch'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'anti_flicker_mode': 4, 'quick_mode': 1};
            await entity.write('manuSpecificLumi', {0x0004: {value: getFromLookup(value, lookup), type: 0x21}}, manufacturerOptions.lumi);
            return {state: {mode_switch: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0004], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_button_switch_mode: {
        key: ['button_switch_mode'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'relay': 0, 'relay_and_usb': 1};
            await entity.write('manuSpecificLumi', {0x0226: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
            return {state: {button_switch_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0226], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_socket_button_lock: {
        key: ['button_lock'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'ON': 0, 'OFF': 1};
            await entity.write('manuSpecificLumi', {0x0200: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
            return {state: {button_lock: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0200], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_dimmer_mode: {
        key: ['dimmer_mode'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'rgbw': 3, 'dual_ct': 1};
            assertString(value, key);
            value = value.toLowerCase();
            // @ts-expect-error
            if (['rgbw'].includes(value)) {
                await entity.write('manuSpecificLumi', {0x0509: {value: getFromLookup(value, lookup), type: 0x23}}, manufacturerOptions.lumi);
                await entity.write('manuSpecificLumi', {0x050F: {value: 1, type: 0x23}}, manufacturerOptions.lumi);
            } else {
                await entity.write('manuSpecificLumi', {0x0509: {value: getFromLookup(value, lookup), type: 0x23}}, manufacturerOptions.lumi);
                // Turn on dimming channel 1 and channel 2
                await entity.write('manuSpecificLumi', {0x050F: {value: 3, type: 0x23}}, manufacturerOptions.lumi);
            }
            return {state: {dimmer_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0509], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_switch_do_not_disturb: {
        key: ['do_not_disturb'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificLumi', {0x0203: {value: value ? 1 : 0, type: 0x10}}, manufacturerOptions.lumi);
            return {state: {do_not_disturb: value}};
        },
    } satisfies Tz.Converter,
    lumi_switch_type: {
        key: ['switch_type'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'toggle': 1, 'momentary': 2};
            assertString(value, key);
            value = value.toLowerCase();
            await entity.write('manuSpecificLumi', {0x000A: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
            return {state: {switch_type: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x000A], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_switch_power_outage_memory: {
        key: ['power_outage_memory'],
        convertSet: async (entity, key, value, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (['SP-EUC01', 'ZNCZ04LM', 'ZNCZ15LM', 'QBCZ14LM', 'QBCZ15LM', 'SSM-U01', 'SSM-U02', 'DLKZMK11LM', 'DLKZMK12LM',
                'WS-EUK01', 'WS-EUK02', 'WS-EUK03', 'WS-EUK04', 'QBKG17LM', 'QBKG18LM', 'QBKG19LM', 'QBKG20LM', 'QBKG25LM', 'QBKG26LM', 'QBKG27LM',
                'QBKG28LM', 'QBKG29LM', 'QBKG30LM', 'QBKG31LM', 'QBKG32LM', 'QBKG33LM', 'QBKG34LM', 'QBKG38LM', 'QBKG39LM', 'QBKG40LM', 'QBKG41LM',
                'ZNDDMK11LM', 'ZNLDP13LM', 'ZNQBKG31LM', 'WS-USC02', 'WS-USC03', 'WS-USC04', 'ZNQBKG24LM', 'ZNQBKG25LM', 'JWDL001A', 'SSWQD02LM',
                'SSWQD03LM', 'XDD11LM', 'XDD12LM', 'XDD13LM', 'ZNLDP12LM', 'ZNLDP13LM', 'ZNXDD01LM', 'WS-USC01',
            ].includes(meta.mapped.model)) {
                await entity.write('manuSpecificLumi', {0x0201: {value: value ? 1 : 0, type: 0x10}}, manufacturerOptions.lumi);
            } else if (['ZNCZ02LM', 'QBCZ11LM', 'LLKZMK11LM'].includes(meta.mapped.model)) {
                const payload = value ?
                    [[0xaa, 0x80, 0x05, 0xd1, 0x47, 0x07, 0x01, 0x10, 0x01], [0xaa, 0x80, 0x03, 0xd3, 0x07, 0x08, 0x01]] :
                    [[0xaa, 0x80, 0x05, 0xd1, 0x47, 0x09, 0x01, 0x10, 0x00], [0xaa, 0x80, 0x03, 0xd3, 0x07, 0x0a, 0x01]];

                await entity.write('genBasic', {0xFFF0: {value: payload[0], type: 0x41}}, manufacturerOptions.lumi);
                await entity.write('genBasic', {0xFFF0: {value: payload[1], type: 0x41}}, manufacturerOptions.lumi);
            } else if (['ZNCZ11LM', 'ZNCZ12LM'].includes(meta.mapped.model)) {
                const payload = value ?
                    [0xaa, 0x80, 0x05, 0xd1, 0x47, 0x00, 0x01, 0x10, 0x01] :
                    [0xaa, 0x80, 0x05, 0xd1, 0x47, 0x01, 0x01, 0x10, 0x00];

                await entity.write('genBasic', {0xFFF0: {value: payload, type: 0x41}}, manufacturerOptions.lumi);
            } else if (['ZNQBKG38LM', 'ZNQBKG39LM', 'ZNQBKG40LM', 'ZNQBKG41LM'].includes(meta.mapped.model)) {
                // Support existing syntax of a nested object just for the state field. Though it's quite silly IMO.
                const targetValue = isObject(value) && value.hasOwnProperty('state') ? value.state : value;
                const lookupState = {on: 0x01, electric_appliances_on: 0x00, electric_appliances_off: 0x02, inverted: 0x03};
                await entity.write('manuSpecificLumi',
                    {0x0517: {value: getFromLookup(targetValue, lookupState), type: 0x20}}, manufacturerOptions.lumi);
            } else {
                throw new Error('Not supported');
            }
            return {state: {power_outage_memory: value}};
        },
        convertGet: async (entity, key, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (['SP-EUC01', 'ZNCZ04LM', 'ZNCZ15LM', 'QBCZ14LM', 'QBCZ15LM', 'SSM-U01', 'SSM-U02', 'DLKZMK11LM', 'DLKZMK12LM',
                'WS-EUK01', 'WS-EUK02', 'WS-EUK03', 'WS-EUK04', 'QBKG17LM', 'QBKG18LM', 'QBKG19LM', 'QBKG20LM', 'QBKG25LM', 'QBKG26LM', 'QBKG27LM',
                'QBKG28LM', 'QBKG29LM', 'QBKG30LM', 'QBKG31LM', 'QBKG32LM', 'QBKG33LM', 'QBKG34LM', 'QBKG38LM', 'QBKG39LM', 'QBKG40LM', 'QBKG41LM',
                'ZNDDMK11LM', 'ZNLDP13LM', 'ZNQBKG31LM', 'WS-USC02', 'WS-USC03', 'WS-USC04', 'ZNQBKG24LM', 'ZNQBKG25LM', 'JWDL001A', 'SSWQD02LM',
                'SSWQD03LM', 'XDD11LM', 'XDD12LM', 'XDD13LM', 'ZNLDP12LM', 'ZNLDP13LM', 'ZNXDD01LM', 'WS-USC01',
            ].includes(meta.mapped.model)) {
                await entity.read('manuSpecificLumi', [0x0201]);
            } else if (['ZNCZ02LM', 'QBCZ11LM', 'ZNCZ11LM', 'ZNCZ12LM'].includes(meta.mapped.model)) {
                await entity.read('manuSpecificLumi', [0xFFF0]);
            } else if (['ZNQBKG38LM', 'ZNQBKG39LM', 'ZNQBKG40LM', 'ZNQBKG41LM'].includes(meta.mapped.model)) {
                await entity.read('manuSpecificLumi', [0x0517]);
            } else {
                throw new Error('Not supported');
            }
        },
    } satisfies Tz.Converter,
    lumi_light_power_outage_memory: {
        key: ['power_outage_memory'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('genBasic', {0xFF19: {value: value ? 1 : 0, type: 0x10}}, manufacturerOptions.lumi);
            return {state: {power_outage_memory: value}};
        },
    } satisfies Tz.Converter,
    lumi_auto_off: {
        key: ['auto_off'],
        convertSet: async (entity, key, value, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (['ZNCZ04LM', 'ZNCZ12LM', 'SP-EUC01'].includes(meta.mapped.model)) {
                await entity.write('manuSpecificLumi', {0x0202: {value: value ? 1 : 0, type: 0x10}}, manufacturerOptions.lumi);
            } else if (['ZNCZ11LM'].includes(meta.mapped.model)) {
                const payload = value ?
                    [0xaa, 0x80, 0x05, 0xd1, 0x47, 0x00, 0x02, 0x10, 0x01] :
                    [0xaa, 0x80, 0x05, 0xd1, 0x47, 0x01, 0x02, 0x10, 0x00];

                await entity.write('genBasic', {0xFFF0: {value: payload, type: 0x41}}, manufacturerOptions.lumi);
            } else {
                throw new Error('Not supported');
            }
            return {state: {auto_off: value}};
        },
        convertGet: async (entity, key, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (['ZNCZ04LM', 'ZNCZ12LM', 'SP-EUC01'].includes(meta.mapped.model)) {
                await entity.read('manuSpecificLumi', [0x0202], manufacturerOptions.lumi);
            } else {
                throw new Error('Not supported');
            }
        },
    } satisfies Tz.Converter,
    lumi_detection_period: {
        key: ['detection_period'],
        convertSet: async (entity, key, value, meta) => {
            assertNumber(value, key);
            value *= 1;
            await entity.write('manuSpecificLumi', {0x0000: {value: [value], type: 0x21}}, manufacturerOptions.lumi);
            return {state: {detection_period: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0000], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_motion_sensitivity: {
        key: ['motion_sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'low': 1, 'medium': 2, 'high': 3};
            assertString(value, key);
            value = value.toLowerCase();
            await entity.write('manuSpecificLumi', {0x010c: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
            return {state: {motion_sensitivity: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x010c], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_presence: {
        key: ['presence'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0142], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_monitoring_mode: {
        key: ['monitoring_mode'],
        convertSet: async (entity, key, value, meta) => {
            assertString(value, key);
            value = value.toLowerCase();
            const lookup = {'undirected': 0, 'left_right': 1};
            await entity.write('manuSpecificLumi', {0x0144: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
            return {state: {monitoring_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0144], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_approach_distance: {
        key: ['approach_distance'],
        convertSet: async (entity, key, value, meta) => {
            assertString(value, key);
            value = value.toLowerCase();
            const lookup = {'far': 0, 'medium': 1, 'near': 2};
            await entity.write('manuSpecificLumi', {0x0146: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
            return {state: {approach_distance: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0146], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_reset_nopresence_status: {
        key: ['reset_nopresence_status'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificLumi', {0x0157: {value: 1, type: 0x20}}, manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_switch_click_mode: {
        key: ['click_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (['ZNQBKG38LM', 'ZNQBKG39LM', 'ZNQBKG40LM', 'ZNQBKG41LM'].includes(meta.mapped.model)) {
                await entity.write('manuSpecificLumi',
                    {0x0286: {value: getFromLookup(value, {'fast': 0x1, 'multi': 0x02}), type: 0x20}},
                    manufacturerOptions.lumi);
                return {state: {click_mode: value}};
            } else {
                await entity.write('manuSpecificLumi',
                    {0x0125: {value: getFromLookup(value, {'fast': 0x1, 'multi': 0x02}), type: 0x20}},
                    manufacturerOptions.lumi);
                return {state: {click_mode: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (['ZNQBKG38LM', 'ZNQBKG39LM', 'ZNQBKG40LM', 'ZNQBKG41LM'].includes(meta.mapped.model)) {
                await entity.read('manuSpecificLumi', [0x0286], manufacturerOptions.lumi);
            } else {
                await entity.read('manuSpecificLumi', [0x125], manufacturerOptions.lumi);
            }
        },
    } satisfies Tz.Converter,
    lumi_switch_lock_relay_opple: {
        key: ['lock_relay'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificLumi', {0x0285: {value: (value ? 1 : 0), type: 0x20}},
                manufacturerOptions.lumi);
            return {state: {lock_relay: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0285], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_operation_mode_opple: {
        key: ['operation_mode'],
        convertSet: async (entity, key, value, meta) => {
            assertString(value);
            // modes:
            // 0 - 'command' mode. keys send commands. useful for binding
            // 1 - 'event' mode. keys send events. useful for handling
            const lookup = {command: 0, event: 1};
            const endpoint = meta.device.getEndpoint(1);
            await endpoint.write('manuSpecificLumi', {'mode': getFromLookup(value.toLowerCase(), lookup)},
                {manufacturerCode: manufacturerOptions.lumi.manufacturerCode});
            return {state: {operation_mode: value.toLowerCase()}};
        },
        convertGet: async (entity, key, meta) => {
            const endpoint = meta.device.getEndpoint(1);
            await endpoint.read('manuSpecificLumi', ['mode'], {manufacturerCode: manufacturerOptions.lumi.manufacturerCode});
        },
    } satisfies Tz.Converter,
    lumi_vibration_sensitivity: {
        key: ['sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            assertString(value, key);
            value = value.toLowerCase();
            const lookup = {'low': 0x15, 'medium': 0x0B, 'high': 0x01};

            const options = {...manufacturerOptions.lumi, timeout: 35000};
            await entity.write('genBasic', {0xFF0D: {value: getFromLookup(value, lookup), type: 0x20}}, options);
            return {state: {sensitivity: value}};
        },
    } satisfies Tz.Converter,
    lumi_interlock: {
        key: ['interlock'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('genBinaryOutput', {0xff06: {value: value ? 0x01 : 0x00, type: 0x10}}, manufacturerOptions.lumi);
            return {state: {interlock: value}};
        },
    } satisfies Tz.Converter,
    lumi_curtain_options: {
        key: ['options'],
        convertSet: async (entity, key, value, meta) => {
            assertObject(value);
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            const opts = {
                reverse_direction: false,
                hand_open: true,
                reset_limits: false,
                ...value,
            };

            // Legacy names
            if (value.hasOwnProperty('auto_close')) opts.hand_open = value.auto_close;
            if (value.hasOwnProperty('reset_move')) opts.reset_limits = value.reset_move;

            if (meta.mapped.model === 'ZNCLDJ12LM') {
                await entity.write('genBasic', {0xff28: {value: opts.reverse_direction, type: 0x10}}, manufacturerOptions.lumi);
                await entity.write('genBasic', {0xff29: {value: !opts.hand_open, type: 0x10}}, manufacturerOptions.lumi);

                if (opts.reset_limits) {
                    await entity.write('genBasic', {0xff27: {value: 0x00, type: 0x10}}, manufacturerOptions.lumi);
                }
            } else if (meta.mapped.model === 'ZNCLDJ11LM') {
                const payload = [
                    0x07, 0x00, opts.reset_limits ? 0x01 : 0x02, 0x00, opts.reverse_direction ? 0x01 : 0x00, 0x04,
                    !opts.hand_open ? 0x01 : 0x00, 0x12,
                ];

                await entity.write('genBasic', {0x0401: {value: payload, type: 0x42}}, manufacturerOptions.lumi);

                // hand_open requires a separate request with slightly different payload
                payload[2] = 0x08;
                await entity.write('genBasic', {0x0401: {value: payload, type: 0x42}}, manufacturerOptions.lumi);
            } else {
                throw new Error(`lumi_curtain_options set called for not supported model: ${meta.mapped.model}`);
            }

            // Reset limits is an action, not a state.
            delete opts.reset_limits;
            return {state: {options: opts}};
        },
        convertGet: async (entity, key, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (meta.mapped.model === 'ZNCLDJ11LM') {
                await entity.read('genBasic', [0x0401], manufacturerOptions.lumi);
            } else {
                throw new Error(`lumi_curtain_options get called for not supported model: ${meta.mapped.model}`);
            }
        },
    } satisfies Tz.Converter,
    lumi_curtain_position_state: {
        key: ['state', 'position'],
        options: [exposes.options.invert_cover()],
        convertSet: async (entity, key, value, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (key === 'state' && typeof value === 'string' && value.toLowerCase() === 'stop') {
                if (['ZNJLBL01LM', 'ZNCLDJ14LM'].includes(meta.mapped.model)) {
                    const payload = {'presentValue': 2};
                    await entity.write('genMultistateOutput', payload);
                } else {
                    await entity.command('closuresWindowCovering', 'stop', {}, getOptions(meta.mapped, entity));
                }

                if (!['ZNCLDJ11LM', 'ZNJLBL01LM', 'ZNCLBL01LM'].includes(meta.mapped.model)) {
                    // The code below is originally added for ZNCLDJ11LM (Koenkk/zigbee2mqtt#4585).
                    // However, in Koenkk/zigbee-herdsman-converters#4039 it was replaced by reading
                    // directly from currentPositionLiftPercentage, so that device is excluded.
                    // For ZNJLBL01LM, in Koenkk/zigbee-herdsman-converters#4163 the position is read
                    // through onEvent each time the motor stops, so it becomes redundant, and the
                    // device is excluded.
                    // The code is left here to avoid breaking compatibility, ideally all devices using
                    // this converter should be tested so the code can be adjusted/deleted.

                    // Lumi curtain does not send position update on stop, request this.
                    await entity.read('genAnalogOutput', [0x0055]);
                }

                return {state: {state: 'STOP'}};
            } else {
                const lookup = {'open': 100, 'close': 0, 'on': 100, 'off': 0};

                value = typeof value === 'string' ? value.toLowerCase() : value;
                if (isString(value)) {
                    value = getFromLookup(value, lookup);
                }
                assertNumber(value);
                value = meta.options.invert_cover ? 100 - value : value;

                if (['ZNCLBL01LM'].includes(meta.mapped.model)) {
                    await entity.command('closuresWindowCovering', 'goToLiftPercentage', {percentageliftvalue: value},
                        getOptions(meta.mapped, entity));
                } else {
                    const payload = {'presentValue': value};
                    await entity.write('genAnalogOutput', payload);
                }
            }
        },
        convertGet: async (entity, key, meta) => {
            if (!Array.isArray(meta.mapped) && ['ZNCLBL01LM'].includes(meta.mapped.model)) {
                await entity.read('closuresWindowCovering', ['currentPositionLiftPercentage']);
            } else {
                await entity.read('genAnalogOutput', [0x0055]);
            }
        },
    } satisfies Tz.Converter,
    lumi_curtain_battery_voltage: {
        key: ['voltage'],
        convertGet: async (entity, key, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            switch (meta.mapped.model) {
            case 'ZNCLBL01LM':
                await entity.read('manuSpecificLumi', [0x040B], manufacturerOptions.lumi);
                break;
            default:
                throw new Error(`lumi_curtain_battery_voltage - unsupported model: ${meta.mapped.model}`);
            }
        },
    } satisfies Tz.Converter,
    lumi_curtain_charging_status: {
        key: ['charging_status'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0409], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_curtain_battery: {
        key: ['battery'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x040a], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_trigger_indicator: {
        key: ['trigger_indicator'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificLumi', {0x0152: {value: value ? 1 : 0, type: 0x20}}, manufacturerOptions.lumi);
            return {state: {trigger_indicator: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0152], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_curtain_hooks_lock: {
        key: ['hooks_lock'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'UNLOCK': 0, 'LOCK': 1};
            await entity.write('manuSpecificLumi', {0x0427: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
            return {state: {[key]: value}};
        },
    } satisfies Tz.Converter,
    lumi_curtain_hooks_state: {
        key: ['hooks_state'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0428], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_curtain_hand_open: {
        key: ['hand_open'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificLumi', {'curtainHandOpen': !value}, manufacturerOptions.lumi);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', ['curtainHandOpen'], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_curtain_reverse: {
        key: ['reverse_direction'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificLumi', {'curtainReverse': value}, manufacturerOptions.lumi);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', ['curtainReverse'], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_curtain_limits_calibration: {
        key: ['limits_calibration'],
        convertSet: async (entity, key, value, meta) => {
            switch (value) {
            case 'start':
                await entity.write('manuSpecificLumi', {0x0407: {value: 0x01, type: 0x20}}, manufacturerOptions.lumi);
                break;
            case 'end':
                await entity.write('manuSpecificLumi', {0x0407: {value: 0x02, type: 0x20}}, manufacturerOptions.lumi);
                break;
            case 'reset':
                await entity.write('manuSpecificLumi', {0x0407: {value: 0x00, type: 0x20}}, manufacturerOptions.lumi);
                // also? await entity.write('manuSpecificLumi', {0x0402: {value: 0x00, type: 0x10}}, manufacturerOptions.lumi);
                break;
            }
        },
    } satisfies Tz.Converter,
    lumi_curtain_limits_calibration_ZNCLDJ14LM: {
        key: ['limits_calibration'],
        options: [
            e.enum('limits_calibration', ea.ALL, ['calibrated', 'recalibrate', 'open', 'close'])
                .withDescription('Recalibrate the position limits'),
        ],
        convertSet: async (entity, key, value, meta) => {
            switch (value) {
            case 'recalibrate':
                await entity.write('manuSpecificLumi', {'curtainCalibrated': false}, manufacturerOptions.lumi);
                break;
            case 'open':
                await entity.write('genMultistateOutput', {'presentValue': 1}, manufacturerOptions.lumi);
                break;
            case 'close':
                await entity.write('genMultistateOutput', {'presentValue': 0}, manufacturerOptions.lumi);
                break;
            }
        },
    } satisfies Tz.Converter,
    lumi_buzzer: {
        key: ['buzzer'],
        convertSet: async (entity, key, value, meta) => {
            assertString(value, key);
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            const attribute = ['JY-GZ-01AQ'].includes(meta.mapped.model) ? 0x013e : 0x013f;
            value = (value.toLowerCase() === 'alarm') ? 15361 : 15360;
            await entity.write('manuSpecificLumi', {[`${attribute}`]: {value: [`${value}`], type: 0x23}}, manufacturerOptions.lumi);
            value = (value === 15361) ? 0 : 1;
            await entity.write('manuSpecificLumi', {0x0126: {value: [`${value}`], type: 0x20}}, manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_buzzer_manual: {
        key: ['buzzer_manual_alarm', 'buzzer_manual_mute'],
        convertGet: async (entity, key, meta) => {
            if (key === 'buzzer_manual_mute') {
                await entity.read('manuSpecificLumi', [0x0126], manufacturerOptions.lumi);
            } else if (key === 'buzzer_manual_alarm') {
                await entity.read('manuSpecificLumi', [0x013d], manufacturerOptions.lumi);
            }
        },
    } satisfies Tz.Converter,
    lumi_heartbeat_indicator: {
        key: ['heartbeat_indicator'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificLumi', {0x013c: {value: value ? 1 : 0, type: 0x20}}, manufacturerOptions.lumi);
            return {state: {heartbeat_indicator: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x013c], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_selftest: {
        key: ['selftest'],
        convertSet: async (entity, key, value, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            if (['JTYJ-GD-01LM/BW', 'JTQJ-BF-01LM/BW'].includes(meta.mapped.model)) {
                // Timeout of 30 seconds + required (https://github.com/Koenkk/zigbee2mqtt/issues/2287)
                const options = {...manufacturerOptions.lumi, timeout: 35000};
                await entity.write('ssIasZone', {0xFFF1: {value: 0x03010000, type: 0x23}}, options);
            } else {
                await entity.write('manuSpecificLumi', {0x0127: {value: true, type: 0x10}}, manufacturerOptions.lumi);
            }
        },
    } satisfies Tz.Converter,
    lumi_linkage_alarm: {
        key: ['linkage_alarm'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificLumi', {0x014b: {value: value ? 1 : 0, type: 0x20}}, manufacturerOptions.lumi);
            return {state: {linkage_alarm: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x014b], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_state: {
        key: ['state'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x0139], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_alarm: {
        key: ['gas', 'smoke'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x013a], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_density: {
        key: ['gas_density', 'smoke_density', 'smoke_density_dbm'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x013b], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,
    lumi_sensitivity: {
        key: ['sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            assertString(value, key);
            value = value.toLowerCase();
            const lookup = {'low': 0x04010000, 'medium': 0x04020000, 'high': 0x04030000};

            // Timeout of 30 seconds + required (https://github.com/Koenkk/zigbee2mqtt/issues/2287)
            const options = {...manufacturerOptions.lumi, timeout: 35000};
            await entity.write('ssIasZone', {0xFFF1: {value: getFromLookup(value, lookup), type: 0x23}}, options);
            return {state: {sensitivity: value}};
        },
    } satisfies Tz.Converter,
    lumi_gas_sensitivity: {
        key: ['gas_sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            assertString(value, key);
            value = value.toUpperCase();
            const lookup = {'15%LEL': 1, '10%LEL': 2};
            await entity.write('manuSpecificLumi', {0x010c: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
            return {state: {gas_sensitivity: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificLumi', [0x010c], manufacturerOptions.lumi);
        },
    } satisfies Tz.Converter,

    // lumi device specific
    lumi_smart_panel_ZNCJMB14LM: {
        key: ['theme',
            'standby_enabled',
            'beep_volume',
            'lcd_brightness',
            'language',
            'screen_saver_style',
            'standby_time',
            'font_size',
            'lcd_auto_brightness_enabled',
            'homepage',
            'screen_saver_enabled',
            'standby_lcd_brightness',
            'available_switches',
            'switch_1_text_icon',
            'switch_2_text_icon',
            'switch_3_text_icon',
        ],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'theme') {
                const lookup = {'classic': 0, 'concise': 1};
                await entity.write('manuSpecificLumi', {0x0215: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
                return {state: {theme: value}};
            } else if (key === 'standby_enabled') {
                await entity.write('manuSpecificLumi', {0x0213: {value: value, type: 0x10}}, manufacturerOptions.lumi);
                return {state: {standby_enabled: value}};
            } else if (key === 'beep_volume') {
                const lookup = {'mute': 0, 'low': 1, 'medium': 2, 'high': 3};
                await entity.write('manuSpecificLumi', {0x0212: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
                return {state: {beep_volume: value}};
            } else if (key === 'lcd_brightness') {
                await entity.write('manuSpecificLumi', {0x0211: {value: value, type: 0x20}}, manufacturerOptions.lumi);
                return {state: {lcd_brightness: value}};
            } else if (key === 'language') {
                const lookup = {'chinese': 0, 'english': 1};
                await entity.write('manuSpecificLumi', {0x0210: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
                return {state: {language: value}};
            } else if (key === 'screen_saver_style') {
                const lookup = {'classic': 1, 'analog clock': 2};
                await entity.write('manuSpecificLumi', {0x0214: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
                return {state: {screen_saver_style: value}};
            } else if (key === 'standby_time') {
                await entity.write('manuSpecificLumi', {0x0216: {value: value, type: 0x23}}, manufacturerOptions.lumi);
                return {state: {standby_time: value}};
            } else if (key === 'font_size') {
                const lookup = {'small': 3, 'medium': 4, 'large': 5};
                await entity.write('manuSpecificLumi', {0x0217: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
                return {state: {font_size: value}};
            } else if (key === 'lcd_auto_brightness_enabled') {
                await entity.write('manuSpecificLumi', {0x0218: {value: value, type: 0x10}}, manufacturerOptions.lumi);
                return {state: {lcd_auto_brightness_enabled: value}};
            } else if (key === 'homepage') {
                const lookup = {'scene': 0, 'feel': 1, 'thermostat': 2, 'switch': 3};
                await entity.write('manuSpecificLumi', {0x0219: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
                return {state: {homepage: value}};
            } else if (key === 'screen_saver_enabled') {
                await entity.write('manuSpecificLumi', {0x0221: {value: value, type: 0x10}}, manufacturerOptions.lumi);
                return {state: {screen_saver_enabled: value}};
            } else if (key === 'standby_lcd_brightness') {
                await entity.write('manuSpecificLumi', {0x0222: {value: value, type: 0x20}}, manufacturerOptions.lumi);
                return {state: {standby_lcd_brightness: value}};
            } else if (key === 'available_switches') {
                const lookup = {'none': 0, '1': 1, '2': 2, '1 and 2': 3, '3': 4, '1 and 3': 5, '2 and 3': 6, 'all': 7};
                await entity.write('manuSpecificLumi', {0x022b: {value: getFromLookup(value, lookup), type: 0x20}}, manufacturerOptions.lumi);
                return {state: {available_switches: value}};
            } else if (key === 'switch_1_text_icon') {
                const lookup = {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, '11': 11};
                const payload = [];
                const statearr: KeyValue = {};
                assertObject(value);
                if (value.hasOwnProperty('switch_1_icon')) {
                    payload.push(getFromLookup(value.switch_1_icon, lookup));
                    statearr.switch_1_icon = value.switch_1_icon;
                } else {
                    payload.push(1);
                    statearr.switch_1_icon = '1';
                }
                if (value.hasOwnProperty('switch_1_text')) {
                    payload.push(...value.switch_1_text.split('').map((c: string) => c.charCodeAt(0)));
                    statearr.switch_1_text = value.switch_1_text;
                } else {
                    // @ts-expect-error
                    payload.push(...''.text.split('').map((c) => c.charCodeAt(0)));
                    statearr.switch_1_text = '';
                }
                await entity.write('manuSpecificLumi', {0x0223: {value: payload, type: 0x41}}, manufacturerOptions.lumi);
                return {state: statearr};
            } else if (key === 'switch_2_text_icon') {
                const lookup = {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, '11': 11};
                const payload = [];
                const statearr: KeyValue = {};
                assertObject(value);
                if (value.hasOwnProperty('switch_2_icon')) {
                    payload.push(getFromLookup(value.switch_2_icon, lookup));
                    statearr.switch_2_icon = value.switch_2_icon;
                } else {
                    payload.push(1);
                    statearr.switch_2_icon = '1';
                }
                if (value.hasOwnProperty('switch_2_text')) {
                    payload.push(...value.switch_2_text.split('').map((c: string) => c.charCodeAt(0)));
                    statearr.switch_2_text = value.switch_2_text;
                } else {
                    // @ts-expect-error
                    payload.push(...''.text.split('').map((c) => c.charCodeAt(0)));
                    statearr.switch_2_text = '';
                }
                await entity.write('manuSpecificLumi', {0x0224: {value: payload, type: 0x41}}, manufacturerOptions.lumi);
                return {state: statearr};
            } else if (key === 'switch_3_text_icon') {
                const lookup = {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, '11': 11};
                const payload = [];
                const statearr: KeyValue = {};
                assertObject(value);
                if (value.hasOwnProperty('switch_3_icon')) {
                    payload.push(getFromLookup(value.switch_3_icon, lookup));
                    statearr.switch_3_icon = value.switch_3_icon;
                } else {
                    payload.push(1);
                    statearr.switch_3_icon = '1';
                }
                if (value.hasOwnProperty('switch_3_text')) {
                    payload.push(...value.switch_3_text.split('').map((c: string) => c.charCodeAt(0)));
                    statearr.switch_3_text = value.switch_3_text;
                } else {
                    // @ts-expect-error
                    payload.push(...''.text.split('').map((c) => c.charCodeAt(0)));
                    statearr.switch_3_text = '';
                }
                await entity.write('manuSpecificLumi', {0x0225: {value: payload, type: 0x41}}, manufacturerOptions.lumi);
                return {state: statearr};
            } else {
                throw new Error(`Not supported: '${key}'`);
            }
        },
    } satisfies Tz.Converter,
};

export const legacyFromZigbee = {
    WXKG01LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                const state = msg.data['onOff'];
                const key = `${deviceID}_legacy`;

                if (!legacyFromZigbeeStore[key]) {
                    legacyFromZigbeeStore[key] = {};
                }

                const current = msg.meta.zclTransactionSequenceNumber;
                if (legacyFromZigbeeStore[key].transaction === current) return;
                legacyFromZigbeeStore[key].transaction = current;

                // 0 = click down, 1 = click up, else = multiple clicks
                if (state === 0) {
                    legacyFromZigbeeStore[key].timer = setTimeout(() => {
                        publish({click: 'long'});
                        legacyFromZigbeeStore[key].timer = null;
                        legacyFromZigbeeStore[key].long = Date.now();
                        legacyFromZigbeeStore[key].long_timer = setTimeout(() => {
                            legacyFromZigbeeStore[key].long = false;
                        }, 4000); // After 4000 milliseconds of not receiving long_release we assume it will not happen.
                        // @ts-expect-error
                    }, options.long_timeout || 1000); // After 1000 milliseconds of not releasing we assume long click.
                } else if (state === 1) {
                    if (legacyFromZigbeeStore[key].long) {
                        const duration = Date.now() - legacyFromZigbeeStore[key].long;
                        publish({click: 'long_release', duration: duration});
                        legacyFromZigbeeStore[key].long = false;
                    }

                    if (legacyFromZigbeeStore[key].timer) {
                        clearTimeout(legacyFromZigbeeStore[key].timer);
                        legacyFromZigbeeStore[key].timer = null;
                        publish({click: 'single'});
                    }
                } else {
                    const clicks = msg.data['32768'];
                    const actionLookup: KeyValueAny = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                    const payload = actionLookup[clicks] ? actionLookup[clicks] : 'many';
                    publish({click: payload});
                }
            }
        },
    } satisfies Fz.Converter,
    WXKG11LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const data = msg.data;
                let clicks;
                if (data.onOff) {
                    clicks = 1;
                } else if (data['32768']) {
                    clicks = data['32768'];
                }

                const actionLookup: KeyValueAny = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                if (actionLookup[clicks]) {
                    return {click: actionLookup[clicks]};
                }
            }
        },
    } satisfies Fz.Converter,
    lumi_action_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const value = msg.data['presentValue'];
                const lookup: KeyValueAny = {
                    1: {click: 'single'}, // single click
                    2: {click: 'double'}, // double click
                };

                return lookup[value] ? lookup[value] : null;
            }
        },
    } satisfies Fz.Converter,
    WXKG12LM_action_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const value = msg.data['presentValue'];
                const lookup: KeyValueAny = {
                    1: {click: 'single'}, // single click
                    2: {click: 'double'}, // double click
                };

                return lookup[value] ? lookup[value] : null;
            }
        },
    } satisfies Fz.Converter,
    WXKG03LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'single'};
            }
        },
    } satisfies Fz.Converter,
    WXKG02LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const lookup: KeyValueAny = {1: 'left', 2: 'right', 3: 'both'};
                return {click: lookup[msg.endpoint.ID]};
            }
        },
    } satisfies Fz.Converter,
    WXKG02LM_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            // Somestime WXKG02LM sends multiple messages on a single click, this prevents handling
            // of a message with the same transaction sequence number twice.
            const current = msg.meta.zclTransactionSequenceNumber;
            if (legacyFromZigbeeStore[msg.device.ieeeAddr + 'legacy'] === current) return;
            legacyFromZigbeeStore[msg.device.ieeeAddr + 'legacy'] = current;

            const buttonLookup: KeyValueAny = {1: 'left', 2: 'right', 3: 'both'};
            const button = buttonLookup[msg.endpoint.ID];
            const value = msg.data['presentValue'];

            const actionLookup: KeyValueAny = {
                0: 'long',
                1: null,
                2: 'double',
            };

            const action = actionLookup[value];

            if (button) {
                if (isLegacyEnabled(options)) {
                    return {click: button + (action ? `_${action}` : '')};
                }
            }
        },
    } satisfies Fz.Converter,
    QBKG04LM_QBKG11LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if (!msg.data['61440']) {
                    return {click: 'single'};
                }
            }
        },
    } satisfies Fz.Converter,
    QBKG11LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if ([1, 2].includes(msg.data.presentValue)) {
                    const times: KeyValueAny = {1: 'single', 2: 'double'};
                    return {click: times[msg.data.presentValue]};
                }
            }
        },
    } satisfies Fz.Converter,
    QBKG03LM_QBKG12LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if (!msg.data['61440']) {
                    const mapping: KeyValueAny = {4: 'left', 5: 'right', 6: 'both'};
                    const button = mapping[msg.endpoint.ID];
                    return {click: button};
                }
            }
        },
    } satisfies Fz.Converter,
    QBKG03LM_buttons: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const mapping: KeyValueAny = {4: 'left', 5: 'right'};
                const button = mapping[msg.endpoint.ID];
                if (button) {
                    const payload: KeyValueAny = {};
                    payload[`button_${button}`] = msg.data['onOff'] === 1 ? 'release' : 'hold';
                    return payload;
                }
            }
        },
    } satisfies Fz.Converter,
    QBKG12LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if ([1, 2].includes(msg.data.presentValue)) {
                    const mapping: KeyValueAny = {5: 'left', 6: 'right', 7: 'both'};
                    const times: KeyValueAny = {1: 'single', 2: 'double'};
                    const button = mapping[msg.endpoint.ID];
                    return {click: `${button}_${times[msg.data.presentValue]}`};
                }
            }
        },
    } satisfies Fz.Converter,
    lumi_on_off_action: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: getKey(model.endpoint(msg.device), msg.endpoint.ID)};
            } else {
                return fromZigbee.lumi_action.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    lumi_multistate_action: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                const value = msg.data['presentValue'];
                const actionLookup: KeyValueAny = {0: 'long', 1: null, 2: 'double'};
                const action = actionLookup[value];

                if (button) {
                    return {action: `${button}${(action ? `_${action}` : '')}`};
                }
            } else {
                return fromZigbee.lumi_action_multistate.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
};

exports.buffer2DataObject = buffer2DataObject;
exports.numericAttributes2Payload = numericAttributes2Payload;
exports.manufacturerCode = manufacturerCode;
