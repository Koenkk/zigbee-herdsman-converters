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
            if (value === 'stop') {
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
            let hasBrightness = message.hasOwnProperty('brightness') || message.hasOwnProperty('brightness_percent');
            const brightnessValue = message.hasOwnProperty('brightness') ?
                Number(message.brightness) : Number(message.brightness_percent);
            let hasState = message.hasOwnProperty('state');
            let state = hasState ? message.state.toLowerCase() : null;
            const entityID = entity.constructor.name === 'Group' ? entity.groupID : entity.deviceIeeeAddress;

            if (hasBrightness && (isNaN(brightnessValue) || brightnessValue < 0 || brightnessValue > 255)) {
                // Allow 255 value, changing this to 254 would be a breaking change.
                throw new Error(`Brightness value of message: '${JSON.stringify(message)}' invalid, must be a number >= 0 and =< 254`);
            }

            if (!hasState && hasBrightness && brightnessValue === 0) {
                // Translate to an OFF.
                hasBrightness = false;
                hasState = true;
                state = 'off';
            }

            if (state === 'toggle' || state === 'off' || (!hasBrightness && state === 'on')) {
                const transition = getTransition(entity, 'brightness', meta);
                if (transition.specified && (state === 'off' || state === 'on')) {
                    if (state === 'off' && meta.state.brightness) {
                        // https://github.com/Koenkk/zigbee2mqtt/issues/2850#issuecomment-580365633
                        // We need to remember the state before turning the device off as we need to restore
                        // it once we turn it on again.
                        // We cannot rely on the meta.state as when reporting is enabled the bulb will reports
                        // it brightness while decreasing the brightness.
                        store[entityID] = {brightness: meta.state.brightness, turnedOffWithTransition: true};
                    }

                    const level = state === 'off' ? 0 : (store[entityID] ? store[entityID].brightness : 254);
                    const payload = {level, transtime: transition.time};
                    await entity.command(
                        'genLevelCtrl', 'moveToLevelWithOnOff', payload, getOptions(meta.mapped, entity),
                    );
                    return {state: {state: state.toUpperCase(), brightness: state === 'on' ? level : 0}};
                } else {
                    if (hasState && state === 'on' && store.hasOwnProperty(entityID) &&
                        store[entityID].turnedOffWithTransition) {
                        /**
                         * In case the bulb it turned OFF with a transition and turned ON WITHOUT
                         * a transition, the brightness is not recovered as it turns on with brightness 1.
                         * https://github.com/Koenkk/zigbee-herdsman-converters/issues/1073
                         */
                        const brightness = store[entityID].brightness;
                        store[entityID].turnedOffWithTransition = false;
                        await entity.command(
                            'genLevelCtrl',
                            'moveToLevelWithOnOff',
                            {level: Number(brightness), transtime: 0},
                            getOptions(meta.mapped, entity),
                        );
                        return {
                            state: {state: brightness === 0 ? 'OFF' : 'ON', brightness: Number(brightness)},
                            readAfterWriteTime: transition * 100,
                        };
                    } else {
                        // Store brightness where the bulb was turned off with as we need it when the bulb is turned on
                        // with transition.
                        if (meta.state.hasOwnProperty('brightness') && state === 'off' && meta.state.brightness !== 0) {
                            store[entityID] = {brightness: meta.state.brightness, turnedOffWithTransition: false};
                        }

                        const result = await converters.on_off.convertSet(entity, 'state', state, meta);
                        if (result.state) {
                            if (result.state.state === 'ON') {
                                result.readAfterWriteTime = 0;
                                if (store.hasOwnProperty(entityID)) {
                                    result.state.brightness = store[entityID].brightness;
                                } else if (meta.state.brightness === 0) {
                                    /**
                                     * In case bulb is turned off and the store is reset (because of application
                                     * restart) we don't know the previous brightness when on. Therefore retrieve
                                     * it from the bulb.
                                     * https://github.com/Koenkk/zigbee2mqtt/issues/3736
                                     */
                                    const entityToRead = getEntityOrFirstGroupMember(entity);
                                    if (entityToRead) {
                                        const readData = await entityToRead.read('genLevelCtrl', ['currentLevel']);
                                        result.state.brightness = readData.currentLevel;
                                    }
                                }
                            } else {
                                // off = brightness 0
                                result.state.brightness = 0;
                            }
                        }

                        return result;
                    }
                }
            } else {
                const transition = getTransition(entity, 'brightness', meta).time;
                let brightness = 0;

                if (message.hasOwnProperty('brightness')) {
                    brightness = message.brightness;
                } else if (message.hasOwnProperty('brightness_percent')) {
                    brightness = Math.round(Number(message.brightness_percent) * 2.55).toString();
                }
                brightness = Math.min(254, brightness);
                if (brightness === 1 && utils.getMetaValue(entity, meta.mapped, 'turnsOffAtBrightness1') === true) {
                    brightness = 2;
                }

                store[entityID] = {...store[entityID], brightness};
                await entity.command(
                    'genLevelCtrl',
                    'moveToLevelWithOnOff',
                    {level: Number(brightness), transtime: transition},
                    getOptions(meta.mapped, entity),
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
                value = {x: xy.x, y: xy.y};
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

            const zclData = {transtime: getTransition(entity, key, meta).time};

            switch (cmd) {
            case 'enhancedMoveToHueAndSaturationAndBrightness':
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
                zclData.enhancehue = value.hue;
                zclData.saturation = value.saturation;
                zclData.direction = value.direction || 0;
                break;
            case 'enhancedMoveToHue':
                zclData.enhancehue = value.hue;
                zclData.direction = value.direction || 0;
                break;
            case 'moveToHueAndSaturationAndBrightness':
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
                zclData.hue = value.hue;
                zclData.saturation = value.saturation;
                zclData.direction = value.direction || 0;
                break;
            case 'moveToHue':
                zclData.hue = value.hue;
                zclData.direction = value.direction || 0;
                break;
            case 'moveToSaturation':
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

                newState.color = {x: value.x, y: value.y};
                zclData.colorx = Math.round(value.x * 65535);
                zclData.colory = Math.round(value.y * 65535);
            }
            await entity.command('lightingColorCtrl', cmd, zclData, getOptions(meta.mapped, entity));
            return {state: newState, readAfterWriteTime: zclData.transtime * 100};
        },
        convertGet: async (entity, key, meta) => {
            // Some bulb like Ikea Tådfri LED1624G9 do not support 'currentHue' and 'currentSaturation' attributes.
            // Skip them if the `supportsHueAndSaturation` flag is set to false
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1340
            const attributes = ['currentX', 'currentY'];
            if (meta.mapped && meta.mapped.meta && meta.mapped.meta.supportsHueAndSaturation !== false) {
                attributes.push('currentHue', 'currentSaturation');
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
                if (result.state && result.state.color.hasOwnProperty('x') && result.state.color.hasOwnProperty('y')) {
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
            await entity.command('genIdentify', 'triggerEffect', payload, getOptions(meta.mapped, entity));
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
            globalStore.putValue(entity.deviceIeeeAddress, 'panelStatus', panelStatus);
            const payload = {panelstatus: panelStatus, secondsremain: 0, audiblenotif: 0, alarmstatus: 0};
            entity.commandResponse('ssIasAce', 'panelStatusChanged', payload);
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
    xiaomi_switch_operation_mode: {
        key: ['operation_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (['QBKG11LM', 'QBKG04LM', 'QBKG03LM', 'QBKG12LM', 'QBKG21LM', 'QBKG22LM'].includes(meta.mapped.model)) {
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
            if (['QBKG11LM', 'QBKG04LM', 'QBKG03LM', 'QBKG12LM', 'QBKG21LM', 'QBKG22LM'].includes(meta.mapped.model)) {
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
                if (result.state && result.state.color.hasOwnProperty('x') && result.state.color.hasOwnProperty('y')) {
                    result.state.color_temp = utils.xyToMireds(result.state.color.x, result.state.color.y);
                }

                return result;
            } else if (key == 'color_temp' || key == 'color_temp_percent') {
                const result = await converters.gledopto_light_colortemp.convertSet(entity, key, value, meta);
                result.state.color = utils.miredsToXY(result.state.color_temp);
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
            if (value.hasOwnProperty('inputConfigurations')) {
                // example: [0, 0, 0, 0]
                await devMgmtEp.write('manuSpecificUbisysDeviceSetup',
                    {'inputConfigurations': {elementType: 'data8', elements: value.inputConfigurations}});
            }
            if (value.hasOwnProperty('inputActions')) {
                // example (default for C4): [[0,13,1,6,0,2], [1,13,2,6,0,2], [2,13,3,6,0,2], [3,13,4,6,0,2]]
                await devMgmtEp.write('manuSpecificUbisysDeviceSetup',
                    {'inputActions': {elementType: 'octetStr', elements: value.inputActions}});
            }
            converters.ubisys_device_setup.convertGet(entity, key, meta);
        },
        convertGet: async (entity, key, meta) => {
            const log = (json) => {
                meta.logger.warn(
                    `ubisys: Device setup read for '${meta.options.friendlyName}': ${JSON.stringify(json)}`);
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
            sendTuyaCommand(entity, 256 + keyid, 0, [1, value === 'ON' ? 1 : 0]);
            return {state: {state: value.toUpperCase()}};
        },
    },
    RM01_on_off: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            if (utils.hasEndpoints(meta.device, [0x12])) {
                const endpoint = meta.device.getEndpoint(0x12);
                return await converters.on_off.convertSet(endpoint, key, value, meta);
            } else {
                throw new Error('OnOff not supported on this RM01 device.');
            }
        },
        convertGet: async (entity, key, meta) => {
            if (utils.hasEndpoints(meta.device, [0x12])) {
                const endpoint = meta.device.getEndpoint(0x12);
                return await converters.on_off.convertGet(endpoint, key, meta);
            } else {
                throw new Error('OnOff not supported on this RM01 device.');
            }
        },
    },
    RM01_light_brightness: {
        key: ['brightness', 'brightness_percent'],
        convertSet: async (entity, key, value, meta) => {
            if (utils.hasEndpoints(meta.device, [0x12])) {
                const endpoint = meta.device.getEndpoint(0x12);
                return await converters.light_brightness.convertSet(endpoint, key, value, meta);
            } else {
                throw new Error('LevelControl not supported on this RM01 device.');
            }
        },
        convertGet: async (entity, key, meta) => {
            if (utils.hasEndpoints(meta.device, [0x12])) {
                const endpoint = meta.device.getEndpoint(0x12);
                return await converters.light_brightness.convertGet(endpoint, key, meta);
            } else {
                throw new Error('LevelControl not supported on this RM01 device.');
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

    // Tuya Thermostat
    tuya_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            sendTuyaCommand(entity, 263, 0, [1, value==='LOCK' ? 1 : 0]);
        },
    },
    tuya_thermostat_window_detection: {
        key: ['window_detection'],
        convertSet: async (entity, key, value, meta) => {
            sendTuyaCommand(entity, 104, 0, [1, value==='ON' ? 1 : 0]);
            sendTuyaCommand(entity, 274, 0, [1, value==='ON' ? 1 : 0]);
        },
    },
    tuya_thermostat_valve_detection: {
        key: ['valve_detection'],
        convertSet: async (entity, key, value, meta) => {
            sendTuyaCommand(entity, 276, 0, [1, value==='ON' ? 1 : 0]);
        },
    },
    tuya_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const temp = Math.round(value * 10);
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(temp);
            sendTuyaCommand(entity, 514, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_system_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            const modeId = utils.getKeyByValue(utils.getMetaValue(entity, meta.mapped, 'tuyaThermostatSystemMode'), value, null);
            if (modeId !== null) {
                sendTuyaCommand(entity, 1028, 0, [1, parseInt(modeId)]);
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
                sendTuyaCommand(entity, 1028, 0, [1, parseInt(presetId)]);
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
                sendTuyaCommand(entity, 1029, 0, [1, parseInt(modeId)]);
            } else {
                console.log(`TRV fan mode ${value} is not recognized.`);
            }
        },
    },
    tuya_thermostat_auto_lock: {
        key: ['auto_lock'],
        convertSet: async (entity, key, value, meta) => {
            sendTuyaCommand(entity, 372, 0, [1, value==='AUTO' ? 1 : 0]);
        },
    },
    tuya_thermostat_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value, meta) => {
            const temp = Math.round(value * 10);
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(temp);
            sendTuyaCommand(entity, 556, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_min_temp: {
        key: ['min_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            sendTuyaCommand(entity, 614, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_max_temp: {
        key: ['max_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            sendTuyaCommand(entity, 615, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_boost_time: {
        key: ['boost_time'],
        convertSet: async (entity, key, value, meta) => {
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            sendTuyaCommand(entity, 617, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_comfort_temp: {
        key: ['comfort_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            sendTuyaCommand(entity, 619, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_eco_temp: {
        key: ['eco_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const payloadValue = utils.convertDecimalValueTo2ByteHexArray(value);
            sendTuyaCommand(entity, 620, 0, [4, 0, 0, ...payloadValue]);
        },
    },
    tuya_thermostat_force: {
        key: ['force'],
        convertSet: async (entity, key, value, meta) => {
            const modeId = utils.getKeyByValue(common.TuyaThermostatForceMode, value, null);
            if (modeId !== null) {
                sendTuyaCommand(entity, 1130, 0, [1, parseInt(modeId)]);
            } else {
                console.log(`TRV force mode ${value} is not recognized.`);
            }
        },
    },
    tuya_curtain_control: {
        key: ['state', 'position'],
        convertSet: async (entity, key, value, meta) => {
            // Protocol description
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1159#issuecomment-614659802

            if (key === 'position') {
                if (value >= 0 && value <= 100) {
                    const invert = !(meta.mapped.meta && meta.mapped.meta.coverInverted ?
                        !meta.options.invert_cover : meta.options.invert_cover);
                    value = invert ? 100 - value : value;
                    sendTuyaCommand(entity, 514, 0, [4, 0, 0, 0, value]); // 0x02 0x02: Set position from 0 - 100%
                } else {
                    meta.logger.debug('owvfni3: Curtain motor position is out of range');
                }
            } else if (key === 'state') {
                value = value.toLowerCase();

                switch (value) {
                case 'open':
                    sendTuyaCommand(entity, 1025, 0, [1, 2]); // 0x04 0x01: Open
                    break;
                case 'close':
                    sendTuyaCommand(entity, 1025, 0, [1, 0]); // 0x04 0x01: Close
                    break;
                case 'stop':
                    sendTuyaCommand(entity, 1025, 0, [1, 1]); // 0x04 0x01: Stop
                    break;
                default:
                    meta.logger.debug('owvfni3: Invalid command received');
                    break;
                }
            }
        },
    },
    tuya_curtain_options: {
        key: ['options'],
        convertSet: async (entity, key, value, meta) => {
            if (value.reverse_direction != undefined) {
                if (value.reverse_direction) {
                    meta.logger.info('Motor direction reverse');
                    sendTuyaCommand(entity, 1029, 0, [1, 1]); // 0x04 0x05: Set motor direction to reverse
                } else {
                    meta.logger.info('Motor direction forward');
                    sendTuyaCommand(entity, 1029, 0, [1, 0]); // 0x04 0x05: Set motor direction to forward (default)
                }
            }
        },
    },
    diyruz_freepad_on_off_config: {
        key: ['switch_type', 'switch_actions'],
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
                sendTuyaCommand(entity, 360, 0, [1, value ? 1 : 0]);
                break;
            case 'melody':
                sendTuyaCommand(entity, 1126, 0, [1, parseInt(value, 10)]);
                break;
            case 'volume':
                sendTuyaCommand(entity, 1140, 0, [1, {'low': 2, 'medium': 1, 'high': 0}[value]]);
                break;
            case 'duration':
                sendTuyaCommand(entity, 615, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'temperature_max':
                sendTuyaCommand(entity, 620, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'temperature_min':
                sendTuyaCommand(entity, 619, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'humidity_max':
                sendTuyaCommand(entity, 621, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'humidity_min':
                sendTuyaCommand(entity, 622, 0, [4, 0, 0, ...utils.convertDecimalValueTo2ByteHexArray(value)]);
                break;
            case 'temperature_alarm':
                sendTuyaCommand(entity, 369, 0, [1, value ? 1 : 0]);
                break;
            case 'humidity_alarm':
                sendTuyaCommand(entity, 370, 0, [1, value ? 1 : 0]);
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
    },
};

module.exports = converters;
