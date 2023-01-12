'use strict';

const ColorXY = require('./color').ColorXY;
const ColorRGB = require('./color').ColorRGB;
const extendDontUse = require('./extend');
const ota = require('./ota');
const exposes = require('./exposes');
const tz = require('../converters/toZigbee');
const libColor = require('./color');
const utils = require('./utils');
const herdsman = require('zigbee-herdsman');
const globalStore = require('./store');
const ea = exposes.access;

const encodeRGBToScaledGradient = (hex) => {
    const xy = ColorRGB.fromHex(hex).toXY();
    const x = xy.x * 4095 / 0.7347;
    const y = xy.y * 4095 / 0.8413;
    const xx = Math.round(x).toString(16);
    const yy = Math.round(y).toString(16);

    return [
        xx[1], xx[2],
        yy[2], xx[0],
        yy[0], yy[1],
    ].join('');
};

const decodeScaledGradientToRGB = (p) => {
    const x = p[3] + p[0] + p[1];
    const y = p[4] + p[5] + p[2];

    const xx = (parseInt(x, 16) * 0.7347 / 4095).toFixed(4);
    const yy = (parseInt(y, 16) * 0.8413 / 4095).toFixed(4);

    return new ColorXY(xx, yy).toRGB().toHEX();
};

const COLOR_MODE_GRADIENT = '4b01';
const COLOR_MODE_COLOR_XY = '0b00';
const COLOR_MODE_COLOR_TEMP = '0f00';
const COLOR_MODE_EFFECT = 'ab00';
const COLOR_MODE_BRIGHTNESS = '0300';

const knownEffects = {
    '0180': 'candle',
    '0280': 'fireplace',
    '0380': 'colorloop',
    '0980': 'sunrise',
    '0a80': 'sparkle',
};

