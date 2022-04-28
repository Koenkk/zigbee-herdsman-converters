'use strict';

const {
    batteryVoltageToPercentage,
    calibrateAndPrecisionRoundOptions,
    postfixWithEndpointName,
    precisionRound,
} = require('./utils');

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

const numericAttributes2Payload = (msg, meta, model, options, dataObject) => {
    let payload = {};

    Object.entries(dataObject).forEach(([key, value]) => {
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
                payload.power_outage_count = value;
            }
            break;
        case '3':
            if (['WSDCGQ12LM'].includes(model.model)) {
                // This temperature value is ignored because with greater accuracy it is reported in key №100
            } else if (!['WXCJKG11LM', 'WXCJKG12LM', 'WXCJKG13LM'].includes(model.model)) {
                payload.temperature = calibrateAndPrecisionRoundOptions(value, options, 'temperature'); // 0x03
            }
            break;
        case '4':
            payload.mode_switch = {4: 'anti_flicker_mode', 1: 'quick_mode'}[value];
            break;
        case '5':
            if (['Mains (single phase)', 'DC Source'].includes(meta.device.powerSource)) {
                payload.power_outage_count = value;
            }
            break;
        case '10':
            payload.switch_type = {1: 'toggle', 2: 'momentary'}[value];
            break;
        case '11':
            if (!['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.illuminance = calibrateAndPrecisionRoundOptions(value, options, 'illuminance');
                // DEPRECATED: remove illuminance_lux here.
                payload.illuminance_lux = calibrateAndPrecisionRoundOptions(value, options, 'illuminance_lux');
            }
            break;
        case '100':
            if (['QBKG20LM', 'QBKG31LM', 'QBKG39LM', 'QBKG41LM', 'QBCZ15LM', 'LLKZMK11LM', 'QBKG12LM', 'QBKG03LM'].includes(model.model)) {
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
            } else if (['WXCJKG11LM', 'WXCJKG12LM', 'WXCJKG13LM', 'ZNMS12LM'].includes(model.model)) {
                // We don't know what the value means for these devices.
                // https://github.com/Koenkk/zigbee2mqtt/issues/11126
                // https://github.com/Koenkk/zigbee2mqtt/issues/12279
            } else if (['WSDCGQ01LM', 'WSDCGQ11LM', 'WSDCGQ12LM'].includes(model.model)) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/798
                // Sometimes the sensor publishes non-realistic vales, filter these
                const temperature = parseFloat(value) / 100.0;
                if (temperature > -65 && temperature < 65) {
                    payload.temperature = calibrateAndPrecisionRoundOptions(temperature, options, 'temperature');
                }
            } else if (['RTCGQ11LM'].includes(model.model)) {
                // It contains the occupancy, but in z2m we use a custom timer to do it, so we ignore it
                // payload.occupancy = value === 1;
            } else if (['MCCGQ11LM'].includes(model.model)) {
                payload.contact = value === 0;
            } else if (['SJCGQ11LM'].includes(model.model)) {
                // Ignore the message. It seems not reliable. See discussion here https://github.com/Koenkk/zigbee2mqtt/issues/12018
                // payload.water_leak = value === 1;
            } else if (['JTYJ-GD-01LM/BW'].includes(model.model)) {
                payload.smoke_density = value;
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
            } else if (['RTCGQ12LM', 'RTCGQ14LM'].includes(model.model)) {
                payload.illuminance = calibrateAndPrecisionRoundOptions(value, options, 'illuminance');
            } else if (['WSDCGQ01LM', 'WSDCGQ11LM', 'WSDCGQ12LM'].includes(model.model)) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/798
                // Sometimes the sensor publishes non-realistic vales, filter these
                const humidity = parseFloat(value) / 100.0;
                if (humidity >= 0 && humidity <= 100) {
                    payload.humidity = calibrateAndPrecisionRoundOptions(humidity, options, 'humidity');
                }
            } else if (['ZNJLBL01LM'].includes(model.model)) {
                payload.battery = value;
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
        case '149':
            payload.energy = precisionRound(value, 2); // 0x95
            // Consumption is deprecated
            payload.consumption = payload.energy;
            break;
        case '150':
            if (!['JTYJ-GD-01LM/BW'].includes(model.model)) {
                payload.voltage = precisionRound(value * 0.1, 1); // 0x96
            }
            break;
        case '151':
            if (['LLKZMK11LM'].includes(model.model)) {
                payload.current = precisionRound(value, 4);
            } else {
                payload.current = precisionRound(value * 0.001, 4);
            }
            break;
        case '152':
            if (['DJT11LM'].includes(model.model)) {
                // We don't know what implies for this device, it contains values like 30, 50,... that don't seem to change
            } else {
                payload.power = precisionRound(value, 2); // 0x98
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
                payload.mute = value === 1;
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
                const payload247 = numericAttributes2Payload(msg, meta, model, options, dataObject247);
                payload = {...payload, ...payload247};
            }
            break;
        case '258':
            payload.detection_interval = value;
            break;
        case '268':
            if (['RTCGQ13LM', 'RTCZCGQ11LM'].includes(model.model)) {
                payload.motion_sensitivity = {1: 'low', 2: 'medium', 3: 'high'}[value];
            } else if (['JT-BZ-01AQ/A'].includes(model.model)) {
                payload.gas_sensitivity = {1: '15%LEL', 2: '10%LEL'}[value];
            }
            break;
        case '293':
            payload.click_mode = {1: 'fast', 2: 'multi'}[value];
            break;
        case '294':
            if (['JT-BZ-01AQ/A', 'JY-GZ-01AQ'].includes(model.model)) {
                payload.mute = value === 1;
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
        case '331':
            if (['JT-BZ-01AQ/A', 'JY-GZ-01AQ'].includes(model.model)) {
                payload.linkage_alarm = value === 1;
            }
            break;
        case '512':
            if (['ZNCZ15LM', 'QBCZ14LM', 'QBCZ15LM'].includes(model.model)) {
                payload.button_lock = value === 1 ? 'OFF' : 'ON';
            } else {
                const mode = {0x01: 'control_relay', 0x00: 'decoupled'}[value];
                payload[postfixWithEndpointName('operation_mode', msg, model)] = mode;
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
            payload.options = {...payload.options, // next values update only when curtain finished initial setup and knows current position
                reverse_direction: value[2] == '\u0001',
                hand_open: value[5] == '\u0000',
            };
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
        case '1289':
            payload.dimmer_mode = {3: 'rgbw', 1: 'dual_ct'}[value];
            break;
        case '65281':
            {
                const payload65281 = numericAttributes2Payload(msg, meta, model, options, value);
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
            break;
        case 'mode':
            payload.operation_mode = ['command', 'event'][value];
            break;
        case 'modelId':
            // We ignore it, but we add it here to not shown an unknown key in the log
            break;
        default:
            if (meta.logger) meta.logger.debug(`${model.zigbeeModel}: unknown key ${key} with value ${value}`);
        }
    });

    if (meta.logger) meta.logger.debug(`${model.zigbeeModel}: Processed data into payload ${JSON.stringify(payload)}`);

    return payload;
};

module.exports = {
    buffer2DataObject,
    numericAttributes2Payload,
};
