'use strict';

const converters = {
    factory_reset: {
        key: 'reset',
        attr: [],
        convert: (value, message) => {
            return {
                cid: 'genBasic',
                cmd: 'resetFactDefault',
                zclData: {},
            };
        },
    },
    onoff: {
        key: 'state',
        type: 'functional',
        attr: ['onOff'],
        convert: (value, message, model) => {
            return {
                cid: 'genOnOff',
                cmd: value.toLowerCase(),
                zclData: {},
            };
        },
    },
    light_brightness: {
        key: 'brightness',
        type: 'functional',
        attr: ['currentLevel'],
        convert: (value, message, model) => {
            return {
                cid: 'genLevelCtrl',
                cmd: 'moveToLevel',
                zclData: {
                    level: value,
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                },
            };
        },
    },
    light_brightness_onoff: {
        key: 'brightness',
        type: 'functional',
        attr: ['currentLevel'],
        convert: (value, message, model) => {
            return {
                cid: 'genLevelCtrl',
                cmd: 'moveToLevelWithOnOff',
                zclData: {
                    level: value,
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                },
            };
        },
    },
    light_colortemp: {
        key: 'color_temp',
        type: 'functional',
        attr: ['colorTemperature'],
        convert: (value, message, model) => {
            return {
                cid: 'lightingColorCtrl',
                cmd: 'moveToColorTemp',
                zclData: {
                    colortemp: value,
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                },
            };
        },
    },
    light_color: {
        key: 'color',
        type: 'functional',
        attr: ['currentX', 'currentY'],
        convert: (value, message, model) => {
            return {
                cid: 'lightingColorCtrl',
                cmd: 'moveToColor',
                zclData: {
                    colorx: value.x * 65535,
                    colory: value.y * 65535,
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                },
            };
        },
    },
    thermostat_occupiedHeatingSetpoint: {
        key: 'occupiedHeatingSetpoint',
        type: 'write',
        attr: ['occupiedHeatingSetpoint'],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                attrid: 'occupiedHeatingSetpoint',
                data: Math.round(value) * 100,
            };
        },
    },
    thermostat_setpointRaiseLower: {
        key: 'setpointRaiseLower',
        type: 'functional',
        attr: ['occupiedHeatingSetpoint'],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'setpointRaiseLower',
                zclData: {
                    mode: value.mode,
                    amount: Math.round(value.amount) * 100,
                },
            };
        },
    },
    thermostat_setWeeklySchedule: {
        key: 'setWeeklySchedule',
        type: 'functional',
        attr: [],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'setWeeklySchedule',
                zclData: {
                    numoftrans: value.numoftrans,
                    dayofweek: value.dayofweek,
                    mode: value.mode,
                    thermoseqmode: value.thermoseqmode,
                },
            };
        },
    },
    thermostat_getWeeklySchedule: {
        key: 'getWeeklySchedule',
        type: 'functional',
        attr: [],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'getWeeklySchedule',
                zclData: {
                    daystoreturn: value.daystoreturn,
                    modetoreturn: value.modetoreturn,
                },
            };
        },
    },
    thermostat_clearWeeklySchedule: {
        key: 'clearWeeklySchedule',
        type: 'functional',
        attr: [],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'clearWeeklySchedule',
                zclData: {},
            };
        },
    },
    thermostat_getRelayStatusLog: {
        key: 'getRelayStatusLog',
        type: 'functional',
        attr: [],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'getRelayStatusLog',
                zclData: {},
            };
        },
    },
    thermostat_getWeeklyScheduleRsp: {
        key: 'getWeeklyScheduleRsp',
        type: 'functional',
        attr: [],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'getWeeklyScheduleRsp',
                zclData: {
                    numoftrans: value.numoftrans,
                    dayofweek: value.dayofweek,
                    mode: value.mode,
                    thermoseqmode: value.thermoseqmode,
                },
            };
        },
    },
    thermostat_getRelayStatusLogRsp: {
        key: 'getRelayStatusLogRsp',
        type: 'functional',
        attr: [],
        convert: (value, message, model) => {
            return {
                cid: 'hvacThermostat',
                cmd: 'getRelayStatusLogRsp',
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
    fan_mode: {
        key: 'fan_mode',
        type: 'write',
        attr: ['fanMode'],
        convert: (value, message, model) => {
            const mapping = model.meta.fan_mode;

            if (mapping.hasOwnProperty(value)) {
                return {
                    cid: 'hvacFanCtrl',
                    attrid: 'fanMode',
                    data: mapping[value],
                };
            }
        },
    },
    // Ignore converters
    ignore_transition: {
        key: 'transition',
        type: '',
        attr: [],
        convert: (value, message, model) => null,
    },
};

module.exports = converters;