const hueExtend = {
    light_onoff_brightness: (options={}) => {
        options = {disableHueEffects: true, ...options};
        if (!options.disableHueEffects) options.disableEffect = true;
        const result = extendDontUse.light_onoff_brightness(options);
        result['ota'] = ota.zigbeeOTA;
        result['meta'] = {turnsOffAtBrightness1: true};
        result['toZigbee'] = result['toZigbee'].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]);
        if (!options.disableHueEffects) {
            result['toZigbee'] = result['toZigbee'].concat([tzLocal.effect]);
            result['exposes'] = result['exposes'].concat([exposes.enum('effect', ea.SET,
                ['blink', 'breathe', 'okay', 'channel_change', 'candle', 'finish_effect', 'stop_effect', 'stop_hue_effect'])]);
        }
        return result;
    },
    light_onoff_brightness_colortemp: (options={}) => {
        options = {disableHueEffects: true, ...options};
        if (!options.disableHueEffects) options.disableEffect = true;
        const result = extendDontUse.light_onoff_brightness_colortemp(options);
        result['ota'] = ota.zigbeeOTA;
        result['meta'] = {turnsOffAtBrightness1: true};
        result['toZigbee'] = result['toZigbee'].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]);
        if (!options.disableHueEffects) {
            result['toZigbee'] = result['toZigbee'].concat([tzLocal.effect]);
            result['exposes'] = result['exposes'].concat([exposes.enum('effect', ea.SET,
                ['blink', 'breathe', 'okay', 'channel_change', 'candle', 'finish_effect', 'stop_effect', 'stop_hue_effect'])]);
        }
        return result;
    },
    light_onoff_brightness_color: (options={}) => {
        options = {disableHueEffects: true, ...options};
        if (!options.disableHueEffects) options.disableEffect = true;
        const result = extendDontUse.light_onoff_brightness_color({supportsHS: true, ...options});
        result['ota'] = ota.zigbeeOTA;
        result['meta'] = {turnsOffAtBrightness1: true};
        result['toZigbee'] = result['toZigbee'].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]);
        if (!options.disableHueEffects) {
            result['toZigbee'] = result['toZigbee'].concat([tzLocal.effect]);
            result['exposes'] = result['exposes'].concat([exposes.enum('effect', ea.SET, [
                'blink', 'breathe', 'okay', 'channel_change',
                'candle', 'fireplace', 'colorloop',
                'finish_effect', 'stop_effect', 'stop_hue_effect',
            ])]);
        }
        return result;
    },
    light_onoff_brightness_colortemp_color: (options={}) => {
        options = {disableHueEffects: true, ...options};
        if (!options.disableHueEffects) options.disableEffect = true;
        const result = extendDontUse.light_onoff_brightness_colortemp_color({supportsHS: true, ...options});
        result['ota'] = ota.zigbeeOTA;
        result['meta'] = {turnsOffAtBrightness1: true};
        result['toZigbee'] = result['toZigbee'].concat([tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error]);
        if (!options.disableHueEffects) {
            result['toZigbee'] = result['toZigbee'].concat([tzLocal.effect]);
            result['exposes'] = result['exposes'].concat([exposes.enum('effect', ea.SET, [
                'blink', 'breathe', 'okay', 'channel_change',
                'candle', 'fireplace', 'colorloop',
                'finish_effect', 'stop_effect', 'stop_hue_effect',
            ])]);
        }
        return result;
    },
    light_onoff_brightness_colortemp_color_gradient: (options={}) => {
        options = {supportsHS: true, disableEffect: true, extraEffects: [], ...options};
        const result = extendDontUse.light_onoff_brightness_colortemp_color({noConfigure: true, ...options});
        result['ota'] = ota.zigbeeOTA;
        result['meta'] = {turnsOffAtBrightness1: true};
        result['toZigbee'] = result['toZigbee'].concat([
            tzLocal.hue_power_on_behavior, tzLocal.hue_power_on_error, tzLocal.effect,
            tzLocal.gradient_scene, tzLocal.gradient({reverse: true}),
        ]);
        result['fromZigbee'] = result['fromZigbee'].concat([fzLocal.gradient({reverse: true})]);
        result['configure'] = async (device, coordinatorEndpoint, logger) => {
            await extendDontUse.light_onoff_brightness_colortemp_color(options)
                .configure(device, coordinatorEndpoint, logger);
            for (const ep of device.endpoints) {
                await ep.bind('manuSpecificPhilips2', coordinatorEndpoint);
            }
        };
        result['exposes'] = result['exposes'].concat([
            // gradient_scene is deprecated, use gradient instead
            exposes.enum('gradient_scene', ea.SET, Object.keys(gradientScenes)),
            exposes.list('gradient', ea.ALL, exposes.text('hex', 'Color in RGB HEX format (eg #663399)'))
                .withLengthMin(1)
                .withLengthMax(9)
                .withDescription('List of RGB HEX colors'),
            exposes.enum('effect', ea.SET, [
                'blink', 'breathe', 'okay', 'channel_change',
                'candle', 'fireplace', 'colorloop', 'sunrise',
                'finish_effect', 'stop_effect', 'stop_hue_effect',
                ...options.extraEffects,
            ]),
        ]);
        return result;
    },
};

