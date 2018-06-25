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
        convert: (value, message) => {
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
        convert: (value, message) => {
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
    light_colortemp: {
        key: 'color_temp',
        type: 'functional',
        attr: ['colorTemperature'],
        convert: (value, message) => {
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
        convert: (value, message) => {
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
    HBUniversalCFRemote_fan_mode: {
        key: 'fan_mode',
        type: 'write',
        attr: ['fanMode'],
        convert: (value, message) => {
            const mapping = {
                'off': 0,
                'low': 1,
                'medium': 2,
                'medium-high': 3,
                'high': 4,
                'breeze': 6,
            };

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
        convert: (value, message) => null,
    },
};

module.exports = converters;
