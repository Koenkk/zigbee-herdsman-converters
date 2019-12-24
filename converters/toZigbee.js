'use strict';

const utils = require('./utils');
const common = require('./common');

const options = {
    xiaomi: {
        manufacturerCode: 0x115F,
        disableDefaultResponse: true,
    },
    osram: {
        manufacturerCode: 0x110c,
    },
    eurotronic: {
        manufacturerCode: 4151,
    },
    hue: {
        manufacturerCode: 4107,
    },
    sinope: {
        manufacturerCode: 0x119C,
    },
    ubisys: {
        manufacturerCode: 0x10f2,
    },
    tint: {
        manufacturerCode: 0x121b,
    },
};

function getTransition(entity, key, meta) {
    const {options, message} = meta;

    let manufacturerIDs = [];
    if (entity.constructor.name === 'Group') {
        manufacturerIDs = entity.members.map((m) => m.getDevice().manufacturerID);
    } else if (entity.constructor.name === 'Endpoint') {
        manufacturerIDs = [entity.getDevice().manufacturerID];
    }

    if (manufacturerIDs.includes(4476)) {
        /**
         * When setting both brightness and color temperature with a transition, the brightness is skipped
         * for IKEA TRADFRI bulbs.
         * To workaround this we skip the transition for the brightness as it is applied first.
         * https://github.com/Koenkk/zigbee2mqtt/issues/1810
         */
        if (key === 'brightness' && (message.hasOwnProperty('color') || message.hasOwnProperty('color_temp'))) {
            return 0;
        }
    }

    if (message.hasOwnProperty('transition')) {
        return message.transition * 10;
    } else if (options.hasOwnProperty('transition')) {
        return options.transition * 10;
    } else {
        return 0;
    }
}

// Entity is expected to be either a zigbee-herdsman group or endpoint

// Meta is expect to contain:
// {
//   message: the full message, used for e.g. {brightness; transition;}
//   options: {disableFeedback: skip waiting for feedback, e.g. Hampton Bay 99432 doesn't respond}
//   endpoint_name: name of the endpoint, used for e.g. livolo where left and right is
//                  seperated by transition time instead of separte endpoint
// }

const getOptions = (meta) => {
    const result = {};
    const allowed = ['disableDefaultResponse', 'manufacturerCode'];
    for (const key of Object.keys(meta.options)) {
        if (allowed.includes(key)) {
            result[key] = meta.options[key];
        }
    }
    return result;
};

