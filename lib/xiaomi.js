'use strict';

const {
    batteryVoltageToPercentage,
    calibrateAndPrecisionRoundOptions,
    calibrateAndPrecisionRoundOptionsIsPercentual,
    postfixWithEndpointName,
    precisionRound,
    getKey,
} = require('./utils');

const exposes = require('../lib/exposes');
const globalStore = require('../lib/store');

const buffer2DataObject = (meta, model, buffer) => {
    const dataObject = {};

    if (buffer !== null && Buffer.isBuffer(buffer)) {
        // Xiaomi struct parsing
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
                if (meta.logger) meta.logger.debug(`${model.zigbeeModel}: unknown vtype=${buffer[i+1]}, pos=${i+1}, moving length 1`);
                i += 2;
                break;
            case 95:
                // 0x5f unknown, length taken from what seems correct in the logs, maybe is wrong
                if (meta.logger) meta.logger.debug(`${model.zigbeeModel}: unknown vtype=${buffer[i+1]}, pos=${i+1}, moving length 4`);
                i += 5;
                break;
            default:
                if (meta.logger) meta.logger.debug(`${model.zigbeeModel}: unknown vtype=${buffer[i + 1]}, pos=${i + 1}`);
            }

            if (value != null) {
                dataObject[index] = value;
            }
        }
    }

    if (meta.logger) {
        meta.logger.debug(`${model.zigbeeModel}: Processed buffer into data ${JSON.stringify(dataObject,
            (key, value) => typeof value === 'bigint' ? value.toString() : value)}`);
    }


    return dataObject;
};

