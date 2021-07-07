'use strict';

const utils = require('./utils');
const common = require('./common');
const globalStore = require('./store');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const store = {};

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
    legrand: {
        manufacturerCode: 0x1021,
        disableDefaultResponse: true,
    },
};

async function sendTuyaCommand(entity, dp, fn, data) {
    await entity.command(
        'manuSpecificTuyaDimmer',
        'setData',
        {
            status: 0,
            transid: utils.getRandomInt(0, 255),
            dp: dp,
            fn: fn,
            data: data,
        },
        {disableDefaultResponse: true},
    );
}

function saveSceneState(entity, sceneID, groupID, state) {
    const attributes = ['state', 'color_temp', 'brightness', 'color'];
    if (!entity.meta.hasOwnProperty('scenes')) entity.meta.scenes = {};
    const metaKey = `${sceneID}_${groupID}`;
    entity.meta.scenes[metaKey] = {state: utils.filterObject(state, attributes)};
    entity.save();
}

function getEntityOrFirstGroupMember(entity) {
    if (entity.constructor.name === 'Group') {
        return entity.members.length > 0 ? entity.members[0] : null;
    } else {
        return entity;
    }
}

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
            return {time: 0, specified: false};
        }
    }

    if (message.hasOwnProperty('transition')) {
        return {time: message.transition * 10, specified: true};
    } else if (options.hasOwnProperty('transition')) {
        return {time: options.transition * 10, specified: true};
    } else {
        return {time: 0, specified: false};
    }
}

// Entity is expected to be either a zigbee-herdsman group or endpoint

// Meta is expect to contain:
// {
//   message: the full message, used for e.g. {brightness; transition;}
//   options: {disableFeedback: skip waiting for feedback, e.g. Hampton Bay 99432 doesn't respond}
//   endpoint_name: name of the endpoint, used for e.g. livolo where left and right is
//                  separated by transition time instead of separated endpoint
// }

const getOptions = (definition, entity) => {
    const result = {};
    const allowed = ['disableDefaultResponse', 'manufacturerCode', 'timeout'];
    if (definition && definition.meta) {
        for (const key of Object.keys(definition.meta)) {
            if (allowed.includes(key)) {
                const value = definition.meta[key];
                result[key] = typeof value === 'function' ? value(entity) : value;
            }
        }
    }

    return result;
};

const correctHue = (hue, meta) => {
    const {options} = meta;
    if (options.hasOwnProperty('hue_correction')) {
        return utils.interpolateHue(hue, options.hue_correction);
    } else {
        return hue;
    }
};

