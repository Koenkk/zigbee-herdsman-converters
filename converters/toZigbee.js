'use strict';

const utils = require('./utils');
const common = require('./common');
const zclId = require('zcl-id');

const cfg = {
    default: {
        manufSpec: 0,
        disDefaultRsp: 0,
    },
    xiaomi: {
        manufSpec: 1,
        disDefaultRsp: 1,
        manufCode: 0x115F,
    },
    eurotronic: {
        manufSpec: 1,
        manufCode: 4151,
    },
    osram: {
        manufSpec: 1,
        manufCode: 0x110c,
    },
};

const converters = {
    /**
     * Generic
     */
    factory_reset: {
        key: ['reset'],
        convert: (key, value, message, type, postfix) => {
            if (type === 'set') {
                return {
                    cid: 'genBasic',
                    cmd: 'resetFactDefault',
                    cmdType: 'functional',
                    zclData: {},
                    cfg: cfg.default,
                };
            }
        },
    },
    on_off: {
        key: ['state'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'genOnOff';
            const attrId = 'onOff';

            if (type === 'set') {
                if (typeof value !== 'string') {
                    return;
                }

                return {
                    cid: cid,
                    cmd: value.toLowerCase(),
                    cmdType: 'functional',
                    zclData: {},
                    cfg: cfg.default,
                    newState: {state: value.toUpperCase()},
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    cover_open_close: {
        key: ['state'],
        convert: (key, value, message, type, postfix) => {
            if (type === 'set') {
                if (typeof value !== 'string') {
                    return;
                }

                const positionByState = {
                    'open': 100,
                    'close': 0,
                };

                value = positionByState[value.toLowerCase()];
            }

            return converters.cover_position.convert(key, value, message, type, postfix);
        },
    },
    cover_position: {
        key: ['position'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'genLevelCtrl';
            const attrId = 'currentLevel';

            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'moveToLevelWithOnOff',
                    cmdType: 'functional',
                    zclData: {
                        level: Math.round(Number(value) * 2.55).toString(),
                        transtime: 0,
                    },
                    cfg: cfg.default,
                    newState: {position: value},
                    readAfterWriteTime: 0,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    occupancy_timeout: {
        // set delay after motion detector changes from occupied to unoccupied
        key: ['occupancy_timeout'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'msOccupancySensing'; // 1030
            const attrId = zclId.attr(cid, 'pirOToUDelay').value; // = 16

            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: attrId,
                        dataType: 33, // uint16
                        // hue_sml001:
                        // in seconds, minimum 10 seconds, <10 values result
                        // in 10 seconds delay
                        // make sure you write to second endpoint!
                        attrData: value,
                    }],
                    cfg: cfg.default,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: attrId,
                    }],
                    cfg: cfg.default,
                };
            }
        },
    },
    light_brightness: {
        key: ['brightness', 'brightness_percent'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'genLevelCtrl';
            const attrId = 'currentLevel';

            if (type === 'set') {
                if (key === 'brightness_percent') {
                    value = Math.round(Number(value) * 2.55).toString();
                }

                if (Number(value) === 0) {
                    const converted = converters.on_off.convert('state', 'off', message, 'set', postfix);
                    converted.newState.brightness = 0;
                    return converted;
                } else {
                    return {
                        cid: cid,
                        cmd: 'moveToLevel',
                        cmdType: 'functional',
                        zclData: {
                            level: Number(value),
                            transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                        },
                        cfg: cfg.default,
                        newState: {brightness: Number(value)},
                        readAfterWriteTime: message.hasOwnProperty('transition') ? message.transition * 1000 : 0,
                    };
                }
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    light_onoff_brightness: {
        key: ['state', 'brightness', 'brightness_percent'],
        convert: (key, value, message, type, postfix) => {
            if (type === 'set') {
                const hasBrightness = message.hasOwnProperty('brightness') ||
                                        message.hasOwnProperty('brightness_percent');
                const brightnessValue = message.hasOwnProperty('brightness') ?
                    message.brightness : message.brightness_percent;
                const hasState = message.hasOwnProperty('state');
                const hasTrasition = message.hasOwnProperty('transition');
                const state = hasState ? message.state.toLowerCase() : null;

                if (hasState && (state === 'off' || !hasBrightness) && !hasTrasition) {
                    const converted = converters.on_off.convert('state', state, message, 'set', postfix);
                    if (state === 'on') {
                        converted.readAfterWriteTime = 0;
                    }
                    return converted;
                } else if (!hasState && hasBrightness && Number(brightnessValue) === 0) {
                    const converted = converters.on_off.convert('state', 'off', message, 'set', postfix);
                    converted.newState.brightness = 0;
                    return converted;
                } else {
                    let brightness = 0;

                    if (hasState && !hasBrightness && state == 'on') {
                        brightness = 255;
                    } else if (message.hasOwnProperty('brightness')) {
                        brightness = message.brightness;
                    } else if (message.hasOwnProperty('brightness_percent')) {
                        brightness = Math.round(Number(message.brightness_percent) * 2.55).toString();
                    }

                    return {
                        cid: 'genLevelCtrl',
                        cmd: 'moveToLevelWithOnOff',
                        cmdType: 'functional',
                        zclData: {
                            level: Number(brightness),
                            transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                        },
                        cfg: cfg.default,
                        newState: {state: brightness === 0 ? 'OFF' : 'ON', brightness: Number(brightness)},
                        readAfterWriteTime: message.hasOwnProperty('transition') ? message.transition * 1000 : 0,
                    };
                }
            } else if (type === 'get') {
                return {
                    cid: 'genLevelCtrl',
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr('genLevelCtrl', 'currentLevel').value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    light_colortemp: {
        key: ['color_temp', 'color_temp_percent'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'lightingColorCtrl';
            const attrId = 'colorTemperature';

            if (type === 'set') {
                if (key === 'color_temp_percent') {
                    value = Number(value) * 3.46;
                    value = Math.round(value + 154).toString();
                }

                value = Number(value);

                return {
                    cid: cid,
                    cmd: 'moveToColorTemp',
                    cmdType: 'functional',
                    zclData: {
                        colortemp: value,
                        transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                    },
                    cfg: cfg.default,
                    newState: {color_temp: value},
                    readAfterWriteTime: message.hasOwnProperty('transition') ? message.transition * 1000 : 0,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    light_color: {
        key: ['color'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'lightingColorCtrl';

            if (type === 'set') {
                // Check if we need to convert from RGB to XY and which cmd to use
                let cmd;
                if (value.hasOwnProperty('r') && value.hasOwnProperty('g') && value.hasOwnProperty('b')) {
                    const xy = utils.rgbToXY(value.r, value.g, value.b);
                    value.x = xy.x;
                    value.y = xy.y;
                } else if (value.hasOwnProperty('rgb')) {
                    const rgb = value.rgb.split(',').map((i) => parseInt(i));
                    const xy = utils.rgbToXY(rgb[0], rgb[1], rgb[2]);
                    value.x = xy.x;
                    value.y = xy.y;
                } else if (value.hasOwnProperty('hex')) {
                    const xy = utils.hexToXY(value.hex);
                    value.x = xy.x;
                    value.y = xy.y;
                } else if (value.hasOwnProperty('hue') && value.hasOwnProperty('saturation')) {
                    value.hue = value.hue * (65535 / 360);
                    value.saturation = value.saturation * (2.54);
                    cmd = 'enhancedMoveToHueAndSaturation';
                } else if (value.hasOwnProperty('hue')) {
                    value.hue = value.hue * (65535 / 360);
                    cmd = 'enhancedMoveToHue';
                } else if (value.hasOwnProperty('saturation')) {
                    value.saturation = value.saturation * (2.54);
                    cmd = 'moveToSaturation';
                }

                const zclData = {
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                };

                let newState = null;
                switch (cmd) {
                case 'enhancedMoveToHueAndSaturation':
                    zclData.enhancehue = value.hue;
                    zclData.saturation = value.saturation;
                    zclData.direction = value.direction || 0;
                    break;
                case 'enhancedMoveToHue':
                    zclData.enhancehue = value.hue;
                    zclData.direction = value.direction || 0;
                    break;

                case 'moveToSaturation':
                    zclData.saturation = value.saturation;
                    break;

                default:
                    cmd = 'moveToColor';
                    newState = {color: {x: value.x, y: value.y}};
                    zclData.colorx = Math.round(value.x * 65535);
                    zclData.colory = Math.round(value.y * 65535);
                }

                return {
                    cid: cid,
                    cmd: cmd,
                    cmdType: 'functional',
                    zclData: zclData,
                    cfg: cfg.default,
                    newState: newState,
                    readAfterWriteTime: message.hasOwnProperty('transition') ? message.transition * 1000 : 0,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [
                        {attrId: zclId.attr(cid, 'currentX').value},
                        {attrId: zclId.attr(cid, 'currentY').value},
                    ],
                    cfg: cfg.default,
                };
            }
        },
    },
    light_color_colortemp: {
        /**
          * This converter is a combination of light_color and light_colortemp and
          * can be used instead of the two individual converters. When used to set,
          * it actually calls out to light_color or light_colortemp to get the
          * return value. When used to get, it gets both color and colorTemp in
          * one call.
          * The reason for the existence of this somewhat peculiar converter is
          * that some lights don't report their state when changed. To fix this,
          * we query the state after we set it. We want to query color and colorTemp
          * both when setting either, because both change when setting one. This
          * converter is used to do just that.
         */
        key: ['color', 'color_temp', 'color_temp_percent'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'lightingColorCtrl';
            if (type === 'set') {
                if (key == 'color') {
                    return converters.light_color.convert(key, value, message, type, postfix);
                } else if (key == 'color_temp' || key == 'color_temp_percent') {
                    return converters.light_colortemp.convert(key, value, message, type, postfix);
                }
            } else if (type == 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [
                        {attrId: zclId.attr(cid, 'currentX').value},
                        {attrId: zclId.attr(cid, 'currentY').value},
                        {attrId: zclId.attr(cid, 'colorTemperature').value},
                    ],
                    cfg: cfg.default,
                };
            }
        },
    },
    light_alert: {
        key: ['alert', 'flash'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'genIdentify';
            if (type === 'set') {
                const lookup = {
                    'select': 0x00,
                    'lselect': 0x01,
                    'none': 0xFF,
                };
                if (key === 'flash') {
                    if (value === 2) {
                        value = 'select';
                    } else if (value === 10) {
                        value = 'lselect';
                    }
                }
                return {
                    cid: cid,
                    cmd: 'triggerEffect',
                    cmdType: 'functional',
                    zclData: {
                        effectid: lookup[value.toLowerCase()],
                        effectvariant: 0x01,
                    },
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_local_temperature: {
        key: 'local_temperature',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'localTemp';
            if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_local_temperature_calibration: {
        key: 'local_temperature_calibration',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'localTemperatureCalibration';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: zclId.attr(cid, attrId).value,
                        dataType: zclId.attrType(cid, attrId).value,
                        attrData: Math.round(value * 10),
                    }],
                    cfg: cfg.default,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_occupancy: {
        key: 'occupancy',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'ocupancy';
            if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_occupied_heating_setpoint: {
        key: 'occupied_heating_setpoint',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'occupiedHeatingSetpoint';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: zclId.attr(cid, attrId).value,
                        dataType: zclId.attrType(cid, attrId).value,
                        attrData: (Math.round((value * 2).toFixed(1))/2).toFixed(1) * 100,
                    }],
                    cfg: cfg.default,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_unoccupied_heating_setpoint: {
        key: 'unoccupied_heating_setpoint',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'unoccupiedHeatingSetpoint';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: zclId.attr(cid, attrId).value,
                        dataType: zclId.attrType(cid, attrId).value,
                        attrData: (Math.round((value * 2).toFixed(1))/2).toFixed(1) * 100,
                    }],
                    cfg: cfg.default,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_remote_sensing: {
        key: 'remote_sensing',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'remoteSensing';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        // Bit 0 = 0 – local temperature sensed internally
                        // Bit 0 = 1 – local temperature sensed remotely
                        // Bit 1 = 0 – outdoor temperature sensed internally
                        // Bit 1 = 1 – outdoor temperature sensed remotely
                        // Bit 2 = 0 – occupancy sensed internally
                        // Bit 2 = 1 – occupancy sensed remotely
                        attrId: zclId.attr(cid, attrId).value,
                        dataType: zclId.attrType(cid, attrId).value,
                        attrData: value, // TODO: Lookup in Zigbee documentation
                    }],
                    cfg: cfg.default,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_control_sequence_of_operation: {
        key: 'control_sequence_of_operation',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'ctrlSeqeOfOper';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: zclId.attr(cid, attrId).value,
                        dataType: zclId.attrType(cid, attrId).value,
                        attrData: utils.getKeyByValue(common.thermostatControlSequenceOfOperations, value, value),
                    }],
                    cfg: cfg.default,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_system_mode: {
        key: 'system_mode',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'systemMode';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: zclId.attr(cid, attrId).value,
                        dataType: zclId.attrType(cid, attrId).value,
                        attrData: utils.getKeyByValue(common.thermostatSystemModes, value, value),
                    }],
                    cfg: cfg.default,
                    readAfterWriteTime: 250,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_setpoint_raise_lower: {
        key: 'setpoint_raise_lower',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'setpointRaiseLower';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'setpointRaiseLower',
                    cmdType: 'functional',
                    zclData: {
                        dataType: zclId.attrType(cid, attrId).value,
                        attrData: Math.round(value) * 100, // TODO: Combine mode and amount in attrData?
                        mode: value.mode,
                        amount: Math.round(value.amount) * 100,
                    },
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_weekly_schedule: {
        key: 'weekly_schedule',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'weeklySchedule';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'setWeeklySchedule',
                    cmdType: 'functional',
                    zclData: {
                        dataType: zclId.attrType(cid, attrId).value,
                        attrData: value, // TODO: Combine attributes in attrData?
                        temperature_setpoint_hold: value.temperature_setpoint_hold,
                        temperature_setpoint_hold_duration: value.temperature_setpoint_hold_duration,
                        thermostat_programming_operation_mode: value.thermostat_programming_operation_mode,
                        thermostat_running_state: value.thermostat_running_state,
                    },
                    cfg: cfg.default,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'getWeeklySchedule',
                    cmdType: 'functional',
                    zclData: {},
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_clear_weekly_schedule: {
        key: 'clear_weekly_schedule',
        attr: [],
        convert: (key, value, message, type, postfix) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'clearWeeklySchedule',
                type: 'functional',
                zclData: {},
            };
        },
    },
    thermostat_relay_status_log: {
        key: 'relay_status_log',
        attr: [],
        convert: (key, value, message, type, postfix) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'getRelayStatusLog',
                type: 'functional',
                zclData: {},
            };
        },
    },
    thermostat_weekly_schedule_rsp: {
        key: 'weekly_schedule_rsp',
        attr: [],
        convert: (key, value, message, type, postfix) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'getWeeklyScheduleRsp',
                type: 'functional',
                zclData: {
                    number_of_transitions: value.numoftrans, // TODO: Lookup in Zigbee documentation
                    day_of_week: value.dayofweek,
                    mode: value.mode,
                    thermoseqmode: value.thermoseqmode,
                },
            };
        },
    },
    thermostat_relay_status_log_rsp: {
        key: 'relay_status_log_rsp',
        attr: [],
        convert: (key, value, message, type, postfix) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'getRelayStatusLogRsp',
                type: 'functional',
                zclData: {
                    time_of_day: value.timeofday, // TODO: Lookup in Zigbee documentation
                    relay_status: value.relaystatus,
                    local_temperature: value.localtemp,
                    humidity: value.humidity,
                    setpoint: value.setpoint,
                    unread_entries: value.unreadentries,
                },
            };
        },
    },
    thermostat_running_mode: {
        key: 'running_mode',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'runningMode';
            if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_running_state: {
        key: 'running_state',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 'runningState';
            if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_temperature_display_mode: {
        key: 'temperature_display_mode',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacUserInterfaceCfg';
            const attrId = 'tempDisplayMode';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: zclId.attr(cid, attrId).value,
                        dataType: zclId.attrType(cid, attrId).value,
                        attrData: value,
                    }],
                    cfg: cfg.default,
                };
            }
        },
    },
    fan_mode: {
        key: ['fan_mode', 'fan_state'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacFanCtrl';
            const attrId = 'fanMode';

            if (type === 'set') {
                value = value.toLowerCase();
                const attrData = common.fanMode[value];

                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value, attrData: attrData, dataType: 48}],
                    cfg: cfg.default,
                    newState: {fan_mode: value, fan_state: value === 'off' ? 'OFF' : 'ON'},
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },

    /**
     * Device specific
     */
    DJT11LM_vibration_sensitivity: {
        key: ['sensitivity'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'genBasic';
            const attrId = 0xFF0D;

            if (type === 'set') {
                const lookup = {
                    'low': 0x15,
                    'medium': 0x0B,
                    'high': 0x01,
                };

                if (lookup.hasOwnProperty(value)) {
                    return {
                        cid: cid,
                        cmd: 'write',
                        cmdType: 'foundation',
                        zclData: [{
                            attrId: attrId,
                            dataType: 0x20,
                            attrData: lookup[value],
                        }],
                        cfg: cfg.xiaomi,
                    };
                }
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: attrId}],
                    cfg: cfg.xiaomi,
                };
            }
        },
    },
    JTQJBF01LMBW_sensitivity: {
        key: ['sensitivity'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'ssIasZone';

            if (type === 'set') {
                const lookup = {
                    'low': 0x04010000,
                    'medium': 0x04020000,
                    'high': 0x04030000,
                };

                if (lookup.hasOwnProperty(value)) {
                    return {
                        cid: cid,
                        cmd: 'write',
                        cmdType: 'foundation',
                        zclData: [{
                            attrId: 0xFFF1, // presentValue
                            dataType: 0x23, // dataType
                            attrData: lookup[value],
                        }],
                        cfg: cfg.xiaomi,
                    };
                }
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: 0xFFF0, // presentValue
                        dataType: 0x39, // dataType
                    }],
                    cfg: cfg.xiaomi,
                };
            }
        },
    },
    JTQJBF01LMBW_selfest: {
        key: ['selftest'],
        convert: (key, value, message, type, postfix) => {
            if (type === 'set') {
                return {
                    cid: 'ssIasZone',
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: 0xFFF1, // presentValue
                        dataType: 0x23, // dataType
                        attrData: 0x03010000,
                    }],
                    cfg: cfg.xiaomi,
                };
            }
        },
    },
    xiaomi_switch_operation_mode: {
        key: ['operation_mode'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'genBasic';
            const lookupAttrId = {
                'single': 0xFF22,
                'left': 0xFF22,
                'right': 0xFF23,
            };
            const lookupState = {
                'control_relay': 0x12,
                'control_left_relay': 0x12,
                'control_right_relay': 0x22,
                'decoupled': 0xFE,
            };
            let button;
            if (value.hasOwnProperty('button')) {
                button = value.button;
            } else {
                button = 'single';
            }
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: lookupAttrId[button],
                        dataType: 0x20,
                        attrData: lookupState[value.state],
                    }],
                    cfg: cfg.xiaomi,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: lookupAttrId[button],
                        dataType: 0x20,
                    }],
                    cfg: cfg.xiaomi,
                };
            }
        },
    },
    STS_PRS_251_beep: {
        key: ['beep'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'genIdentify';
            const attrId = 'identifyTime';

            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'identify',
                    cmdType: 'functional',
                    zclData: {
                        identifytime: value,
                    },
                    cfg: cfg.default,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    ZNCLDJ11LM_control: {
        key: ['state', 'position'],
        convert: (key, value, message, type, postfix) => {
            if (key === 'state' && value.toLowerCase() === 'stop') {
                return {
                    cid: 'closuresWindowCovering',
                    cmd: 'stop',
                    cmdType: 'functional',
                    zclData: {},
                    cfg: cfg.default,
                };
            } else {
                const lookup = {
                    'open': 100,
                    'close': 0,
                    'on': 100,
                    'off': 0,
                };

                value = typeof value === 'string' ? value.toLowerCase() : value;
                value = lookup.hasOwnProperty(value) ? lookup[value] : value;

                return {
                    cid: 'genAnalogOutput',
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: 0x0055,
                        dataType: 0x39,
                        attrData: value,
                    }],
                    cfg: cfg.default,
                };
            }
        },
    },
    osram_cmds: {
        key: ['osram_set_transition', 'osram_remember_state'],
        convert: (key, value, message, type, postfix) => {
            if (type === 'set') {
                if ( key === 'osram_set_transition' ) {
                    if (value) {
                        const transition = ( value > 1 ) ? (Math.round((value * 2).toFixed(1))/2).toFixed(1) * 10 : 1;
                        return {
                            cid: 'genLevelCtrl',
                            cmd: 'write',
                            cmdType: 'foundation',
                            zclData: [{
                                attrId: 0x0012,
                                dataType: 0x21,
                                attrData: transition,
                            }, {attrId: 0x0013,
                                dataType: 0x21,
                                attrData: transition,
                            }],
                            cfg: cfg.default,
                        };
                    }
                } else if ( key == 'osram_remember_state' ) {
                    if (value === true) {
                        return {
                            cid: 'manuSpecificOsram',
                            cmd: 'saveStartupParams',
                            cmdType: 'functional',
                            zclData: {},
                            cfg: cfg.osram,
                        };
                    } else if ( value === false ) {
                        return {
                            cid: 'manuSpecificOsram',
                            cmd: 'resetStartupParams',
                            cmdType: 'functional',
                            zclData: {},
                            cfg: cfg.osram,
                        };
                    }
                }
            }
        },
    },
    eurotronic_system_mode: {
        key: 'eurotronic_system_mode',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 0x4008;
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        // Bit 0 = ? (default 1)
                        // Bit 2 = Boost
                        // Bit 4 = Window open
                        // Bit 7 = Child protection
                        attrId: attrId,
                        dataType: 0x22,
                        attrData: value,
                    }],
                    cfg: cfg.eurotronic,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: attrId}],
                    cfg: cfg.eurotronic,
                };
            }
        },
    },
    eurotronic_error_status: {
        key: 'eurotronic_error_status',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 0x4002;
            if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: attrId}],
                    cfg: cfg.eurotronic,
                };
            }
        },
    },
    eurotronic_current_heating_setpoint: {
        key: 'current_heating_setpoint',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 0x4003;
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: attrId,
                        dataType: 0x29,
                        attrData: (Math.round((value * 2).toFixed(1))/2).toFixed(1) * 100,
                    }],
                    cfg: cfg.eurotronic,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: attrId}],
                    cfg: cfg.eurotronic,
                };
            }
        },
    },
    eurotronic_valve_position: {
        key: 'eurotronic_valve_position',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 0x4001;
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: attrId,
                        dataType: 0x20,
                        attrData: value,
                    }],
                    cfg: cfg.eurotronic,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: attrId}],
                    cfg: cfg.eurotronic,
                };
            }
        },
    },
    eurotronic_trv_mode: {
        key: 'eurotronic_trv_mode',
        convert: (key, value, message, type, postfix) => {
            const cid = 'hvacThermostat';
            const attrId = 0x4000;
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: attrId,
                        dataType: 0x30,
                        attrData: value,
                    }],
                    cfg: cfg.eurotronic,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: attrId}],
                    cfg: cfg.eurotronic,
                };
            }
        },
    },
    livolo_switch_on_off: {
        key: ['state'],
        convert: (key, value, message, type, postfix) => {
            if (type === 'set') {
                if (typeof value !== 'string') {
                    return;
                }

                postfix = postfix || 'left';

                const cid = 'genLevelCtrl';
                let state = value.toLowerCase();
                let channel = 1;

                if (state === 'on') {
                    state = 108;
                } else if (state === 'off') {
                    state = 1;
                } else {
                    return;
                }

                if (postfix === 'left') {
                    channel = 1.0;
                } else if (postfix === 'right') {
                    channel = 2.0;
                } else {
                    return;
                }

                return {
                    cid: cid,
                    cmd: 'moveToLevelWithOnOff',
                    cmdType: 'functional',
                    zclData: {
                        level: state,
                        transtime: channel,
                    },
                    cfg: cfg.default,
                    newState: {state: value.toUpperCase()},
                    readAfterWriteTime: 250,
                };
            } else if (type === 'get') {
                const cid = 'genOnOff';
                const attrId = 'onOff';
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    generic_lock: {
        key: ['state'],
        convert: (key, value, message, type, postfix) => {
            const cid = 'closuresDoorLock';
            const attrId = 'lockState';

            if (type === 'set') {
                if (typeof value !== 'string') {
                    return;
                }

                return {
                    cid: cid,
                    cmd: `${value.toLowerCase()}Door`,
                    cmdType: 'functional',
                    zclData: {
                        'pincodevalue': '',
                    },
                    cfg: cfg.default,
                    readAfterWriteTime: 200,
                };
            } else if (type === 'get') {
                return {
                    cid: cid,
                    cmd: 'read',
                    cmdType: 'foundation',
                    zclData: [{attrId: zclId.attr(cid, attrId).value}],
                    cfg: cfg.default,
                };
            }
        },
    },
    gledopto_light_onoff_brightness: {
        key: ['state', 'brightness', 'brightness_percent'],
        convert: (key, value, message, type, postfix) => {
            if (message && message.hasOwnProperty('transition')) {
                message.transition = message.transition * 3.3;
            }

            return converters.light_onoff_brightness.convert(key, value, message, type, postfix);
        },
    },
    gledopto_light_color_colortemp: {
        key: ['color', 'color_temp', 'color_temp_percent'],
        convert: (key, value, message, type, postfix) => {
            if (message.hasOwnProperty('transition')) {
                message.transition = message.transition * 3.3;
            }

            return converters.light_color_colortemp.convert(key, value, message, type, postfix);
        },
    },
    gledopto_light_colortemp: {
        key: ['color_temp', 'color_temp_percent'],
        convert: (key, value, message, type, postfix) => {
            if (message.hasOwnProperty('transition')) {
                message.transition = message.transition * 3.3;
            }

            return converters.light_colortemp.convert(key, value, message, type, postfix);
        },
    },
    hue_power_on_behavior: {
        key: ['hue_power_on_behavior'],
        convert: (key, value, message, type, postfix) => {
            const lookup = {
                'default': 0x01,
                'on': 0x01,
                'off': 0x00,
                'recover': 0xff,
            };

            if (type === 'set') {
                return {
                    cid: 'genOnOff',
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: 0x4003,
                        dataType: 0x30,
                        attrData: lookup[value],
                    }],
                    cfg: cfg.default,
                };
            }
        },
    },
    hue_power_on_brightness: {
        key: ['hue_power_on_brightness'],
        convert: (key, value, message, type, postfix) => {
            if (type === 'set') {
                if (value === 'default') {
                    value = 255;
                }
                return {
                    cid: 'genLevelCtrl',
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: 0x4000,
                        dataType: 0x20,
                        attrData: value,
                    }],
                    cfg: cfg.default,
                };
            }
        },
    },
    hue_power_on_color_temperature: {
        key: ['hue_power_on_color_temperature'],
        convert: (key, value, message, type, postfix) => {
            if (type === 'set') {
                if (value === 'default') {
                    value = 366;
                }
                return {
                    cid: 'lightingColorCtrl',
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: 0x4010,
                        dataType: 0x21,
                        attrData: value,
                    }],
                    cfg: cfg.default,
                };
            }
        },
    },

    /**
     * Ignore converters
     */
    ignore_transition: {
        key: ['transition'],
        attr: [],
        convert: (key, value, message, type, postfix) => null,
    },
};

module.exports = converters;