const numericAttributes2Payload = async (msg, meta, model, options, dataObject) => {
    let payload = {};

    for (const [key, value] of Object.entries(dataObject)) {
        switch (key) {
        case '0':
            payload.detection_period = value;
            break;
        case '1':
            payload.voltage = value;
            if (model.meta && model.meta.battery && model.meta.battery.voltageToPercentage) {
                payload.battery = batteryVoltageToPercentage(value, model.meta.battery.voltageToPercentage);
            }
            break;
        case '2':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.power_outage_count = value - 1;
            }
            break;
        case '3':
            if (['WXCJKG11LM', 'WXCJKG12LM', 'WXCJKG13LM', 'MCCGQ14LM', 'GZCGQ01LM', 'JY-GZ-01AQ'].includes(model.model)) {
                // The temperature value is constant 25 °C and does not change, so we ignore it
                // https://github.com/Koenkk/zigbee2mqtt/issues/11126
                // https://github.com/Koenkk/zigbee-herdsman-converters/pull/3585
                // https://github.com/Koenkk/zigbee2mqtt/issues/13253
            } else {
                payload.device_temperature = calibrateAndPrecisionRoundOptions(value, options, 'device_temperature'); // 0x03
            }
            break;
        case '4':
            payload.mode_switch = {4: 'anti_flicker_mode', 1: 'quick_mode'}[value];
            break;
        case '5':
            payload.power_outage_count = value - 1;
            break;
        case '8':
            if (['ZNLDP13LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            }
            break;
        case '9':
            if (['ZNLDP13LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            }
            break;
        case '10':
            if (['ZNLDP13LM', 'CTP-R01'].includes(model.model)) {
                // We don't know what the value means for these devices.
            } else {
                payload.switch_type = {1: 'toggle', 2: 'momentary'}[value];
            }
            break;
        case '11':
            if (['RTCGQ11LM'].includes(model.model)) {
                payload.illuminance = calibrateAndPrecisionRoundOptions(value, options, 'illuminance');
                // DEPRECATED: remove illuminance_lux here.
                payload.illuminance_lux = calibrateAndPrecisionRoundOptions(value, options, 'illuminance_lux');
            }
            break;
        case '12':
            if (['ZNLDP13LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            }
            break;
        case '100':
            if (['QBKG20LM', 'QBKG31LM', 'QBKG39LM', 'QBKG41LM', 'QBCZ15LM', 'LLKZMK11LM', 'QBKG12LM', 'QBKG03LM', 'QBKG25LM']
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
                payload.click_mode = {1: 'fast', 2: 'multi'}[value];
            } else if (['WXCJKG11LM', 'WXCJKG12LM', 'WXCJKG13LM', 'ZNMS12LM', 'ZNCLBL01LM', 'RTCGQ12LM', 'RTCGQ13LM', 'RTCGQ14LM',
                'RTCGQ15LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
                // https://github.com/Koenkk/zigbee2mqtt/issues/11126
                // https://github.com/Koenkk/zigbee2mqtt/issues/12279
            } else if (['WSDCGQ01LM', 'WSDCGQ11LM', 'WSDCGQ12LM', 'VOCKQJK11LM'].includes(model.model)) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/798
                // Sometimes the sensor publishes non-realistic vales, filter these
                const temperature = parseFloat(value) / 100.0;
                if (temperature > -65 && temperature < 65) {
                    payload.temperature = calibrateAndPrecisionRoundOptions(temperature, options, 'temperature');
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
                payload.illuminance_lux = calibrateAndPrecisionRoundOptions(value, options, 'illuminance_lux');
            } else {
                payload.state = value === 1 ? 'ON' : 'OFF';
            }
            break;
        case '101':
            if (['QBKG20LM', 'QBKG31LM', 'QBKG39LM', 'QBKG41LM', 'QBCZ15LM', 'QBKG25LM', 'QBKG34LM', 'LLKZMK11LM', 'QBKG12LM', 'QBKG03LM']
                .includes(model.model)) {
                let mapping;
                switch (model.model) {
                case 'QBCZ15LM':
                    mapping = 'usb';
                    break;
                case 'QBKG25LM':
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
                const illuminance = value > 65000 ? 0 : value;
                payload.illuminance = calibrateAndPrecisionRoundOptions(illuminance, options, 'illuminance');
            } else if (['WSDCGQ01LM', 'WSDCGQ11LM', 'WSDCGQ12LM', 'VOCKQJK11LM'].includes(model.model)) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/798
                // Sometimes the sensor publishes non-realistic vales, filter these
                const humidity = parseFloat(value) / 100.0;
                if (humidity >= 0 && humidity <= 100) {
                    payload.humidity = calibrateAndPrecisionRoundOptions(humidity, options, 'humidity');
                }
            } else if (['ZNJLBL01LM', 'ZNCLDJ12LM'].includes(model.model)) {
                payload.battery = value;
            } else if (['ZNCLBL01LM'].includes(model.model)) {
                const battery = value / 2;
                payload.battery = precisionRound(battery, 2);
            } else if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.presence = {0: false, 1: true, 255: null}[value];
            }
            break;
        case '102':
            if (['QBKG25LM', 'QBKG34LM'].includes(model.model)) {
                payload.state_right = value === 1 ? 'ON' : 'OFF';
            } else if (['WSDCGQ01LM', 'WSDCGQ11LM'].includes(model.model)) {
                payload.pressure = calibrateAndPrecisionRoundOptions(value/100.0, options, 'pressure');
            } else if (['WSDCGQ12LM'].includes(model.model)) {
                // This pressure value is ignored because it is less accurate than reported in the 'scaledValue' attribute
                // of the 'msPressureMeasurement' cluster
            } else if (['RTCZCGQ11LM'].includes(model.model)) {
                if (meta.device.applicationVersion < 50) {
                    payload.presence_event = {0: 'enter', 1: 'leave', 2: 'left_enter', 3: 'right_leave', 4: 'right_enter',
                        5: 'left_leave', 6: 'approach', 7: 'away', 255: null}[value];
                } else {
                    payload.motion_sensitivity = {1: 'low', 2: 'medium', 3: 'high'}[value];
                }
            }
            break;
        case '103':
            if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.monitoring_mode = {0: 'undirected', 1: 'left_right'}[value];
            }
            break;
        case '105':
            if (['RTCGQ13LM'].includes(model.model)) {
                payload.motion_sensitivity = {1: 'low', 2: 'medium', 3: 'high'}[value];
            } else if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.approach_distance = {0: 'far', 1: 'medium', 2: 'near'}[value];
            } else if (['RTCGQ14LM'].includes(model.model)) {
                payload.detection_interval = value;
            }
            break;
        case '106':
            if (['RTCGQ14LM'].includes(model.model)) {
                payload.motion_sensitivity = {1: 'low', 2: 'medium', 3: 'high'}[value];
            }
            break;
        case '107':
            if (['RTCGQ14LM'].includes(model.model)) {
                payload.trigger_indicator = value === 1;
            } else if (['ZNCLBL01LM'].includes(model.model)) {
                const position = options.invert_cover ? 100 - value : value;
                payload.position = position;
                payload.state = options.invert_cover ? (position > 0 ? 'CLOSE' : 'OPEN') : (position > 0 ? 'OPEN' : 'CLOSE');
            }
            break;
        case '149':
            payload.energy = calibrateAndPrecisionRoundOptions(value, options, 'energy'); // 0x95
            // Consumption is deprecated
            payload.consumption = payload.energy;
            break;
        case '150':
            if (!['JTYJ-GD-01LM/BW'].includes(model.model)) {
                payload.voltage = calibrateAndPrecisionRoundOptions(value * 0.1, options, 'voltage'); // 0x96
            }
            break;
        case '151':
            if (['LLKZMK11LM'].includes(model.model)) {
                payload.current = calibrateAndPrecisionRoundOptions(value, options, 'current');
            } else {
                payload.current = calibrateAndPrecisionRoundOptions(value * 0.001, options, 'current');
            }
            break;
        case '152':
            if (['DJT11LM'].includes(model.model)) {
                // We don't know what implies for this device, it contains values like 30, 50,... that don't seem to change
            } else {
                payload.power = calibrateAndPrecisionRoundOptions(value, options, 'power'); // 0x98
            }
            break;
        case '154':
            if (['ZNLDP13LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
            }
            break;
        case '159':
            if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.gas_sensitivity = {1: '15%LEL', 2: '10%LEL'}[value];
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
                payload.smoke_density_dbm = {0: 0, 1: 0.085, 2: 0.088, 3: 0.093, 4: 0.095, 5: 0.100, 6: 0.105, 7: 0.110,
                    8: 0.115, 9: 0.120, 10: 0.125}[value];
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
                payload.state = {0: 'work', 1: 'preparation'}[value];
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
        case '240':
            payload.flip_indicator_light = value === 1 ? 'ON' : 'OFF';
            break;
        case '247':
            {
                const dataObject247 = buffer2DataObject(meta, model, value);
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
                        payload.operation_mode = {0: 'action_mode', 1: 'scene_mode'}[dataObject247[155]];
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
                payload.motion_sensitivity = {1: 'low', 2: 'medium', 3: 'high'}[value];
            } else if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.gas_sensitivity = {1: '15%LEL', 2: '10%LEL'}[value];
            }
            break;
        case '276':
            if (['VOCKQJK11LM'].includes(model.model)) {
                payload.display_unit = getKey(VOCKQJK11LMDisplayUnit, value);
            }
            break;
        case '293':
            payload.click_mode = {1: 'fast', 2: 'multi'}[value];
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
                payload.state = {0: 'work', 1: 'preparation'}[value];
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
                payload.smoke_density_dbm = {0: 0, 1: 0.085, 2: 0.088, 3: 0.093, 4: 0.095, 5: 0.100, 6: 0.105, 7: 0.110,
                    8: 0.115, 9: 0.120, 10: 0.125}[value];
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
        case '322':
            if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.presence = {0: false, 1: true, 255: null}[value];
            }
            break;
        case '323':
            if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.presence_event = {0: 'enter', 1: 'leave', 2: 'left_enter', 3: 'right_leave', 4: 'right_enter',
                    5: 'left_leave', 6: 'approach', 7: 'away'}[value];
            }
            break;
        case '324':
            if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.monitoring_mode = {0: 'undirected', 1: 'left_right'}[value];
            }
            break;
        case '326':
            if (['RTCZCGQ11LM'].includes(model.model)) {
                payload.approach_distance = {0: 'far', 1: 'medium', 2: 'near'}[value];
            }
            break;
        case '328':
            if (['CTP-R01'].includes(model.model)) {
                // detected hard switch of operation_mode (attribute 0x148[328])
                payload.operation_mode = {0: 'action_mode', 1: 'scene_mode'}[msg.data[328]];
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
            if (['ZNCZ15LM', 'QBCZ14LM', 'QBCZ15LM'].includes(model.model)) {
                payload.button_lock = value === 1 ? 'OFF' : 'ON';
            } else {
                const mode = {0x01: 'control_relay', 0x00: 'decoupled'}[value];
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
            payload.overload_protection = precisionRound(value, 2);
            break;
        case '550':
            payload.button_switch_mode = value === 1 ? 'relay_and_usb' : 'relay';
            break;
        case '1025':
            if (['ZNCLBL01LM'].includes(model.model)) {
                payload.hand_open = !value;
            } else {
                // next values update only when curtain finished initial setup and knows current position
                payload.options = {...payload.options,
                    reverse_direction: value[2] == '\u0001',
                    hand_open: value[5] == '\u0000',
                };
            }
            break;
        case '1028':
            payload = {...payload,
                motor_state: (options.invert_cover ? {0: 'stopped', 1: 'closing', 2: 'opening'} :
                    {0: 'stopped', 1: 'opening', 2: 'closing'})[value],
                running: !!value,
            };
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
                payload.motor_state = (options.invert_cover ? {0: 'opening', 1: 'closing', 2: 'stopped'} :
                    {0: 'closing', 1: 'opening', 2: 'stopped'})[value];
                payload.running = value < 2 ? true : false;
            }
            break;
        case '1061':
            if (['ZNCLBL01LM'].includes(model.model)) {
                payload.action = (options.invert_cover ? {1: 'manual_close', 2: 'manual_open'} :
                    {1: 'manual_open', 2: 'manual_close'})[value];
            }
            break;
        case '1063':
            if (['ZNCLBL01LM'].includes(model.model)) {
                payload.hooks_lock = {0: 'UNLOCK', 1: 'LOCK'}[value];
            }
            break;
        case '1064':
            if (['ZNCLBL01LM'].includes(model.model)) {
                payload.hooks_state = {0: 'unlocked', 1: 'locked', 2: 'locking', 3: 'unlocking'}[value];
                payload.hooks_lock = {0: 'UNLOCK', 1: 'LOCK', 2: 'UNLOCK', 3: 'LOCK'}[value];
            }
            break;
        case '1289':
            payload.dimmer_mode = {3: 'rgbw', 1: 'dual_ct'}[value];
            break;
        case '65281':
            {
                const payload65281 = await numericAttributes2Payload(msg, meta, model, options, value);
                payload = {...payload, ...payload65281};
            }
            break;
        case '65282':
            // This is a a complete structure with attributes, like element 0 for state, element 1 for voltage...
            // At this moment we only extract what we are sure, for example, position 0 seems to be always 1 for a
            // occupancy sensor, so we ignore it at this moment
            if (['MCCGQ01LM'].includes(model.model)) {
                payload.contact = value[0].elmVal === 0;
            }
            payload.voltage = value[1].elmVal;
            if (model.meta && model.meta.battery && model.meta.battery.voltageToPercentage) {
                payload.battery = batteryVoltageToPercentage(payload.voltage, model.meta.battery.voltageToPercentage);
            }
            payload.power_outage_count = value[4].elmVal - 1;
            break;
        case 'mode':
            payload.operation_mode = ['command', 'event'][value];
            break;
        case 'modelId':
            // We ignore it, but we add it here to not shown an unknown key in the log
            break;
        case 'illuminance':
            // It contains the illuminance and occupancy, but in z2m we use a custom timer to do it, so we ignore it
            break;
        default:
            if (meta.logger) meta.logger.debug(`${model.zigbeeModel}: unknown key ${key} with value ${value}`);
        }
    }

    if (meta.logger) meta.logger.debug(`${model.zigbeeModel}: Processed data into payload ${JSON.stringify(payload)}`);

    return payload;
};

const VOCKQJK11LMDisplayUnit = {
    'mgm3_celsius': 0x00, // mg/m³, °C (default)
    'ppb_celsius': 0x01, // ppb, °C
    'mgm3_fahrenheit': 0x10, // mg/m³, °F
    'ppb_fahrenheit': 0x11, // ppb, °F
};

const numericAttributes2Options = (definition) => {
    const supported = ['temperature', 'device_temperature', 'illuminance', 'illuminance_lux',
        'pressure', 'power', 'current', 'voltage', 'energy', 'power'];
    const precisionSupported = ['temperature', 'humidity', 'pressure', 'power', 'current', 'voltage', 'energy', 'power'];
    const result = [];
    for (const expose of definition.exposes) {
        // only eletrical measurement voltage is supported, not battery
        const isBatteryVoltage = expose.name === 'voltage' && definition.meta && definition.meta.battery;
        if (supported.includes(expose.name) && !isBatteryVoltage) {
            const type = calibrateAndPrecisionRoundOptionsIsPercentual(expose.name) ? 'percentual' : 'absolute';
            result.push(exposes.options.calibration(expose.name, type));
            if (precisionSupported.includes(expose.name)) {
                result.push(exposes.options.precision(expose.name));
            }
        }
    }

    return result;
};

// For RTCZCGQ11LM
/**
 * @typedef {{
*  x: number,
*  y: number,
* }} AqaraFP1RegionZone
*/
const fp1Constants = {
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
const fp1Mappers = {
    aqara_fp1: {
        region_event_type_names: {
            [fp1Constants.region_event_types.Enter]: 'enter',
            [fp1Constants.region_event_types.Leave]: 'leave',
            [fp1Constants.region_event_types.Occupied]: 'occupied',
            [fp1Constants.region_event_types.Unoccupied]: 'unoccupied',
        },
    },
};
const fp1 = {
    constants: fp1Constants,
    mappers: fp1Mappers,
    /**
     * @param {undefined | Set<number>} xCells
     * @return {number}
     */
    encodeXCellsDefinition: (xCells) => {
        if (!xCells || !xCells.size) {
            return 0;
        }
        return [...xCells.values()].reduce((accumulator, marker) => accumulator + fp1.encodeXCellIdx(marker), 0);
    },
    /**
     * @param {number} cellXIdx
     * @return {number}
     */
    encodeXCellIdx: (cellXIdx) => {
        return 2 ** (cellXIdx - 1);
    },
    // Note: let TypeScript infer the return type to enable union discrimination
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {unknown} input
     */
    parseAqaraFp1RegionDeleteInput: (input) => {
        if (!input || typeof input !== 'object') {
            return fp1.failure({reason: 'NOT_OBJECT'});
        }

        if (!('region_id' in input) || !fp1.isAqaraFp1RegionId(input.region_id)) {
            return fp1.failure({reason: 'INVALID_REGION_ID'});
        }

        return {
            /** @type true */
            isSuccess: true,
            payload: {
                command: {
                    region_id: input.region_id,
                },
            },
        };
    },
    // Note: let TypeScript infer the return type to enable union discrimination
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {unknown} input
     */
    parseAqaraFp1RegionUpsertInput: (input) => {
        if (!input || typeof input !== 'object') {
            return fp1.failure({reason: 'NOT_OBJECT'});
        }

        if (!('region_id' in input) || !fp1.isAqaraFp1RegionId(input.region_id)) {
            return fp1.failure({reason: 'INVALID_REGION_ID'});
        }

        if (!('zones' in input) || !Array.isArray(input.zones) || !input.zones.length) {
            return fp1.failure({reason: 'ZONES_LIST_EMPTY'});
        }

        if (!input.zones.every(fp1.isAqaraFp1RegionZoneDefinition)) {
            return fp1.failure({reason: 'INVALID_ZONES'});
        }

        return {
            /** @type true */
            isSuccess: true,
            payload: {
                command: {
                    region_id: input.region_id,
                    zones: input.zones,
                },
            },
        };
    },
    // Note: this is valid typescript JSDoc
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {unknown} value
     * @returns {value is number}
     */
    isAqaraFp1RegionId: (value) => {
        return (
            typeof value === 'number' &&
            value >= fp1.constants.region_config_regionId_min &&
            value <= fp1.constants.region_config_regionId_max
        );
    },
    // Note: this is valid typescript JSDoc
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {unknown} value
     * @returns {value is AqaraFP1RegionZone}
     */
    isAqaraFp1RegionZoneDefinition: (value) => {
        return (
            value &&
            typeof value === 'object' &&
            'x' in value &&
            'y' in value &&
            typeof value.x === 'number' &&
            typeof value.y === 'number' &&
            value.x >= fp1.constants.region_config_zoneX_min &&
            value.x <= fp1.constants.region_config_zoneX_max &&
            value.y >= fp1.constants.region_config_zoneY_min &&
            value.y <= fp1.constants.region_config_zoneY_max
        );
    },
    /**
     * @template {Record<string, unknown>} ErrorType
     * @param {ErrorType} error
     * @return { { isSuccess: false, error: ErrorType } }
     */
    failure: (error) => {
        return {
            isSuccess: false,
            error,
        };
    },
};

const trv = {
    decodeFirmwareVersionString(value) {
        // Add prefix to follow Aqara's versioning schema: https://www.aqara.com/en/version/radiator-thermostat-e1
        const firmwareVersionPrefix = '0.0.0_';

        // Reinterpret from LE integer to byte sequence(e.g., `[25,8,0,0]` corresponds to 0.0.0_0825)
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(value);
        const firmwareVersionNumber = buffer.reverse().subarray(1).join('');

        return firmwareVersionPrefix + firmwareVersionNumber;
    },

    decodePreset(value) {
        // Setup mode is the initial device state after powering it ("F11" on display) and not a real preset that can be deliberately
        // set by users, therefore it is exposed as a separate flag.
        return {
            setup: value === 3,
            preset: {2: 'away', 1: 'auto', 0: 'manual'}[value],
        };
    },

    decodeHeartbeat(meta, model, messageBuffer) {
        const data = buffer2DataObject(meta, model, messageBuffer);
        const payload = {};

        Object.entries(data).forEach(([key, value]) => {
            switch (parseInt(key)) {
            case 3:
                payload.device_temperature = value;
                break;
            case 5:
                payload.power_outage_count = value - 1;
                break;
            case 10:
                // unidentified number, e.g. 32274, 3847
                break;
            case 13:
                payload.firmware_version = trv.decodeFirmwareVersionString(value);
                break;
            case 17:
                // unidentified flag/enum, e.g. 1
                break;
            case 101:
                Object.assign(payload, trv.decodePreset(value));
                break;
            case 102:
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
};

module.exports = {
    buffer2DataObject,
    numericAttributes2Payload,
    numericAttributes2Options,
    VOCKQJK11LMDisplayUnit,
    fp1,
    manufacturerCode: 0x115f,
    trv,
};