const converters = {
    /**
     * Generic
     */
    factory_reset: {
        key: ['reset'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('genBasic', 'resetFactDefault', {}, getOptions(meta.mapped, entity));
        },
    },
    kmpcil_res005_on_off: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            const options = {disableDefaultResponse: true};
            if (value.toLowerCase() === 'toggle') {
                if (!meta.state.hasOwnProperty('state')) {
                    return {};
                } else {
                    const payload = {0x0055: {value: (meta.state.state === 'OFF')?0x01:0x00, type: 0x10}};
                    await entity.write('genBinaryOutput', payload, options);
                    return {state: {state: meta.state.state === 'OFF' ? 'ON' : 'OFF'}};
                }
            } else {
                const payload = {0x0055: {value: (value.toUpperCase() === 'OFF')?0x00:0x01, type: 0x10}};
                await entity.write('genBinaryOutput', payload, options);
                return {state: value.toUpperCase()};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genBinaryOutput', ['presentValue']);
        },
    },
    on_off: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('genOnOff', value.toLowerCase(), {}, getOptions(meta.mapped, entity));
            if (value.toLowerCase() === 'toggle') {
                const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`];
                return currentState ? {state: {state: currentState === 'OFF' ? 'ON' : 'OFF'}} : {};
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
            const invert = meta.mapped.meta && meta.mapped.meta.coverInverted ? !meta.options.invert_cover : meta.options.invert_cover;
            const zpos = invert ? 100 - value : value;
            await entity.command(
                'genLevelCtrl',
                'moveToLevelWithOnOff',
                {level: Math.round(Number(zpos) * 2.55).toString(), transtime: 0},
                getOptions(meta.mapped, entity),
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
                getOptions(meta.mapped, entity),
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

            await entity.command(
                'closuresWindowCovering',
                zclCmdLookup[value.toLowerCase()],
                {},
                getOptions(meta.mapped, entity),
            );
        },
    },
    cover_position_tilt: {
        key: ['position', 'tilt'],
        convertSet: async (entity, key, value, meta) => {
            const isPosition = (key === 'position');
            const invert = !(meta.mapped.meta && meta.mapped.meta.coverInverted ? !meta.options.invert_cover : meta.options.invert_cover);
            const zpos = invert ? 100 - value : value;

            // Zigbee officially expects 'open' to be 0 and 'closed' to be 100 whereas
            // HomeAssistant etc. work the other way round.
            // For zigbee-herdsman-converters: open = 100, close = 0
            await entity.command(
                'closuresWindowCovering',
                isPosition ? 'goToLiftPercentage' : 'goToTiltPercentage',
                isPosition ? {percentageliftvalue: zpos} : {percentagetiltvalue: zpos},
                getOptions(meta.mapped, entity),
            );

            return {state: {[isPosition ? 'position' : 'tilt']: value}};
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
            value *= 1;
            await entity.write('msOccupancySensing', {pirOToUDelay: value});
            return {state: {occupancy_timeout: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('msOccupancySensing', ['pirOToUDelay']);
        },
    },
    light_brightness_step: {
        key: ['brightness_step', 'brightness_step_onoff'],
        convertSet: async (entity, key, value, meta) => {
            const onOff = key.endsWith('_onoff');
            const command = onOff ? 'stepWithOnOff' : 'step';
            value = Number(value);
            if (isNaN(value)) {
                throw new Error(`${key} value of message: '${JSON.stringify(meta.message)}' invalid`);
            }

            const mode = value > 0 ? 0 : 1;
            const transition = getTransition(entity, key, meta).time;
            const payload = {stepmode: mode, stepsize: Math.abs(value), transtime: transition};
            await entity.command('genLevelCtrl', command, payload, getOptions(meta.mapped, entity));

            if (meta.state.hasOwnProperty('brightness')) {
                let brightness = onOff || meta.state.state === 'ON' ? meta.state.brightness + value : meta.state.brightness;
                brightness = Math.min(254, brightness);
                brightness = Math.max(onOff || meta.state.state === 'OFF' ? 0 : 1, brightness);

                if (utils.getMetaValue(entity, meta.mapped, 'turnsOffAtBrightness1')) {
                    if (onOff && value < 0 && brightness === 1) {
                        brightness = 0;
                    } else if (onOff && value > 0 && meta.state.brightness === 0) {
                        brightness++;
                    }
                }

                return {state: {brightness, state: brightness === 0 ? 'OFF' : 'ON'}};
            }
        },
    },
    light_brightness_move: {
        key: ['brightness_move', 'brightness_move_onoff'],
        convertSet: async (entity, key, value, meta) => {
            if (value === 'stop' || value === 0) {
                await entity.command('genLevelCtrl', 'stop', {}, getOptions(meta.mapped, entity));

                // As we cannot determine the new brightness state, we read it from the device
                await wait(500);
                const target = entity.constructor.name === 'Group' ? entity.members[0] : entity;
                await target.read('genOnOff', ['onOff']);
                await target.read('genLevelCtrl', ['currentLevel']);
            } else {
                value = Number(value);
                if (isNaN(value)) {
                    throw new Error(`${key} value of message: '${JSON.stringify(meta.message)}' invalid`);
                }
                const payload = {movemode: value > 0 ? 0 : 1, rate: Math.abs(value)};
                const command = key.endsWith('onoff') ? 'moveWithOnOff' : 'move';
                await entity.command('genLevelCtrl', command, payload, getOptions(meta.mapped, entity));
            }
        },
    },
    light_colortemp_step: {
        key: ['color_temp_step'],
        convertSet: async (entity, key, value, meta) => {
            value = Number(value);
            if (isNaN(value)) {
                throw new Error(`${key} value of message: '${JSON.stringify(meta.message)}' invalid`);
            }

            const mode = value > 0 ? 1 : 3;
            const transition = getTransition(entity, key, meta).time;
            const payload = {stepmode: mode, stepsize: Math.abs(value), transtime: transition, minimum: 0, maximum: 600};
            await entity.command('lightingColorCtrl', 'stepColorTemp', payload, getOptions(meta.mapped, entity));

            // We cannot determine the color temperature from the current state so we read it, because
            // - We don't know the max/min valus
            // - Color mode could have been swithed (x/y or hue/saturation)
            const entityToRead = getEntityOrFirstGroupMember(entity);
            if (entityToRead) {
                await wait(100 + (transition * 100));
                await entityToRead.read('lightingColorCtrl', ['colorTemperature']);
            }
        },
    },
    light_colortemp_move: {
        key: ['colortemp_move', 'color_temp_move'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'color_temp_move' && (value === 'stop' || !isNaN(value))) {
                value = value === 'stop' ? value : Number(value);
                const payload = {minimum: 0, maximum: 600};
                if (value === 'stop' || value === 0) {
                    payload.rate = 1;
                    payload.movemode = 0;
                } else {
                    payload.rate = Math.abs(value);
                    payload.movemode = value > 0 ? 1 : 3;
                }

                await entity.command('lightingColorCtrl', 'moveColorTemp', payload, getOptions(meta.mapped, entity));

                // As we cannot determine the new brightness state, we read it from the device
                if (value === 'stop' || value === 0) {
                    const entityToRead = getEntityOrFirstGroupMember(entity);
                    if (entityToRead) {
                        await wait(100);
                        await entityToRead.read('lightingColorCtrl', ['colorTemperature']);
                    }
                }
            } else {
                // Deprecated
                const payload = {minimum: 153, maximum: 370, rate: 55};
                const stop = (val) => ['stop', 'release', '0'].some((el) => val.includes(el));
                const up = (val) => ['1', 'up'].some((el) => val.includes(el));
                const arr = [value.toString()];
                const moverate = meta.message.hasOwnProperty('rate') ? parseInt(meta.message.rate) : 55;
                payload.rate = moverate;
                if (arr.filter(stop).length) {
                    payload.movemode = 0;
                } else {
                    payload.movemode=arr.filter(up).length ? 1 : 3;
                }
                await entity.command('lightingColorCtrl', 'moveColorTemp', payload, getOptions(meta.mapped, entity));
            }
        },
    },
    light_hue_saturation_step: {
        key: ['hue_step', 'saturation_step'],
        convertSet: async (entity, key, value, meta) => {
            value = Number(value);
            if (isNaN(value)) {
                throw new Error(`${key} value of message: '${JSON.stringify(meta.message)}' invalid`);
            }

            const command = key === 'hue_step' ? 'stepHue' : 'stepSaturation';
            const attribute = key === 'hue_step' ? 'currentHue' : 'currentSaturation';
            const mode = value > 0 ? 1 : 3;
            const transition = getTransition(entity, key, meta).time;
            const payload = {stepmode: mode, stepsize: Math.abs(value), transtime: transition};
            await entity.command('lightingColorCtrl', command, payload, getOptions(meta.mapped, entity));

            // We cannot determine the hue/saturation from the current state so we read it, because
            // - Color mode could have been swithed (x/y or colortemp)
            const entityToRead = getEntityOrFirstGroupMember(entity);
            if (entityToRead) {
                await wait(100 + (transition * 100));
                await entityToRead.read('lightingColorCtrl', [attribute]);
            }
        },
    },
    light_hue_saturation_move: {
        key: ['hue_move', 'saturation_move'],
        convertSet: async (entity, key, value, meta) => {
            value = value === 'stop' ? value : Number(value);
            if (isNaN(value) && value !== 'stop') {
                throw new Error(`${key} value of message: '${JSON.stringify(meta.message)}' invalid`);
            }

            const command = key === 'hue_move' ? 'moveHue' : 'moveSaturation';
            const attribute = key === 'hue_move' ? 'currentHue' : 'currentSaturation';

            const payload = {};
            if (value === 'stop' || value === 0) {
                payload.rate = 1;
                payload.movemode = 0;
            } else {
                payload.rate = Math.abs(value);
                payload.movemode = value > 0 ? 1 : 3;
            }

            await entity.command('lightingColorCtrl', command, payload, getOptions(meta.mapped, entity));

            // As we cannot determine the new brightness state, we read it from the device
            if (value === 'stop' || value === 0) {
                const entityToRead = getEntityOrFirstGroupMember(entity);
                if (entityToRead) {
                    await wait(100);
                    await entityToRead.read('lightingColorCtrl', [attribute]);
                }
            }
        },
    },
    light_onoff_brightness: {
        key: ['state', 'brightness', 'brightness_percent'],
        convertSet: async (entity, key, value, meta) => {
            const {message} = meta;
            const transition = getTransition(entity, 'brightness', meta);
            const turnsOffAtBrightness1 = utils.getMetaValue(entity, meta.mapped, 'turnsOffAtBrightness1');
            const state = message.hasOwnProperty('state') ? message.state.toLowerCase() : undefined;
            let brightness = undefined;
            if (message.hasOwnProperty('brightness')) brightness = Number(message.brightness);
            else if (message.hasOwnProperty('brightness_percent')) brightness = Math.round(Number(message.brightness_percent) * 2.55);

            if (brightness !== undefined && (isNaN(brightness) || brightness < 0 || brightness > 255)) {
                // Allow 255 value, changing this to 254 would be a breaking change.
                throw new Error(`Brightness value of message: '${JSON.stringify(message)}' invalid, must be a number >= 0 and =< 254`);
            }

            if (state !== undefined && ['on', 'off', 'toggle'].includes(state) === false) {
                throw new Error(`State value of message: '${JSON.stringify(message)}' invalid, must be 'ON', 'OFF' or 'TOGGLE'`);
            }

            if (state === 'toggle' || state === 'off' || (brightness === undefined && state === 'on')) {
                if (transition.specified && (state === 'off' || state === 'on')) {
                    if (state === 'off' && meta.state.brightness) {
                        // https://github.com/Koenkk/zigbee2mqtt/issues/2850#issuecomment-580365633
                        // We need to remember the state before turning the device off as we need to restore
                        // it once we turn it on again.
                        // We cannot rely on the meta.state as when reporting is enabled the bulb will reports
                        // it brightness while decreasing the brightness.
                        globalStore.putValue(entity, 'brightness', meta.state.brightness);
                        globalStore.putValue(entity, 'turnedOffWithTransition', true);
                    }

                    let level = state === 'off' ? 0 : globalStore.getValue(entity, 'brightness', 254);
                    if (state === 'on' && level === 0) level = turnsOffAtBrightness1 ? 2 : 1;

                    const payload = {level, transtime: transition.time};
                    await entity.command('genLevelCtrl', 'moveToLevelWithOnOff', payload, getOptions(meta.mapped, entity));
                    const result = {state: {state: state.toUpperCase()}};
                    if (state === 'on') result.state.brightness = level;
                    return result;
                } else {
                    if (state === 'on' && globalStore.getValue(entity, 'turnedOffWithTransition') === true) {
                        /**
                         * In case the bulb it turned OFF with a transition and turned ON WITHOUT
                         * a transition, the brightness is not recovered as it turns on with brightness 1.
                         * https://github.com/Koenkk/zigbee-herdsman-converters/issues/1073
                         */
                        globalStore.putValue(entity, 'turnedOffWithTransition', false);
                        await entity.command(
                            'genLevelCtrl',
                            'moveToLevelWithOnOff',
                            {level: globalStore.getValue(entity, 'brightness'), transtime: 0},
                            getOptions(meta.mapped, entity),
                        );
                        return {state: {state: 'ON'}, readAfterWriteTime: transition * 100};
                    } else {
                        // Store brightness where the bulb was turned off with as we need it when the bulb is turned on
                        // with transition.
                        if (meta.state.hasOwnProperty('brightness') && state === 'off') {
                            globalStore.putValue(entity, 'brightness', meta.state.brightness);
                            globalStore.putValue(entity, 'turnedOffWithTransition', false);
                        }

                        const result = await converters.on_off.convertSet(entity, 'state', state, meta);
                        result.readAfterWriteTime = 0;
                        if (result.state && result.state.state === 'ON' && meta.state.brightness === 0) {
                            result.state.brightness = 1;
                        }

                        return result;
                    }
                }
            } else {
                brightness = Math.min(254, brightness);
                if (brightness === 1 && turnsOffAtBrightness1) {
                    brightness = 2;
                }

                globalStore.putValue(entity, 'brightness', brightness);
                await entity.command(
                    'genLevelCtrl',
                    'moveToLevelWithOnOff',
                    {level: Number(brightness), transtime: transition.time},
                    getOptions(meta.mapped, entity),
                );

                // If this command is send to a group, and this group contains a device not supporting genLevelCtrl, e.g. a switch
                // that device won't change state with the moveToLevelWithOnOff command.
                // Therefore send the genOnOff command also.
                // https://github.com/Koenkk/zigbee2mqtt/issues/4558
                if (entity.constructor.name === 'Group' && state !== undefined && transition.time === 0) {
                    if (entity.members.filter((e) => !e.supportsInputCluster('genLevelCtrl')).length !== 0) {
                        await converters.on_off.convertSet(entity, 'state', 'ON', meta);
                    }
                }

                return {
                    state: {state: brightness === 0 ? 'OFF' : 'ON', brightness: Number(brightness)},
                    readAfterWriteTime: transition.time * 100,
                };
            }
        },
        convertGet: async (entity, key, meta) => {
            if (key === 'brightness') {
                await entity.read('genLevelCtrl', ['currentLevel']);
            } else if (key === 'state') {
                await converters.on_off.convertGet(entity, key, meta);
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

            value = Number(value);

            // ensure value within range
            value = light.clampColorTemp(value, colorTempMin, colorTempMax, meta.logger);

            const payload = {colortemp: value, transtime: utils.getTransition(entity, key, meta).time};
            await entity.command('lightingColorCtrl', 'moveToColorTemp', payload, utils.getOptions(meta.mapped, entity));
            //RS://return {state: {color_temp: value, color_mode: constants.colorMode[2]}, readAfterWriteTime: payload.transtime * 100};
            return {state: {color_temp: value, color_mode: constants.colorMode[2], mode: 'ct'}, readAfterWriteTime: payload.transtime * 100};
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
            const payload = {colortemp: value, transtime: getTransition(entity, key, meta).time};
            await entity.command('lightingColorCtrl', 'moveToColorTemp', payload, getOptions(meta.mapped, entity));
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
            const newState = {};

            // Set correct meta.mapped for groups
            // * all device models are the same -> copy meta.mapped[0]
            // * mixed device models -> meta.mapped = null (old behavior)
            if (entity.constructor.name === 'Group' && entity.members.length > 0) {
                for (const memberMeta of Object.values(meta.mapped)) {
                    // check all members are the same device
                    if (meta.mapped[0] != memberMeta) {
                        meta.mapped = [null];
                        break;
                    }
                }
                meta.mapped = meta.mapped[0];
            }
            
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
                //RS://value = {x: xy.x, y: xy.y};
                value = {hex: value.hex, x: xy.x, y: xy.y};
            } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s') && value.hasOwnProperty('l')) {
                newState.color = {h: value.h, s: value.s, l: value.l};
                const hsv = utils.gammaCorrectHSV(...Object.values(
                    utils.hslToHSV(correctHue(value.h, meta), value.s, value.l)));
                value.saturation = hsv.s * (2.54);
                value.brightness = hsv.v * (2.54);
                newState.brightness = value.brightness;

                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.enhancedHue === false) {
                    value.hue = Math.round(hsv.h / 360 * 254);
                    cmd = 'moveToHueAndSaturationAndBrightness';
                } else {
                    value.hue = hsv.h % 360 * (65535 / 360);
                    cmd = 'enhancedMoveToHueAndSaturationAndBrightness';
                }
            } else if (value.hasOwnProperty('hsl')) {
                newState.color = {hsl: value.hsl};
                const hsl = value.hsl.split(',').map((i) => parseInt(i));
                const hsv = utils.gammaCorrectHSV(...Object.values(
                    utils.hslToHSV(correctHue(hsl[0], meta), hsl[1], hsl[2])));
                value.saturation = hsv.s * (2.54);
                value.brightness = hsv.v * (2.54);
                newState.brightness = value.brightness;
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.enhancedHue === false) {
                    value.hue = Math.round(hsv.h / 360 * 254);
                    cmd = 'moveToHueAndSaturationAndBrightness';
                } else {
                    value.hue = hsv.h % 360 * (65535 / 360);
                    cmd = 'enhancedMoveToHueAndSaturationAndBrightness';
                }
            } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s') && value.hasOwnProperty('b')) {
                newState.color = {h: value.h, s: value.s, v: value.b};
                const hsv = utils.gammaCorrectHSV(correctHue(value.h, meta), value.s, value.b);
                value.saturation = hsv.s * (2.54);
                value.brightness = hsv.v * (2.54);
                newState.brightness = value.brightness;
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.enhancedHue === false) {
                    value.hue = Math.round(hsv.h / 360 * 254);
                    cmd = 'moveToHueAndSaturationAndBrightness';
                } else {
                    value.hue = hsv.h % 360 * (65535 / 360);
                    cmd = 'enhancedMoveToHueAndSaturationAndBrightness';
                }
            } else if (value.hasOwnProperty('hsb')) {
                let hsv = value.hsb.split(',').map((i) => parseInt(i));
                newState.color = {h: hsv[0], s: hsv[1], v: hsv[2]};
                hsv = utils.gammaCorrectHSV(correctHue(hsv[0], meta), hsv[1], hsv[2]);
                value.saturation = hsv.s * (2.54);
                value.brightness = hsv.v * (2.54);
                newState.brightness = value.brightness;
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.enhancedHue === false) {
                    value.hue = Math.round(hsv.h / 360 * 254);
                    cmd = 'moveToHueAndSaturationAndBrightness';
                } else {
                    value.hue = hsv.h % 360 * (65535 / 360);
                    cmd = 'enhancedMoveToHueAndSaturationAndBrightness';
                }
            } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s') && value.hasOwnProperty('v')) {
                newState.color = {h: value.h, s: value.s, v: value.v};
                const hsv = utils.gammaCorrectHSV(correctHue(value.h, meta), value.s, value.v);
                value.saturation = hsv.s * (2.54);
                value.brightness = hsv.v * (2.54);
                newState.brightness = value.brightness;
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.enhancedHue === false) {
                    value.hue = Math.round(hsv.h / 360 * 254);
                    cmd = 'moveToHueAndSaturationAndBrightness';
                } else {
                    value.hue = hsv.h % 360 * (65535 / 360);
                    cmd = 'enhancedMoveToHueAndSaturationAndBrightness';
                }
            } else if (value.hasOwnProperty('hsv')) {
                let hsv = value.hsv.split(',').map((i) => parseInt(i));
                newState.color = {h: hsv[0], s: hsv[1], v: hsv[2]};
                hsv = utils.gammaCorrectHSV(correctHue(hsv[0], meta), hsv[1], hsv[2]);
                value.saturation = hsv.s * (2.54);
                value.brightness = hsv.v * (2.54);
                newState.brightness = value.brightness;
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.enhancedHue === false) {
                    value.hue = Math.round(hsv.h / 360 * 254);
                    cmd = 'moveToHueAndSaturationAndBrightness';
                } else {
                    value.hue = hsv.h % 360 * (65535 / 360);
                    cmd = 'enhancedMoveToHueAndSaturationAndBrightness';
                }
            } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s')) {
                newState.color = {h: value.h, s: value.s};
                const hsv = utils.gammaCorrectHSV(correctHue(value.h, meta), value.s, 100);
                value.saturation = hsv.s * (2.54);
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.enhancedHue === false) {
                    value.hue = Math.round(hsv.h / 360 * 254);
                    cmd = 'moveToHueAndSaturation';
                } else {
                    value.hue = hsv.h % 360 * (65535 / 360);
                    cmd = 'enhancedMoveToHueAndSaturation';
                }
            } else if (value.hasOwnProperty('h')) {
                newState.color = {h: value.h};
                const hsv = utils.gammaCorrectHSV(correctHue(value.h, meta), 100, 100);
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.enhancedHue === false) {
                    value.hue = Math.round(hsv.h / 360 * 254);
                    cmd = 'moveToHue';
                } else {
                    value.hue = hsv.h % 360 * (65535 / 360);
                    cmd = 'enhancedMoveToHue';
                }
            } else if (value.hasOwnProperty('s')) {
                newState.color = {s: value.s};
                const hsv = utils.gammaCorrectHSV(360, value.s, 100);
                value.saturation = hsv.s * (2.54);
                cmd = 'moveToSaturation';
            } else if (value.hasOwnProperty('hue') && value.hasOwnProperty('saturation')) {
                newState.color = {hue: value.hue, saturation: value.saturation};
                const hsv = utils.gammaCorrectHSV(correctHue(value.hue, meta), value.saturation, 100);
                value.saturation = hsv.s * (2.54);
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.enhancedHue === false) {
                    value.hue = Math.round(hsv.h / 360 * 254);
                    cmd = 'moveToHueAndSaturation';
                } else {
                    value.hue = hsv.h % 360 * (65535 / 360);
                    cmd = 'enhancedMoveToHueAndSaturation';
                }
            } else if (value.hasOwnProperty('hue')) {
                newState.color = {hue: value.hue};
                const hsv = utils.gammaCorrectHSV(correctHue(value.hue, meta), 100, 100);
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.enhancedHue === false) {
                    value.hue = Math.round(hsv.h / 360 * 254);
                    cmd = 'moveToHue';
                } else {
                    value.hue = hsv.h % 360 * (65535 / 360);
                    cmd = 'enhancedMoveToHue';
                }
            } else if (value.hasOwnProperty('saturation')) {
                newState.color = {saturation: value.saturation};
                const hsv = utils.gammaCorrectHSV(360, value.saturation, 100);
                value.saturation = hsv.s * (2.54);
                cmd = 'moveToSaturation';
            }
            value.mode = 'xy';

            const zclData = {transtime: getTransition(entity, key, meta).time};

            switch (cmd) {
            case 'enhancedMoveToHueAndSaturationAndBrightness':
                newState.color_mode = constants.colorMode[0];
                //RS://
                newState.mode = 'xy';
                await entity.command(
                    'genLevelCtrl',
                    'moveToLevelWithOnOff',
                    {level: Number(value.brightness), transtime: getTransition(entity, key, meta).time},
                    getOptions(meta.mapped, entity),
                );
                zclData.enhancehue = value.hue;
                zclData.saturation = value.saturation;
                zclData.direction = value.direction || 0;
                cmd = 'enhancedMoveToHueAndSaturation';
                break;
            case 'enhancedMoveToHueAndSaturation':
                newState.color_mode = constants.colorMode[0];
                //RS://
                newState.mode = 'xy';
                zclData.enhancehue = value.hue;
                zclData.saturation = value.saturation;
                zclData.direction = value.direction || 0;
                break;
            case 'enhancedMoveToHue':
                newState.color_mode = constants.colorMode[0];
                newState.mode = 'xy';
                zclData.enhancehue = value.hue;
                zclData.direction = value.direction || 0;
                break;
            case 'moveToHueAndSaturationAndBrightness':
                newState.color_mode = constants.colorMode[0];
                //RS://
                newState.mode = 'xy';
                await entity.command(
                    'genLevelCtrl',
                    'moveToLevelWithOnOff',
                    {level: Number(value.brightness), transtime: getTransition(entity, key, meta).time},
                    getOptions(meta.mapped, entity),
                );
                zclData.hue = value.hue;
                zclData.saturation = value.saturation;
                zclData.direction = value.direction || 0;
                cmd = 'moveToHueAndSaturation';
                break;
            case 'moveToHueAndSaturation':
                newState.color_mode = constants.colorMode[0];
                //RS://
                newState.mode = 'xy';
                zclData.hue = value.hue;
                zclData.saturation = value.saturation;
                zclData.direction = value.direction || 0;
                break;
            case 'moveToHue':
                newState.color_mode = constants.colorMode[0];
                //RS://
                newState.mode = 'xy';
                zclData.hue = value.hue;
                zclData.direction = value.direction || 0;
                break;
            case 'moveToSaturation':
                newState.color_mode = constants.colorMode[0];
                //RS://
                newState.mode = 'xy';
                zclData.saturation = value.saturation;
                break;

            default:
                cmd = 'moveToColor';

                // Some bulbs e.g. RB 185 C don't turn to red (they don't respond at all) when x: 0.701 and y: 0.299
                // is send. These values are e.g. send by Home Assistant when clicking red in the color wheel.
                // If we slighlty modify these values the bulb will respond.
                // https://github.com/home-assistant/home-assistant/issues/31094
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.applyRedFix &&
                    value.x == 0.701 && value.y === 0.299) {
                    value.x = 0.7006;
                    value.y = 0.2993;
                }

                //RS://newState.color = {x: value.x, y: value.y};
                newState.color = {hex: value.hex, x: value.x, y: value.y};
                newState.color_mode = constants.colorMode[1];
                //RS://
                newState.mode = 'xy';
                zclData.colorx = utils.mapNumberRange(value.x, 0, 1, 0, 65535);
                zclData.colory = utils.mapNumberRange(value.y, 0, 1, 0, 65535);
            }
            await entity.command('lightingColorCtrl', cmd, zclData, getOptions(meta.mapped, entity));
            return {state: newState, readAfterWriteTime: zclData.transtime * 100};
        },
        convertGet: async (entity, key, meta) => {
            // Some bulb like Ikea Tådfri LED1624G9 do not support 'currentHue' and 'currentSaturation' attributes.
            // Skip them if the `supportsHueAndSaturation` flag is set to false
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1340
            const attributes = [];
            if (meta.message && typeof meta.message.color === 'object') {
                if (meta.message.color.hasOwnProperty('x')) attributes.push('currentX');
                if (meta.message.color.hasOwnProperty('y')) attributes.push('currentY');
                if (meta.message.color.hasOwnProperty('hue')) attributes.push('currentHue');
                if (meta.message.color.hasOwnProperty('saturation')) attributes.push('currentSaturation');
            } else {
                attributes.push('currentX', 'currentY');
                if (meta.mapped && meta.mapped.meta && meta.mapped.meta.supportsHueAndSaturation !== false) {
                    attributes.push('currentHue', 'currentSaturation');
                }
            }

            await entity.read('lightingColorCtrl', attributes);
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
                //RS://
                //if (result.state && result.state.color.hasOwnProperty('x') && result.state.color.hasOwnProperty('y')) {
                //    result.state.color_temp = utils.xyToMireds(result.state.color.x, result.state.color.y);
                //}
                result.state.mode = 'xy';
                return result;
            } else if (key == 'color_temp' || key == 'color_temp_percent') {
                const result = await converters.light_colortemp.convertSet(entity, key, value, meta);
                result.state.color = utils.miredsToXY(result.state.color_temp);
                //RS://
                result.state.mode = 'ct';
                return result;
            }
        },
        convertGet: async (entity, key, meta) => {
            if (key == 'color') {
                await converters.light_color.convertGet(entity, key, meta);
            } else if (key == 'color_temp') {
                await converters.light_colortemp.convertGet(entity, key, meta);
            }
        },
    },
    effect: {
        key: ['effect', 'alert', 'flash'], // alert and flash are deprecated.
        convertSet: async (entity, key, value, meta) => {
            if (key === 'effect') {
                const lookup = {
                    blink: 0,
                    breathe: 1,
                    okay: 2,
                    channel_change: 11,
                    finish_effect: 254,
                    stop_effect: 255,
                };

                if (!lookup.hasOwnProperty(value)) {
                    throw new Error(`Effect '${value}' not supported`);
                }

                const payload = {effectid: lookup[value], effectvariant: 0};
                await entity.command('genIdentify', 'triggerEffect', payload, getOptions(meta.mapped, entity));
            } else if (key === 'alert' || key === 'flash') { // Deprecated
                let effectid = 0;
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

                effectid = lookup[value];
                const payload = {effectid, effectvariant: 0};
                await entity.command('genIdentify', 'triggerEffect', payload, getOptions(meta.mapped, entity));
            }
        },
    },
    thermostat_local_temperature: {
        key: ['local_temperature'],
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['localTemp']);
        },
    },
    thermostat_local_temperature_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('hvacThermostat', {localTemperatureCalibration: Math.round(value * 10)});
            return {state: {local_temperature_calibration: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['localTemperatureCalibration']);
        },
    },
    thermostat_occupancy: {
        key: ['occupancy'],
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['ocupancy']);
        },
    },
    thermostat_pi_heating_demand: {
        key: ['pi_heating_demand'],
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['pIHeatingDemand']);
        },
    },
    thermostat_running_state: {
        key: ['running_state'],
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['runningState']);
        },
    },
    thermostat_occupied_heating_setpoint: {
        key: ['occupied_heating_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const occupiedHeatingSetpoint = (Math.round((value * 2).toFixed(1)) / 2).toFixed(1) * 100;
            await entity.write('hvacThermostat', {occupiedHeatingSetpoint});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['occupiedHeatingSetpoint']);
        },
    },
    thermostat_unoccupied_heating_setpoint: {
        key: ['unoccupied_heating_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const unoccupiedHeatingSetpoint = (Math.round((value * 2).toFixed(1)) / 2).toFixed(1) * 100;
            await entity.write('hvacThermostat', {unoccupiedHeatingSetpoint});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['unoccupiedHeatingSetpoint']);
        },
    },
    thermostat_occupied_cooling_setpoint: {
        key: ['occupied_cooling_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const occupiedCoolingSetpoint = (Math.round((value * 2).toFixed(1)) / 2).toFixed(1) * 100;
            await entity.write('hvacThermostat', {occupiedCoolingSetpoint});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['occupiedCoolingSetpoint']);
        },
    },
    thermostat_unoccupied_cooling_setpoint: {
        key: ['unoccupied_cooling_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const unoccupiedCoolingSetpoint = (Math.round((value * 2).toFixed(1)) / 2).toFixed(1) * 100;
            await entity.write('hvacThermostat', {unoccupiedCoolingSetpoint});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['unoccupiedCoolingSetpoint']);
        },
    },
    thermostat_remote_sensing: {
        key: ['remote_sensing'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('hvacThermostat', {remoteSensing: value});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['remoteSensing']);
        },
    },
    thermostat_control_sequence_of_operation: {
        key: ['control_sequence_of_operation'],
        convertSet: async (entity, key, value, meta) => {
            const ctrlSeqeOfOper = utils.getKeyByValue(common.thermostatControlSequenceOfOperations, value, value);
            await entity.write('hvacThermostat', {ctrlSeqeOfOper});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['ctrlSeqeOfOper']);
        },
    },
    thermostat_system_mode: {
        key: ['system_mode'],
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
        key: ['setpoint_raise_lower'],
        convertSet: async (entity, key, value, meta) => {
            const payload = {mode: value.mode, amount: Math.round(value.amount) * 100};
            await entity.command('hvacThermostat', 'setpointRaiseLower', payload, getOptions(meta.mapped, entity));
        },
    },
    thermostat_weekly_schedule: {
        key: ['weekly_schedule'],
        convertSet: async (entity, key, value, meta) => {
            const payload = {
                numoftrans: value.numoftrans,
                dayofweek: value.dayofweek,
                mode: value.mode,
                transitions: value.transitions,
            };
            for (const elem of payload['transitions']) {
                if (typeof elem['heatSetpoint'] == 'number') {
                    elem['heatSetpoint'] = Math.round(elem['heatSetpoint'] * 100);
                }
                if (typeof elem['coolSetpoint'] == 'number') {
                    elem['coolSetpoint'] = Math.round(elem['coolSetpoint'] * 100);
                }
            }
            await entity.command('hvacThermostat', 'setWeeklySchedule', payload, getOptions(meta.mapped, entity));
        },
        convertGet: async (entity, key, meta) => {
            const payload = {
                daystoreturn: 0xff, // Sun-Sat and vacation
                modetoreturn: 3, // heat + cool
            };
            await entity.command('hvacThermostat', 'getWeeklySchedule', payload, getOptions(meta.mapped, entity));
        },
    },
    thermostat_clear_weekly_schedule: {
        key: ['clear_weekly_schedule'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('hvacThermostat', 'clearWeeklySchedule', {}, getOptions(meta.mapped, entity));
        },
    },
    thermostat_relay_status_log: {
        key: ['relay_status_log'],
        convertGet: async (entity, key, meta) => {
            await entity.command('hvacThermostat', 'getRelayStatusLog', {}, getOptions(meta.mapped, entity));
        },
    },
    thermostat_running_mode: {
        key: ['running_mode'],
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['runningMode']);
        },
    },
    thermostat_temperature_display_mode: {
        key: ['temperature_display_mode'],
        convertSet: async (entity, key, value, meta) => {
            const tempDisplayMode = utils.getKeyByValue(common.temperatureDisplayMode, value, value);
            await entity.write('hvacUserInterfaceCfg', {tempDisplayMode});
        },
    },
    thermostat_keypad_lockout: {
        key: ['keypad_lockout'],
        convertSet: async (entity, key, value, meta) => {
            const keypadLockout = utils.getKeyByValue(common.keypadLockoutMode, value, value);
            await entity.write('hvacUserInterfaceCfg', {keypadLockout});
        },
    },
    thermostat_temperature_setpoint_hold: {
        key: ['temperature_setpoint_hold'],
        convertSet: async (entity, key, value, meta) => {
            const tempSetpointHold = value;
            await entity.write('hvacThermostat', {tempSetpointHold});
            return {readAfterWriteTime: 250, state: {system_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['tempSetpointHold']);
        },
    },
    thermostat_temperature_setpoint_hold_duration: {
        key: ['temperature_setpoint_hold_duration'],
        convertSet: async (entity, key, value, meta) => {
            const tempSetpointHoldDuration = value;
            await entity.write('hvacThermostat', {tempSetpointHoldDuration});
            return {readAfterWriteTime: 250, state: {system_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['tempSetpointHoldDuration']);
        },
    },
    fan_mode: {
        key: ['fan_mode', 'fan_state'],
        convertSet: async (entity, key, value, meta) => {
            const fanMode = common.fanMode[value.toLowerCase()];
            await entity.write('hvacFanCtrl', {fanMode});
            return {state: {fan_mode: value.toLowerCase(), fan_state: value.toLowerCase() === 'off' ? 'OFF' : 'ON'}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacFanCtrl', ['fanMode']);
        },
    },
    arm_mode: {
        key: ['arm_mode'],
        convertSet: async (entity, key, value, meta) => {
            const mode = utils.getKeyByValue(common.armMode, value.mode, undefined);
            if (mode === undefined) {
                throw new Error(
                    `Unsupported mode: '${value.mode}', should be one of: ${Object.values(common.armMode)}`,
                );
            }

            if (value.hasOwnProperty('transaction')) {
                entity.commandResponse('ssIasAce', 'armRsp', {armnotification: mode}, {}, value.transaction);
            }

            const panelStatus = mode !== 0 && mode !== 4 ? 0x80: 0x00;
            globalStore.putValue(entity, 'panelStatus', panelStatus);
            const payload = {panelstatus: panelStatus, secondsremain: 0, audiblenotif: 0, alarmstatus: 0};
            entity.commandResponse('ssIasAce', 'panelStatusChanged', payload);
        },
    },
    ballast_config: {
        key: ['ballast_config'],
        // zcl attribute names are camel case, but we want to use snake case in the outside communication
        convertSet: async (entity, key, value, meta) => {
            value = utils.toCamelCase(value);
            for (const [attrName, attrValue] of Object.entries(value)) {
                const attributes = {};
                attributes[attrName] = attrValue;
                await entity.write('lightingBallastCfg', attributes);
            }
            converters.ballast_config.convertGet(entity, key, meta);
        },
        convertGet: async (entity, key, meta) => {
            let result = {};
            for (const attrName of [
                'physical_min_level',
                'physical_max_level',
                'ballast_status',
                'min_level',
                'max_level',
                'power_on_level',
                'power_on_fade_time',
                'intrinsic_ballast_factor',
                'ballast_factor_adjustment',
                'lamp_quantity',
                'lamp_type',
                'lamp_manufacturer',
                'lamp_rated_hours',
                'lamp_burn_hours',
                'lamp_alarm_mode',
                'lamp_burn_hours_trip_point',
            ]) {
                try {
                    result = {...result, ...(await entity.read('lightingBallastCfg', [utils.toCamelCase(attrName)]))};
                } catch (ex) {
                    // continue regardless of error
                }
            }
            meta.logger.warn(`ballast_config attribute results received: ${JSON.stringify(utils.toSnakeCase(result))}`);
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
                const opts = {...options.xiaomi, timeout: 35000};
                await entity.write('genBasic', {0xFF0D: {value: lookup[value], type: 0x20}}, opts);
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
    xiaomi_switch_power_outage_memory: {
        key: ['power_outage_memory'],
        convertSet: async (entity, key, value, meta) => {
            if (['ZNCZ04LM', 'QBKG25LM'].includes(meta.mapped.model)) {
                await entity.write('aqaraOpple', {0x0201: {value: value ? 1 : 0, type: 0x10}}, options.xiaomi);
            } else if (['ZNCZ02LM', 'QBCZ11LM'].includes(meta.mapped.model)) {
                const payload = value ?
                    [[0xaa, 0x80, 0x05, 0xd1, 0x47, 0x07, 0x01, 0x10, 0x01], [0xaa, 0x80, 0x03, 0xd3, 0x07, 0x08, 0x01]] :
                    [[0xaa, 0x80, 0x05, 0xd1, 0x47, 0x09, 0x01, 0x10, 0x00], [0xaa, 0x80, 0x03, 0xd3, 0x07, 0x0a, 0x01]];

                await entity.write('genBasic', {0xFFF0: {value: payload[0], type: 0x41}}, options.xiaomi);
                await entity.write('genBasic', {0xFFF0: {value: payload[1], type: 0x41}}, options.xiaomi);
            } else {
                throw new Error('Not supported');
            }

            return {state: {power_outage_memory: value}};
        },
    },
    xiaomi_power: {
        key: ['power'],
        convertGet: async (entity, key, meta) => {
            const endpoint = meta.device.endpoints.find((e) => e.supportsInputCluster('genAnalogInput'));
            await endpoint.read('genAnalogInput', ['presentValue']);
        },
    },
    xiaomi_switch_operation_mode: {
        key: ['operation_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (['QBKG11LM', 'QBKG04LM', 'QBKG03LM', 'QBKG12LM', 'QBKG21LM', 'QBKG22LM', 'QBKG24LM'].includes(meta.mapped.model)) {
                const lookupAttrId = {single: 0xFF22, left: 0xFF22, right: 0xFF23};
                const lookupState = {control_relay: 0x12, control_left_relay: 0x12, control_right_relay: 0x22, decoupled: 0xFE};
                const button = value.hasOwnProperty('button') ? value.button : 'single';
                const payload = {};
                payload[lookupAttrId[button]] = {value: lookupState[value.state], type: 0x20};
                await entity.write('genBasic', payload, options.xiaomi);
                return {state: {[`operation_mode${button !== 'single' ? `_${button}` : ''}`]: value.state}};
            } else if (meta.mapped.model === 'QBKG25LM') {
                const lookupState = {control_relay: 0x01, decoupled: 0x00};
                await entity.write('aqaraOpple', {0x0200: {value: lookupState[value.state], type: 0x20}}, options.xiaomi);
                return {state: {operation_mode: value.state}};
            } else {
                throw new Error('Not supported');
            }
        },
        convertGet: async (entity, key, meta) => {
            if (['QBKG11LM', 'QBKG04LM', 'QBKG03LM', 'QBKG12LM', 'QBKG21LM', 'QBKG22LM', 'QBKG24LM'].includes(meta.mapped.model)) {
                const lookupAttrId = {single: 0xFF22, left: 0xFF22, right: 0xFF23};
                const button = meta.message[key].hasOwnProperty('button') ? meta.message[key].button : 'single';
                await entity.read('genBasic', [lookupAttrId[button]], options.xiaomi);
            } else if (meta.mapped.model === 'QBKG25LM') {
                await entity.read('aqaraOpple', 0x0200, options.xiaomi);
            } else {
                throw new Error('Not supported');
            }
        },
    },
    xiaomi_switch_do_not_disturb: {
        key: ['do_not_disturb'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('aqaraOpple', {0x0203: {value: value ? 1 : 0, type: 0x10}}, options.xiaomi);
            return {state: {do_not_disturb: value}};
        },
    },
    STS_PRS_251_beep: {
        key: ['beep'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('genIdentify', 'identifyTime', {identifytime: value}, getOptions(meta.mapped, entity));
        },
    },
    xiaomi_curtain_options: {
        key: ['options'],
        convertSet: async (entity, key, value, meta) => {
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
                await entity.write('genBasic', {0xff28: {value: opts.reverse_direction, type: 0x10}}, options.xiaomi);
                await entity.write('genBasic', {0xff29: {value: !opts.hand_open, type: 0x10}}, options.xiaomi);

                if (opts.reset_limits) {
                    await entity.write('genBasic', {0xff27: {value: 0x00, type: 0x10}}, options.xiaomi);
                }
            } else if (meta.mapped.model === 'ZNCLDJ11LM') {
                const payload = [
                    0x07, 0x00, opts.reset_limits ? 0x01: 0x02, 0x00, opts.reverse_direction ? 0x01: 0x00, 0x04,
                    !opts.hand_open ? 0x01: 0x00, 0x12,
                ];

                await entity.write('genBasic', {0x0401: {value: payload, type: 0x42}}, options.xiaomi);

                // hand_open requires a separate request with slightly different payload
                payload[2] = 0x08;
                await entity.write('genBasic', {0x0401: {value: payload, type: 0x42}}, options.xiaomi);
            } else {
                throw new Error(`xiaomi_curtain_options set called for not supported model: ${meta.mapped.model}`);
            }

            // Reset limits is an action, not a state.
            delete opts.reset_limits;
            return {state: {options: opts}};
        },
        convertGet: async (entity, key, meta) => {
            if (meta.mapped.model === 'ZNCLDJ11LM') {
                await entity.read('genBasic', [0x0401], options.xiaomi);
            } else {
                throw new Error(`xiaomi_curtain_options get called for not supported model: ${meta.mapped.model}`);
            }
        },
    },
    xiaomi_curtain_position_state: {
        key: ['state', 'position'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'state' && typeof value === 'string' && value.toLowerCase() === 'stop') {
                await entity.command('closuresWindowCovering', 'stop', {}, getOptions(meta.mapped, entity));

                // Xiaomi curtain does not send position update on stop, request this.
                await entity.read('genAnalogOutput', [0x0055]);
            } else {
                const lookup = {
                    'open': 100,
                    'close': 0,
                    'on': 100,
                    'off': 0,
                };

                value = typeof value === 'string' ? value.toLowerCase() : value;
                value = lookup.hasOwnProperty(value) ? lookup[value] : value;

                if (key === 'position') {
                    value = meta.options.invert_cover ? 100 - value : value;
                }

                const payload = {0x0055: {value, type: 0x39}};
                await entity.write('genAnalogOutput', payload);
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genAnalogOutput', [0x0055]);
        },
    },
    ledvance_commands: {
        /* deprectated osram_*/
        key: ['set_transition', 'remember_state', 'osram_set_transition', 'osram_remember_state'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'osram_set_transition' || key === 'set_transition') {
                if (value) {
                    const transition = (value > 1) ? (Math.round((value * 2).toFixed(1)) / 2).toFixed(1) * 10 : 1;
                    const payload = {0x0012: {value: transition, type: 0x21}, 0x0013: {value: transition, type: 0x21}};
                    await entity.write('genLevelCtrl', payload);
                }
            } else if (key == 'osram_remember_state' || key == 'remember_state') {
                if (value === true) {
                    await entity.command('manuSpecificOsram', 'saveStartupParams', {}, options.osram);
                } else if (value === false) {
                    await entity.command('manuSpecificOsram', 'resetStartupParams', {}, options.osram);
                }
            }
        },
    },
    eurotronic_thermostat_system_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            const systemMode = utils.getKeyByValue(common.thermostatSystemModes, value, value);
            const hostFlags = {};
            switch (systemMode) {
            case 0: // off (window_open for eurotronic)
                hostFlags['boost'] = false;
                hostFlags['window_open'] = true;
                break;
            case 4: // heat (boost for eurotronic)
                hostFlags['boost'] = true;
                hostFlags['window_open'] = false;
                break;
            default:
                hostFlags['boost'] = false;
                hostFlags['window_open'] = false;
                break;
            }
            await converters.eurotronic_host_flags.convertSet(entity, 'eurotronic_host_flags', hostFlags, meta);
        },
        convertGet: async (entity, key, meta) => {
            await converters.eurotronic_host_flags.convertGet(entity, 'eurotronic_host_flags', meta);
        },
    },
    eurotronic_host_flags: {
        key: ['eurotronic_host_flags', 'eurotronic_system_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value === 'object') {
                // read current eurotronic_host_flags (we will update some of them)
                await entity.read('hvacThermostat', [0x4008], options.eurotronic);
                const currentHostFlags = meta.state.eurotronic_host_flags ? meta.state.eurotronic_host_flags : {};

                // get full hostFlag object
                const hostFlags = {...currentHostFlags, ...value};

                // calculate bit value
                let bitValue = 1; // bit 0 always 1
                if (hostFlags.mirror_display) {
                    bitValue |= 1 << 1;
                }
                if (hostFlags.boost) {
                    bitValue |= 1 << 2;
                }
                if (value.hasOwnProperty('window_open') && value.window_open != currentHostFlags.window_open) {
                    if (hostFlags.window_open) {
                        bitValue |= 1 << 5;
                    } else {
                        bitValue |= 1 << 4;
                    }
                }
                if (hostFlags.child_protection) {
                    bitValue |= 1 << 7;
                }

                meta.logger.debug(`eurotronic: host_flags object converted to ${bitValue}`);
                value = bitValue;
            }
            const payload = {0x4008: {value, type: 0x22}};
            await entity.write('hvacThermostat', payload, options.eurotronic);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4008], options.eurotronic);
        },
    },
    eurotronic_error_status: {
        key: ['eurotronic_error_status'],
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4002], options.eurotronic);
        },
    },
    eurotronic_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const payload = {
                0x4003: {
                    value: (Math.round((value * 2).toFixed(1)) / 2).toFixed(1) * 100,
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
        key: ['eurotronic_valve_position'],
        convertSet: async (entity, key, value, meta) => {
            const payload = {0x4001: {value, type: 0x20}};
            await entity.write('hvacThermostat', payload, options.eurotronic);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4001], options.eurotronic);
        },
    },
    eurotronic_trv_mode: {
        key: ['eurotronic_trv_mode'],
        convertSet: async (entity, key, value, meta) => {
            const payload = {0x4000: {value, type: 0x30}};
            await entity.write('hvacThermostat', payload, options.eurotronic);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4000], options.eurotronic);
        },
    },
    livolo_socket_switch_on_off: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== 'string') {
                return;
            }

            const state = value.toLowerCase();
            await entity.command('genOnOff', 'toggle', {}, {transactionSequenceNumber: 0});
            const payloadOn = {0x0001: {value: Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]), type: 1}};
            const payloadOff = {0x0001: {value: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), type: 1}};
            await entity.write('genPowerCfg', (state === 'on') ? payloadOn : payloadOff,
                {manufacturerCode: 0x1ad2, disableDefaultResponse: true, disableResponse: true,
                    reservedBits: 3, direction: 1, transactionSequenceNumber: 0xe9});
            return {state: {state: value.toUpperCase()}, readAfterWriteTime: 250};
        },
        convertGet: async (entity, key, meta) => {
            await entity.command('genOnOff', 'toggle', {}, {transactionSequenceNumber: 0});
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
            await entity.command('genOnOff', 'toggle', {}, {transactionSequenceNumber: 0});
        },
    },
    generic_lock: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command(
                'closuresDoorLock',
                `${value.toLowerCase()}Door`,
                {'pincodevalue': ''},
                getOptions(meta.mapped, entity),
            );

            return {readAfterWriteTime: 200};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('closuresDoorLock', ['lockState']);
        },
    },
    pincode_lock: {
        key: ['pin_code'],
        convertSet: async (entity, key, value, meta) => {
            const user = value.user;
            const pinCode = value.pin_code;
            if ( isNaN(user) ) {
                throw new Error('user must be numbers');
            }
            if (!utils.isInRange(0, meta.mapped.meta.pinCodeCount - 1, user)) {
                throw new Error('user must be in range for device');
            }
            if (pinCode === undefined || pinCode === null) {
                await entity.command(
                    'closuresDoorLock',
                    'clearPinCode',
                    {
                        'userid': user,
                    },
                    getOptions(meta.mapped),
                );
            } else {
                if (isNaN(pinCode)) {
                    throw new Error('pinCode must be a number or pinCode');
                }
                await entity.command(
                    'closuresDoorLock',
                    'setPinCode',
                    {
                        'userid': user,
                        'userstatus': 1,
                        'usertype': 0,
                        'pincodevalue': pinCode.toString(),
                    },
                    getOptions(meta.mapped),
                );
            }
            return {readAfterWriteTime: 200};
        },
        convertGet: async (entity, key, meta) => {
            const user = meta && meta.message && meta.message.pin_code ? meta.message.pin_code.user : undefined;
            if (user === undefined) {
                const max = meta.mapped.meta.pinCodeCount;
                // Get all
                const options = getOptions(meta);
                for (let i = 0; i < max; i++) {
                    await utils.getDoorLockPinCode(entity, i, options);
                }
            } else {
                if (isNaN(user)) {
                    throw new Error('user must be numbers');
                }
                if (!utils.isInRange(0, meta.mapped.meta.pinCodeCount - 1, user)) {
                    throw new Error('userId must be in range for device');
                }
                await utils.getDoorLockPinCode(entity, user, getOptions(meta));
            }
        },
    },
    gledopto_light_onoff_brightness: {
        key: ['state', 'brightness', 'brightness_percent'],
        convertSet: async (entity, key, value, meta) => {
            if (meta.message && meta.message.hasOwnProperty('transition')) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            if (meta.mapped.model === 'GL-S-007ZS') {
                // https://github.com/Koenkk/zigbee2mqtt/issues/2757
                // Device doesn't support ON with moveToLevelWithOnOff command
                if (meta.message.hasOwnProperty('state') && meta.message.state.toLowerCase() === 'on') {
                    await converters.on_off.convertSet(entity, key, 'ON', meta);
                    await wait(1000);
                }
            }

            return await converters.light_onoff_brightness.convertSet(entity, key, value, meta);
        },
        convertGet: async (entity, key, meta) => {
            return await converters.light_onoff_brightness.convertGet(entity, key, meta);
        },
    },
    gledopto_light_colortemp: {
        key: ['color_temp', 'color_temp_percent'],
        convertSet: async (entity, key, value, meta) => {
            if (meta.message && meta.message.hasOwnProperty('transition')) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            // Gledopto devices turn ON when they are OFF and color is set.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3509
            const state = {state: 'ON'};

            const result = await converters.light_colortemp.convertSet(entity, key, value, meta);
            result.state = {...result.state, ...state};
            return result;
        },
        convertGet: async (entity, key, meta) => {
            return await converters.light_colortemp.convertGet(entity, key, meta);
        },
    },
    gledopto_light_color: {
        key: ['color'],
        convertSet: async (entity, key, value, meta) => {
            if (meta.message && meta.message.hasOwnProperty('transition')) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            if (key === 'color' && !meta.message.transition) {
                // Always provide a transition when setting color, otherwise CCT to RGB
                // doesn't work properly (CCT leds stay on).
                meta.message.transition = 0.4;
            }

            // Gledopto devices turn ON when they are OFF and color is set.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3509
            const state = {state: 'ON'};

            const result = await converters.light_color.convertSet(entity, key, value, meta);
            result.state = {...result.state, ...state};
            return result;
        },
        convertGet: async (entity, key, meta) => {
            return await converters.light_color.convertGet(entity, key, meta);
        },
    },

    gledopto_light_color_colortemp: {
        key: ['color', 'color_temp', 'color_temp_percent'],
        convertSet: async (entity, key, value, meta) => {
            if (key == 'color') {
                const result = await converters.gledopto_light_color.convertSet(entity, key, value, meta);
                //if (result.state && result.state.color.hasOwnProperty('x') && result.state.color.hasOwnProperty('y')) {
                //    result.state.color_temp = utils.xyToMireds(result.state.color.x, result.state.color.y);
                //}

                return result;
            } else if (key == 'color_temp' || key == 'color_temp_percent') {
                const result = await converters.gledopto_light_colortemp.convertSet(entity, key, value, meta);
                //result.state.color = utils.miredsToXY(result.state.color_temp);
                return result;
            }
        },
        convertGet: async (entity, key, meta) => {
            return await converters.light_color_colortemp.convertGet(entity, key, meta);
        },
    },
    hue_power_on_behavior: {
        key: ['hue_power_on_behavior'],
        convertSet: async (entity, key, value, meta) => {
            if (value === 'default') {
                value = 'on';
            }

            let supports = {colorTemperature: false, colorXY: false};
            if (entity.constructor.name === 'Endpoint' && entity.supportsInputCluster('lightingColorCtrl')) {
                const readResult = await entity.read('lightingColorCtrl', ['colorCapabilities']);
                supports = {
                    colorTemperature: (readResult.colorCapabilities & 1<<4) > 0,
                    colorXY: (readResult.colorCapabilities & 1<<3) > 0,
                };
            } else if (entity.constructor.name === 'Group') {
                supports = {colorTemperature: true, colorXY: true};
            }

            if (value === 'off') {
                await entity.write('genOnOff', {0x4003: {value: 0x00, type: 0x30}});
            } else if (value === 'recover') {
                await entity.write('genOnOff', {0x4003: {value: 0xff, type: 0x30}});
                await entity.write('genLevelCtrl', {0x4000: {value: 0xff, type: 0x20}});

                if (supports.colorTemperature) {
                    await entity.write('lightingColorCtrl', {0x4010: {value: 0xffff, type: 0x21}});
                }

                if (supports.colorXY) {
                    await entity.write('lightingColorCtrl', {0x0003: {value: 0xffff, type: 0x21}}, options.hue);
                    await entity.write('lightingColorCtrl', {0x0004: {value: 0xffff, type: 0x21}}, options.hue);
                }
            } else if (value === 'on') {
                await entity.write('genOnOff', {0x4003: {value: 0x01, type: 0x30}});

                let brightness = meta.message.hasOwnProperty('hue_power_on_brightness') ?
                    meta.message.hue_power_on_brightness : 0xfe;
                if (brightness === 255) {
                    // 255 (0xFF) is the value for recover, therefore set it to 254 (0xFE)
                    brightness = 254;
                }
                await entity.write('genLevelCtrl', {0x4000: {value: brightness, type: 0x20}});

                if (entity.supportsInputCluster('lightingColorCtrl')) {
                    if (
                        meta.message.hasOwnProperty('hue_power_on_color_temperature') &&
                        meta.message.hasOwnProperty('hue_power_on_color')
                    ) {
                        meta.logger.error(`Provide either color temperature or color, not both`);
                    } else if (meta.message.hasOwnProperty('hue_power_on_color_temperature')) {
                        const colortemp = meta.message.hue_power_on_color_temperature;
                        await entity.write('lightingColorCtrl', {0x4010: {value: colortemp, type: 0x21}});
                        // Set color to default
                        if (supports.colorXY) {
                            await entity.write('lightingColorCtrl', {0x0003: {value: 0xFFFF, type: 0x21}}, options.hue);
                            await entity.write('lightingColorCtrl', {0x0004: {value: 0xFFFF, type: 0x21}}, options.hue);
                        }
                    } else if (meta.message.hasOwnProperty('hue_power_on_color')) {
                        const xy = utils.hexToXY(meta.message.hue_power_on_color);
                        value = {x: xy.x * 65535, y: xy.y * 65535};

                        // Set colortemp to default
                        if (supports.colorTemperature) {
                            await entity.write('lightingColorCtrl', {0x4010: {value: 366, type: 0x21}});
                        }

                        await entity.write('lightingColorCtrl', {0x0003: {value: value.x, type: 0x21}}, options.hue);
                        await entity.write('lightingColorCtrl', {0x0004: {value: value.y, type: 0x21}}, options.hue);
                    } else {
                        // Set defaults for colortemp and color
                        if (supports.colorTemperature) {
                            await entity.write('lightingColorCtrl', {0x4010: {value: 366, type: 0x21}});
                        }

                        if (supports.colorXY) {
                            await entity.write('lightingColorCtrl', {0x0003: {value: 0xFFFF, type: 0x21}}, options.hue);
                            await entity.write('lightingColorCtrl', {0x0004: {value: 0xFFFF, type: 0x21}}, options.hue);
                        }
                    }
                }
            }
        },
    },
    hue_power_on_error: {
        key: ['hue_power_on_brightness', 'hue_power_on_color_temperature', 'hue_power_on_color'],
        convertSet: async (entity, key, value, meta) => {
            if (!meta.message.hasOwnProperty('hue_power_on_behavior')) {
                meta.logger.error(`Provide a value for 'hue_power_on_behavior'`);
            }
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
            return {state: {motion_sensitivity: value}};
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
        key: ['thermostat_occupancy'],
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
        key: ['backlight_auto_dim'],
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
        key: ['enable_outdoor_temperature'],
        convertSet: async (entity, key, value, meta) => {
            if (value.toLowerCase() == 'on') {
                await entity.write('manuSpecificSinope', {outdoorTempToDisplayTimeout: 10800});
            } else if (value.toLowerCase() == 'off') {
                // set timer to 30sec in order to disable outdoor temperature
                await entity.write('manuSpecificSinope', {outdoorTempToDisplayTimeout: 30});
            }
        },
    },
    sinope_thermostat_outdoor_temperature: {
        key: ['thermostat_outdoor_temperature'],
        convertSet: async (entity, key, value, meta) => {
            if (value > -100 && value < 100) {
                await entity.write('manuSpecificSinope', {outdoorTempToDisplay: value * 100});
            }
        },
    },
    sinope_thermostat_time: {
        key: ['thermostat_time'],
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
    sinope_floor_control_mode: {
        // TH1300ZB specific
        key: ['floor_control_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== 'string') {
                return;
            }
            const lookup = {'ambiant': 1, 'floor': 2};
            value = value.toLowerCase();
            if (lookup.hasOwnProperty(value)) {
                await entity.write('manuSpecificSinope', {floorControlMode: lookup[value]});
            }
        },
    },
    sinope_ambiant_max_heat_setpoint: {
        // TH1300ZB specific
        key: ['ambiant_max_heat_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            if (value >= 5 && value <= 36) {
                await entity.write('manuSpecificSinope', {ambiantMaxHeatSetpointLimit: value * 100});
            }
        },
    },
    sinope_floor_min_heat_setpoint: {
        // TH1300ZB specific
        key: ['floor_min_heat_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            if (value >= 5 && value <= 36) {
                await entity.write('manuSpecificSinope', {floorMinHeatSetpointLimit: value * 100});
            }
        },
    },
    sinope_floor_max_heat_setpoint: {
        // TH1300ZB specific
        key: ['floor_max_heat_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            if (value >= 5 && value <= 36) {
                await entity.write('manuSpecificSinope', {floorMaxHeatSetpointLimit: value * 100});
            }
        },
    },
    sinope_temperature_sensor: {
        // TH1300ZB specific
        key: ['floor_temperature_sensor'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== 'string') {
                return;
            }
            const lookup = {'10k': 0, '12k': 1};
            value = value.toLowerCase();
            if (lookup.hasOwnProperty(value)) {
                await entity.write('manuSpecificSinope', {temperatureSensor: lookup[value]});
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['temperatureSensor']);
        },
    },
    sinope_time_format: {
        // TH1300ZB specific
        key: ['time_format'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== 'string') {
                return;
            }
            const lookup = {'24h': 0, '12h': 1};
            value = value.toLowerCase();
            if (lookup.hasOwnProperty(value)) {
                await entity.write('manuSpecificSinope', {timeFormatToDisplay: lookup[value]});
            }
        },
    },
    stelpro_thermostat_outdoor_temperature: {
        key: ['thermostat_outdoor_temperature'],
        convertSet: async (entity, key, value, meta) => {
            if (value > -100 && value < 100) {
                await entity.write('hvacThermostat', {StelproOutdoorTemp: value * 100});
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
            if (((value >= 0) && value < 2) == false) value = 0;

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
    ptvo_switch_uart: {
        key: ['action'],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                return;
            }
            const payload = {14: {value, type: 0x42}};
            for (const endpoint of meta.device.endpoints) {
                const cluster = 'genMultistateValue';
                if (endpoint.supportsInputCluster(cluster) || endpoint.supportsOutputCluster(cluster)) {
                    await endpoint.write(cluster, payload);
                    return;
                }
            }
            await entity.write('genMultistateValue', payload);
        },
    },
    ptvo_switch_analog_input: {
        key: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'],
        convertGet: async (entity, key, meta) => {
            const epId = parseInt(key.substr(1, 1));
            if ( utils.hasEndpoints(meta.device, [epId]) ) {
                const endpoint = meta.device.getEndpoint(epId);
                await endpoint.read('genAnalogInput', ['presentValue', 'description']);
            }
        },
        convertSet: async (entity, key, value, meta) => {
            const epId = parseInt(key.substr(1, 1));
            if ( utils.hasEndpoints(meta.device, [epId]) ) {
                const endpoint = meta.device.getEndpoint(epId);
                let cluster = 'genLevelCtrl';
                if (endpoint.supportsInputCluster(cluster) || endpoint.supportsOutputCluster(cluster)) {
                    const value2 = parseInt(value);
                    if (isNaN(value2)) {
                        return;
                    }
                    const payload = {'currentLevel': value2};
                    await endpoint.write(cluster, payload);
                    return;
                }

                cluster = 'genAnalogInput';
                if (endpoint.supportsInputCluster(cluster) || endpoint.supportsOutputCluster(cluster)) {
                    const value2 = parseFloat(value);
                    if (isNaN(value2)) {
                        return;
                    }
                    const payload = {'presentValue': value2};
                    await endpoint.write(cluster, payload);
                    return;
                }
            }
            return;
        },
    },
    ptvo_switch_light_brightness: {
        key: ['brightness', 'brightness_percent', 'transition'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'transition') {
                return;
            }
            const cluster = 'genLevelCtrl';
            if (entity.supportsInputCluster(cluster) || entity.supportsOutputCluster(cluster)) {
                return await converters.light_onoff_brightness.convertSet(entity, key, value, meta);
            } else {
                throw new Error('LevelControl not supported on this endpoint.');
            }
        },
        convertGet: async (entity, key, meta) => {
            const cluster = 'genLevelCtrl';
            if (entity.supportsInputCluster(cluster) || entity.supportsOutputCluster(cluster)) {
                return await converters.light_onoff_brightness.convertGet(entity, key, meta);
            } else {
                throw new Error('LevelControl not supported on this endpoint.');
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
    ubisys_device_setup: {
        key: ['configure_device_setup'],
        convertSet: async (entity, key, value, meta) => {
            const devMgmtEp = meta.device.getEndpoint(232);

            if (value.hasOwnProperty('input_configurations')) {
                // example: [0, 0, 0, 0]
                await devMgmtEp.write('manuSpecificUbisysDeviceSetup',
                    {'inputConfigurations': {elementType: 'data8', elements: value.input_configurations}});
            }

            if (value.hasOwnProperty('input_actions')) {
                // example (default for C4): [[0,13,1,6,0,2], [1,13,2,6,0,2], [2,13,3,6,0,2], [3,13,4,6,0,2]]
                await devMgmtEp.write('manuSpecificUbisysDeviceSetup',
                    {'inputActions': {elementType: 'octetStr', elements: value.input_actions}});
            }

            if (value.hasOwnProperty('input_action_templates')) {
                const templateTypes = {
                    // source: "ZigBee Device Physical Input Configurations Integrator’s Guide"
                    // (can be obtained directly from ubisys upon request)
                    'toggle': {
                        getInputActions: (input, endpoint) => [
                            [input, 0x0D, endpoint, 0x06, 0x00, 0x02],
                        ],
                    },
                    'toggle_switch': {
                        getInputActions: (input, endpoint) => [
                            [input, 0x0D, endpoint, 0x06, 0x00, 0x02],
                            [input, 0x03, endpoint, 0x06, 0x00, 0x02],
                        ],
                    },
                    'on_off_switch': {
                        getInputActions: (input, endpoint) => [
                            [input, 0x0D, endpoint, 0x06, 0x00, 0x01],
                            [input, 0x03, endpoint, 0x06, 0x00, 0x00],
                        ],
                    },
                    'on': {
                        getInputActions: (input, endpoint) => [
                            [input, 0x0D, endpoint, 0x06, 0x00, 0x01],
                        ],
                    },
                    'off': {
                        getInputActions: (input, endpoint) => [
                            [input, 0x0D, endpoint, 0x06, 0x00, 0x00],
                        ],
                    },
                    'dimmer_single': {
                        getInputActions: (input, endpoint, template) => {
                            const moveUpCmd = template.no_onoff || template.no_onoff_up ? 0x01 : 0x05;
                            const moveDownCmd = template.no_onoff || template.no_onoff_down ? 0x01 : 0x05;
                            const moveRate = template.rate || 50;
                            return [
                                [input, 0x07, endpoint, 0x06, 0x00, 0x02],
                                [input, 0x86, endpoint, 0x08, 0x00, moveUpCmd, 0x00, moveRate],
                                [input, 0xC6, endpoint, 0x08, 0x00, moveDownCmd, 0x01, moveRate],
                                [input, 0x0B, endpoint, 0x08, 0x00, 0x03],
                            ];
                        },
                    },
                    'dimmer_double': {
                        doubleInputs: true,
                        getInputActions: (inputs, endpoint, template) => {
                            const moveUpCmd = template.no_onoff || template.no_onoff_up ? 0x01 : 0x05;
                            const moveDownCmd = template.no_onoff || template.no_onoff_down ? 0x01 : 0x05;
                            const moveRate = template.rate || 50;
                            return [
                                [inputs[0], 0x07, endpoint, 0x06, 0x00, 0x01],
                                [inputs[0], 0x06, endpoint, 0x08, 0x00, moveUpCmd, 0x00, moveRate],
                                [inputs[0], 0x0B, endpoint, 0x08, 0x00, 0x03],
                                [inputs[1], 0x07, endpoint, 0x06, 0x00, 0x00],
                                [inputs[1], 0x06, endpoint, 0x08, 0x00, moveDownCmd, 0x01, moveRate],
                                [inputs[1], 0x0B, endpoint, 0x08, 0x00, 0x03],
                            ];
                        },
                    },
                    'cover': {
                        cover: true,
                        doubleInputs: true,
                        getInputActions: (inputs, endpoint) => [
                            [inputs[0], 0x0D, endpoint, 0x02, 0x01, 0x00],
                            [inputs[0], 0x07, endpoint, 0x02, 0x01, 0x02],
                            [inputs[1], 0x0D, endpoint, 0x02, 0x01, 0x01],
                            [inputs[1], 0x07, endpoint, 0x02, 0x01, 0x02],
                        ],
                    },
                    'cover_switch': {
                        cover: true,
                        doubleInputs: true,
                        getInputActions: (inputs, endpoint) => [
                            [inputs[0], 0x0D, endpoint, 0x02, 0x01, 0x00],
                            [inputs[0], 0x03, endpoint, 0x02, 0x01, 0x02],
                            [inputs[1], 0x0D, endpoint, 0x02, 0x01, 0x01],
                            [inputs[1], 0x03, endpoint, 0x02, 0x01, 0x02],
                        ],
                    },
                    'cover_up': {
                        cover: true,
                        getInputActions: (input, endpoint) => [
                            [input, 0x0D, endpoint, 0x02, 0x01, 0x00],
                        ],
                    },
                    'cover_down': {
                        cover: true,
                        getInputActions: (input, endpoint) => [
                            [input, 0x0D, endpoint, 0x02, 0x01, 0x01],
                        ],
                    },
                    'scene': {
                        scene: true,
                        getInputActions: (input, endpoint, groupId, sceneId) => [
                            [input, 0x07, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                        ],
                        getInputActions2: (input, endpoint, groupId, sceneId) => [
                            [input, 0x06, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                        ],
                    },
                    'scene_switch': {
                        scene: true,
                        getInputActions: (input, endpoint, groupId, sceneId) => [
                            [input, 0x0D, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                        ],
                        getInputActions2: (input, endpoint, groupId, sceneId) => [
                            [input, 0x03, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                        ],
                    },
                };

                // first input
                let input = 0;
                // first client endpoint - depends on actual device
                let endpoint = {'S1': 2, 'S2': 3, 'D1': 2, 'J1': 2, 'C4': 1}[meta.mapped.model];
                // default group id
                let groupId = 0;

                const templates = Array.isArray(value.input_action_templates) ? value.input_action_templates :
                    [value.input_action_templates];
                let resultingInputActions = [];
                for (const template of templates) {
                    const templateType = templateTypes[template.type];
                    if (!templateType) {
                        throw new Error(`input_action_templates: Template type '${template.type}' is not valid ` +
                            `(valid types: ${Object.keys(templateTypes)})`);
                    }

                    if (template.hasOwnProperty('input')) {
                        input = template.input;
                    }
                    if (template.hasOwnProperty('endpoint')) {
                        endpoint = template.endpoint;
                    }
                    // C4 cover endpoints only start at 5
                    if (templateType.cover && meta.mapped.model === 'C4' && endpoint < 5) {
                        endpoint += 4;
                    }

                    let inputActions;
                    if (!templateType.doubleInputs) {
                        if (!templateType.scene) {
                            // single input, no scene(s)
                            inputActions = templateType.getInputActions(input, endpoint, template);
                        } else {
                            // scene(s) (always single input)
                            if (!template.hasOwnProperty('scene_id')) {
                                throw new Error(`input_action_templates: Need an attribute 'scene_id' for '${template.type}'`);
                            }
                            if (template.hasOwnProperty('group_id')) {
                                groupId = template.group_id;
                            }
                            inputActions = templateType.getInputActions(input, endpoint, groupId, template.scene_id);

                            if (template.hasOwnProperty('scene_id_2')) {
                                if (template.hasOwnProperty('group_id_2')) {
                                    groupId = template.group_id_2;
                                }
                                inputActions = inputActions.concat(templateType.getInputActions2(input, endpoint, groupId,
                                    template.scene_id_2));
                            }
                        }
                    } else {
                        // double inputs
                        input = template.hasOwnProperty('inputs') ? template.inputs : [input, input + 1];
                        inputActions = templateType.getInputActions(input, endpoint, template);
                    }
                    resultingInputActions = resultingInputActions.concat(inputActions);

                    meta.logger.warn(`ubisys: Using input(s) ${input} and endpoint ${endpoint} for '${template.type}'.`);
                    // input might by now be an array (in case of double inputs)
                    input = (Array.isArray(input) ? Math.max(...input) : input) + 1;
                    endpoint += 1;
                }

                meta.logger.debug(`ubisys: input_actions to be sent to '${meta.options.friendlyName}': ` +
                    JSON.stringify(resultingInputActions));
                await devMgmtEp.write('manuSpecificUbisysDeviceSetup',
                    {'inputActions': {elementType: 'octetStr', elements: resultingInputActions}});
            }

            // re-read effective settings and dump them to the log
            converters.ubisys_device_setup.convertGet(entity, key, meta);
        },

        convertGet: async (entity, key, meta) => {
            const log = (dataRead) => {
                meta.logger.warn(
                    `ubisys: Device setup read for '${meta.options.friendlyName}': ${JSON.stringify(utils.toSnakeCase(dataRead))}`);
            };
            const devMgmtEp = meta.device.getEndpoint(232);
            log(await devMgmtEp.read('manuSpecificUbisysDeviceSetup', ['inputConfigurations']));
            log(await devMgmtEp.read('manuSpecificUbisysDeviceSetup', ['inputActions']));
        },
    },

    tint_scene: {
        key: ['tint_scene'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('genBasic', {0x4005: {value, type: 0x20}}, options.tint);
        },
    },

    // legrand custom cluster : settings
    legrand_identify: {
        key: ['identify'],
        convertSet: async (entity, key, value, meta) => {
            if (!value.timeout) {
                const effects = {
                    'blink3': 0x00,
                    'fixed': 0x01,
                    'blinkgreen': 0x02,
                    'blinkblue': 0x03,
                };
                // only works for blink3 & fixed
                const colors = {
                    'default': 0x00,
                    'red': 0x01,
                    'green': 0x02,
                    'blue': 0x03,
                    'lightblue': 0x04,
                    'yellow': 0x05,
                    'pink': 0x06,
                    'white': 0x07,
                };

                const selectedEffect = effects[value.effect] | effects['blink3'];
                const selectedColor = colors[value.color] | colors['default'];

                const payload = {effectid: selectedEffect, effectvariant: selectedColor};
                await entity.command('genIdentify', 'triggerEffect', payload, {});
            } else {
                await entity.command('genIdentify', 'identify', {identifytime: 10}, {});
            }
            // await entity.command('genIdentify', 'triggerEffect', payload, getOptions(meta.mapped, entity));
        },
    },
    // connected power outlet is on attribute 2 and not 1
    legrand_settingAlwaysEnableLed: {
        key: ['permanent_led'],
        convertSet: async (entity, key, value, meta) => {
            // enable or disable the LED (blue) when permitJoin=false (LED off)
            const enableLedIfOn = value === 'ON' || (value === 'OFF' ? false : !!value);
            const payload = {1: {value: enableLedIfOn, type: 16}};
            await entity.write('manuSpecificLegrandDevices', payload, options.legrand);
        },
    },
    legrand_settingEnableLedIfOn: {
        key: ['led_when_on'],
        convertSet: async (entity, key, value, meta) => {
            // enable the LED when the light object is "doing something"
            // on the light switch, the LED is on when the light is on,
            // on the shutter switch, the LED is on when te shutter is moving
            const enableLedIfOn = value === 'ON' || (value === 'OFF' ? false : !!value);
            const payload = {2: {value: enableLedIfOn, type: 16}};
            await entity.write('manuSpecificLegrandDevices', payload, options.legrand);
        },
    },
    legrand_settingEnableDimmer: {
        key: ['dimmer_enabled'],
        convertSet: async (entity, key, value, meta) => {
            // enable the dimmer, requires a recent firmware on the device
            const enableDimmer = value === 'ON' || (value === 'OFF' ? false : !!value);
            const payload = {0: {value: enableDimmer ? 0x0101 : 0x0100, type: 9}};
            await entity.write('manuSpecificLegrandDevices', payload, options.legrand);
        },
    },
    legrand_readActivePower: {
        key: ['power'],
        convertGet: async (entity, key, meta) => {
            await entity.read('haElectricalMeasurement', ['activePower']);
        },
    },
    legrand_powerAlarm: {
        key: ['power_alarm'],
        convertSet: async (entity, key, value, meta) => {
            const enableAlarm = (value === 'DISABLE' ? false : true);
            const payloadBolean = {0xf001: {value: enableAlarm ? 0x01 : 0x00, type: 0x10}};
            const payloadValue = {0xf002: {value: value, type: 0x29}};
            await entity.write('haElectricalMeasurement', payloadValue);
            await entity.write('haElectricalMeasurement', payloadBolean);
            // To have consistent information in the system.
            await entity.read('haElectricalMeasurement', [0xf000, 0xf001, 0xf002]);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('haElectricalMeasurement', [0xf000, 0xf001, 0xf002]);
        },
    },
    tuya_led_control: {
        key: ['color', 'brightness', 'color_temp'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'color_temp') {
                value = Number(value);
                const mappedValue = Math.round(-0.734 * value + 367);
                const payload = {colortemp: mappedValue, transtime: 0};
                // disable tuya rgb mode
                await entity.command('lightingColorCtrl', 'tuyaRgbMode', {enable: 0}, {}, {disableDefaultResponse: true});
                await entity.command('lightingColorCtrl', 'moveToColorTemp', payload, getOptions(meta.mapped, entity));
                return {state: {color_temp: mappedValue}};
            }
            // transtime is ignored
            const payload = {
                transtime: 0,
                hue: Math.round((meta.state.color.h * 254) / 360),
                saturation: Math.round(meta.state.color.s * 2.54),
                brightness: meta.state.brightness || 255,
            };
            if (value.h) {
                payload.hue = Math.round((value.h * 254) / 360);
            }
            if (value.s) {
                payload.saturation = Math.round(value.s * 2.54);
            }
            if (value.b) {
                payload.brightness = value.b;
            }
            if (value.brightness) {
                payload.brightness = value.brightness;
            }
            if (typeof value === 'number') {
                payload.brightness = value;
            }
            if (meta.state.tuyaMode === 0 && payload.brightness) {
                await entity.command('genLevelCtrl',
                    'moveToLevel',
                    {transtime: 0, level: payload.brightness},
                    {disableResponse: true, disableDefaultResponse: true});
                await entity.command('lightingColorCtrl', 'tuyaRgbMode', {enable: 0}, {}, {disableDefaultResponse: true});
                return {state: {brightness: payload.brightness}};
            }

            // if key is color -> make sure to switch to rgb mode
            await entity.command('lightingColorCtrl', 'tuyaRgbMode', {enable: 1}, {}, {disableDefaultResponse: true});
            await entity.command('lightingColorCtrl', 'tuyaMoveToHueAndSaturationBrightness', payload, {disableDefaultResponse: true});
            // transtime cannot be set on these devices. They seem to have a default one of about 1500ms!
            return {state: {color_temp: value, brightness: payload.brightness}, readAfterWriteTime: payload.transtime * 100};
        },
        convertGet: async (entity, key, meta) => {
            if (key === 'color') {
                await entity.read('lightingColorCtrl', [
                    'currentHue', 'currentSaturation', 'tuyaBrightness', 'tuyaMode', 'colorTemperature',
                ]);
            }
        },
    },
    tuya_led_controller: {
        key: ['state', 'color'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'state') {
                if (value.toLowerCase() === 'off') {
                    await entity.command(
                        'genOnOff', 'offWithEffect', {effectid: 0x01, effectvariant: 0x01}, getOptions(meta.mapped, entity),
                    );
                } else {
                    const payload = {level: 255, transtime: 0};
                    await entity.command('genLevelCtrl', 'moveToLevelWithOnOff', payload, getOptions(meta.mapped, entity));
                }
                return {state: {state: value.toUpperCase()}};
            } else if (key === 'color') {
                const hue = {};
                const saturation = {};

                hue.hue = Math.round((value.h * 254) / 360);
                saturation.saturation = Math.round(value.s * 2.54);

                hue.transtime = saturation.transtime = 0;
                hue.direction = 0;

                await entity.command('lightingColorCtrl', 'moveToHue', hue, {}, getOptions(meta.mapped, entity));
                await entity.command('lightingColorCtrl', 'moveToSaturation', saturation, {}, getOptions(meta.mapped, entity));
            }
        },
        convertGet: async (entity, key, meta) => {
            if (key === 'state') {
                await entity.read('genOnOff', ['onOff']);
            } else if (key === 'color') {
                await entity.read('lightingColorCtrl', ['currentHue', 'currentSaturation']);
            }
        },
    },
    tuya_dimmer_state: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command(
                'manuSpecificTuyaDimmer', 'setData', {
                    status: 0, transid: 16, dp: 257, fn: 0, data: [1, (value === 'ON') ? 1 : 0],
                },
                {disableDefaultResponse: true},
            );
        },
    },
    tuya_dimmer_level: {
        key: ['brightness', 'brightness_percent'],
        convertSet: async (entity, key, value, meta) => {
            // upscale to 1000
            let newValue;
            if (key === 'brightness_percent') {
                newValue = Math.round(Number(value) * 10);
            } else {
                newValue = Math.round(Number(value) * 1000 / 255);
            }
            const b1 = newValue >> 8;
            const b2 = newValue & 0xFF;
            await entity.command(
                'manuSpecificTuyaDimmer', 'setData', {
                    status: 0, transid: 16, dp: 515, fn: 0, data: [4, 0, 0, b1, b2],
                },
                {disableDefaultResponse: true},
            );
        },
    },
    tuya_switch_state: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {l1: 1, l2: 2, l3: 3, l4: 4};
            const multiEndpoint = meta.mapped.meta && meta.mapped.meta.multiEndpoint;
            const keyid = multiEndpoint ? lookup[meta.endpoint_name] : 1;
            await sendTuyaCommand(entity, 256 + keyid, 0, [1, value === 'ON' ? 1 : 0]);
            return {state: {state: value.toUpperCase()}};
        },
    },
    RM01_light_onoff_brightness: {
        key: ['state', 'brightness', 'brightness_percent'],
        convertSet: async (entity, key, value, meta) => {
            if (utils.hasEndpoints(meta.device, [0x12])) {
                const endpoint = meta.device.getEndpoint(0x12);
                return await converters.light_onoff_brightness.convertSet(endpoint, key, value, meta);
            } else {
                throw new Error('OnOff and LevelControl not supported on this RM01 device.');
            }
        },
        convertGet: async (entity, key, meta) => {
            if (utils.hasEndpoints(meta.device, [0x12])) {
                const endpoint = meta.device.getEndpoint(0x12);
                return await converters.light_onoff_brightness.convertGet(endpoint, key, meta);
            } else {
                throw new Error('OnOff and LevelControl not supported on this RM01 device.');
            }
        },
    },
    aqara_opple_operation_mode: {
        key: ['operation_mode'],
        convertSet: async (entity, key, value, meta) => {
            // modes:
            // 0 - 'command' mode. keys send commands. useful for binding
            // 1 - 'event' mode. keys send events. useful for handling
            const lookup = {command: 0, event: 1};
            const endpoint = meta.device.getEndpoint(1);
            await endpoint.write('aqaraOpple', {'mode': lookup[value.toLowerCase()]}, {manufacturerCode: 0x115f});
        },
        convertGet: async (entity, key, meta) => {
            const endpoint = meta.device.getEndpoint(1);
            await endpoint.read('aqaraOpple', ['mode'], {manufacturerCode: 0x115f});
        },
    },
    EMIZB_132_mode: {
        key: ['interface_mode'],
        convertSet: async (entity, key, value, meta) => {
            const endpoint = meta.device.getEndpoint(2);
            const lookup = {
                'norwegian_han': {value: 0x0200, acVoltageDivisor: 10, acCurrentDivisor: 10},
                'norwegian_han_extra_load': {value: 0x0201, acVoltageDivisor: 10, acCurrentDivisor: 10},
                'aidon_meter': {value: 0x0202, acVoltageDivisor: 10, acCurrentDivisor: 10},
                'kaifa_and_kamstrup': {value: 0x0203, acVoltageDivisor: 10, acCurrentDivisor: 1000},
            };

            if (!lookup[value]) {
                throw new Error(`Interface mode '${value}' is not valid, chose: ${Object.keys(lookup)}`);
            }

            await endpoint.write(
                'seMetering', {0x0302: {value: lookup[value].value, type: 49}}, {manufacturerCode: 0x1015},
            );

            // As the device reports the incorrect divisor, we need to set it here
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/974#issuecomment-604347303
            // Values for norwegian_han and aidon_meter have not been been checked
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1,
                acVoltageDivisor: lookup[value].acVoltageDivisor,
                acCurrentMultiplier: 1,
                acCurrentDivisor: lookup[value].acCurrentDivisor,
            });

            return {state: {interface_mode: value}};
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
    ignore_rate: {
        key: ['rate'],
        attr: [],
        convertSet: async (entity, key, value, meta) => {
        },
    },

    // Moes Thermostat
    moes_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            sendTuyaCommand(entity, 296, 0, [1, value==='LOCK' ? 1 : 0]);
        },
    },
    moes_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const temp = value;
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(temp);
            sendTuyaCommand(entity, 528, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    moes_thermostat_min_temperature: {
        key: ['min_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const temp = value;
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(temp);
            sendTuyaCommand(entity, 532, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    moes_thermostat_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value, meta) => {
            if (value < 0) value = 4096 + value;
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            sendTuyaCommand(entity, 539, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    moes_thermostat_mode: {
        key: ['preset'],
        convertSet: async (entity, key, value, meta) => {
            sendTuyaCommand(entity, 1026, 0, [1, value === 'hold' ? 0 : 1]);
            sendTuyaCommand(entity, 1027, 0, [1, value === 'program' ? 0 : 1]);
        },
    },
    moes_thermostat_standby: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            sendTuyaCommand(entity, 257, 0, [1, value === 'heat' ? 1 : 0]);
            sendTuyaCommand(entity, 257, 0, [1, value === 'off' ? 0 : 1]);
        },
    },
    // send an mqtt message to topic '/sensor' to change the temperature sensor setting - options [0=IN|1=AL|2=OU]
    moes_thermostat_sensor: {
        key: ['sensor'],
        convertSet: async (entity, key, value, meta) => {
            sendTuyaCommand(entity, 1067, 0, [1, value]);
        },
    },
    etop_thermostat_system_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            switch (value) {
            case 'off':
                await sendTuyaCommand(entity, 257, 0, [1, 0/* off */]);
                break;
            case 'heat':
                await sendTuyaCommand(entity, 257, 0, [1, 1/* on */]);
                await utils.sleepMs(500);
                await sendTuyaCommand(entity, 1028, 0, [1, 0/* manual */]);
                break;
            case 'auto':
                await sendTuyaCommand(entity, 257, 0, [1, 1/* on */]);
                await utils.sleepMs(500);
                await sendTuyaCommand(entity, 1028, 0, [1, 2/* auto */]);
                break;
            }
        },
    },
    etop_thermostat_away_mode: {
        key: ['away_mode'],
        convertSet: async (entity, key, value, meta) => {
            switch (value) {
            case 'ON':
                await sendTuyaCommand(entity, 257, 0, [1, 1/* on */]);
                await utils.sleepMs(500);
                await sendTuyaCommand(entity, 1028, 0, [1, 1/* away */]);
                break;
            case 'OFF':
                await sendTuyaCommand(entity, 1028, 0, [1, 0/* manual */]);
                break;
            }
        },
    },
    tuya_thermostat_weekly_schedule: {
        key: ['weekly_schedule'],
        convertSet: async (entity, key, value, meta) => {
            const thermostatMeta = utils.getMetaValue(entity, meta.mapped, 'thermostat');
            const maxTransitions = thermostatMeta.weeklyScheduleMaxTransitions;
            const supportedModes = thermostatMeta.weeklyScheduleSupportedModes;
            const firstDayDpId = thermostatMeta.weeklyScheduleFirstDayDpId;

            function transitionToData(transition) {
                // Later it is possible to move converter to meta or to other place outside if other type of converter
                // will be needed for other device. Currently this converter is based on ETOP HT-08 thermostat.
                // see also fromZigbee.tuya_thermostat_weekly_schedule()
                const minutesSinceMidnight = transition.transitionTime;
                const heatSetpoint = Math.floor(transition.heatSetpoint * 10);
                return [
                    (minutesSinceMidnight & 0xff00) >> 8,
                    minutesSinceMidnight & 0xff,
                    (heatSetpoint & 0xff00) >> 8,
                    heatSetpoint & 0xff,
                ];
            }
            for (const [, daySchedule] of Object.entries(value)) {
                const dayofweek = parseInt(daySchedule.dayofweek);
                const numoftrans = parseInt(daySchedule.numoftrans);
                let transitions = [...daySchedule.transitions];
                const mode = parseInt(daySchedule.mode);
                if (!supportedModes.includes(mode)) {
                    throw new Error(`Invalid mode: ${mode} for device ${meta.options.friendlyName}`);
                }
                if (numoftrans != transitions.length) {
                    throw new Error(`Invalid numoftrans provided. Real: ${transitions.length} ` +
                        `provided ${numoftrans} for device ${meta.options.friendlyName}`);
                }
                if (transitions.length > maxTransitions) {
                    throw new Error(`Too more transitions provided. Provided: ${transitions.length} ` +
                        `but supports only ${numoftrans} for device ${meta.options.friendlyName}`);
                }
                if (transitions.length < maxTransitions) {
                    meta.logger.warn(`Padding transitions from ${transitions.length} ` +
                        `to ${maxTransitions} with last item for device ${meta.options.friendlyName}`);
                    const lastTransition = transitions[transitions.length-1];
                    while (transitions.length != maxTransitions) {
                        transitions = [...transitions, lastTransition];
                    }
                }
                const payload = [];
                transitions.forEach((transition) => {
                    payload.push(...transitionToData(transition));
                });
                await sendTuyaCommand(entity, firstDayDpId - 1 + dayofweek, 0, [payload.length, ...payload]);
            }
        },
    },
    tuya_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await sendTuyaCommand(entity, 263, 0, [1, value==='LOCK' ? 1 : 0]);
        },
    },
    tuya_thermostat_window_detection: {
        key: ['window_detection'],
        convertSet: async (entity, key, value, meta) => {
            await sendTuyaCommand(entity, 104, 0, [1, value==='ON' ? 1 : 0]);
            await sendTuyaCommand(entity, 274, 0, [1, value==='ON' ? 1 : 0]);
        },
    },
    tuya_thermostat_valve_detection: {
        key: ['valve_detection'],
        convertSet: async (entity, key, value, meta) => {
            await sendTuyaCommand(entity, 276, 0, [1, value==='ON' ? 1 : 0]);
        },
    },
    tuya_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const temp = Math.round(value * 10);
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(temp);
            await sendTuyaCommand(entity, 514, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_system_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            const modeId = utils.getKeyByValue(utils.getMetaValue(entity, meta.mapped, 'tuyaThermostatSystemMode'), value, null);
            if (modeId !== null) {
                await sendTuyaCommand(entity, 1028, 0, [1, parseInt(modeId)]);
            } else {
                console.log(`TRV system mode ${value} is not recognized.`);
            }
        },
    },
    tuya_thermostat_preset: {
        key: ['preset'],
        convertSet: async (entity, key, value, meta) => {
            const presetId = utils.getKeyByValue(utils.getMetaValue(entity, meta.mapped, 'tuyaThermostatPreset'), value, null);
            if (presetId !== null) {
                await sendTuyaCommand(entity, 1028, 0, [1, parseInt(presetId)]);
            } else {
                console.log(`TRV preset ${value} is not recognized.`);
            }
        },
    },
    tuya_thermostat_away_mode: {
        key: ['away_mode'],
        convertSet: async (entity, key, value, meta) => {
            // HA has special behavior for the away mode
            const awayPresetId = utils.getKeyByValue(utils.getMetaValue(entity, meta.mapped, 'tuyaThermostatPreset'), 'away', null);
            const schedulePresetId = utils.getKeyByValue(utils.getMetaValue(entity, meta.mapped, 'tuyaThermostatPreset'), 'schedule', null);
            if (awayPresetId !== null) {
                if (value == 'ON') {
                    await sendTuyaCommand(entity, 1028, 0, [1, parseInt(awayPresetId)]);
                } else if (schedulePresetId != null) {
                    await sendTuyaCommand(entity, 1028, 0, [1, parseInt(schedulePresetId)]);
                }
                // In case 'OFF' tuya_thermostat_preset() should be called with another preset
            } else {
                console.log(`TRV preset ${value} is not recognized.`);
            }
        },
    },
    tuya_thermostat_fan_mode: {
        key: ['fan_mode'],
        convertSet: async (entity, key, value, meta) => {
            const modeId = utils.getKeyByValue(common.TuyaFanModes, value, null);
            if (modeId !== null) {
                await sendTuyaCommand(entity, 1029, 0, [1, parseInt(modeId)]);
            } else {
                console.log(`TRV fan mode ${value} is not recognized.`);
            }
        },
    },
    tuya_thermostat_auto_lock: {
        key: ['auto_lock'],
        convertSet: async (entity, key, value, meta) => {
            await sendTuyaCommand(entity, 372, 0, [1, value==='AUTO' ? 1 : 0]);
        },
    },
    tuya_thermostat_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value, meta) => {
            const temp = Math.round(value * 10);
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(temp);
            await sendTuyaCommand(entity, 556, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_min_temp: {
        key: ['min_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            await sendTuyaCommand(entity, 614, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_max_temp: {
        key: ['max_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            await sendTuyaCommand(entity, 615, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_boost_time: {
        key: ['boost_time'],
        convertSet: async (entity, key, value, meta) => {
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            await sendTuyaCommand(entity, 617, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_comfort_temp: {
        key: ['comfort_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            await sendTuyaCommand(entity, 619, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_eco_temp: {
        key: ['eco_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            await sendTuyaCommand(entity, 620, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_force: {
        key: ['force'],
        convertSet: async (entity, key, value, meta) => {
            const modeId = utils.getKeyByValue(common.TuyaThermostatForceMode, value, null);
            if (modeId !== null) {
                await sendTuyaCommand(entity, 1130, 0, [1, parseInt(modeId)]);
            } else {
                console.log(`TRV force mode ${value} is not recognized.`);
            }
        },
    },
    tuya_cover_control: {
        key: ['state', 'position'],
        convertSet: async (entity, key, value, meta) => {
            // Protocol description
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1159#issuecomment-614659802

            if (key === 'position') {
                if (value >= 0 && value <= 100) {
                    const invert = !(meta.mapped.meta && meta.mapped.meta.coverInverted ?
                        !meta.options.invert_cover : meta.options.invert_cover);
                    value = invert ? 100 - value : value;
                    await sendTuyaCommand(entity, 514, 0, [4, 0, 0, 0, value]); // Set position from 0 - 100%
                } else {
                    meta.logger.debug('TuYa_cover_control: Curtain motor position is out of range');
                }
            } else if (key === 'state') {
                const isRoller = meta.mapped.model === 'TS0601_roller_blind';
                value = value.toLowerCase();
                switch (value) {
                case 'close':
                    await sendTuyaCommand(entity, 1025, 0, [1, isRoller ? 0 : 2]); // close
                    break;
                case 'open':
                    await sendTuyaCommand(entity, 1025, 0, [1, isRoller ? 2 : 0]); // open
                    break;
                case 'stop':
                    await sendTuyaCommand(entity, 1025, 0, [1, 1]); // Stop
                    break;
                default:
                    meta.logger.debug('TuYa_cover_control: Invalid command received');
                    break;
                }
            }
        },
    },
    tuya_cover_options: {
        key: ['options'],
        convertSet: async (entity, key, value, meta) => {
            if (value.reverse_direction != undefined) {
                if (value.reverse_direction) {
                    meta.logger.info('Motor direction reverse');
                    await sendTuyaCommand(entity, 1029, 0, [1, 1]); // 0x04 0x05: Set motor direction to reverse
                } else {
                    meta.logger.info('Motor direction forward');
                    await sendTuyaCommand(entity, 1029, 0, [1, 0]); // 0x04 0x05: Set motor direction to forward (default)
                }
            }
        },
    },
    diyruz_freepad_on_off_config: {
        key: ['switch_type', 'switch_actions'],
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOffSwitchCfg', ['switchType', 'switchActions']);
        },
        convertSet: async (entity, key, value, meta) => {
            const switchTypesLookup = {
                toggle: 0x00,
                momentary: 0x01,
                multifunction: 0x02,
            };
            const switchActionsLookup = {
                on: 0x00,
                off: 0x01,
                toggle: 0x02,
            };
            const intVal = parseInt(value, 10);
            const switchType = switchTypesLookup.hasOwnProperty(value) ? switchTypesLookup[value] : intVal;
            const switchActions = switchActionsLookup.hasOwnProperty(value) ? switchActionsLookup[value] : intVal;

            const payloads = {
                switch_type: {switchType},
                switch_actions: {switchActions},
            };
            await entity.write('genOnOffSwitchCfg', payloads[key]);

            return {state: {[`${key}_${meta.endpoint_name}`]: value}};
        },
    },
    diyruz_geiger_config: {
        key: ['sensitivity', 'led_feedback', 'buzzer_feedback', 'sensors_count', 'sensors_type', 'alert_threshold'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {
                'OFF': 0x00,
                'ON': 0x01,
            };
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                sensitivity: {0xF000: {value, type: 0x21}},
                led_feedback: {0xF001: {value, type: 0x10}},
                buzzer_feedback: {0xF002: {value, type: 0x10}},
                sensors_count: {0xF003: {value, type: 0x20}},
                sensors_type: {0xF004: {value, type: 0x30}},
                alert_threshold: {0xF005: {value, type: 0x23}},
            };
            await entity.write('msIlluminanceLevelSensing', payloads[key]);
        },
    },
    neo_t_h_alarm: {
        key: [
            'alarm', 'melody', 'volume', 'duration',
            'temperature_max', 'temperature_min', 'humidity_min', 'humidity_max',
            'temperature_alarm', 'humidity_alarm',
        ],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'alarm':
                await sendTuyaCommand(entity, 360, 0, [1, value ? 1 : 0]);
                break;
            case 'melody':
                await sendTuyaCommand(entity, 1126, 0, [1, parseInt(value, 10)]);
                break;
            case 'volume':
                await sendTuyaCommand(entity, 1140, 0, [1, {'low': 2, 'medium': 1, 'high': 0}[value]]);
                break;
            case 'duration':
                await sendTuyaCommand(entity, 615, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'temperature_max':
                await sendTuyaCommand(entity, 620, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'temperature_min':
                await sendTuyaCommand(entity, 619, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'humidity_max':
                await sendTuyaCommand(entity, 622, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'humidity_min':
                await sendTuyaCommand(entity, 621, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'temperature_alarm':
                await sendTuyaCommand(entity, 369, 0, [1, value ? 1 : 0]);
                break;
            case 'humidity_alarm':
                await sendTuyaCommand(entity, 370, 0, [1, value ? 1 : 0]);
                break;
            default: // Unknown key
                console.log(`Unhandled key ${key}`);
            }
        },
    },
    heiman_ir_remote: {
        key: ['send_key', 'create', 'learn', 'delete', 'get_list'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'send_key':
                await entity.command('heimanSpecificInfraRedRemote', 'sendKey',
                    {id: value['id'], keyCode: value['key_code']}, getOptions(meta.mapped, entity));
                break;
            case 'create':
                await entity.command('heimanSpecificInfraRedRemote', 'createId', {modelType: value['model_type']},
                    getOptions(meta.mapped, entity));
                break;
            case 'learn':
                await entity.command('heimanSpecificInfraRedRemote', 'studyKey',
                    {id: value['id'], keyCode: value['key_code']}, getOptions(meta.mapped, entity));
                break;
            case 'delete':
                await entity.command('heimanSpecificInfraRedRemote', 'deleteKey',
                    {id: value['id'], keyCode: value['key_code']}, getOptions(meta.mapped, entity));
                break;
            case 'get_list':
                await entity.command('heimanSpecificInfraRedRemote', 'getIdAndKeyCodeList', {}, getOptions(meta.mapped, entity));
                break;
            default: // Unknown key
                console.log(`Unhandled key ${key}`);
            }
        },
    },
    scene_store: {
        key: ['scene_store'],
        convertSet: async (entity, key, value, meta) => {
            const isGroup = entity.constructor.name === 'Group';
            const groupid = isGroup ? entity.groupID : 0;
            const sceneid = value;
            const response = await entity.command('genScenes', 'store', {groupid, sceneid}, getOptions(meta.mapped));

            if (isGroup) {
                if (meta.membersState) {
                    for (const member of entity.members) {
                        saveSceneState(member, sceneid, groupid, meta.membersState[member.getDevice().ieeeAddr]);
                    }
                }
            } else if (response.status === 0) {
                saveSceneState(entity, sceneid, groupid, meta.state);
            } else {
                throw new Error(`Scene add not succesfull ('${common.zclStatus[response.status]}')`);
            }

            return {state: {}};
        },
    },
    scene_recall: {
        key: ['scene_recall'],
        convertSet: async (entity, key, value, meta) => {
            const groupid = entity.constructor.name === 'Group' ? entity.groupID : 0;
            const sceneid = value;
            await entity.command('genScenes', 'recall', {groupid, sceneid}, utils.getOptions(meta.mapped));

            const addColorMode = (newState) => {
                if (newState.hasOwnProperty('color_temp')) {
                    newState.color_mode = constants.colorMode[2];
                    //RS://
                    newState.mode = 'ct';
                } else if (newState.hasOwnProperty('color')) {
                    if (newState.color.hasOwnProperty('x')) {
                        newState.color_mode = constants.colorMode[1];
                        //RS://
                        newState.mode = 'xy';
                    } else {
                        newState.color_mode = constants.colorMode[0];
                        //RS://
                        newState.mode = 'ct';
                    }
                }

                return newState;
            };

            const isGroup = entity.constructor.name === 'Group';
            const metaKey = `${sceneid}_${groupid}`;
            if (isGroup) {
                const membersState = {};
                for (const member of entity.members) {
                    membersState[member.getDevice().ieeeAddr] = member.meta.scenes[metaKey].state;
                }

                return {membersState};
            } else {
                return {state: entity.meta.scenes[metaKey].state};
            }
        },
    },
    scene_add: {
        key: ['scene_add'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== 'object' || !value.hasOwnProperty('ID')) {
                throw new Error('Invalid payload');
            }

            if (value.hasOwnProperty('color_temp') && value.hasOwnProperty('color')) {
                throw new Error(`Don't specify both 'color_temp' and 'color'`);
            }

            const isGroup = entity.constructor.name === 'Group';
            const groupid = isGroup ? entity.groupID : 0;
            const sceneid = value.ID;
            const scenename = '';
            const transtime = value.hasOwnProperty('transition') ? value.transition : 0;

            const state = {};
            const extensionfieldsets = [];
            for (let [attribute, val] of Object.entries(value)) {
                if (attribute === 'state') {
                    extensionfieldsets.push({'clstId': 6, 'len': 1, 'extField': [val.toLowerCase() === 'on' ? 1 : 0]});
                    state['state'] = val.toUpperCase();
                } else if (attribute === 'brightness') {
                    extensionfieldsets.push({'clstId': 8, 'len': 1, 'extField': [val]});
                    state['brightness'] = val;
                } else if (attribute === 'color_temp') {
                    extensionfieldsets.push({'clstId': 768, 'len': 13, 'extField': [0, 0, 0, 0, 0, 0, 0, val]});
                    state['color_temp'] = val;
                    //RS://
                    state['mode'] = 'ct';
                } else if (attribute === 'color') {
                    try {
                        val = JSON.parse(val);
                    } catch (e) {
                        e;
                    }
                    const color = typeof val === 'string' ? utils.hexToXY(val) : val;
                    if (color.hasOwnProperty('x') && color.hasOwnProperty('y')) {
                        const xScaled = utils.mapNumberRange(color.x, 0, 1, 0, 65535);
                        const yScaled = utils.mapNumberRange(color.y, 0, 1, 0, 65535);
                        extensionfieldsets.push(
                            {
                                'clstId': 768,
                                'len': 4,
                                'extField': [xScaled, yScaled],
                            },
                        );
                        //RS://
                        state['color'] = {hex: value.hex, x: color.x, y: color.y};
                        state['mode'] = 'xy';
                    } else if (color.hasOwnProperty('hue') && color.hasOwnProperty('saturation')) {
                        if (utils.getMetaValue(entity, meta.mapped, 'enhancedHue', 'allEqual', true)) {
                            const hsv = utils.gammaCorrectHSV(utils.correctHue(color.hue, meta), color.saturation, 100);
                            const hScaled = utils.mapNumberRange(hsv.h % 360, 0, 360, 0, 65535);
                            const sScaled = utils.mapNumberRange(hsv.s, 0, 100, 0, 254);
                            extensionfieldsets.push(
                                {
                                    'clstId': 768,
                                    'len': 13,
                                    'extField': [0, 0, hScaled, sScaled, 0, 0, 0, 0],
                                },
                            );
                        } else {
                            // The extensionFieldSet is always EnhancedCurrentHue according to ZCL
                            // When the bulb or all bulbs in a group do not support enhanchedHue,
                            // a fallback to XY is done by converting HSV -> RGB -> XY
                            const colorXY = utils.rgbToXY(...Object.values(utils.hsvToRgb(color.hue, color.saturation, 100)));
                            const xScaled = utils.mapNumberRange(colorXY.x, 0, 1, 0, 65535);
                            const yScaled = utils.mapNumberRange(colorXY.y, 0, 1, 0, 65535);
                            extensionfieldsets.push(
                                {
                                    'clstId': 768,
                                    'len': 4,
                                    'extField': [xScaled, yScaled],
                                },
                            );
                        }
                        state['color'] = {hue: color.hue, saturation: color.saturation};
                    }
                }
            }

            /*
             * Remove scene first
             *
             * Multiple add scene calls will result in the current and previous
             * payloads to be merged. Resulting in unexpected behavior when
             * trying to replace a scene.
             *
             * We accept a SUCESS or NOT_FOUND as a result of the remove call.
             */
            const removeresp = await entity.command(
                'genScenes', 'remove', {groupid, sceneid}, utils.getOptions(meta.mapped),
            );

            if (isGroup || (removeresp.status === 0 || removeresp.status == 133 || removeresp.status == 139)) {
                const response = await entity.command(
                    'genScenes', 'add', {groupid, sceneid, scenename, transtime, extensionfieldsets}, utils.getOptions(meta.mapped),
                );

                if (isGroup) {
                    if (meta.membersState) {
                        for (const member of entity.members) {
                            utils.saveSceneState(member, sceneid, groupid, state);
                        }
                    }
                } else if (response.status === 0) {
                    utils.saveSceneState(entity, sceneid, groupid, state);
                } else {
                    throw new Error(`Scene add not succesfull ('${herdsman.Zcl.Status[response.status]}')`);
                }
            }

            const response = await entity.command(
                'genScenes', 'add', {groupid, sceneid, scenename, transtime, extensionfieldsets}, getOptions(meta.mapped),
            );

            if (isGroup) {
                if (meta.membersState) {
                    for (const member of entity.members) {
                        saveSceneState(member, sceneid, groupid, state);
                    }
                }
            } else if (response.status === 0) {
                saveSceneState(entity, sceneid, groupid, state);
            } else {
                throw new Error(`Scene add not succesfull ('${common.zclStatus[response.status]}')`);
            }

            return {state: {}};
        },
    },
    TS0003_curtain_switch: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'close': 1, 'stop': 2, 'open': 1};
            const endpointID = lookup[value.toLowerCase()];
            const endpoint = entity.getDevice().getEndpoint(endpointID);
            await endpoint.command('genOnOff', 'on', {}, getOptions(meta.mapped, entity));
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['onOff']);
        },
    },
    saswell_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const temp = Math.round(value * 10);
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(temp);
            await sendTuyaCommand(entity, 615, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    saswell_thermostat_mode: {
        key: ['preset'],
        convertSet: async (entity, key, value, meta) => {
            if ( value == 'auto' ) {
                sendTuyaCommand(entity, 364, 0, [1, 1]);
            } else {
                sendTuyaCommand(entity, 364, 0, [1, 0]);
            }
        },
    },
    saswell_thermostat_standby: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            sendTuyaCommand(entity, 357, 0, [1, value === 'heat' ? 1 : 0]);
        },
    },
    ts0216_duration: {
        key: ['duration'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('ssIasWd', {'maxDuration': value});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('ssIasWd', ['maxDuration']);
        },
    },
    ts0216_volume: {
        key: ['volume'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('ssIasWd', {0x0002: {value: value, type: 0x20}});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('ssIasWd', [0x0002]);
        },
    },
    ts0216_alarm: {
        key: ['alarm'],
        convertSet: async (entity, key, value, meta) => {
            const info = (value) ? (2 << 4) + (1 << 2) + 0 : 0;

            await entity.command(
                'ssIasWd',
                'startWarning',
                {startwarninginfo: info, warningduration: 0},
                getOptions(meta.mapped, entity),
            );
        },
    },
    tuya_cover_calibration: {
        key: ['calibration'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'ON': 0, 'OFF': 1};
            const calibration = lookup[value.toUpperCase()];
            await entity.write('closuresWindowCovering', {tuyaCalibration: calibration});
            return {state: {calibration: value.toUpperCase()}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('closuresWindowCovering', ['tuyaCalibration']);
        },
    },
    tuya_cover_reversal: {
        key: ['motor_reversal'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'ON': 1, 'OFF': 0};
            const reversal = lookup[value.toUpperCase()];
            await entity.write('closuresWindowCovering', {tuyaMotorReversal: reversal});
            return {state: {motor_reversal: value.toUpperCase()}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('closuresWindowCovering', ['tuyaMotorReversal']);
        },
    },
    tuya_backlight_mode: {
        key: ['backlight_mode'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'LOW': 0, 'MEDIUM': 1, 'HIGH': 2};
            const backlight = lookup[value.toUpperCase()];
            await entity.write('genOnOff', {tuyaBacklightMode: backlight});
            return {state: {backlight_mode: value.toUpperCase()}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['tuyaBacklightMode']);
        },
    },
    hy_thermostat: {
        key: [
            'child_lock', 'current_heating_setpoint', 'local_temperature_calibration',
            'max_temperature_protection', 'min_temperature_protection', 'state',
            'hysteresis', 'hysteresis_for_protection',
            'max_temperature_for_protection', 'min_temperature_for_protection',
            'max_temperature', 'min_temperature',
            'sensor_type', 'power_on_behavior', 'week', 'system_mode',
            'away_preset_days', 'away_preset_temperature',
        ],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'max_temperature_protection':
                sendTuyaCommand(entity, 362, 0, [1, value==='ON' ? 1 : 0]);
                break;
            case 'min_temperature_protection':
                sendTuyaCommand(entity, 363, 0, [1, value==='ON' ? 1 : 0]);
                break;
            case 'state':
                sendTuyaCommand(entity, 381, 0, [1, value==='ON' ? 1 : 0]);
                break;
            case 'child_lock':
                sendTuyaCommand(entity, 385, 0, [1, value==='LOCKED' ? 1 : 0]);
                break;
            case 'away_preset_days':
                sendTuyaCommand(entity, 616, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'away_preset_temperature':
                sendTuyaCommand(entity, 617, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'local_temperature_calibration':
                value = Math.round(value * 10);
                if (value < 0) value = 0xFFFFFFFF + value + 1;
                sendTuyaCommand(entity, 621, 0, [4, ...utils.convertDecimalValueTo4ByteHexArray(value)]);
                break;
            case 'hysteresis':
                value = Math.round(value * 10);
                sendTuyaCommand(entity, 622, 0, [4, ...utils.convertDecimalValueTo4ByteHexArray(value)]);
                break;
            case 'hysteresis_for_protection':
                sendTuyaCommand(entity, 623, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'max_temperature_for_protection':
                sendTuyaCommand(entity, 624, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'min_temperature_for_protection':
                sendTuyaCommand(entity, 625, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'max_temperature':
                sendTuyaCommand(entity, 626, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'min_temperature':
                sendTuyaCommand(entity, 627, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'current_heating_setpoint':
                value = Math.round(value * 10);
                sendTuyaCommand(entity, 638, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'sensor_type':
                sendTuyaCommand(entity, 1140, 0, [1, {'internal': 0, 'external': 1, 'both': 2}[value]]);
                break;
            case 'power_on_behavior':
                sendTuyaCommand(entity, 1141, 0, [1, {'restore': 0, 'off': 1, 'on': 2}[value]]);
                break;
            case 'week':
                sendTuyaCommand(entity, 1142, 0, [1, utils.getKeyByValue(common.TuyaThermostatWeekFormat, value, value)]);
                break;
            case 'system_mode':
                sendTuyaCommand(entity, 1152, 0, [1, {'manual': 0, 'auto': 1, 'away': 2}[value]]);
                break;
            default: // Unknown key
                console.log(`Unhandled key ${key}`);
            }
        },
    },

    // Not a converter, can be used by tests to clear the store.
    __clearStore__: () => {
        for (const key of Object.keys(store)) {
            delete store[key];
        }

        globalStore.clear();
    },
};

module.exports = converters;