const tzLocal = {
    gradient_scene: {
        key: ['gradient_scene'],
        convertSet: async (entity, key, value, meta) => {
            const scene = gradientScenes[value];
            if (!scene) throw new Error(`Gradient scene '${value}' is unknown`);
            const payload = {data: Buffer.from(scene, 'hex')};
            await entity.command('manuSpecificPhilips2', 'multiColor', payload);
        },
    },
    gradient: (opts = {reverse: false}) => {
        return {
            key: ['gradient'],
            convertSet: async (entity, key, value, meta) => {
                const scene = encodeGradientColors(value, opts);
                const payload = {data: Buffer.from(scene, 'hex')};
                await entity.command('manuSpecificPhilips2', 'multiColor', payload);
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificPhilips2', ['state']);
            },
        };
    },
    effect: {
        key: ['effect'],
        convertSet: async (entity, key, value, meta) => {
            if (Object.keys(hueEffects).includes(value.toLowerCase())) {
                await entity.command('manuSpecificPhilips2', 'multiColor', {data: Buffer.from(hueEffects[value.toLowerCase()], 'hex')});
            } else {
                return await tz.effect.convertSet(entity, key, value, meta);
            }
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
                    colorTemperature: (readResult.colorCapabilities & 1 << 4) > 0,
                    colorXY: (readResult.colorCapabilities & 1 << 3) > 0,
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
                    await entity.write('lightingColorCtrl', {0x0003: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                    await entity.write('lightingColorCtrl', {0x0004: {value: 0xffff, type: 0x21}}, manufacturerOptions);
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
                            await entity.write('lightingColorCtrl', {0x0003: {value: 0xFFFF, type: 0x21}}, manufacturerOptions);
                            await entity.write('lightingColorCtrl', {0x0004: {value: 0xFFFF, type: 0x21}}, manufacturerOptions);
                        }
                    } else if (meta.message.hasOwnProperty('hue_power_on_color')) {
                        const colorXY = libColor.ColorRGB.fromHex(meta.message.hue_power_on_color).toXY();
                        value = {x: utils.mapNumberRange(colorXY.x, 0, 1, 0, 65535), y: utils.mapNumberRange(colorXY.y, 0, 1, 0, 65535)};

                        // Set colortemp to default
                        if (supports.colorTemperature) {
                            await entity.write('lightingColorCtrl', {0x4010: {value: 366, type: 0x21}});
                        }

                        await entity.write('lightingColorCtrl', {0x0003: {value: value.x, type: 0x21}}, manufacturerOptions);
                        await entity.write('lightingColorCtrl', {0x0004: {value: value.y, type: 0x21}}, manufacturerOptions);
                    } else {
                        // Set defaults for colortemp and color
                        if (supports.colorTemperature) {
                            await entity.write('lightingColorCtrl', {0x4010: {value: 366, type: 0x21}});
                        }

                        if (supports.colorXY) {
                            await entity.write('lightingColorCtrl', {0x0003: {value: 0xFFFF, type: 0x21}}, manufacturerOptions);
                            await entity.write('lightingColorCtrl', {0x0004: {value: 0xFFFF, type: 0x21}}, manufacturerOptions);
                        }
                    }
                }
            }

            return {state: {hue_power_on_behavior: value}};
        },
    },
    hue_power_on_error: {
        key: ['hue_power_on_brightness', 'hue_power_on_color_temperature', 'hue_power_on_color'],
        convertSet: async (entity, key, value, meta) => {
            if (!meta.message.hasOwnProperty('hue_power_on_behavior')) {
                throw new Error(`Provide a value for 'hue_power_on_behavior'`);
            }
        },
    },
    hue_motion_sensitivity: {
        // motion detect sensitivity, philips specific
        key: ['motion_sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            // make sure you write to second endpoint!
            const lookup = {'low': 0, 'medium': 1, 'high': 2, 'very_high': 3, 'max': 4};
            value = value.toLowerCase();
            utils.validateValue(value, Object.keys(lookup));

            const payload = {48: {value: lookup[value], type: 32}};
            await entity.write('msOccupancySensing', payload, manufacturerOptions);
            return {state: {motion_sensitivity: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('msOccupancySensing', [48], manufacturerOptions);
        },
    },
    hue_motion_led_indication: {
        key: ['led_indication'],
        convertSet: async (entity, key, value, meta) => {
            const payload = {0x0033: {value, type: 0x10}};
            await entity.write('genBasic', payload, manufacturerOptions);
            return {state: {led_indication: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genBasic', [0x0033], manufacturerOptions);
        },
    },
};


const manufacturerOptions = {manufacturerCode: herdsman.Zcl.ManufacturerCode.PHILIPS};

const gradientScenes = {
    'blossom': '50010400135000000039d553d2955ba5287a9f697e25fb802800',
    'crocus': '50010400135000000050389322f97f2b597343764cc664282800',
    'precious': '5001040013500000007fa8838bb9789a786d7577499a773f2800',
    'narcissa': '500104001350000000b0498a5c0a888fea89eb0b7ee15c742800',
    'beginnings': '500104001350000000b3474def153e2ad42e98232c7483292800',
    'first_light': '500104001350000000b28b7900e959d3f648a614389723362800',
    'horizon': '500104001350000000488b7d6cbb750c6642f1133cc4033c2800',
    'valley_dawn': '500104001350000000c1aa7de03a7a8ce861c7c4410d94412800',
    'sunflare': '500104001350000000d0aa7d787a7daf197590154d6c14472800',
    'emerald_flutter': '5001040013500000006a933977e34bb0d35e916468f246792800',
    'memento': '500104001350000000f87318a3e31962331ec3532cceea892800',
    'resplendent': '500104001350000000278b6d257a58efe84204273a35f5252800',
    'scarlet_dream': '500104001350000000b02c654e4c5b45ab51fb0950d6c84d2800',
    'lovebirds': '50010400135000000053ab84ea1a7e35fb7c098c73994c772800',
    'smitten': '500104001350000000fe7b70a74b6aa42b65811b60550a592800',
    'glitz_and_glam': '500104001350000000cc193cb9b845bad9521d1c77bf6c712800',
    'promise': '500104001350000000258b606eca6b28d6382db445df26812800',
    'ruby_romance': '5001040013500000000edb63cbcb6bac0c670b2d58204e572800',
    'city_of_love': '50010400135000000055830e5cf31b6aa339d2ec70908b802800',
    'honolulu': '500104001350000000dbfd59866c6378ec6c45cc765c0a822800',
    'savanna_sunset': '50010400135000000005ae65c38c6c6b4b7573ca820fc9832800',
    'golden_pond': '5001040013500000007e4a88cc4a8605db8728ec7b666c792800',
    'runy_glow': '50010400135000000095bb53ac2a56eb99591e095c54985e2800',
    'tropical_twilight': '500104001350000000408523a0b636e777524c0a71a76c6e2800',
    'miami': '50010400135000000022ec61e6d94902d83766c3305a43182800',
    'cancun': '500104001350000000a7eb54673d55944e6265fd6e26bb842800',
    'rio': '500104001350000000a26526088c51a74b58ea6b7137ba892800',
    'chinatown': '500104001350000000b33e5b408e59d90d5b4c6c6360ac792800',
    'ibiza': '500104001350000000014d6d708c73827b7b6c7a8887f98a2800',
    'osaka': '500104001350000000d649510b5c4deb7c5d8b6d6d2b9b802800',
    'tokyo': '500104001350000000d1c311665331d3451fd59c4e394c7b2800',
    'motown': '50010400135000000055730e5db3156623306c533d7a235c2800',
    'fairfax': '50010400135000000072d34a3664477d7a61581d5fc08e5b2800',
    'galaxy': '500104001350000000a6cb638b2a4f8cfa549bb9549ff73a2800',
    'starlight': '5001040013500000008d897134a9653ec854d2963ed1d4282800',
    'blood moon': '500104001350000000202a6987c8599ee647ec632779c3142800',
    'artic_aurora': '50010400135000000082548922057511046571c32d5b93192800',
    'moonlight': '50010400135000000055730e5e9320c1832e96243ebec7652800',
    'nebula': '50010400135000000026c852e106460d653ee745342964142800',
    'sundown': '500104001350000000f37c68157c6d8efa755ac5512e24332800',
    'blue_lagoon': '50010400135000000088c3623975699ea672a0c8831ada6d2800',
    'palm_beach': '5001040013500000005ec4679ba56077f85a80ea64639c6a2800',
    'lake_placid': '5001040013500000002eab69239a692d996552c54c39743a2800',
    'mountain_breeze': '500104001350000000df843d2355419195465a98674ca97b2800',
    'lake_mist': '500104001350000000e3286f39b96859f86266e54ded943f2800',
    'ocean_dawn': '5001040013500000005cf9779da97105b96b07485e32564a2800',
    'frosty_dawn': '5001040013500000006d6883bca87e3029758ec9722d6a722800',
    'sunday_morning': '5001040013500000002c586dc6f87345997c63f983f777892800',
    'emerald_isle': '500104001350000000e535628dc57ed2667d8b687d1e2a812800',
    'spring_blossom': '500104001350000000a8b75fd0c75826b851a7094d305b652800',
    'midsummer_sun': '500104001350000000002984799984dd29848eba836c0b7f2800',
    'autumn_gold': '500104001350000000435a7817aa7ba3f979a8a981f3c9852800',
    'spring_lake': '5001040013500000004a976d3347736e677561b77a4b07812800',
    'winter_mountain': '5001040013500000002c555c68c55d7c555ef165606136622800',
    'midwinter': '500104001350000000bda5532c554dbd254cd5a4428d94392800',
    'amber_bloom': '500104001350000000739d67f2bc7372ec78a0ab78be8a6f2800',
    'lily': '5001040013500000009cfc76c5ab793d4a6a1a9b586b9c522800',
    'painted_sky': '500104001350000000d1c424c3d63783384c3f7a6a83bd6d2800',
    'winter_beauty': '500104001350000000e2335ea7b4942467952db986a7ab7b2800',
    'orange_fields': '500104001350000000409c69694c79eafa88498a8fb867aa2800',
    'forest_adventure': '50010400135000000023999bbd76b363d4b674d3415fb3222800',
    'blue_planet': '50010400135000000037a7a3a403b489737b2b746e6873362800',
    'soho': '500104001350000000c52c4e220b6eed8a53d404192b04782800',
    'vapor_wave': '500104001350000000e1c32401251acb183ac31b8051ea842800',
    'magneto': '50010400135000000077b3286d9340b9e3662d99943c9b852800',
    'tyrell': '500104001350000000ef4419a898370ea84698353574434e2800',
    'disturbia': '50010400135000000084f371a4845e6998388c3b4f57ce582800',
    'hal': '50010400135000000075f351a6244cf6dc5d480c658cda862800',
    'golden_star': '5001040013500000007a4a8702eb8372ac7892cd61d51e5c2800',
    'under_the_tree': '5001040013500000001de498b9a3cc0c9b8563bb6cc1ae5d2800',
    'silent_night': '5001040013500000009e296a245a6f660a75086b70953b6e2800',
    'rosy_sparkle': '500104001350000000810967c63a6cb2aa5ea7094eddd73c2800',
    'festive_fun': '5001040013500000005a9318de53123e9414fdcc67839d612800',
    'colour_burst': '500104001350000000f2731ff0c6266a6c64246e57d4f98f2800',
    'crystalline': '5001040013500000006ea96a92a85e58074e18543d9cf3332800',
};

const hueEffects = {
    'candle': '21000101',
    'fireplace': '21000102',
    'colorloop': '21000103',
    'sunrise': '21000109',
    'sparkle': '2100010a',
    'stop_hue_effect': '200000',
};

const fzLocal = {
    hue_tap_dial: {
        cluster: 'manuSpecificPhilips',
        type: 'commandHueNotification',
        options: [exposes.options.simulated_brightness()],
        convert: (model, msg, publish, options, meta) => {
            const buttonLookup = {1: 'button_1', 2: 'button_2', 3: 'button_3', 4: 'button_4', 20: 'dial'};
            const button = buttonLookup[msg.data['button']];
            const typeLookup = {0: 'press', 1: 'hold', 2: 'press_release', 3: 'hold_release'};
            const type = typeLookup[msg.data['type']];
            const direction = msg.data['unknown2'] <127 ? 'right' : 'left';
            const time = msg.data['time'];
            const payload = {};

            if (button === 'dial') {
                const adjustedTime = direction === 'right' ? time : 256 - time;
                const dialType = 'rotate';
                const speed = adjustedTime <= 25 ? 'step' : adjustedTime <= 75 ? 'slow' : 'fast';
                payload.action = `${button}_${dialType}_${direction}_${speed}`;

                // simulated brightness
                if (options.simulated_brightness) {
                    const opts = options.simulated_brightness;
                    const deltaOpts = typeof opts === 'object' && opts.hasOwnProperty('delta') ? opts.delta : 35;
                    const delta = direction === 'right' ? deltaOpts : deltaOpts * -1;
                    const brightness = globalStore.getValue(msg.endpoint, 'brightness', 255) + delta;
                    payload.brightness = utils.numberWithinRange(brightness, 0, 255);
                    globalStore.putValue(msg.endpoint, 'brightness', payload.brightness);
                }
            } else {
                payload.action = `${button}_${type}`;
                // duration
                if (type === 'press') globalStore.putValue(msg.endpoint, 'press_start', Date.now());
                else if (type === 'hold' || type === 'hold_release') {
                    payload.action_duration = (Date.now() - globalStore.getValue(msg.endpoint, 'press_start')) / 1000;
                }
            }
            return payload;
        },
    },
    gradient: (opts = {reverse: false}) => {
        return {
            cluster: 'manuSpecificPhilips2',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data && msg.data.hasOwnProperty('state')) {
                    const input = msg.data['state'].toString('hex');
                    const decoded = decodeGradientColors(input, opts);
                    if (decoded.color_mode === 'gradient') {
                        return {gradient: decoded.colors};
                    }
                }
                return {};
            },
        };
    },
};

// decoder for manuSpecificPhilips2.state
function decodeGradientColors(input, opts) {
    // Gradient mode (4b01)
    // Example: 4b010164fb74346b1350000000f3297fda7d55da7d55f3297fda7d552800
    // 4b01 - mode? (4) (0b00 single color?, 4b01 gradient?)
    //     01 - on/off (2)
    //       64 - brightness (2)
    //         fb74346b - unknown (8) - Might be XY Color?
    //                 13 - length (2)
    //                   50 - ncolors (2)
    //                     000000 - unknown (6)
    //                           f3297fda7d55da7d55f3297fda7d55 - colors (6 * ncolors)
    //                                                         28 - segments (2)
    //                                                           00 - offset (2)
    //
    // Temperature mode (0f00)
    // Example: 0f0000044d01ab6f7067
    // 0f00 - mode (4)
    //     01 - on/off (2)
    //       1a - brightness (2)
    //          4d01 - color temperature (4)
    //              ab6f7067 - unknown (8)
    //
    // XY Color mode (0b00)
    // Example: 0b00010460b09c4e
    // 0b00 - mode (4) == 0b00 single color mode
    //     01 - on/off (2)
    //       04 - brightness (2)
    //         60b09c4e - color (8) (xLow, xHigh, yLow, yHigh)
    //
    // Effect mode (ab00)
    // Example: ab000153df7e446a0180
    // ab00 - mode (4)
    //     01 - on/off (2)
    //       53 - brightness (2)
    //         df7e446a - XY Color (8)
    //                 0180 - effect (4)
    //
    // On/off/brightness mode (0003) – For devices that only support on/off and brightness
    // Example: 030001b2
    // 0300 - mode (4)
    //     01 - on/off (2)
    //       b2 - brightness (2)

    // Device color mode
    const mode = input.slice(0, 4);
    input = input.slice(4);

    // On/off (2 bytes)
    const on = parseInt(input.slice(0, 2), 16) === 1;
    input = input.slice(2);

    // Brightness (2 bytes)
    const brightness = parseInt(input.slice(0, 2), 16);
    input = input.slice(2);

    // Gradient mode
    if (mode === COLOR_MODE_GRADIENT) {
        // Unknown (8 bytes)
        input = input.slice(8);

        // Length (2 bytes)
        input = input.slice(2);

        // Number of colors (2 bytes)
        const nColors = parseInt(input.slice(0, 2), 16) >> 4;
        input = input.slice(2);

        // Unknown (6 bytes)
        input = input.slice(6);

        // Colors (6 * nColors bytes)
        const colorsPayload = input.slice(0, 6 * nColors);
        input = input.slice(6 * nColors);
        const colors = colorsPayload.match(/.{6}/g).map(decodeScaledGradientToRGB);

        // Segments (2 bytes)
        const segments = parseInt(input.slice(0, 2), 16) >> 3;
        input = input.slice(2);

        // Offset (2 bytes)
        const offset = parseInt(input.slice(0, 2), 16) >> 3;

        if (opts && opts.reverse) {
            colors.reverse();
        }

        return {
            color_mode: 'gradient',
            colors,
            segments,
            offset,
            brightness,
            on,
        };
    } else if (mode === COLOR_MODE_COLOR_XY || mode === COLOR_MODE_EFFECT) {
        // XY Color mode
        const xLow = parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const xHigh = parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);
        const yHigh = parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const yLow = parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);


        const x = Math.round((xHigh | xLow) / 65535 * 10000) / 10000;
        const y = Math.round((yHigh | yLow) / 65535 * 10000) / 10000;

        if (mode === COLOR_MODE_COLOR_XY) {
            return {
                color_mode: 'xy',
                x, y,
                brightness, on,
            };
        }

        // Effect mode
        const effect = input.slice(0, 4);
        const name = knownEffects[effect] || `unknown_${effect}`;
        return {
            color_mode: 'xy',
            x, y,
            brightness, on,
            name,
        };
    } else if (mode === COLOR_MODE_COLOR_TEMP) {
        // Color temperature mode
        const low = parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const high = parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);

        const temp = high | low;

        return {
            color_mode: 'color_temp',
            color_temp: temp,
            brightness,
            on,
        };
    } else if (mode === COLOR_MODE_BRIGHTNESS) {
        return {
            brightness,
            on,
        };
    }

    // Unknown mode
    return {};
}