const converters = {
    /**
     * Generic
     */
    factory_reset: {
        key: ['reset'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('genBasic', 'resetFactDefault', {}, getOptions(meta));
        },
    },
    on_off: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('genOnOff', value.toLowerCase(), {}, getOptions(meta));
            if (value.toLowerCase() === 'toggle') {
                if (!meta.state.hasOwnProperty('state')) {
                    return {};
                } else {
                    return {state: {state: meta.state.state === 'OFF' ? 'ON' : 'OFF'}};
                }
            } else {
                return {state: {state: value.toUpperCase()}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['onOff']);
        },
    },
    cover_open_close_via_brightness: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== 'string') {
                return;
            }

            const positionByState = {
                'open': 100,
                'close': 0,
            };

            value = positionByState[value.toLowerCase()];
            return await converters.cover_position_via_brightness.convertSet(entity, key, value, meta);
        },
        convertGet: async (entity, key, meta) => {
            return await converters.cover_position_via_brightness.convertGet(entity, key, meta);
        },
    },
    cover_position_via_brightness: {
        key: ['position'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command(
                'genLevelCtrl',
                'moveToLevel',
                {level: Math.round(Number(value) * 2.55).toString(), transtime: 0},
                getOptions(meta),
            );

            return {state: {position: value}, readAfterWriteTime: 0};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genLevelCtrl', ['currentLevel']);
        },
    },
    warning: {
        key: ['warning'],
        convertSet: async (entity, key, value, meta) => {
            const mode = {
                'stop': 0,
                'burglar': 1,
                'fire': 2,
                'emergency': 3,
                'police_panic': 4,
                'fire_panic': 5,
                'emergency_panic': 6,
            };

            const level = {
                'low': 0,
                'medium': 1,
                'high': 2,
                'very_high': 3,
            };

            const values = {
                mode: value.mode || 'emergency',
                level: value.level || 'medium',
                strobe: value.hasOwnProperty('strobe') ? value.strobe : true,
                duration: value.hasOwnProperty('duration') ? value.duration : 10,
            };

            const info = (mode[values.mode] << 4) + ((values.strobe ? 1 : 0) << 2) + (level[values.level]);

            await entity.command(
                'ssIasWd',
                'startWarning',
                {startwarninginfo: info, warningduration: values.duration},
                getOptions(meta),
            );
        },
    },
    cover_state: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            const zclCmdLookup = {
                'open': 'upOpen',
                'close': 'downClose',
                'stop': 'stop',
                'on': 'upOpen',
                'off': 'downClose',
            };

            await entity.command('closuresWindowCovering', zclCmdLookup[value.toLowerCase()], {}, getOptions(meta));
        },
    },
    cover_position_tilt: {
        key: ['position', 'tilt'],
        convertSet: async (entity, key, value, meta) => {
            const isPosition = (key === 'position');
            // ZigBee officially expects "open" to be 0 and "closed" to be 100 whereas
            // HomeAssistant etc. work the other way round.
            value = 100 - value;

            await entity.command(
                'closuresWindowCovering',
                isPosition ? 'goToLiftPercentage' : 'goToTiltPercentage',
                isPosition ? {percentageliftvalue: value} : {percentagetiltvalue: value},
                getOptions(meta),
            );
        },
        convertGet: async (entity, key, meta) => {
            const isPosition = (key === 'position');
            await entity.read(
                'closuresWindowCovering',
                [isPosition ? 'currentPositionLiftPercentage' : 'currentPositionTiltPercentage'],
            );
        },
    },
    occupancy_timeout: {
        // set delay after motion detector changes from occupied to unoccupied
        key: ['occupancy_timeout'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('msOccupancySensing', {pirOToUDelay: value});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('msOccupancySensing', ['pirOToUDelay']);
        },
    },
    light_brightness_move: {
        key: ['brightness_move'],
        convertSet: async (entity, key, value, meta) => {
            if (value === 'stop') {
                await entity.command('genLevelCtrl', 'stop', {}, getOptions(meta));
            } else {
                const payload = {movemode: value > 0 ? 0 : 1, rate: Math.abs(value)};
                await entity.command('genLevelCtrl', 'moveWithOnOff', payload, getOptions(meta));
            }
        },
    },
    light_brightness: {
        key: ['brightness', 'brightness_percent'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'brightness_percent') {
                value = Math.round(Number(value) * 2.55).toString();
            }

            if (Number(value) === 0) {
                const result = await converters.on_off.convertSet(entity, 'state', 'off', meta);
                result.state.brightness = 0;
                return result;
            } else {
                const payload = {level: Number(value), transtime: getTransition(entity, key, meta)};
                await entity.command('genLevelCtrl', 'moveToLevel', payload, getOptions(meta));
                return {state: {brightness: Number(value)}, readAfterWriteTime: payload.transtime * 100};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genLevelCtrl', ['currentLevel']);
        },
    },
    light_onoff_brightness: {
        key: ['state', 'brightness', 'brightness_percent'],
        convertSet: async (entity, key, value, meta) => {
            const {message} = meta;
            const hasBrightness = message.hasOwnProperty('brightness') || message.hasOwnProperty('brightness_percent');
            const brightnessValue = message.hasOwnProperty('brightness') ?
                message.brightness : message.brightness_percent;
            const hasState = message.hasOwnProperty('state');
            const state = hasState ? message.state.toLowerCase() : null;

            if (state === 'toggle' || state === 'off' || (!hasBrightness && state === 'on')) {
                const result = await converters.on_off.convertSet(entity, 'state', state, meta);
                if (state === 'on') {
                    result.readAfterWriteTime = 0;
                }
                return result;
            } else if (!hasState && hasBrightness && Number(brightnessValue) === 0) {
                return await converters.on_off.convertSet(entity, 'state', 'off', meta);
            } else {
                const transition = getTransition(entity, 'brightness', meta);
                let brightness = 0;

                if (message.hasOwnProperty('brightness')) {
                    brightness = message.brightness;
                } else if (message.hasOwnProperty('brightness_percent')) {
                    brightness = Math.round(Number(message.brightness_percent) * 2.55).toString();
                }

                await entity.command(
                    'genLevelCtrl',
                    'moveToLevelWithOnOff',
                    {level: Number(brightness), transtime: transition},
                    getOptions(meta),
                );
                return {
                    state: {state: brightness === 0 ? 'OFF' : 'ON', brightness: Number(brightness)},
                    readAfterWriteTime: transition * 100,
                };
            }
        },
        convertGet: async (entity, key, meta) => {
            if (meta.message) {
                if (meta.message.hasOwnProperty('brightness')) {
                    await entity.read('genLevelCtrl', ['currentLevel']);
                }
                if (meta.message.hasOwnProperty('state')) {
                    await converters.on_off.convertGet(entity, key, meta);
                }
            } else {
                await converters.on_off.convertGet(entity, key, meta);
                await entity.read('genLevelCtrl', ['currentLevel']);
            }
        },
    },
    // Some devices reset brightness to 100% when turned on, even if previous brightness was different
    // This uses the stored state of the device to restore to the previous brightness level when turning on
    light_onoff_restorable_brightness: {
        key: ['state', 'brightness', 'brightness_percent'],
        convertSet: async (entity, key, value, meta) => {
            const deviceState = meta.state || {};
            const message = meta.message;
            const state = message.hasOwnProperty('state') ? message.state.toLowerCase() : null;
            const hasBrightness = message.hasOwnProperty('brightness') || message.hasOwnProperty('brightness_percent');

            // Add brightness if command is 'on' and we can restore previous value
            if (state === 'on' && !hasBrightness && deviceState.brightness > 0) {
                message.brightness = deviceState.brightness;
            }

            return await converters.light_onoff_brightness.convertSet(entity, key, value, meta);
        },
        convertGet: async (entity, key, meta) => {
            return await converters.light_onoff_brightness.convertGet(entity, key, meta);
        },
    },
    light_colortemp: {
        key: ['color_temp', 'color_temp_percent'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'color_temp_percent') {
                value = Number(value) * 3.46;
                value = Math.round(value + 154).toString();
            }

            value = Number(value);
            const payload = {colortemp: value, transtime: getTransition(entity, key, meta)};
            await entity.command('lightingColorCtrl', 'moveToColorTemp', payload, getOptions(meta));
            return {state: {color_temp: value}, readAfterWriteTime: payload.transtime * 100};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('lightingColorCtrl', ['colorTemperature']);
        },
    },
    light_color: {
        key: ['color'],
        convertSet: async (entity, key, value, meta) => {
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
            } else if (value.hasOwnProperty('hex') || (typeof value === 'string' && value.startsWith('#'))) {
                const xy = utils.hexToXY(typeof value === 'string' && value.startsWith('#') ? value : value.hex);
                value = {x: xy.x, y: xy.y};
            } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s')) {
                value.hue = value.h % 360 * (65535 / 360);
                value.saturation = value.s * (2.54);
                cmd = 'enhancedMoveToHueAndSaturation';
            } else if (value.hasOwnProperty('h')) {
                value.hue = value.h % 360 * (65535 / 360);
                cmd = 'enhancedMoveToHue';
            } else if (value.hasOwnProperty('s')) {
                value.saturation = value.s * (2.54);
                cmd = 'moveToSaturation';
            } else if (value.hasOwnProperty('hue') && value.hasOwnProperty('saturation')) {
                value.hue = value.hue % 360 * (65535 / 360);
                value.saturation = value.saturation * (2.54);
                cmd = 'enhancedMoveToHueAndSaturation';
            } else if (value.hasOwnProperty('hue')) {
                value.hue = value.hue % 360 * (65535 / 360);
                cmd = 'enhancedMoveToHue';
            } else if (value.hasOwnProperty('saturation')) {
                value.saturation = value.saturation * (2.54);
                cmd = 'moveToSaturation';
            }

            const zclData = {transtime: getTransition(entity, key, meta)};

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

            await entity.command('lightingColorCtrl', cmd, zclData, getOptions(meta));
            return {state: newState, readAfterWriteTime: zclData.transtime * 100};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('lightingColorCtrl', ['currentX', 'currentY']);
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
        convertSet: async (entity, key, value, meta) => {
            if (key == 'color') {
                const result = await converters.light_color.convertSet(entity, key, value, meta);
                if (result.state) {
                    result.state.color_temp = utils.xyToMireds(result.state.color.x, result.state.color.y);
                }

                return result;
            } else if (key == 'color_temp' || key == 'color_temp_percent') {
                const result = await converters.light_colortemp.convertSet(entity, key, value, meta);
                result.state.color = utils.miredsToXY(result.state.color_temp);
                return result;
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('lightingColorCtrl', ['currentX', 'currentY', 'colorTemperature']);
        },
    },
    light_alert: {
        key: ['alert', 'flash'],
        convertSet: async (entity, key, value, meta) => {
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

            const payload = {effectid: lookup[value.toLowerCase()], effectvariant: 0x01};
            await entity.command('genIdentify', 'triggerEffect', payload, getOptions(meta));
        },
    },
    thermostat_local_temperature: {
        key: 'local_temperature',
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['localTemp']);
        },
    },
    thermostat_local_temperature_calibration: {
        key: 'local_temperature_calibration',
        convertSet: async (entity, key, value, meta) => {
            await entity.write('hvacThermostat', {localTemperatureCalibration: Math.round(value * 10)});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['localTemperatureCalibration']);
        },
    },
    thermostat_occupancy: {
        key: 'occupancy',
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['ocupancy']);
        },
    },
    thermostat_occupied_heating_setpoint: {
        key: 'occupied_heating_setpoint',
        convertSet: async (entity, key, value, meta) => {
            const occupiedHeatingSetpoint = (Math.round((value * 2).toFixed(1))/2).toFixed(1) * 100;
            await entity.write('hvacThermostat', {occupiedHeatingSetpoint});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['occupiedHeatingSetpoint']);
        },
    },
    thermostat_unoccupied_heating_setpoint: {
        key: 'unoccupied_heating_setpoint',
        convertSet: async (entity, key, value, meta) => {
            const unoccupiedHeatingSetpoint = (Math.round((value * 2).toFixed(1))/2).toFixed(1) * 100;
            await entity.write('hvacThermostat', {unoccupiedHeatingSetpoint});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['unoccupiedHeatingSetpoint']);
        },
    },
    thermostat_occupied_cooling_setpoint: {
        key: 'occupied_cooling_setpoint',
        convertSet: async (entity, key, value, meta) => {
            const occupiedCoolingSetpoint = (Math.round((value * 2).toFixed(1))/2).toFixed(1) * 100;
            await entity.write('hvacThermostat', {occupiedCoolingSetpoint});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['occupiedCoolingSetpoint']);
        },
    },
    thermostat_remote_sensing: {
        key: 'remote_sensing',
        convertSet: async (entity, key, value, meta) => {
            await entity.write('hvacThermostat', {remoteSensing: value});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['remoteSensing']);
        },
    },
    thermostat_control_sequence_of_operation: {
        key: 'control_sequence_of_operation',
        convertSet: async (entity, key, value, meta) => {
            const ctrlSeqeOfOper = utils.getKeyByValue(common.thermostatControlSequenceOfOperations, value, value);
            await entity.write('hvacThermostat', {ctrlSeqeOfOper});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['ctrlSeqeOfOper']);
        },
    },
    thermostat_system_mode: {
        key: 'system_mode',
        convertSet: async (entity, key, value, meta) => {
            const systemMode = utils.getKeyByValue(common.thermostatSystemModes, value, value);
            await entity.write('hvacThermostat', {systemMode});
            return {readAfterWriteTime: 250, state: {system_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['systemMode']);
        },
    },
    thermostat_setpoint_raise_lower: {
        key: 'setpoint_raise_lower',
        convertSet: async (entity, key, value, meta) => {
            const payload = {mode: value.mode, amount: Math.round(value.amount) * 100};
            await entity.command('hvacThermostat', 'setpointRaiseLower', payload, getOptions(meta));
        },
    },
    thermostat_weekly_schedule: {
        key: 'weekly_schedule',
        convertSet: async (entity, key, value, meta) => {
            const payload = {
                temperature_setpoint_hold: value.temperature_setpoint_hold,
                temperature_setpoint_hold_duration: value.temperature_setpoint_hold_duration,
                thermostat_programming_operation_mode: value.thermostat_programming_operation_mode,
                thermostat_running_state: value.thermostat_running_state,
            };
            await entity.command('hvacThermostat', 'setWeeklySchedule', payload, getOptions(meta));
        },
        convertGet: async (entity, key, meta) => {
            await entity.command('hvacThermostat', 'getWeeklySchedule', {}, getOptions(meta));
        },
    },
    thermostat_clear_weekly_schedule: {
        key: 'clear_weekly_schedule',
        convertSet: async (entity, key, value, meta) => {
            await entity.command('hvacThermostat', 'clearWeeklySchedule', {}, getOptions(meta));
        },
    },
    thermostat_relay_status_log: {
        key: 'relay_status_log',
        convertGet: async (entity, key, meta) => {
            await entity.command('hvacThermostat', 'getRelayStatusLog', {}, getOptions(meta));
        },
    },
    thermostat_weekly_schedule_rsp: {
        key: 'weekly_schedule_rsp',
        convertGet: async (entity, key, meta) => {
            const payload = {
                number_of_transitions: meta.message[key].numoftrans, // TODO: Lookup in Zigbee documentation
                day_of_week: meta.message[key].dayofweek,
                mode: meta.message[key].mode,
                thermoseqmode: meta.message[key].thermoseqmode,
            };
            await entity.command('hvacThermostat', 'getWeeklyScheduleRsp', payload, getOptions(meta));
        },
    },
    thermostat_relay_status_log_rsp: {
        key: 'relay_status_log_rsp',
        attr: [],
        convertGet: async (entity, key, meta) => {
            const payload = {
                time_of_day: meta.message[key].timeofday, // TODO: Lookup in Zigbee documentation
                relay_status: meta.message[key].relaystatus,
                local_temperature: meta.message[key].localtemp,
                humidity: meta.message[key].humidity,
                setpoint: meta.message[key].setpoint,
                unread_entries: meta.message[key].unreadentries,
            };
            await entity.command('hvacThermostat', 'getRelayStatusLogRsp', payload, getOptions(meta));
        },
    },
    thermostat_running_mode: {
        key: 'running_mode',
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['runningMode']);
        },
    },
    thermostat_running_state: {
        key: 'running_state',
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['runningState']);
        },
    },
    thermostat_temperature_display_mode: {
        key: 'temperature_display_mode',
        convertSet: async (entity, key, value, meta) => {
            const tempDisplayMode = utils.getKeyByValue(common.temperatureDisplayMode, value, value);
            await entity.write('hvacUserInterfaceCfg', {tempDisplayMode});
        },
    },
    thermostat_keypad_lockout: {
        key: 'keypad_lockout',
        convertSet: async (entity, key, value, meta) => {
            const keypadLockout = utils.getKeyByValue(common.keypadLockoutMode, value, value);
            await entity.write('hvacUserInterfaceCfg', {keypadLockout});
        },
    },
    fan_mode: {
        key: ['fan_mode', 'fan_state'],
        convertSet: async (entity, key, value, meta) => {
            const fanMode = common.fanMode[value.toLowerCase()];
            await entity.write('hvacFanCtrl', {fanMode});
            return {state: {fan_mode: value, fan_state: value === 'off' ? 'OFF' : 'ON'}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacFanCtrl', ['fanMode']);
        },
    },

    /**
     * Device specific
     */
    LLKZMK11LM_interlock: {
        key: ['interlock'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('genBinaryOutput', {0xff06: {value: value ? 0x01 : 0x00, type: 0x10}}, options.xiaomi);
            return {state: {interlock: value}};
        },
    },
    DJT11LM_vibration_sensitivity: {
        key: ['sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {
                'low': 0x15,
                'medium': 0x0B,
                'high': 0x01,
            };

            if (lookup.hasOwnProperty(value)) {
                await entity.write('genBasic', {0xFF0D: {value: lookup[value], type: 0x20}}, options.xiaomi);
            }

            return {state: {sensitivity: value}};
        },
    },
    JTQJBF01LMBW_JTYJGD01LMBW_sensitivity: {
        key: ['sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {
                'low': 0x04010000,
                'medium': 0x04020000,
                'high': 0x04030000,
            };


            if (lookup.hasOwnProperty(value)) {
                // Timeout of 30 seconds + required (https://github.com/Koenkk/zigbee2mqtt/issues/2287)
                const opts = {...options.xiaomi, timeout: 35000};
                await entity.write('ssIasZone', {0xFFF1: {value: lookup[value], type: 0x23}}, opts);
            }

            return {state: {sensitivity: value}};
        },
    },
    JTQJBF01LMBW_JTYJGD01LMBW_selfest: {
        key: ['selftest'],
        convertSet: async (entity, key, value, meta) => {
            // Timeout of 30 seconds + required (https://github.com/Koenkk/zigbee2mqtt/issues/2287)
            const opts = {...options.xiaomi, timeout: 35000};
            await entity.write('ssIasZone', {0xFFF1: {value: 0x03010000, type: 0x23}}, opts);
        },
    },
    xiaomi_switch_operation_mode: {
        key: ['operation_mode'],
        convertSet: async (entity, key, value, meta) => {
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

            const payload = {};
            payload[lookupAttrId[button]] = {value: lookupState[value.state], type: 0x20};

            await entity.write('genBasic', payload, options.xiaomi);
        },
        convertGet: async (entity, key, meta) => {
            const lookupAttrId = {
                'single': 0xFF22,
                'left': 0xFF22,
                'right': 0xFF23,
            };

            let button;
            if (meta.message[key].hasOwnProperty('button')) {
                button = meta.message[key].button;
            } else {
                button = 'single';
            }

            await entity.read('genBasic', [lookupAttrId[button]], options.xiaomi);
        },
    },
    STS_PRS_251_beep: {
        key: ['beep'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('genIdentify', 'identifyTime', {identifytime: value}, getOptions(meta));
        },
    },
    ZNCLDJ11LM_ZNCLDJ12LM_control: {
        key: ['state', 'position'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'state' && value.toLowerCase() === 'stop') {
                await entity.command('closuresWindowCovering', 'stop', {}, getOptions(meta));
            } else {
                const lookup = {
                    'open': 100,
                    'close': 0,
                    'on': 100,
                    'off': 0,
                };

                value = typeof value === 'string' ? value.toLowerCase() : value;
                value = lookup.hasOwnProperty(value) ? lookup[value] : value;

                const payload = {0x0055: {value, type: 0x39}};
                await entity.write('genAnalogOutput', payload);
            }
        },
    },
    osram_cmds: {
        key: ['osram_set_transition', 'osram_remember_state'],
        convertSet: async (entity, key, value, meta) => {
            if ( key === 'osram_set_transition' ) {
                if (value) {
                    const transition = ( value > 1 ) ? (Math.round((value * 2).toFixed(1))/2).toFixed(1) * 10 : 1;
                    const payload = {0x0012: {value: transition, type: 0x21}, 0x0013: {value: transition, type: 0x21}};
                    await entity.write('genLevelCtrl', payload);
                }
            } else if ( key == 'osram_remember_state' ) {
                if (value === true) {
                    await entity.command('manuSpecificOsram', 'saveStartupParams', {}, options.osram);
                } else if ( value === false ) {
                    await entity.command('manuSpecificOsram', 'resetStartupParams', {}, options.osram);
                }
            }
        },
    },
    eurotronic_thermostat_system_mode: {
        key: 'system_mode',
        convertSet: async (entity, key, value, meta) => {
            const systemMode = utils.getKeyByValue(common.thermostatSystemModes, value, value);
            switch (systemMode) {
            case 0:
                value |= 1 << 5; // off
                break;
            case 1:
                value |= 1 << 2; // boost
                break;
            default:
                value |= 1 << 4; // heat
            }
            const payload = {0x4008: {value, type: 0x22}};
            await entity.write('hvacThermostat', payload, options.eurotronic);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['systemMode']);
        },
    },
    eurotronic_system_mode: {
        key: 'eurotronic_system_mode',
        convertSet: async (entity, key, value, meta) => {
            const payload = {0x4008: {value, type: 0x22}};
            await entity.write('hvacThermostat', payload, options.eurotronic);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4008], options.eurotronic);
        },
    },
    eurotronic_error_status: {
        key: 'eurotronic_error_status',
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4002], options.eurotronic);
        },
    },
    eurotronic_current_heating_setpoint: {
        key: 'current_heating_setpoint',
        convertSet: async (entity, key, value, meta) => {
            const payload = {
                0x4003: {
                    value: (Math.round((value * 2).toFixed(1))/2).toFixed(1) * 100,
                    type: 0x29,
                },
            };
            await entity.write('hvacThermostat', payload, options.eurotronic);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4003], options.eurotronic);
        },
    },
    eurotronic_valve_position: {
        key: 'eurotronic_valve_position',
        convertSet: async (entity, key, value, meta) => {
            const payload = {0x4001: {value, type: 0x20}};
            await entity.write('hvacThermostat', payload, options.eurotronic);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4001], options.eurotronic);
        },
    },
    eurotronic_trv_mode: {
        key: 'eurotronic_trv_mode',
        convertSet: async (entity, key, value, meta) => {
            const payload = {0x4000: {value, type: 0x30}};
            await entity.write('hvacThermostat', payload, options.eurotronic);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4000], options.eurotronic);
        },
    },
    livolo_switch_on_off: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== 'string') {
                return;
            }

            const postfix = meta.endpoint_name || 'left';
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

            await entity.command('genLevelCtrl', 'moveToLevelWithOnOff', {level: state, transtime: channel});
            return {state: {state: value.toUpperCase()}, readAfterWriteTime: 250};
        },
        convertGet: async (entity, key, meta) => {
            await entity.command('genOnOff', 'toggle', {}, {});
        },
    },
    generic_lock: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command(
                'closuresDoorLock',
                `${value.toLowerCase()}Door`,
                {'pincodevalue': ''},
                getOptions(meta),
            );

            return {readAfterWriteTime: 200, state: {state: value.toUpperCase()}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('closuresDoorLock', ['lockState']);
        },
    },
    gledopto_light_onoff_brightness: {
        key: ['state', 'brightness', 'brightness_percent'],
        convertSet: async (entity, key, value, meta) => {
            if (meta.message && meta.message.hasOwnProperty('transition')) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            if (meta.mapped.model === 'GL-C-007' && utils.hasEndpoints(meta.device, [11, 13, 15])) {
                // GL-C-007 RGBW
                if (key === 'state' && value.toUpperCase() === 'OFF') {
                    await converters.light_onoff_brightness.convertSet(meta.device.getEndpoint(15), key, value, meta);
                }

                entity = meta.state.white_value === -1 ? meta.device.getEndpoint(11) : meta.device.getEndpoint(15);
            }

            return await converters.light_onoff_brightness.convertSet(entity, key, value, meta);
        },
        convertGet: async (entity, key, meta) => {
            return await converters.light_onoff_brightness.convertGet(entity, key, meta);
        },
    },
    gledopto_light_color_colortemp_white: {
        key: ['color', 'color_temp', 'color_temp_percent', 'white_value'],
        convertSet: async (entity, key, value, meta) => {
            const xyWhite = {x: 0.323, y: 0.329};
            if (meta.message && meta.message.hasOwnProperty('transition')) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            if (key === 'color' && !meta.message.transition) {
                // Always provide a transition when setting color, otherwise CCT to RGB
                // doesn't work properly (CCT leds stay on).
                meta.message.transition = 0.4;
            }

            const state = {};

            if (meta.mapped.model === 'GL-C-007') {
                // GL-C-007 RGBW
                if (utils.hasEndpoints(meta.device, [11, 13, 15])) {
                    if (key === 'white_value') {
                        // Switch from RGB to white
                        if (!meta.options.separate_control) {
                            await meta.device.getEndpoint(15).command('genOnOff', 'on', {});
                            await meta.device.getEndpoint(11).command('genOnOff', 'off', {});
                            state.color = xyWhite;
                        }

                        const result = await converters.light_brightness.convertSet(
                            meta.device.getEndpoint(15), key, value, meta,
                        );
                        return {
                            state: {white_value: value, ...result.state, ...state},
                            readAfterWriteTime: 0,
                        };
                    } else {
                        if (meta.state.white_value !== -1 && !meta.options.seperate_control) {
                            // Switch from white to RGB
                            await meta.device.getEndpoint(11).command('genOnOff', 'on', {});
                            await meta.device.getEndpoint(15).command('genOnOff', 'off', {});
                            state.white_value = -1;
                        }
                    }
                } else if (utils.hasEndpoints(meta.device, [11, 13])) {
                    if (key === 'white_value') {
                        // Switch to white channel
                        const payload = {colortemp: 500, transtime: getTransition(entity, key, meta)};
                        await entity.command('lightingColorCtrl', 'moveToColorTemp', payload, getOptions(meta));

                        const result = await converters.light_brightness.convertSet(entity, key, value, meta);
                        return {
                            state: {white_value: value, ...result.state, color: xyWhite},
                            readAfterWriteTime: 0,
                        };
                    }
                }
            }

            const result = await converters.light_color_colortemp.convertSet(entity, key, value, meta);
            result.state = {...result.state, ...state};
            return result;
        },
        convertGet: async (entity, key, meta) => {
            return await converters.light_color_colortemp.convertGet(entity, key, meta);
        },
    },
    hue_power_on_behavior: {
        key: ['hue_power_on_behavior'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {
                'default': 0x01,
                'on': 0x01,
                'off': 0x00,
                'recover': 0xff,
            };

            const payload = {
                0x4003: {
                    value: lookup[value],
                    type: 0x30,
                },
            };
            await entity.write('genOnOff', payload, options.hue);
        },
    },
    hue_power_on_brightness: {
        key: ['hue_power_on_brightness'],
        convertSet: async (entity, key, value, meta) => {
            if (value === 'default') {
                value = 255;
            }

            const payload = {
                0x4000: {
                    value,
                    type: 0x20,
                },
            };
            await entity.write('genLevelCtrl', payload, options.hue);
        },
    },
    hue_power_on_color_temperature: {
        key: ['hue_power_on_color_temperature'],
        convertSet: async (entity, key, value, meta) => {
            if (value === 'default') {
                value = 366;
            }

            const payload = {
                0x4010: {
                    value,
                    type: 0x21,
                },
            };
            await entity.write('lightingColorCtrl', payload, options.hue);
        },
    },
    hue_motion_sensitivity: {
        // motion detect sensitivity, philips specific
        key: ['motion_sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            // hue_sml:
            // 0: low, 1: medium, 2: high (default)
            // make sure you write to second endpoint!
            const lookup = {
                'low': 0,
                'medium': 1,
                'high': 2,
            };


            const payload = {
                48: {
                    value: typeof value === 'string' ? lookup[value] : value,
                    type: 32,
                },
            };
            await entity.write('msOccupancySensing', payload, options.hue);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('msOccupancySensing', [48], options.hue);
        },
    },
    ZigUP_lock: {
        key: ['led'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {
                'off': 'lockDoor',
                'on': 'unlockDoor',
                'toggle': 'toggleDoor',
            };

            await entity.command('closuresDoorLock', lookup[value], {'pincodevalue': ''});
        },
    },

    // Sinope
    sinope_thermostat_occupancy: {
        key: 'thermostat_occupancy',
        convertSet: async (entity, key, value, meta) => {
            const sinopeOccupancy = {
                0: 'unoccupied',
                1: 'occupied',
            };
            const SinopeOccupancy = utils.getKeyByValue(sinopeOccupancy, value, value);
            await entity.write('hvacThermostat', {SinopeOccupancy});
        },
    },
    sinope_thermostat_backlight_autodim_param: {
        key: 'backlight_auto_dim',
        convertSet: async (entity, key, value, meta) => {
            const sinopeBacklightParam = {
                0: 'on demand',
                1: 'sensing',
            };
            const SinopeBacklight = utils.getKeyByValue(sinopeBacklightParam, value, value);
            await entity.write('hvacThermostat', {SinopeBacklight});
        },
    },
    sinope_thermostat_enable_outdoor_temperature: {
        key: 'enable_outdoor_temperature',
        convertSet: async (entity, key, value, meta) => {
            if (value.toLowerCase() == 'on') {
                await entity.write('manuSpecificSinope', {outdoorTempToDisplayTimeout: 10800});
            } else if (value.toLowerCase()=='off') {
                // set timer to 30sec in order to disable outdoor temperature
                await entity.write('manuSpecificSinope', {outdoorTempToDisplayTimeout: 30});
            }
        },
    },
    sinope_thermostat_outdoor_temperature: {
        key: 'thermostat_outdoor_temperature',
        convertSet: async (entity, key, value, meta) => {
            if (value > -100 && value < 100) {
                await entity.write('manuSpecificSinope', {outdoorTempToDisplay: value * 100});
            }
        },
    },
    sinope_thermostat_time: {
        key: 'thermostat_time',
        convertSet: async (entity, key, value, meta) => {
            if (value === '') {
                const thermostatDate = new Date();
                const thermostatTimeSec = thermostatDate.getTime() / 1000;
                const thermostatTimezoneOffsetSec = thermostatDate.getTimezoneOffset() * 60;
                const currentTimeToDisplay = Math.round(thermostatTimeSec - thermostatTimezoneOffsetSec - 946684800);
                await entity.write('manuSpecificSinope', {currentTimeToDisplay});
            } else if (value !== '') {
                await entity.write('manuSpecificSinope', {currentTimeToDisplay: value});
            }
        },
    },
    DTB190502A1_LED: {
        key: ['LED'],
        convertSet: async (entity, key, value, meta) => {
            if (value === 'default') {
                value = 1;
            }
            const lookup = {
                'OFF': '0',
                'ON': '1',
            };
            value = lookup[value];
            // Check for valid data
            if ( ((value >= 0) && value < 2) == false ) value = 0;

            const payload = {
                0x4010: {
                    value,
                    type: 0x21,
                },
            };

            await entity.write('genBasic', payload);
        },
    },
    ptvo_switch_trigger: {
        key: ['trigger', 'interval'],
        convertSet: async (entity, key, value, meta) => {
            value = parseInt(value);
            if (!value) {
                return;
            }

            if (key === 'trigger') {
                await entity.command('genOnOff', 'onWithTimedOff', {ctrlbits: 0, ontime: value, offwaittime: 0});
            } else if (key === 'interval') {
                await entity.configureReporting('genOnOff', [{
                    attribute: 'onOff',
                    minimumReportInterval: value,
                    maximumReportInterval: value,
                }]);
            }
        },
    },

    // ubisys configuration / calibration converters
    ubisys_configure_j1: {
        key: ['configure_j1'],
        convertSet: async (entity, key, value, meta) => {
            const log = (message) => {
                meta.logger.warn(`ubisys: ${message}`);
            };
            const sleepSeconds = async (s) => {
                return new Promise((resolve) => setTimeout(resolve, s * 1000));
            };
            const waitUntilStopped = async () => {
                let operationalStatus = 0;
                do {
                    await sleepSeconds(2);
                    operationalStatus = (await entity.read('closuresWindowCovering',
                        ['operationalStatus'])).operationalStatus;
                } while (operationalStatus != 0);
                await sleepSeconds(2);
            };
            const writeAttrFromJson = async (attr, jsonAttr = attr, converterFunc) => {
                if (jsonAttr.startsWith('ubisys')) {
                    jsonAttr = jsonAttr.substring(6, 1).toLowerCase + jsonAttr.substring(7);
                }
                if (value.hasOwnProperty(jsonAttr)) {
                    let attrValue = value[jsonAttr];
                    if (converterFunc) {
                        attrValue = converterFunc(attrValue);
                    }
                    const attributes = {};
                    attributes[attr] = attrValue;
                    await entity.write('closuresWindowCovering', attributes, options.ubisys);
                }
            };
            const stepsPerSecond = value.steps_per_second || 50;
            const hasCalibrate = value.hasOwnProperty('calibrate');

            if (hasCalibrate) {
                log('Cover calibration starting...');
                // first of all, move to top position to not confuse calibration later
                log('  Moving cover to top position to get a good starting point...');
                await entity.command('closuresWindowCovering', 'upOpen');
                await waitUntilStopped();
                log('  Settings some attributes...');
                // cancel any running calibration
                await entity.write('closuresWindowCovering', {windowCoveringMode: 0});
                await sleepSeconds(2);
            }
            if (await writeAttrFromJson('windowCoveringType')) {
                await sleepSeconds(5);
            }
            if (hasCalibrate) {
                // reset attributes
                await entity.write('closuresWindowCovering', {
                    installedOpenLimitLiftCm: 0,
                    installedClosedLimitLiftCm: 240,
                    installedOpenLimitTiltDdegree: 0,
                    installedClosedLimitTiltDdegree: 900,
                    ubisysLiftToTiltTransitionSteps: 0xffff,
                    ubisysTotalSteps: 0xffff,
                    ubisysLiftToTiltTransitionSteps2: 0xffff,
                    ubisysTotalSteps2: 0xffff,
                }, options.ubisys);
                // enable calibration mode
                await sleepSeconds(2);
                await entity.write('closuresWindowCovering', {windowCoveringMode: 0x02});
                await sleepSeconds(2);
                // move down a bit and back up to detect upper limit
                log('  Moving cover down a bit...');
                await entity.command('closuresWindowCovering', 'downClose');
                await sleepSeconds(5);
                await entity.command('closuresWindowCovering', 'stop');
                await sleepSeconds(2);
                log('  Moving up again to detect upper limit...');
                await entity.command('closuresWindowCovering', 'upOpen');
                await waitUntilStopped();
                log('  Moving down to count steps from open to closed...');
                await entity.command('closuresWindowCovering', 'downClose');
                await waitUntilStopped();
                log('  Moving up to count steps from closed to open...');
                await entity.command('closuresWindowCovering', 'upOpen');
                await waitUntilStopped();
            }
            // now write any attribute values present in JSON
            await writeAttrFromJson('configStatus');
            await writeAttrFromJson('installedOpenLimitLiftCm');
            await writeAttrFromJson('installedClosedLimitLiftCm');
            await writeAttrFromJson('installedOpenLimitTiltDdegree');
            await writeAttrFromJson('installedClosedLimitTiltDdegree');
            await writeAttrFromJson('ubisysTurnaroundGuardTime');
            await writeAttrFromJson('ubisysLiftToTiltTransitionSteps');
            await writeAttrFromJson('ubisysTotalSteps');
            await writeAttrFromJson('ubisysLiftToTiltTransitionSteps2');
            await writeAttrFromJson('ubisysTotalSteps2');
            await writeAttrFromJson('ubisysAdditionalSteps');
            await writeAttrFromJson('ubisysInactivePowerThreshold');
            await writeAttrFromJson('ubisysStartupSteps');
            // some convenience functions to not have to calculate
            await writeAttrFromJson('ubisysTotalSteps', 'open_to_closed_s', (s) => s * stepsPerSecond);
            await writeAttrFromJson('ubisysTotalSteps2', 'closed_to_open_s', (s) => s * stepsPerSecond);
            await writeAttrFromJson('ubisysLiftToTiltTransitionSteps', 'lift_to_tilt_transition_ms',
                (s) => s * stepsPerSecond / 1000);
            await writeAttrFromJson('ubisysLiftToTiltTransitionSteps2', 'lift_to_tilt_transition_ms',
                (s) => s * stepsPerSecond / 1000);
            if (hasCalibrate) {
                log('  Finalizing calibration...');
                // disable calibration mode again
                await sleepSeconds(2);
                await entity.write('closuresWindowCovering', {windowCoveringMode: 0x00});
                await sleepSeconds(2);
                // re-read and dump all relevant attributes
                log('  Done - will now read back the results.');
                converters.ubisys_configure_j1.convertGet(entity, key, meta);
            }
        },
        convertGet: async (entity, key, meta) => {
            const log = (json) => {
                meta.logger.warn(`ubisys: Cover configuration read: ${JSON.stringify(json)}`);
            };
            log(await entity.read('closuresWindowCovering', [
                'windowCoveringType',
                'physicalClosedLimitLiftCm',
                'physicalClosedLimitTiltDdegree',
                'installedOpenLimitLiftCm',
                'installedClosedLimitLiftCm',
                'installedOpenLimitTiltDdegree',
                'installedClosedLimitTiltDdegree',
            ]));
            log(await entity.read('closuresWindowCovering', [
                'configStatus',
                'windowCoveringMode',
                'currentPositionLiftPercentage',
                'currentPositionLiftCm',
                'currentPositionTiltPercentage',
                'currentPositionTiltDdegree',
                'operationalStatus',
            ]));
            log(await entity.read('closuresWindowCovering', [
                'ubisysTurnaroundGuardTime',
                'ubisysLiftToTiltTransitionSteps',
                'ubisysTotalSteps',
                'ubisysLiftToTiltTransitionSteps2',
                'ubisysTotalSteps2',
                'ubisysAdditionalSteps',
                'ubisysInactivePowerThreshold',
                'ubisysStartupSteps',
            ], options.ubisys));
        },
    },

    tint_scene: {
        key: ['tint_scene'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('genBasic', {0x4005: {value, type: 0x20}}, options.tint);
        },
    },

    /**
     * Ignore converters
     */
    ignore_transition: {
        key: ['transition'],
        attr: [],
        convertSet: async (entity, key, value, meta) => {
        },
    },
};

module.exports = converters;
