'use strict';

const utils = require('./utils');
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
};

const converters = {
    factory_reset: {
        key: ['reset'],
        convert: (key, value, message, type) => {
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
        convert: (key, value, message, type) => {
            const cid = 'genOnOff';
            const attrId = 'onOff';

            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: value.toLowerCase(),
                    cmdType: 'functional',
                    zclData: {},
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
    light_brightness: {
        key: ['brightness', 'brightness_percent'],
        convert: (key, value, message, type) => {
            const cid = 'genLevelCtrl';
            const attrId = 'currentLevel';

            if (type === 'set') {
                if (key === 'brightness_percent') {
                    value = Math.round(Number(value) * 2.55).toString();
                }

                return {
                    cid: cid,
                    cmd: 'moveToLevelWithOnOff',
                    cmdType: 'functional',
                    zclData: {
                        level: value,
                        transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
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
    light_colortemp: {
        key: ['color_temp', 'color_temp_percent'],
        convert: (key, value, message, type) => {
            const cid = 'lightingColorCtrl';
            const attrId = 'colorTemperature';

            if (type === 'set') {
                if (key === 'color_temp_percent') {
                    value = Number(value) * 3.46;
                    value = Math.round(value + 154).toString();
                }

                return {
                    cid: cid,
                    cmd: 'moveToColorTemp',
                    cmdType: 'functional',
                    zclData: {
                        colortemp: value,
                        transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
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
    light_color: {
        key: ['color'],
        convert: (key, value, message, type) => {
            const cid = 'lightingColorCtrl';

            if (type === 'set') {
                // Check if we need to convert from RGB to XY.
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
                }

                return {
                    cid: cid,
                    cmd: 'moveToColor',
                    cmdType: 'functional',
                    zclData: {
                        colorx: Math.round(value.x * 65535),
                        colory: Math.round(value.y * 65535),
                        transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                    },
                    cfg: cfg.default,
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
    light_alert: {
        key: ['alert'],
        convert: (key, value, message, type) => {
            const cid = 'genIdentify';
            if (type === 'set') {
                const lookup = {
                    'select': 0x00,
                    'lselect': 0x01,
                    'none': 0xFF,
                };
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
    thermostat_localTemp: {
        key: 'localTemp',
        convert: (value, message, type) => {
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
    thermostat_occupancy: {
        key: 'occupancy',
        convert: (value, message, type) => {
            const cid = 'hvacThermostat';
            const attrId = 'occupancy';
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
    thermostat_temperatureCalibration: {
        key: 'setTemperatureCalibration',
        convert: (key, value, message, type) => {
            const cid = 'hvacThermostat';
            const attrId = 0x10;

            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: attrId, // localTemperatureCalibration 0x10
                        dataType: 0x28, // dataType int8
                        attrData: Math.round(value * 10),
                    }],
                };
            }
        },
    },
    thermostat_occupiedHeatingSetpoint: { // testing
        key: 'occupiedHeatingSetpoint',
        convert: (value, message, type) => {
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
                        attrData: Math.round(value) * 100,
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
    thermostat_unoccupiedHeatingSetpoint: { // testing
        key: 'unoccupiedHeatingSetpoint',
        convert: (value, message, type) => {
            const cid = 'hvacThermostat';
            const attrId = 'unoccupiedHeatingSetpoint';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: zclId.attr(cid, attrId).value,
                        dataType: 0x29,
                        attrData: Math.round(value) * 100,
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
    thermostat_ctrlSeqeOfOper: { // testing
        key: 'ctrlSeqeOfOper',
        convert: (value, message, type) => {
            const cid = 'hvacThermostat';
            const attrId = 'ctrlSeqeOfOper';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'write',
                    cmdType: 'foundation',
                    zclData: [{
                        attrId: zclId.attr(cid, attrId).value,
                        dataType: 0x29,
                        attrData: Math.round(value) * 100,
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
    thermostat_systemMode: { // testing
        key: 'systemMode',
        convert: (value, message, type) => {
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
                        attrData: Math.round(value) * 100,
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
    thermostat_setpointRaiseLower: { // testing
        key: 'setpointRaiseLower',
        convert: (value, message, type) => {
            const cid = 'hvacThermostat';
            const attrId = 'setpointRaiseLower';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'setpointRaiseLower',
                    cmdType: 'functional',
                    zclData: {
                        dataType: 0x29, // dataType
                        attrData: Math.round(value) * 100,
                        mode: value.mode,
                        amount: Math.round(value.amount) * 100,
                    },
                    cfg: cfg.default,
                };
            } else if (type === 'get') { // MAC transaction expired.
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
    thermostat_weeklySchedule: { // not tested
        key: 'weeklySchedule',
        convert: (value, message, type) => {
            const cid = 'hvacThermostat';
            const attrId = 'weeklySchedule';
            if (type === 'set') {
                return {
                    cid: cid,
                    cmd: 'setWeeklySchedule',
                    cmdType: 'functional',
                    zclData: {
                        dataType: 0x29, // dataType
                        attrData: Math.round(value) * 100,
                        numoftrans: value.numoftrans,
                        dayofweek: value.dayofweek,
                        mode: value.mode,
                        thermoseqmode: value.thermoseqmode,
                    },
                    cfg: cfg.default,
                };
            } else if (type === 'get') { // MAC transaction expired.
                return {
                    cid: cid,
                    cmd: 'getWeeklySchedule',
                    cmdType: 'functional',
                    zclData: [
                        {attrId: zclId.attr(cid, attrId).value},
                        // {daystoreturn: value.daystoreturn},
                        // {modetoreturn: value.modetoreturn},
                    ],
                    cfg: cfg.default,
                };
            }
        },
    },
    thermostat_clearWeeklySchedule: { // not tested
        key: 'clearWeeklySchedule',
        attr: [],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'clearWeeklySchedule',
                type: 'functional',
                zclData: {},
            };
        },
    },
    thermostat_getRelayStatusLog: { // not tested
        key: 'getRelayStatusLog',
        attr: [],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'getRelayStatusLog',
                type: 'functional',
                zclData: {},
            };
        },
    },
    thermostat_getWeeklyScheduleRsp: { // not tested
        key: 'getWeeklyScheduleRsp',
        attr: [],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'getWeeklyScheduleRsp',
                type: 'functional',
                zclData: {
                    numoftrans: value.numoftrans,
                    dayofweek: value.dayofweek,
                    mode: value.mode,
                    thermoseqmode: value.thermoseqmode,
                },
            };
        },
    },
    thermostat_getRelayStatusLogRsp: { // not tested
        key: 'getRelayStatusLogRsp',
        attr: [],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'getRelayStatusLogRsp',
                type: 'functional',
                zclData: {
                    timeofday: value.timeofday,
                    relaystatus: value.relaystatus,
                    localtemp: value.localtemp,
                    humidity: value.humidity,
                    setpoint: value.setpoint,
                    unreadentries: value.unreadentries,
                },
            };
        },
    },
    /* Note when send the command to set sensitivity, press button on the device to make it wakeup*/
    DJT11LM_vibration_sensitivity: {
        key: ['sensitivity'],
        convert: (key, value, message, type) => {
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
        convert: (key, value, message, type) => {
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
        convert: (key, value, message, type) => {
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
    STS_PRS_251_beep: {
        key: ['beep'],
        convert: (key, value, message, type) => {
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
        key: 'state',
        convert: (key, value, message, type) => {
            const lookup = {
                'open': 'upOpen',
                'close': 'downClose',
                'stop': 'stop',
                'on': 'upOpen',
                'off': 'downClose',
            };

            value = value.toLowerCase();
            if (lookup[value]) {
                return {
                    cid: 'closuresWindowCovering',
                    cmd: lookup[value],
                    cmdType: 'functional',
                    zclData: {},
                    cfg: cfg.default,
                };
            }
        },
    },
    ZNCLDJ11LM_control_position: {
        key: 'position',
        convert: (key, value, message, type) => {
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
        },
    },

    // Ignore converters
    ignore_transition: {
        key: ['transition'],
        attr: [],
        convert: (key, value, message, type) => null,
    },
};

module.exports = converters;