// Value is a list of RGB HEX colors
function encodeGradientColors(value, opts) {
    if (value.length > 9) {
        throw new Error(`Expected up to 9 colors, got ${value.length}`);
    }
    if (value.length < 1) {
        throw new Error(`Expected at least 1 color, got 0`);
    }

    // For devices where it makes more sense to specify the colors in reverse
    // For example Hue Signe, where the last color is the top color.
    if (opts.reverse) {
        value.reverse();
    }

    // The number of colors and segments can technically differ. Here they are always the same, but we could
    // support it by extending the API.
    // If number of colors is less than the number of segments, the colors will repeat.
    // It seems like the maximum number of colors is 9, and the maximum number of segments is 31.
    const nColors = (value.length << 4).toString(16).padStart(2, '0');

    let segments = value.length;
    if (opts.segments) {
        segments = opts.segments;
    }

    if (segments < 1 || segments > 31) {
        throw new Error(`Expected segments to be between 1 and 31 (inclusive), got ${segments}`);
    }
    const segmentsPayload = (segments << 3).toString(16).padStart(2, '0');

    // Encode the colors
    const colorsPayload = value.map(encodeRGBToScaledGradient).join('');

    // Offset of the first color. 0 means the first segment uses the first color. (min 0, max 31)
    let offset = 0;
    if (opts.offset) {
        offset = opts.offset;
    }
    const offsetPayload = (offset << 3).toString(16).padStart(2, '0');

    // Payload length
    const length = (1 + 3 * (value.length + 1)).toString(16).padStart(2, '0');

    // 5001 - mode? set gradient?
    // 0400 - unknown
    const scene = `50010400${length}${nColors}000000${colorsPayload}${segmentsPayload}${offsetPayload}`;

    return scene;
}

module.exports = {
    decodeGradientColors,
    encodeGradientColors,
    hueExtend,
    tzLocal,
    fzLocal,
    gradientScenes,
    knownEffects,
};
