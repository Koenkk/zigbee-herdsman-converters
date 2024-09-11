import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as libColor from '../lib/color';
import {ColorMode, colorModeLookup} from '../lib/constants';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import {logger} from '../lib/logger';
import {
    onOff,
    quirkCheckinInterval,
    battery,
    deviceEndpoints,
    light,
    iasZoneAlarm,
    temperature,
    humidity,
    identify,
    actionEnumLookup,
    commandsOnOff,
    commandsLevelCtrl,
    electricityMeter,
    windowCovering,
} from '../lib/modernExtend';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import * as globalStore from '../lib/store';
import * as tuya from '../lib/tuya';
import {KeyValue, DefinitionWithExtend, Zh, Tz, Fz, Expose, KeyValueAny, KeyValueString, ModernExtend} from '../lib/types';
import * as utils from '../lib/utils';
import {addActionGroup, hasAlreadyProcessedMessage, postfixWithEndpointName} from '../lib/utils';
import * as zosung from '../lib/zosung';

const NS = 'zhc:tuya';
const {tuyaLight} = tuya.modernExtend;

const e = exposes.presets;
const ea = exposes.access;

const fzZosung = zosung.fzZosung;
const tzZosung = zosung.tzZosung;
const ez = zosung.presetsZosung;

const storeLocal = {
    getPrivatePJ1203A: (device: Zh.Device) => {
        let priv = globalStore.getValue(device, 'private_state');
        if (priv === undefined) {
            //
            // The PJ-1203A is sending quick sequences of messages containing a single datapoint.
            // A sequence occurs every `update_frequency` seconds (10s by default)
            //
            // A typical sequence is composed of two identical groups for channel a and b.
            //
            //     102 energy_flow_a
            //     112 voltage
            //     113 current_a
            //     101 power_a
            //     110 power_factor_a
            //     111 ac_frequency
            //     115 power_ab
            //     ---
            //     104 energy_flow_b
            //     112 voltage
            //     114 current_b
            //     105 power_b
            //     121 power_factor_b
            //     111 ac_frequency
            //     115 power_ab
            //
            // It should be noted that when no current is detected on channel x then
            // energy_flow_x is not emited and current_x==0, power_x==0 and power_factor_x==100.
            //
            // The other datapoints are emitted every few minutes.
            //
            // There is a known issue on the _TZE204_81yrt3lo (with appVersion 74, stackVersion 0 and hwVersion 1).
            // The energy_flow datapoints are (incorrectly) emited during the next update. This is quite problematic
            // because that means that the direction can be inverted for up to update_frequency seconds.
            //
            // The features implemented here are
            //   - cache the datapoints for each channel and publish them together.
            //   - (OPTIONAL) solve the issue described above by waiting for the next energy flow datapoint
            //     before publishing the cached channel data.
            //   - (OPTIONAL) provide signed power instead of energy flow.
            //   - detect missing or reordered Zigbee message using the Tuya 'seq' attibute and invalidate
            //     cached data accordingly.
            //
            priv = {
                // Cached values for both channels
                sign_a: null,
                sign_b: null,
                power_a: null,
                power_b: null,
                current_a: null,
                current_b: null,
                power_factor_a: null,
                power_factor_b: null,
                timestamp_a: null,
                timestamp_b: null,
                // Used to detect missing or misordered messages.
                last_seq: -99999,
                // Do all PJ-1203A increment seq by 256? If not, then this is
                // the value that will have to be customized.
                seq_inc: 256,
                // Also need to save the last published SIGNED values of
                // power_a and power_b to recompute power_ab on the fly.
                pub_power_a: null,
                pub_power_b: null,

                recompute_power_ab: function (result: KeyValueAny) {
                    let modified = false;
                    if ('power_a' in result) {
                        this.pub_power_a = result.power_a * (result.energy_flow_a == 'producing' ? -1 : 1);
                        modified = true;
                    }
                    if ('power_b' in result) {
                        this.pub_power_b = result.power_b * (result.energy_flow_b == 'producing' ? -1 : 1);
                        modified = true;
                    }
                    if (modified) {
                        if (this.pub_power_a !== null && this.pub_power_b !== null) {
                            // Cancel and reapply the scaling by 10 to avoid floating-point rounding errors
                            // such as 79.8 - 37.1 = 42.699999999999996
                            result['power_ab'] = Math.round(10 * this.pub_power_a + 10 * this.pub_power_b) / 10;
                        }
                    }
                },

                flush: function (result: KeyValueAny, channel: string, options: KeyValue) {
                    const sign = this['sign_' + channel];
                    const power = this['power_' + channel];
                    const current = this['current_' + channel];
                    const powerFactor = this['power_factor_' + channel];
                    this['sign_' + channel] = this['power_' + channel] = this['current_' + channel] = this['power_factor_' + channel] = null;
                    // Only publish if the set is complete otherwise discard everything.
                    if (sign !== null && power !== null && current !== null && powerFactor !== null) {
                        const signedPowerKey = 'signed_power_' + channel;
                        const signedPower = options.hasOwnProperty(signedPowerKey) ? options[signedPowerKey] : false;
                        if (signedPower) {
                            result['power_' + channel] = sign * power;
                            result['energy_flow_' + channel] = 'sign';
                        } else {
                            result['power_' + channel] = power;
                            result['energy_flow_' + channel] = sign > 0 ? 'consuming' : 'producing';
                        }
                        result['timestamp_' + channel] = this['timestamp_' + channel];
                        result['current_' + channel] = current;
                        result['power_factor_' + channel] = powerFactor;
                        this.recompute_power_ab(result);
                        return true;
                    }
                    return false;
                },

                // When the device does not detect any flow, it stops sending
                // the energy_flow datapoint (102 and 104) and always set
                // current_x=0, power_x=0 and power_factor_x=100.
                //
                // So if we see a datapoint with current==0 or power==0
                // then we can safely assume that we are in that zero energy state.
                //
                // Also, the publication of a zero energy state is not delayed
                // when option late_energy_flow_a|b is set.
                flushZero: function (result: KeyValueAny, channel: string, options: KeyValue) {
                    this['sign_' + channel] = +1;
                    this['power_' + channel] = 0;
                    this['timestamp_' + channel] = new Date().toISOString();
                    this['current_' + channel] = 0;
                    this['power_factor_' + channel] = 100;
                    this.flush(result, channel, options);
                },

                clear: function () {
                    priv.sign_a = null;
                    priv.sign_b = null;
                    priv.power_a = null;
                    priv.power_b = null;
                    priv.current_a = null;
                    priv.current_b = null;
                    priv.power_factor_a = null;
                    priv.power_factor_b = null;
                },
            };
            globalStore.putValue(device, 'private_state', priv);
        }
        return priv;
    },
};

const convLocal = {
    energyFlowPJ1203A: (channel: string) => {
        return {
            from: (v: number, meta: Fz.Meta, options: KeyValue) => {
                const priv = storeLocal.getPrivatePJ1203A(meta.device);
                const result = {};
                priv['sign_' + channel] = v == 1 ? -1 : +1;
                const lateEnergyFlowKey = 'late_energy_flow_' + channel;
                const lateEnergyFlow = options.hasOwnProperty(lateEnergyFlowKey) ? options[lateEnergyFlowKey] : false;
                if (lateEnergyFlow) {
                    priv.flush(result, channel, options);
                }
                return result;
            },
        };
    },

    powerPJ1203A: (channel: string) => {
        return {
            from: (v: number, meta: Fz.Meta, options: KeyValue) => {
                const priv = storeLocal.getPrivatePJ1203A(meta.device);
                const result = {};
                priv['power_' + channel] = v / 10;
                priv['timestamp_' + channel] = new Date().toISOString();
                if (v == 0) {
                    priv.flushZero(result, channel, options);
                    return result;
                }
                return result;
            },
        };
    },

    currentPJ1203A: (channel: string) => {
        return {
            from: (v: number, meta: Fz.Meta, options: KeyValue) => {
                const priv = storeLocal.getPrivatePJ1203A(meta.device);
                const result = {};
                priv['current_' + channel] = v / 1000;
                if (v == 0) {
                    priv.flushZero(result, channel, options);
                    return result;
                }
                return result;
            },
        };
    },

    powerFactorPJ1203A: (channel: string) => {
        return {
            from: (v: number, meta: Fz.Meta, options: KeyValue) => {
                const priv = storeLocal.getPrivatePJ1203A(meta.device);
                const result = {};
                priv['power_factor_' + channel] = v;
                const lateEnergyFlowKey = 'late_energy_flow_' + channel;
                const lateEnergyFlow = options.hasOwnProperty(lateEnergyFlowKey) ? options[lateEnergyFlowKey] : false;
                if (!lateEnergyFlow) {
                    priv.flush(result, channel, options);
                }
                return result;
            },
        };
    },

    powerAbPJ1203A: () => {
        return {
            // power_ab datapoint is broken and will be recomputed so ignore it.
            from: (v: number, meta: Fz.Meta, options: KeyValue) => {
                return {};
            },
        };
    },
};

const tzLocal = {
    TS030F_border: {
        key: ['border'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {up: 0, down: 1, up_delete: 2, down_delete: 3};
            await entity.write(0xe001, {0xe001: {value: utils.getFromLookup(value, lookup), type: 0x30}});
        },
    } satisfies Tz.Converter,
    TS0726_switch_mode: {
        key: ['switch_mode'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write(0xe001, {0xd020: {value: utils.getFromLookup(value, {switch: 0, scene: 1}), type: 0x30}});
            return {state: {switch_mode: value}};
        },
    } satisfies Tz.Converter,
    led_control: {
        key: ['brightness', 'color', 'color_temp', 'transition'],
        options: [exposes.options.color_sync()],
        convertSet: async (entity, _key, _value, meta) => {
            const newState: KeyValue = {};

            // The color mode encodes whether the light is using its white LEDs or its color LEDs
            let colorMode = meta.state.color_mode ?? colorModeLookup[ColorMode.ColorTemp];

            // Color mode switching is done by setting color temperature (switch to white LEDs) or setting color (switch
            // to color LEDs)
            if ('color_temp' in meta.message) colorMode = colorModeLookup[ColorMode.ColorTemp];
            if ('color' in meta.message) colorMode = colorModeLookup[ColorMode.HS];

            if (colorMode != meta.state.color_mode) {
                newState.color_mode = colorMode;

                // To switch between white mode and color mode, we have to send a special command:
                const rgbMode = colorMode == colorModeLookup[ColorMode.HS];
                await entity.command('lightingColorCtrl', 'tuyaRgbMode', {enable: rgbMode});
            }

            // A transition time of 0 would be treated as about 1 second, probably some kind of fallback/default
            // transition time, so for "no transition" we use 1 (tenth of a second).
            const transtime = typeof meta.message.transition === 'number' ? meta.message.transition * 10 : 0.1;

            if (colorMode == colorModeLookup[ColorMode.ColorTemp]) {
                if ('brightness' in meta.message) {
                    const zclData = {level: Number(meta.message.brightness), transtime};
                    await entity.command('genLevelCtrl', 'moveToLevel', zclData, utils.getOptions(meta.mapped, entity));
                    newState.brightness = meta.message.brightness;
                }

                if ('color_temp' in meta.message) {
                    const zclData = {colortemp: meta.message.color_temp, transtime: transtime};
                    await entity.command('lightingColorCtrl', 'moveToColorTemp', zclData, utils.getOptions(meta.mapped, entity));
                    newState.color_temp = meta.message.color_temp;
                }
            } else if (colorMode == colorModeLookup[ColorMode.HS]) {
                if ('brightness' in meta.message || 'color' in meta.message) {
                    // We ignore the brightness of the color and instead use the overall brightness setting of the lamp
                    // for the brightness because I think that's the expected behavior and also because the color
                    // conversion below always returns 100 as brightness ("value") even for very dark colors, except
                    // when the color is completely black/zero.

                    // Load current state or defaults
                    const newSettings = {
                        brightness: meta.state.brightness ?? 254, //      full brightness
                        // @ts-expect-error
                        hue: (meta.state.color ?? {}).hue ?? 0, //          red
                        // @ts-expect-error
                        saturation: (meta.state.color ?? {}).saturation ?? 100, // full saturation
                    };

                    // Apply changes
                    if ('brightness' in meta.message) {
                        newSettings.brightness = meta.message.brightness;
                        newState.brightness = meta.message.brightness;
                    }
                    if ('color' in meta.message) {
                        // The Z2M UI sends `{ hex:'#xxxxxx' }`.
                        // Home Assistant sends `{ h: xxx, s: xxx }`.
                        // We convert the former into the latter.
                        const c = libColor.Color.fromConverterArg(meta.message.color);
                        if (c.isRGB()) {
                            // https://github.com/Koenkk/zigbee2mqtt/issues/13421#issuecomment-1426044963
                            c.hsv = c.rgb.gammaCorrected().toXY().toHSV();
                        }
                        const color = c.hsv;

                        newSettings.hue = color.hue;
                        newSettings.saturation = color.saturation;

                        newState.color = {
                            hue: color.hue,
                            saturation: color.saturation,
                        };
                    }

                    // Convert to device specific format and send
                    const brightness = utils.toNumber(newSettings.brightness, 'brightness');
                    const zclData = {
                        brightness: utils.mapNumberRange(brightness, 0, 254, 0, 1000),
                        hue: newSettings.hue,
                        saturation: utils.mapNumberRange(newSettings.saturation, 0, 100, 0, 1000),
                    };
                    // This command doesn't support a transition time
                    await entity.command(
                        'lightingColorCtrl',
                        'tuyaMoveToHueAndSaturationBrightness2',
                        zclData,
                        utils.getOptions(meta.mapped, entity),
                    );
                }
            }

            // If we're in white mode, calculate a matching display color for the set color temperature. This also kind
            // of works in the other direction.
            Object.assign(newState, libColor.syncColorState(newState, meta.state, entity, meta.options));

            return {state: newState};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('lightingColorCtrl', ['currentHue', 'currentSaturation', 'currentLevel', 'tuyaRgbMode', 'colorTemperature']);
        },
    } satisfies Tz.Converter,
    TS0504B_color: {
        key: ['color'],
        convertSet: async (entity, key, value, meta) => {
            const color = libColor.Color.fromConverterArg(value);
            const enableWhite =
                (color.isRGB() && color.rgb.red === 1 && color.rgb.green === 1 && color.rgb.blue === 1) ||
                // Zigbee2MQTT frontend white value
                (color.isXY() && (color.xy.x === 0.3125 || color.xy.y === 0.32894736842105265)) ||
                // Home Assistant white color picker value
                (color.isXY() && (color.xy.x === 0.323 || color.xy.y === 0.329));

            if (enableWhite) {
                await entity.command('lightingColorCtrl', 'tuyaRgbMode', {enable: false});
                const newState: KeyValue = {color_mode: 'xy'};
                if (color.isXY()) {
                    newState.color = color.xy;
                } else {
                    newState.color = color.rgb.gammaCorrected().toXY().rounded(4);
                }
                return {state: libColor.syncColorState(newState, meta.state, entity, meta.options) as KeyValue};
            } else {
                return await tz.light_color.convertSet(entity, key, value, meta);
            }
        },
        convertGet: tz.light_color.convertGet,
    } satisfies Tz.Converter,
    TS0224: {
        key: ['light', 'duration', 'volume'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'light') {
                utils.assertString(value, 'light');
                await entity.command('genOnOff', value.toLowerCase() === 'on' ? 'on' : 'off', {}, utils.getOptions(meta.mapped, entity));
            } else if (key === 'duration') {
                await entity.write('ssIasWd', {maxDuration: value}, utils.getOptions(meta.mapped, entity));
            } else if (key === 'volume') {
                const lookup: KeyValue = {mute: 0, low: 10, medium: 30, high: 50};
                utils.assertString(value, 'volume');
                const lookupValue = lookup[value];
                value = value.toLowerCase();
                utils.validateValue(value, Object.keys(lookup));
                await entity.write('ssIasWd', {0x0002: {value: lookupValue, type: 0x0a}}, utils.getOptions(meta.mapped, entity));
            }
            return {state: {[key]: value}};
        },
    } satisfies Tz.Converter,
    temperature_unit: {
        key: ['temperature_unit'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
                case 'temperature_unit': {
                    utils.assertString(value, 'temperature_unit');
                    await entity.write('manuSpecificTuya_2', {'57355': {value: {celsius: 0, fahrenheit: 1}[value], type: 48}});
                    break;
                }
                default: // Unknown key
                    logger.warning(`Unhandled key ${key}`, NS);
            }
        },
    } satisfies Tz.Converter,
    TS011F_threshold: {
        key: [
            'temperature_threshold',
            'temperature_breaker',
            'power_threshold',
            'power_breaker',
            'over_current_threshold',
            'over_current_breaker',
            'over_voltage_threshold',
            'over_voltage_breaker',
            'under_voltage_threshold',
            'under_voltage_breaker',
        ],
        convertSet: async (entity, key, value, meta) => {
            const onOffLookup = {on: 1, off: 0};
            switch (key) {
                case 'temperature_threshold': {
                    const state = meta.state['temperature_breaker'];
                    const buf = Buffer.from([5, utils.getFromLookup(state, onOffLookup), 0, utils.toNumber(value, 'temperature_threshold')]);
                    await entity.command('manuSpecificTuya_3', 'setOptions2', {data: buf});
                    break;
                }
                case 'temperature_breaker': {
                    const threshold = meta.state['temperature_threshold'];
                    const number = utils.toNumber(threshold, 'temperature_threshold');
                    const buf = Buffer.from([5, utils.getFromLookup(value, onOffLookup), 0, number]);
                    await entity.command('manuSpecificTuya_3', 'setOptions2', {data: buf});
                    break;
                }
                case 'power_threshold': {
                    const state = meta.state['power_breaker'];
                    const buf = Buffer.from([7, utils.getFromLookup(state, onOffLookup), 0, utils.toNumber(value, 'power_breaker')]);
                    await entity.command('manuSpecificTuya_3', 'setOptions2', {data: buf});
                    break;
                }
                case 'power_breaker': {
                    const threshold = meta.state['power_threshold'];
                    const number = utils.toNumber(threshold, 'power_breaker');
                    const buf = Buffer.from([7, utils.getFromLookup(value, onOffLookup), 0, number]);
                    await entity.command('manuSpecificTuya_3', 'setOptions2', {data: buf});
                    break;
                }
                case 'over_current_threshold': {
                    const state = meta.state['over_current_breaker'];
                    const buf = Buffer.from([1, utils.getFromLookup(state, onOffLookup), 0, utils.toNumber(value, 'over_current_threshold')]);
                    await entity.command('manuSpecificTuya_3', 'setOptions3', {data: buf});
                    break;
                }
                case 'over_current_breaker': {
                    const threshold = meta.state['over_current_threshold'];
                    const number = utils.toNumber(threshold, 'over_current_threshold');
                    const buf = Buffer.from([1, utils.getFromLookup(value, onOffLookup), 0, number]);
                    await entity.command('manuSpecificTuya_3', 'setOptions3', {data: buf});
                    break;
                }
                case 'over_voltage_threshold': {
                    const state = meta.state['over_voltage_breaker'];
                    const buf = Buffer.from([3, utils.getFromLookup(state, onOffLookup), 0, utils.toNumber(value, 'over_voltage_breaker')]);
                    await entity.command('manuSpecificTuya_3', 'setOptions3', {data: buf});
                    break;
                }
                case 'over_voltage_breaker': {
                    const threshold = meta.state['over_voltage_threshold'];
                    const number = utils.toNumber(threshold, 'over_voltage_threshold');
                    const buf = Buffer.from([3, utils.getFromLookup(value, onOffLookup), 0, number]);
                    await entity.command('manuSpecificTuya_3', 'setOptions3', {data: buf});
                    break;
                }
                case 'under_voltage_threshold': {
                    const state = meta.state['under_voltage_breaker'];
                    const buf = Buffer.from([4, utils.getFromLookup(state, onOffLookup), 0, utils.toNumber(value, 'under_voltage_threshold')]);
                    await entity.command('manuSpecificTuya_3', 'setOptions3', {data: buf});
                    break;
                }
                case 'under_voltage_breaker': {
                    const threshold = meta.state['under_voltage_threshold'];
                    const number = utils.toNumber(threshold, 'under_voltage_breaker');
                    const buf = Buffer.from([4, utils.getFromLookup(value, onOffLookup), 0, number]);
                    await entity.command('manuSpecificTuya_3', 'setOptions3', {data: buf});
                    break;
                }
                default: // Unknown key
                    logger.warning(`Unhandled key ${key}`, NS);
            }
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    TS0726_action: {
        cluster: 'genOnOff',
        type: ['commandTuyaAction'],
        convert: (model, msg, publish, options, meta) => {
            return {action: `scene_${msg.endpoint.ID}`};
        },
    } satisfies Fz.Converter,
    TS0222_humidity: {
        ...fz.humidity,
        convert: async (model, msg, publish, options, meta) => {
            const result = await fz.humidity.convert(model, msg, publish, options, meta);
            if (result) result.humidity *= 10;
            return result;
        },
    } satisfies Fz.Converter,
    scene_recall: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const payload = {action: postfixWithEndpointName(`scene_${msg.data.sceneid}`, msg, model, meta)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    } satisfies Fz.Converter,
    scenes_recall_scene_65029: {
        cluster: '65029',
        type: ['raw', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const id = meta.device.modelID === '005f0c3b' ? msg.data[0] : msg.data[msg.data.length - 1];
            return {action: `scene_${id}`};
        },
    } satisfies Fz.Converter,
    TS0201_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // https://github.com/Koenkk/zigbee2mqtt/issues/11470
            if (msg.data.batteryPercentageRemaining == 200 && msg.data.batteryVoltage < 30) return;
            return fz.battery.convert(model, msg, publish, options, meta);
        },
    } satisfies Fz.Converter,
    TS0201_humidity: {
        ...fz.humidity,
        convert: (model, msg, publish, options, meta) => {
            if (['_TZ3210_ncw88jfq', '_TZ3000_ywagc4rj'].includes(meta.device.manufacturerName)) {
                msg.data['measuredValue'] *= 10;
            }
            return fz.humidity.convert(model, msg, publish, options, meta);
        },
    } satisfies Fz.Converter,
    humidity10: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const humidity = parseFloat(msg.data['measuredValue']) / 10.0;
            if (humidity >= 0 && humidity <= 100) {
                return {humidity};
            }
        },
    } satisfies Fz.Converter,
    temperature_unit: {
        cluster: 'manuSpecificTuya_2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('57355')) {
                result.temperature_unit = utils.getFromLookup(msg.data['57355'], {'0': 'celsius', '1': 'fahrenheit'});
            }
            return result;
        },
    } satisfies Fz.Converter,
    TS011F_electrical_measurement: {
        ...fz.electrical_measurement,
        convert: async (model, msg, publish, options, meta) => {
            const result = (await fz.electrical_measurement.convert(model, msg, publish, options, meta)) ?? {};
            const lookup: KeyValueString = {power: 'activePower', current: 'rmsCurrent', voltage: 'rmsVoltage'};

            // Wait 5 seconds before reporting a 0 value as this could be an invalid measurement.
            // https://github.com/Koenkk/zigbee2mqtt/issues/16709#issuecomment-1509599046
            if (result) {
                for (const key of ['power', 'current', 'voltage']) {
                    if (key in result) {
                        const value = result[key];
                        clearTimeout(globalStore.getValue(msg.endpoint, key));
                        if (value === 0) {
                            const configuredReporting = msg.endpoint.configuredReportings.find(
                                (c) => c.cluster.name === 'haElectricalMeasurement' && c.attribute.name === lookup[key],
                            );
                            const time = (configuredReporting ? configuredReporting.minimumReportInterval : 5) * 2 + 1;
                            globalStore.putValue(
                                msg.endpoint,
                                key,
                                setTimeout(() => {
                                    const payload = {[key]: value};
                                    // Device takes a lot of time to report power 0 in some cases. When current == 0 we can assume power == 0
                                    // https://github.com/Koenkk/zigbee2mqtt/discussions/19680#discussioncomment-7868445
                                    if (key === 'current') {
                                        payload.power = 0;
                                    }
                                    publish(payload);
                                }, time * 1000),
                            );
                            delete result[key];
                        }
                    }
                }
            }

            // Device takes a lot of time to report power 0 in some cases. When the state is OFF we can assume power == 0
            // https://github.com/Koenkk/zigbee2mqtt/discussions/19680#discussioncomment-7868445
            if (meta.state.state === 'OFF') {
                result.power = 0;
            }

            return result;
        },
    } satisfies Fz.Converter,
    TS011F_threshold: {
        cluster: 'manuSpecificTuya_3',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            const splitToAttributes = (value: Buffer): KeyValueAny => {
                const result: KeyValue = {};
                const len = value.length;
                let i = 0;
                while (i < len) {
                    const key = value.readUInt8(i);
                    result[key] = [value.readUInt8(i + 1), value.readUInt16BE(i + 2)];
                    i += 4;
                }
                return result;
            };
            const lookup: KeyValue = {0: 'OFF', 1: 'ON'};
            const command = msg.data[2];
            const data = msg.data.slice(3);
            if (command == 0xe6) {
                const value = splitToAttributes(data);
                const result: KeyValue = {};
                if (0x05 in value) {
                    result.temperature_threshold = value[0x05][1];
                    result.temperature_breaker = lookup[value[0x05][0]];
                }
                if (0x07 in value) {
                    result.power_threshold = value[0x07][1];
                    result.power_breaker = lookup[value[0x07][0]];
                }
                return result;
            }
            if (command == 0xe7) {
                const value = splitToAttributes(data);
                return {
                    over_current_threshold: value[0x01][1],
                    over_current_breaker: lookup[value[0x01][0]],
                    over_voltage_threshold: value[0x03][1],
                    over_voltage_breaker: lookup[value[0x03][0]],
                    under_voltage_threshold: value[0x04][1],
                    under_voltage_breaker: lookup[value[0x04][0]],
                };
            }
        },
    } satisfies Fz.Converter,
    PJ1203A_sync_time_increase_seq: {
        cluster: 'manuSpecificTuya',
        type: ['commandMcuSyncTime'],
        convert: (model, msg, publish, options, meta) => {
            const priv = storeLocal.getPrivatePJ1203A(meta.device);
            priv.last_seq += priv.seq_inc;
        },
    } satisfies Fz.Converter,
    PJ1203A_strict_fz_datapoints: {
        ...tuya.fz.datapoints,
        convert: (model, msg, publish, options, meta) => {
            // Uncomment the next line to test the behavior when random messages are lost
            // if ( Math.random() < 0.05 ) return;
            const priv = storeLocal.getPrivatePJ1203A(meta.device);
            // Detect missing or re-ordered messages but allow duplicate messages (should we?).
            const expectedSeq = (priv.last_seq + priv.seq_inc) & 0xffff;
            if (msg.data.seq != expectedSeq && msg.data.seq != priv.last_seq) {
                logger.debug(`[PJ1203A] Missing or re-ordered message detected: Got seq=${msg.data.seq}, expected ${priv.next_seq}`, NS);
                priv.clear();
            }
            priv.last_seq = msg.data.seq;
            // And finally, process the datapoint using tuya.fz.datapoints
            return tuya.fz.datapoints.convert(model, msg, publish, options, meta);
        },
    } satisfies Fz.Converter,
};

const modernExtendLocal = {
    dpTHZBSettings(): ModernExtend {
        const exp = e
            .composite('auto_settings', 'auto_settings', ea.STATE_SET)
            .withFeature(e.enum('enabled', ea.STATE_SET, ['on', 'off', 'none']).withDescription('Enable auto settings'))
            .withFeature(e.enum('temp_greater_then', ea.STATE_SET, ['on', 'off', 'none']).withDescription('Greater action'))
            .withFeature(
                e
                    .numeric('temp_greater_value', ea.STATE_SET)
                    .withValueMin(-20)
                    .withValueMax(80)
                    .withValueStep(0.1)
                    .withUnit('*C')
                    .withDescription('Temperature greater than value'),
            )
            .withFeature(e.enum('temp_lower_then', ea.STATE_SET, ['on', 'off', 'none']).withDescription('Lower action'))
            .withFeature(
                e
                    .numeric('temp_lower_value', ea.STATE_SET)
                    .withValueMin(-20)
                    .withValueMax(80)
                    .withValueStep(0.1)
                    .withUnit('*C')
                    .withDescription('Temperature lower than value'),
            );

        const handlers: [Fz.Converter[], Tz.Converter[]] = tuya.getHandlersForDP('auto_settings', 0x77, tuya.dataTypes.string, {
            from: (value: string) => {
                let result = {
                    enabled: 'none',
                    temp_greater_then: 'none',
                    temp_greater_value: 0,
                    temp_lower_then: 'none',
                    temp_lower_value: 0,
                };
                const buf = Buffer.from(value, 'hex');
                if (buf.length > 0) {
                    const enabled = buf[0];
                    const gr = buf[1];
                    const grValue = buf.readInt32LE(2) / 10;
                    const grAction = buf[6];
                    const lo = buf[7];
                    const loValue = buf.readInt32LE(8) / 10;
                    const loAction = buf[13];
                    result = {
                        enabled: {0x00: 'on', 0x80: 'off'}[enabled],
                        temp_greater_then: gr !== 0xff ? {0x01: 'on', 0x00: 'off'}[grAction] : 'none',
                        temp_greater_value: grValue,
                        temp_lower_then: lo !== 0xff ? {0x01: 'on', 0x00: 'off'}[loAction] : 'none',
                        temp_lower_value: loValue,
                    };
                }
                return result;
            },
            to: (value: KeyValueAny) => {
                let result = '';
                if (value.enabled !== 'none') {
                    const enabled = utils.getFromLookup(value.enabled, {on: 0x00, off: 0x80});
                    const gr = value.temp_greater_then == 'none' ? 0xff : 0x00;
                    const grAction = utils.getFromLookup(value.temp_greater_then, {on: 0x01, off: 0x00, none: 0x00});
                    const lo = value.temp_lower_then == 'none' ? 0xff : 0x00;
                    const loAction = utils.getFromLookup(value.temp_lower_then, {on: 0x01, off: 0x00, none: 0x00});
                    const buf = Buffer.alloc(13);
                    buf.writeUInt8(enabled, 0);
                    buf.writeUInt8(gr, 1);
                    buf.writeInt32LE(value.temp_greater_value * 10, 2);
                    buf.writeUInt8(grAction, 6);
                    buf.writeUInt8(lo, 7);
                    buf.writeInt32LE(value.temp_lower_value * 10, 8);
                    buf.writeUInt8(loAction, 12);
                    result = buf.toString('hex');
                }
                return result;
            },
        });

        return {exposes: [exp], fromZigbee: handlers[0], toZigbee: handlers[1], isModernExtend: true};
    },
};

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['TS0204'],
        model: 'TS0204',
        vendor: 'Tuya',
        description: 'Gas sensor',
        whiteLabel: [{vendor: 'Tesla Smart', model: 'TSL-SEN-GAS'}],
        fromZigbee: [fz.ias_gas_alarm_1, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.gas(), e.tamper()],
    },
    {
        zigbeeModel: ['TS0205'],
        model: 'TS0205',
        vendor: 'Tuya',
        description: 'Smoke sensor',
        whiteLabel: [
            {vendor: 'Tesla Smart', model: 'TSL-SEN-SMOKE'},
            {vendor: 'Dongguan Daying Electornics Technology', model: 'YG400A'},
            tuya.whitelabel('Tuya', 'TS0205_smoke_2', 'Smoke sensor', ['_TZ3210_up3pngle']),
        ],
        fromZigbee: [fz.ias_smoke_alarm_1, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.smoke(), e.battery_low(), e.tamper()],
        // Configure battery % fails
        // https://github.com/Koenkk/zigbee2mqtt/issues/22421
        extend: [battery({percentageReporting: false})],
    },
    {
        zigbeeModel: ['TS0111'],
        model: 'TS0111',
        vendor: 'Tuya',
        description: 'Socket',
        extend: [tuya.modernExtend.tuyaOnOff()],
    },
    {
        zigbeeModel: ['TS0218'],
        model: 'TS0218',
        vendor: 'Tuya',
        description: 'Button',
        fromZigbee: [legacy.fromZigbee.TS0218_click, fz.battery],
        exposes: [e.battery(), e.action(['click'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0203'],
        model: 'TS0203',
        vendor: 'Tuya',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        whiteLabel: [
            {vendor: 'CR Smart Home', model: 'TS0203'},
            {vendor: 'Tuya', model: 'iH-F001'},
            {vendor: 'Tesla Smart', model: 'TSL-SEN-DOOR'},
            {vendor: 'Cleverio', model: 'SS100'},
            tuya.whitelabel('Niceboy', 'ORBIS Windows & Door Sensor', 'Door sensor', ['_TZ3000_qrldbmfn']),
            tuya.whitelabel('Tuya', 'ZD06', 'Door window sensor', ['_TZ3000_rcuyhwe3']),
            tuya.whitelabel('Tuya', 'ZD08', 'Door sensor', ['_TZ3000_7d8yme6f']),
            tuya.whitelabel('Tuya', 'MC500A', 'Door sensor', ['_TZ3000_2mbfxlzr']),
            tuya.whitelabel('Tuya', '19DZT', 'Door sensor', ['_TZ3000_n2egfsli']),
            tuya.whitelabel('Tuya', 'DS04', 'Door sensor', ['_TZ3000_yfekcy3n']),
            tuya.whitelabel('Moes', 'ZSS-JM-GWM-C-MS', 'Smart door and window sensor', ['_TZ3000_decxrtwa']),
            tuya.whitelabel('Moes', 'ZSS-X-GWM-C', 'Door/window magnetic sensor', ['_TZ3000_gntwytxo']),
            tuya.whitelabel('Luminea', 'ZX-5232', 'Smart door and window sensor', ['_TZ3000_4ugnzsli']),
            tuya.whitelabel('QA', 'QASD1', 'Door sensor', ['_TZ3000_udyjylt7']),
            tuya.whitelabel('Nous', 'E3', 'Door sensor', ['_TZ3000_v7chgqso']),
        ],
        exposes: (device, options) => {
            const exps: Expose[] = [e.contact(), e.battery(), e.battery_voltage()];
            const noTamperModels = [
                // manufacturerName for models without a tamper sensor
                '_TZ3000_rcuyhwe3', // Tuya ZD06
                '_TZ3000_2mbfxlzr', // Tuya MC500A
                '_TZ3000_n2egfsli', // Tuya 19DZT
                '_TZ3000_yfekcy3n', // Tuya DS04
                '_TZ3000_bpkijo14',
                '_TZ3000_gntwytxo', // Moes ZSS-X-GWM-C
                '_TZ3000_4ugnzsli', // Luminea ZX-5232
            ];
            if (!device || !noTamperModels.includes(device.manufacturerName)) {
                exps.push(e.tamper());
            }
            const noBatteryLowModels = ['_TZ3000_26fmupbb', '_TZ3000_oxslv1c9', '_TZ3000_osu834un'];
            if (!device || !noBatteryLowModels.includes(device.manufacturerName)) {
                exps.push(e.battery_low());
            }
            exps.push(e.linkquality());
            return exps;
        },
        meta: {
            battery: {
                // These sensors do send a Battery Percentage Remaining (0x0021)
                // value, but is usually incorrect. For example, a coin battery tested
                // with a load tester may show 80%, but report 2.5V / 1%. This voltage
                // calculation matches what ZHA does by default.
                // https://github.com/Koenkk/zigbee2mqtt/discussions/17337
                // https://github.com/zigpy/zha-device-handlers/blob/c6ed94a52a469e72b32ece2a92d528060c7fd034/zhaquirks/__init__.py#L195-L228
                voltageToPercentage: '3V_1500_2800',
            },
        },
        configure: async (device, coordinatorEndpoint) => {
            try {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.batteryVoltage(endpoint);
            } catch (error) {
                /* Fails for some*/
            }
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0203', ['_TZ3210_jowhpxop']),
        model: 'TS0203_1',
        vendor: 'Tuya',
        description: 'Door sensor with scene switch',
        fromZigbee: [tuya.fz.datapoints, fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [e.action(['single', 'double', 'hold']), e.contact(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()],
        meta: {
            tuyaDatapoints: [[101, 'action', tuya.valueConverterBasic.lookup({single: 0, double: 1, hold: 2})]],
        },
        whiteLabel: [tuya.whitelabel('Linkoze', 'LKDSZ001', 'Door sensor with scene switch', ['_TZ3210_jowhpxop'])],
    },
    {
        fingerprint: [{modelID: 'TS0021', manufacturerName: '_TZ3210_3ulg9kpo'}],
        model: 'LKWSZ211',
        vendor: 'Tuya',
        description: 'Scene remote with 2 keys',
        fromZigbee: [tuya.fz.datapoints, fz.ignore_basic_report],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(),
            e.action(['button_1_single', 'button_1_double', 'button_1_hold', 'button_2_single', 'button_2_double', 'button_2_hold']),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    'action',
                    tuya.valueConverterBasic.lookup({
                        button_1_single: tuya.enum(0),
                        button_1_double: tuya.enum(1),
                        button_1_hold: tuya.enum(2),
                    }),
                ],
                [
                    2,
                    'action',
                    tuya.valueConverterBasic.lookup({
                        button_2_single: tuya.enum(0),
                        button_2_double: tuya.enum(1),
                        button_2_hold: tuya.enum(2),
                    }),
                ],
                [10, 'battery', tuya.valueConverter.raw],
            ],
        },
        whiteLabel: [tuya.whitelabel('Linkoze', 'LKWSZ211', 'Wireless switch (2-key)', ['_TZ3210_3ulg9kpo'])],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_bq5c8xfe'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_bjawzodf'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_qyflbnbj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_vs0skpuc'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_44af8vyi'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zl1kmjqx'},
        ],
        model: 'TS0601_temperature_humidity_sensor_1',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor',
        fromZigbee: [legacy.fromZigbee.tuya_temperature_humidity_sensor],
        toZigbee: [],
        exposes: (device, options) => {
            const exps: Expose[] = [e.temperature(), e.humidity(), e.battery()];
            if (!device || device.manufacturerName === '_TZE200_qyflbnbj') {
                exps.push(e.battery_low());
                exps.push(e.enum('battery_level', ea.STATE, ['low', 'middle', 'high']).withDescription('Battery level state'));
            }
            exps.push(e.linkquality());
            return exps;
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_mfamvsdb'}],
        model: 'F00MB00-04-1',
        vendor: 'FORIA',
        description: '4 scenes switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            tuya.modernExtend.combineActions([
                tuya.modernExtend.dpAction({dp: 1, lookup: {scene_1: 0}}),
                tuya.modernExtend.dpAction({dp: 2, lookup: {scene_2: 0}}),
                tuya.modernExtend.dpAction({dp: 3, lookup: {scene_3: 0}}),
                tuya.modernExtend.dpAction({dp: 4, lookup: {scene_4: 0}}),
            ]),
            tuya.modernExtend.dpBinary({
                name: 'vibration',
                dp: 0x6c,
                type: tuya.dataTypes.enum,
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                description: 'Enable vibration',
            }),
            tuya.modernExtend.dpBinary({
                name: 'approach',
                dp: 0x6b,
                type: tuya.dataTypes.enum,
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                description: 'Enable approach detection',
            }),
            tuya.modernExtend.dpBinary({
                name: 'illumination',
                dp: 0x6a,
                type: tuya.dataTypes.enum,
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                description: 'Enable illumination detection',
            }),
            tuya.modernExtend.dpBinary({
                name: 'backlight',
                dp: 0x69,
                type: tuya.dataTypes.enum,
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                description: 'Enable backlight',
            }),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_dhke3p9w']),
        model: 'F00YK04-18-1',
        vendor: 'FORIA',
        description: '18 scenes remote',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            tuya.modernExtend.combineActions([
                tuya.modernExtend.dpAction({dp: 1, lookup: {scene_1: 0}}),
                tuya.modernExtend.dpAction({dp: 2, lookup: {scene_2: 0}}),
                tuya.modernExtend.dpAction({dp: 3, lookup: {scene_3: 0}}),
                tuya.modernExtend.dpAction({dp: 4, lookup: {scene_4: 0}}),
                tuya.modernExtend.dpAction({dp: 5, lookup: {scene_5: 0}}),
                tuya.modernExtend.dpAction({dp: 6, lookup: {scene_6: 0}}),
                tuya.modernExtend.dpAction({dp: 7, lookup: {scene_7: 0}}),
                tuya.modernExtend.dpAction({dp: 8, lookup: {scene_8: 0}}),
                tuya.modernExtend.dpAction({dp: 9, lookup: {scene_9: 0}}),
                tuya.modernExtend.dpAction({dp: 10, lookup: {scene_10: 0}}),
                tuya.modernExtend.dpAction({dp: 11, lookup: {scene_11: 0}}),
                tuya.modernExtend.dpAction({dp: 12, lookup: {scene_12: 0}}),
                tuya.modernExtend.dpAction({dp: 13, lookup: {scene_13: 0}}),
                tuya.modernExtend.dpAction({dp: 14, lookup: {scene_14: 0}}),
                tuya.modernExtend.dpAction({dp: 15, lookup: {scene_15: 0}}),
                tuya.modernExtend.dpAction({dp: 16, lookup: {scene_16: 0}}),
                tuya.modernExtend.dpAction({dp: 101, lookup: {scene_17: 0}}),
                tuya.modernExtend.dpAction({dp: 102, lookup: {scene_18: 0}}),
            ]),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE200_yjjdcqsq',
            '_TZE200_9yapgbuv',
            '_TZE200_utkemkbs',
            '_TZE204_utkemkbs',
            '_TZE204_9yapgbuv',
            '_TZE204_upagmta9',
            '_TZE200_cirvgep4',
            '_TZE200_upagmta9',
            '_TZE204_yjjdcqsq',
            '_TZE204_cirvgep4',
        ]),
        model: 'TS0601_temperature_humidity_sensor_2',
        vendor: 'Tuya',
        description: 'Temperature and humidity sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEvent({queryOnDeviceAnnounce: true}),
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            // Required to get the device to start reporting
            await device.getEndpoint(1).command('manuSpecificTuya', 'dataQuery', {});
        },
        exposes: [e.temperature(), e.humidity(), tuya.exposes.batteryState(), tuya.exposes.temperatureUnit()],
        meta: {
            tuyaDatapoints: [
                [1, 'temperature', tuya.valueConverter.divideBy10],
                [2, 'humidity', tuya.valueConverter.raw],
                [3, 'battery_state', tuya.valueConverter.batteryState],
                [9, 'temperature_unit', tuya.valueConverter.temperatureUnitEnum],
            ],
        },
        whiteLabel: [
            tuya.whitelabel('Tuya', 'ZTH01', 'Temperature and humidity sensor', ['_TZE200_yjjdcqsq', '_TZE204_yjjdcqsq']),
            tuya.whitelabel('Tuya', 'SZTH02', 'Temperature and humidity sensor', ['_TZE200_utkemkbs', '_TZE204_utkemkbs']),
            tuya.whitelabel('Tuya', 'ZTH02', 'Temperature and humidity sensor', ['_TZE200_9yapgbuv', '_TZE204_9yapgbuv']),
            tuya.whitelabel('Tuya', 'ZTH05', 'Temperature and humidity sensor', ['_TZE204_upagmta9', '_TZE200_upagmta9']),
            tuya.whitelabel('Tuya', 'ZTH08-E', 'Temperature and humidity sensor', ['_TZE200_cirvgep4', '_TZE204_cirvgep4']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_s1xgth2u'}],
        model: 'TS0601_temperature_humidity_sensor_3',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor',
        fromZigbee: [tuya.fz.datapoints],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            // Required to get the device to start reporting (-- Maybe needed? Copied this from another humidity sensor configuration)
            await device.getEndpoint(1).command('manuSpecificTuya', 'dataQuery', {});
        },
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        exposes: [e.temperature(), e.humidity(), e.battery(), tuya.exposes.temperatureUnit()],
        meta: {
            tuyaDatapoints: [
                [1, 'temperature', tuya.valueConverter.divideBy10],
                [2, 'humidity', tuya.valueConverter.raw],
                [4, 'battery', tuya.valueConverter.raw], // maybe?
                [9, 'temperature_unit', tuya.valueConverter.temperatureUnitEnum],
                [19, 'temperature_sensitivity', tuya.valueConverter.raw], // maybe? commented this out for now
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_vvmbj46n']),
        model: 'ZTH05Z',
        vendor: 'Tuya',
        description: 'Temperature and humidity sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEvent({queryOnDeviceAnnounce: true}),
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            // Required to get the device to start reporting
            await device.getEndpoint(1).command('manuSpecificTuya', 'dataQuery', {});
        },
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            e.enum('temperature_unit', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Temperature unit'),
            e
                .numeric('max_temperature_alarm', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(-20)
                .withValueMax(60)
                .withDescription('Alarm temperature max'),
            e
                .numeric('min_temperature_alarm', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(-20)
                .withValueMax(60)
                .withDescription('Alarm temperature min'),
            e.numeric('max_humidity_alarm', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100).withDescription('Alarm humidity max'),
            e.numeric('min_humidity_alarm', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100).withDescription('Alarm humidity min'),
            e.enum('temperature_alarm', ea.STATE_SET, ['lower_alarm', 'upper_alarm', 'cancel']).withDescription('Temperature alarm'),
            e.enum('humidity_alarm', ea.STATE_SET, ['lower_alarm', 'upper_alarm', 'cancel']).withDescription('Humidity alarm'),
            e
                .numeric('temperature_periodic_report', ea.STATE_SET)
                .withUnit('%')
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Temp periodic report'),
            e
                .numeric('humidity_periodic_report', ea.STATE_SET)
                .withUnit('%')
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Humidity periodic report'),
            e
                .numeric('temperature_sensitivity', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(3)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription('Sensitivity of temperature'),
            e
                .numeric('humidity_sensitivity', ea.STATE_SET)
                .withUnit('%')
                .withValueMin(3)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription('Sensitivity of humidity'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'temperature', tuya.valueConverter.divideBy10],
                [2, 'humidity', tuya.valueConverter.raw],
                [4, 'battery', tuya.valueConverter.raw],
                [9, 'temperature_unit', tuya.valueConverter.temperatureUnitEnum],
                [10, 'max_temperature_alarm', tuya.valueConverter.divideBy10],
                [11, 'min_temperature_alarm', tuya.valueConverter.divideBy10],
                [12, 'max_humidity_alarm', tuya.valueConverter.raw],
                [13, 'min_humidity_alarm', tuya.valueConverter.raw],
                [
                    14,
                    'temperature_alarm',
                    tuya.valueConverterBasic.lookup({lower_alarm: tuya.enum(0), upper_alarm: tuya.enum(1), cancel: tuya.enum(2)}),
                ],
                [15, 'humidity_alarm', tuya.valueConverterBasic.lookup({lower_alarm: tuya.enum(0), upper_alarm: tuya.enum(1), cancel: tuya.enum(2)})],
                [17, 'temperature_periodic_report', tuya.valueConverter.raw],
                [18, 'humidity_periodic_report', tuya.valueConverter.raw],
                [19, 'temperature_sensitivity', tuya.valueConverter.raw],
                [20, 'humidity_sensitivity', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nvups4nh']),
        model: 'TS0601_contact_temperature_humidity_sensor',
        vendor: 'Tuya',
        description: 'Contact, temperature and humidity sensor',
        fromZigbee: [tuya.fz.datapoints, tuya.fz.gateway_connection_status],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.contact(), e.temperature(), e.humidity(), e.battery()],
        meta: {
            tuyaDatapoints: [
                [1, 'contact', tuya.valueConverter.trueFalseInvert],
                [2, 'battery', tuya.valueConverter.raw],
                [7, 'temperature', tuya.valueConverter.divideBy10],
                [8, 'humidity', tuya.valueConverter.raw],
            ],
        },
        whiteLabel: [tuya.whitelabel('Aubess', '1005005194831629', 'Contact, temperature and humidity sensor', ['_TZE200_nvups4nh'])],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_vzqtvljm'}],
        model: 'TS0601_illuminance_temperature_humidity_sensor_1',
        vendor: 'Tuya',
        description: 'Illuminance, temperature & humidity sensor',
        fromZigbee: [legacy.fromZigbee.tuya_illuminance_temperature_humidity_sensor],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.illuminance_lux(), e.battery()],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_8ygsuhe1'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_yvx5lh6k'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ryfmq5rl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_c2fmom5z'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_mja3fuja'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_yvx5lh6k'},
        ],
        model: 'TS0601_air_quality_sensor',
        vendor: 'Tuya',
        description: 'Air quality sensor',
        fromZigbee: [legacy.fromZigbee.tuya_air_quality],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.co2(), e.voc().withUnit('ppm'), e.formaldehyd()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_rbbx5mfq'}],
        model: 'TS0601_illuminance_temperature_humidity_sensor_2',
        vendor: 'Tuya',
        description: 'Illuminance sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.illuminance().withUnit('lx'), e.temperature(), e.humidity()],
        meta: {
            tuyaDatapoints: [
                [2, 'illuminance', tuya.valueConverter.raw],
                [6, 'temperature', tuya.valueConverter.divideBy10],
                [7, 'humidity', tuya.valueConverter.divideBy10],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_dwcarsat', '_TZE204_dwcarsat']),
        model: 'TS0601_smart_air_house_keeper',
        vendor: 'Tuya',
        description: 'Smart air house keeper',
        fromZigbee: [legacy.fromZigbee.tuya_air_quality],
        toZigbee: [],
        exposes: [
            e.temperature(),
            e.humidity(),
            e.co2(),
            e.voc().withUnit('ppb'),
            e.formaldehyd().withUnit('µg/m³'),
            e.pm25().withValueMin(0).withValueMax(999).withValueStep(1),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ogkdpgy2', '_TZE200_3ejwxpmu']),
        model: 'TS0601_co2_sensor',
        vendor: 'Tuya',
        description: 'NDIR co2 sensor',
        fromZigbee: [legacy.fromZigbee.tuya_air_quality],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.co2()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_7bztmfm1'}],
        model: 'TS0601_smart_CO_air_box',
        vendor: 'Tuya',
        description: 'Smart air box (carbon monoxide)',
        fromZigbee: [legacy.fromZigbee.tuya_CO],
        toZigbee: [],
        exposes: [e.carbon_monoxide(), e.co()],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ggev5fsl', '_TZE200_u319yc66', '_TZE200_kvpwq8z7']),
        model: 'TS0601_gas_sensor_1',
        vendor: 'Tuya',
        description: 'Gas sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.gas(), tuya.exposes.selfTest(), tuya.exposes.selfTestResult(), tuya.exposes.faultAlarm(), tuya.exposes.silence()],
        meta: {
            tuyaDatapoints: [
                [1, 'gas', tuya.valueConverter.trueFalse0],
                [8, 'self_test', tuya.valueConverter.raw],
                [9, 'self_test_result', tuya.valueConverter.selfTestResult],
                [11, 'fault_alarm', tuya.valueConverter.trueFalse1],
                [16, 'silence', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_yojqa8xn', '_TZE204_zougpkpy', '_TZE204_chbyv06x', '_TZE204_yojqa8xn']),
        model: 'TS0601_gas_sensor_2',
        vendor: 'Tuya',
        description: 'Gas sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.gas(),
            tuya.exposes.gasValue().withUnit('LEL'),
            tuya.exposes.selfTest(),
            tuya.exposes.selfTestResult(),
            tuya.exposes.silence(),
            e
                .enum('alarm_ringtone', ea.STATE_SET, ['melody_1', 'melody_2', 'melody_3', 'melody_4', 'melody_5'])
                .withDescription('Ringtone of the alarm'),
            e.numeric('alarm_time', ea.STATE_SET).withValueMin(1).withValueMax(180).withValueStep(1).withUnit('s').withDescription('Alarm time'),
            e.binary('preheat', ea.STATE, true, false).withDescription('Indicates sensor preheat is active'),
        ],
        whiteLabel: [
            tuya.whitelabel('DYGSM', 'DY-RQ500A', 'Gas sensor', ['_TZE204_zougpkpy']),
            tuya.whitelabel('DYGSM', 'DY-RQ500A', 'Gas sensor', ['_TZE204_chbyv06x']),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'gas', tuya.valueConverter.trueFalseEnum0],
                [2, 'gas_value', tuya.valueConverter.divideBy10],
                [
                    6,
                    'alarm_ringtone',
                    tuya.valueConverterBasic.lookup({
                        melody_1: tuya.enum(0),
                        melody_2: tuya.enum(1),
                        melody_3: tuya.enum(2),
                        melody_4: tuya.enum(3),
                        melody_5: tuya.enum(4),
                    }),
                ],
                [7, 'alarm_time', tuya.valueConverter.raw],
                [8, 'self_test', tuya.valueConverter.raw],
                [9, 'self_test_result', tuya.valueConverter.selfTestResult],
                [10, 'preheat', tuya.valueConverter.raw],
                [13, null, null], // alarm_switch; ignore for now since it is unclear what it does
                [16, 'silence', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nus5kk3n']),
        model: 'TS0601_gas_sensor_3',
        vendor: 'Tuya',
        description: 'Gas sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.gas(), tuya.exposes.selfTest(), tuya.exposes.selfTestResult(), tuya.exposes.faultAlarm(), tuya.exposes.silence()],
        meta: {
            tuyaDatapoints: [
                [1, 'gas', tuya.valueConverter.trueFalse0],
                [9, 'self_test_result', tuya.valueConverter.selfTestResult],
                [11, 'fault_alarm', tuya.valueConverter.trueFalse1],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_mby4kbtq', '_TZE204_mby4kbtq']),
        model: 'TS0601_gas_sensor_4', // _TZE200_mby4kbtq looks like TS0601_gas_sensor_2
        vendor: 'Tuya',
        description: 'Gas sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.gas(),
            tuya.exposes.gasValue().withUnit('LEL'),
            e.binary('preheat', ea.STATE, true, false).withDescription('Indicates sensor preheat is active'),
            tuya.exposes.faultAlarm(),
            e.binary('alarm_switch', ea.STATE_SET, true, false),
            tuya.exposes.silence(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'gas', tuya.valueConverter.trueFalse0],
                [2, 'gas_value', tuya.valueConverter.divideBy10],
                [10, 'preheat', tuya.valueConverter.raw],
                [11, 'fault_alarm', tuya.valueConverter.trueFalse1],
                [13, 'alarm_switch', tuya.valueConverter.raw],
                [16, 'silence', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0001', manufacturerName: '_TZ3000_hktqahrq'},
            {manufacturerName: '_TZ3000_hktqahrq'},
            {manufacturerName: '_TZ3000_q6a3tepg'},
            {modelID: 'TS000F', manufacturerName: '_TZ3000_m9af2l6g'},
            {modelID: 'TS000F', manufacturerName: '_TZ3000_mx3vgyea'},
            {modelID: 'TS000F', manufacturerName: '_TZ3000_skueekg3'},
            {modelID: 'TS000F', manufacturerName: '_TZ3000_dlhhrhs8'},
            {modelID: 'TS000F', manufacturerName: '_TZ3000_fdxihpp7'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_skueekg3'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_npzfdcof'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_5ng23zjs'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_rmjr4ufz'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_v7gnj3ad'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_3a9beq8a'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_ark8nv4y'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_mx3vgyea'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_fdxihpp7'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_qsp2pwtf'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_kycczpw8'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_46t1rvdu'},
        ],
        model: 'WHD02',
        vendor: 'Tuya',
        whiteLabel: [
            {vendor: 'Tuya', model: 'iHSW02'},
            {vendor: 'Aubess', model: 'TMZ02'},
            tuya.whitelabel('Tuya', 'QS-zigbee-S08-16A-RF', 'Wall switch module', ['_TZ3000_dlhhrhs8']),
        ],
        description: 'Wall switch module',
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, onOffCountdown: true})],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS011F', [
            '_TZ3000_mvn6jl7x',
            '_TZ3000_raviyuvk',
            '_TYZB01_hlla45kx',
            '_TZ3000_92qd4sqa',
            '_TZ3000_zwaadvus',
            '_TZ3000_k6fvknrr',
            '_TZ3000_6s5dc9lx',
            '_TZ3000_helyqdvs',
            '_TZ3000_rgpqqmbj',
            '_TZ3000_8nyaanzb',
            '_TZ3000_iy2c3n6p',
            '_TZ3000_qlmnxmac',
        ]),
        model: 'TS011F_2_gang_wall',
        vendor: 'Tuya',
        description: '2 gang wall outlet',
        ota: ota.zigbeeOTA,
        extend: [tuya.modernExtend.tuyaOnOff({backlightModeLowMediumHigh: true, childLock: true, endpoints: ['l1', 'l2']})],
        whiteLabel: [
            tuya.whitelabel('ClickSmart+', 'CMA30036', '2 gang socket outlet', ['_TYZB01_hlla45kx']),
            tuya.whitelabel('Rylike', 'RY-WS02Z', '2 gang socket outlet AU', ['_TZ3000_rgpqqmbj', '_TZ3000_8nyaanzb', '_TZ3000_iy2c3n6p']),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['power_on_behavior']},
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: [
            {modelID: 'TS011F', manufacturerName: '_TZ3000_rk2yzt0u'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_o4cjetlm'},
            {manufacturerName: '_TZ3000_o4cjetlm'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_iedbgyxt'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_h3noz0a5'},
            {modelID: 'TS0001', manufacturerName: '_TYZB01_4tlksk8a'},
            {modelID: 'TS0011', manufacturerName: '_TYZB01_rifa0wlb'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_5ucujjts'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_h8ngtlxy'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_w0ypwa1f'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_wpueorev'},
        ],
        model: 'ZN231392',
        vendor: 'Tuya',
        description: 'Smart water/gas valve',
        extend: [tuya.modernExtend.tuyaOnOff({indicatorMode: true})],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genOnOff', ['onOff', 'moesStartUpOnOff']);
        },
        whiteLabel: [tuya.whitelabel('Nous', 'LZ3', 'Smart water/gas valve', ['_TZ3000_abjodzas'])],
    },
    {
        zigbeeModel: ['CK-BL702-AL-01(7009_Z102LG03-1)', 'CK-BL702-AL-01(7009_Z102LG04-2)'],
        model: 'CK-BL702-AL-01',
        vendor: 'Tuya',
        description: 'Zigbee LED bulb',
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [142, 500]}, color: true})],
    },
    {
        zigbeeModel: ['SM0001'],
        model: 'SM0001',
        vendor: 'Tuya',
        description: 'Switch',
        extend: [tuya.modernExtend.tuyaOnOff()],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [tuya.whitelabel('Zemismart', 'ZM-H7', 'Hand wave wall smart switch', ['_TZ3000_jcqs2mrv'])],
    },
    {
        zigbeeModel: ['TS0505B'],
        model: 'TS0505B_1',
        vendor: 'Tuya',
        description: 'Zigbee RGB+CCT light',
        whiteLabel: [
            {vendor: 'Mercator Ikuü', model: 'SMD4106W-RGB-ZB'},
            {vendor: 'Tuya', model: 'A5C-21F7-01'},
            {vendor: 'Mercator Ikuü', model: 'S9E27LED9W-RGB-Z'},
            {vendor: 'Aldi', model: 'L122CB63H11A9.0W', description: 'LIGHTWAY smart home LED-lamp - bulb'},
            {vendor: 'Lidl', model: '14153706L', description: 'Livarno smart LED ceiling light'},
            {vendor: 'Zemismart', model: 'LXZB-ZB-09A', description: 'Zemismart LED Surface Mounted Downlight 9W RGBW'},
            {vendor: 'Feconn', model: 'FE-GU10-5W', description: 'Zigbee GU10 5W smart bulb'},
            {vendor: 'Nedis', model: 'ZBLC1E14'},
            tuya.whitelabel('Aldi', 'L122FF63H11A5.0W', 'LIGHTWAY smart home LED-lamp - spot', ['_TZ3000_j0gtlepx']),
            tuya.whitelabel('Aldi', 'L122AA63H11A6.5W', 'LIGHTWAY smart home LED-lamp - candle', ['_TZ3000_iivsrikg']),
            tuya.whitelabel('Aldi', 'C422AC11D41H140.0W', 'MEGOS LED panel RGB+CCT 40W 3600lm 62 x 62 cm', ['_TZ3000_v1srfw9x']),
            tuya.whitelabel('Aldi', 'C422AC14D41H140.0W', 'MEGOS LED panel RGB+CCT 40W 3600lm 30 x 120 cm', ['_TZ3000_gb5gaeca']),
            tuya.whitelabel('MiBoxer', 'FUT066Z', 'RGB+CCT LED Downlight', ['_TZ3210_zrvxvydd']),
            tuya.whitelabel('MiBoxer', 'FUT039Z', 'RGB+CCT LED controller', ['_TZ3210_jicmoite']),
            tuya.whitelabel('Lidl', '14156506L', 'Livarno Lux smart LED mood light', ['_TZ3210_r0xgkft5']),
            tuya.whitelabel('Lidl', 'HG08010', 'Livarno Home outdoor spotlight', ['_TZ3210_umi6vbsz']),
            tuya.whitelabel('Lidl', 'HG08008', 'Livarno Home LED ceiling light', ['_TZ3210_p9ao60da']),
            tuya.whitelabel('Tuya', 'HG08007', 'Livarno Home outdoor LED band', ['_TZ3210_zbabx9wh']),
            tuya.whitelabel('Lidl', '14158704L', 'Livarno Home LED floor lamp, RGBW', ['_TZ3210_z1vlyufu']),
            tuya.whitelabel('Lidl', '14158804L', 'Livarno Home LED desk lamp RGBW', ['_TZ3210_hxtfthp5']),
            tuya.whitelabel('Lidl', 'HG07834A/HG09155A', 'Livarno Lux GU10 spot RGB', ['_TZ3000_quqaeew6']),
            tuya.whitelabel('Lidl', 'HG07834B', 'Livarno Lux E14 candle RGB', ['_TZ3000_th6zqqy6', '_TZ3000_wr6g6olr']),
            tuya.whitelabel('Lidl', 'HG08131C', 'Livarno Home outdoor E27 bulb in set with flare', ['_TZ3000_q50zhdsc']),
            tuya.whitelabel('Lidl', 'HG07834C', 'Livarno Lux E27 bulb RGB', ['_TZ3000_qd7hej8u']),
            tuya.whitelabel('MiBoxer', 'FUT037Z+', 'RGB led controller', ['_TZB210_417ikxay', '_TZB210_wxazcmsh']),
            tuya.whitelabel('Lidl', 'HG08383B', 'Livarno outdoor LED light chain', ['_TZ3000_bwlvyjwk']),
            tuya.whitelabel('Lidl', 'HG08383A', 'Livarno outdoor LED light chain', ['_TZ3000_taspddvq']),
            tuya.whitelabel('Garza Smart', 'Garza-Standard-A60', 'Standard A60 bulb', ['_TZ3210_sln7ah6r']),
            tuya.whitelabel('UR Lighting', 'TH008L10RGBCCT', '10W RGB+CCT downlight', ['_TZ3210_dn5higyl', '_TZ3210_hicxa0rh']),
            tuya.whitelabel('Lidl', 'HG08010', 'Livarno Home outdoor spotlight', ['_TZ3210_umi6vbsz']),
            tuya.whitelabel('Lidl', 'HG08008', 'Livarno Home LED ceiling light', ['_TZ3210_p9ao60da']),
            tuya.whitelabel('Lidl', 'HG08007', 'Livarno Home outdoor LED band', ['_TZ3210_zbabx9wh']),
            tuya.whitelabel('Lidl', '399629_2110', 'Livarno Lux Ceiling Panel RGB+CCT', ['_TZ3210_c0s1xloa', '_TZ3210_x13bu7za']),
            tuya.whitelabel('Nous', 'P3Z', 'Smart light bulb', ['_TZ3210_cieijuw1']),
            tuya.whitelabel('Moes', 'ZLD-RCW_1', 'RGB+CCT Zigbee LED controller', ['_TZ3000_7hcgjxpc']),
            tuya.whitelabel('Moes', 'ZB-TD5-RCW-GU10', 'RGB+CCT 4.7W GU10 LED bulb', ['_TZ3210_rcggc0ys']),
            tuya.whitelabel('Moes', 'ZB-TDA9-RCW-E27-MS', 'RGB+CCT 9W E27 LED bulb', ['_TZ3210_wxa85bwk']),
            tuya.whitelabel('Moes', 'ZB-LZD10-RCW', '10W RGB+CCT Smart Downlight', ['_TZ3210_s9lumfhn', '_TZ3210_jjqdqxfq']),
            tuya.whitelabel('MiBoxer', 'FUT106ZR', 'GU10 bulb', ['_TZB210_rwy5hexp']),
            tuya.whitelabel('Tuya', 'TS0505B_1_1', 'Zigbee 3.0 18W led light bulb E27 RGBCW', ['_TZ3210_jd3z4yig', '_TZ3210_r5afgmkl']),
            tuya.whitelabel('MiBoxer', 'FUTC11ZR', 'Outdoor light', ['_TZB210_zmppwawa']),
        ],
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}, color: true})],
        configure: async (device, coordinatorEndpoint) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0505B', ['_TZ3210_iystcadi', '_TZ3210_mja6r5ix', '_TZ3210_it1u8ahz']),
        model: 'TS0505B_2',
        vendor: 'Tuya',
        description: 'Zigbee RGB+CCT light',
        whiteLabel: [
            tuya.whitelabel('Lidl', '14149505L/14149506L_2', 'Livarno Lux light bar RGB+CCT (black/white)', ['_TZ3210_iystcadi']),
            tuya.whitelabel('Tuya', 'TS0505B_2_1', 'Zigbee 3.0 18W led light bulb E27 RGBCW', ['_TZ3210_mja6r5ix']),
            tuya.whitelabel('Tuya', 'TS0505B_2_2', 'Zigbee GU10/E14 5W smart bulb', ['_TZ3210_it1u8ahz']),
        ],
        toZigbee: [tz.on_off, tzLocal.led_control, tuya.tz.do_not_disturb],
        fromZigbee: [fz.on_off, fz.tuya_led_controller, fz.brightness, fz.ignore_basic_report],
        exposes: [e.light_brightness_colortemp_colorhs([143, 500]).removeFeature('color_temp_startup'), tuya.exposes.doNotDisturb()],
        configure: async (device, coordinatorEndpoint) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0505B', ['_TZB210_3zfp8mki', '_TZB210_gj0ccsar']),
        model: 'TS0505B_3',
        vendor: 'Tuya',
        description: 'Zigbee RGB+CCT light',
        whiteLabel: [
            tuya.whitelabel('Skydance', 'WZ5_dim_2', 'Zigbee & RF 5 in 1 LED controller (DIM mode)', ['_TZB210_3zfp8mki']),
            tuya.whitelabel('QA', 'QADZC5', '5 in 1 LED controller', ['_TZB210_gj0ccsar']),
        ],
        extend: [light({colorTemp: {range: [153, 500]}, color: {modes: ['hs'], applyRedFix: true, enhancedHue: false}})],
        configure: async (device, coordinatorEndpoint) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        zigbeeModel: ['TS0503B'],
        model: 'TS0503B',
        vendor: 'Tuya',
        description: 'Zigbee RGB light',
        whiteLabel: [{vendor: 'BTF-Lighting', model: 'C03Z'}, tuya.whitelabel('MiBoxer', 'FUT037Z', 'RGB led controller', ['_TZ3210_778drfdt'])],
        extend: [tuya.modernExtend.tuyaLight({color: true})],
    },
    {
        zigbeeModel: ['TS0504B'],
        model: 'TS0504B',
        vendor: 'Tuya',
        description: 'Zigbee RGBW light',
        toZigbee: [tzLocal.TS0504B_color],
        extend: [tuya.modernExtend.tuyaLight({color: true})],
    },
    {
        zigbeeModel: ['TS0501A'],
        model: 'TS0501A',
        description: 'Zigbee light',
        vendor: 'Tuya',
        extend: [tuyaLight()],
        whiteLabel: [
            tuya.whitelabel('Lidl', 'HG06463A', 'Livarno Lux E27 ST64 filament bulb', ['_TZ3000_j2w1dw29']),
            tuya.whitelabel('Lidl', 'HG06463B', 'Livarno Lux E27 G95 filament bulb', ['_TZ3000_nosnx7im']),
            tuya.whitelabel('Lidl', 'HG06462A', 'Livarno Lux E27 A60 filament bulb', ['_TZ3000_7dcddnye', '_TZ3000_nbnmw9nc']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0501B', ['_TZB210_rkgngb5o']),
        model: 'TS0501B_dimmer',
        description: 'Zigbee dimmer',
        vendor: 'Tuya',
        extend: [tuyaLight({configureReporting: true, effect: false})],
        whiteLabel: [tuya.whitelabel('Tuya', 'L1(ZW)', 'Light dimmer 0-10V', ['_TZB210_rkgngb5o'])],
    },
    {
        fingerprint: tuya.fingerprint('TS0501B', ['_TZB210_g01ie5wu']),
        model: 'TS0501B_dimmer_2',
        description: 'Zigbee dimmer',
        vendor: 'Tuya',
        extend: [tuyaLight({minBrightness: 'command', effect: false})],
    },
    {
        zigbeeModel: ['TS0501B'],
        model: 'TS0501B',
        description: 'Zigbee light',
        vendor: 'Tuya',
        extend: [tuyaLight()],
        whiteLabel: [
            tuya.whitelabel('MiBoxer', 'FUT036Z', 'Single color LED controller', ['_TZ3210_dxroobu3', '_TZ3210_dbilpfqk']),
            tuya.whitelabel('Mercator Ikuü', 'SMFL20W-ZB', 'Ridley Floodlight', ['_TZ3000_juq7i1fr']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TYZB01_vwqnz1sn']),
        model: 'TS0202_3',
        vendor: 'Tuya',
        description: 'Motion detector with illuminance',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1_report, fz.illuminance],
        toZigbee: [],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.tamper(), e.illuminance_lux()],
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3210_cwamkvua']),
        model: 'TS0202_2',
        vendor: 'Tuya',
        description: 'Motion sensor with scene switch',
        fromZigbee: [tuya.fz.datapoints, fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [tuya.tz.datapoints],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.occupancy(),
            e.action(['single', 'double', 'hold']),
            e.enum('light', ea.STATE, ['dark', 'bright']),
        ],
        meta: {
            tuyaDatapoints: [
                [102, 'light', tuya.valueConverterBasic.lookup({dark: false, bright: true})],
                [101, 'action', tuya.valueConverterBasic.lookup({single: 0, double: 1, hold: 2})],
            ],
        },
        whiteLabel: [{vendor: 'Linkoze', model: 'LKMSZ001'}],
    },
    {
        fingerprint: [
            {modelID: 'TS0202', manufacturerName: '_TYZB01_jytabjkb'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_lltemgsf'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_5nr7ncpl'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_mg4dy6z6'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_bsvqrxru'},
        ],
        model: 'TS0202_1',
        vendor: 'Tuya',
        description: 'Motion sensor',
        // Requires alarm_1_with_timeout https://github.com/Koenkk/zigbee2mqtt/issues/2818#issuecomment-776119586
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.linkquality(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint('WHD02', ['_TZ3000_hktqahrq']),
        zigbeeModel: ['TS0202'],
        model: 'TS0202',
        vendor: 'Tuya',
        description: 'Motion sensor',
        whiteLabel: [
            {vendor: 'Mercator Ikuü', model: 'SMA02P'},
            {vendor: 'Tuya', model: 'TY-ZPR06'},
            {vendor: 'Tesla Smart', model: 'TS0202'},
            tuya.whitelabel('MiBoxer', 'PIR1-ZB', 'PIR sensor', ['_TZ3040_wqmtjsyk']),
            tuya.whitelabel('Tuya', 'ZMS01', 'Motion sensor', ['_TZ3000_otvn3lne']),
            tuya.whitelabel('Nous', 'E2', 'Motion sensor', ['_TZ3000_h4wnrtck']),
            tuya.whitelabel('Tuya', '809WZT', 'Motion sensor', ['_TZ3040_bb6xaihh']),
            tuya.whitelabel('Niceboy', 'ORBIS Motion Sensor', 'Motion sensor', ['_TZ3000_qomxlryd']),
            tuya.whitelabel('Luminea', 'ZX-5311', 'Motion sensor', ['_TZ3000_jmrgyl7o']),
            tuya.whitelabel('Tuya', 'ZP01', 'Motion sensor', ['_TZ3000_lf56vpxj']),
            tuya.whitelabel('Tuya', 'HW500A', 'Motion sensor', ['_TZ3000_bsvqrxru']),
            tuya.whitelabel('Nedis', 'ZBSM10WT', 'Motion sensor', ['_TZ3000_nss8amz9']),
        ],
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1_report],
        toZigbee: [],
        exposes: (device, options) => {
            const exps: Expose[] = [e.occupancy(), e.battery_low(), e.battery(), e.battery_voltage()];
            if (!device || !['_TZ3000_bsvqrxru', '_TZ3000_nss8amz9'].includes(device.manufacturerName)) {
                exps.push(e.tamper());
            }
            exps.push(e.linkquality());
            return exps;
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            try {
                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.batteryVoltage(endpoint);
            } catch (error) {
                /* Fails for some https://github.com/Koenkk/zigbee2mqtt/issues/13708 */
            }
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3040_fwxuzcf4', '_TZ3040_msl6wxk9']),
        model: 'ZM-35H-Q',
        vendor: 'Tuya',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ZM35HQ_attr, legacy.fromZigbee.ZM35HQ_battery],
        toZigbee: [tz.ZM35HQ_attr],
        extend: [quirkCheckinInterval(15000)],
        exposes: [
            e.occupancy(),
            e.battery_low(),
            e.battery(),
            e.enum('sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            e.enum('keep_time', ea.ALL, [30, 60, 120]).withDescription('PIR keep time in seconds'),
        ],
        configure: tuya.configureMagicPacket,
        whiteLabel: [tuya.whitelabel('Aubess', '40ZH-O', 'Motion sensor', ['_TZ3040_msl6wxk9'])],
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3000_mcxw5ehu', '_TZ3000_6ygjfyll', '_TZ3040_6ygjfyll', '_TZ3000_msl6wxk9']),
        model: 'IH012-RT01',
        vendor: 'Tuya',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.ignore_basic_report, fz.ZM35HQ_attr, fz.battery],
        toZigbee: [tz.ZM35HQ_attr],
        extend: [quirkCheckinInterval(15000)],
        exposes: [
            e.occupancy(),
            e.battery_low(),
            e.battery(),
            e.battery_voltage(),
            e.enum('sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            e.enum('keep_time', ea.ALL, [30, 60, 120]).withDescription('PIR keep time in seconds'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        whiteLabel: [tuya.whitelabel('Tuya', 'ZMS-102', 'Motion sensor', ['_TZ3000_msl6wxk9'])],
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3000_o4mkahkc']),
        model: 'IH012-RT02',
        vendor: 'Tuya',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.ignore_basic_report, fz.ZM35HQ_attr, fz.battery],
        toZigbee: [tz.ZM35HQ_attr],
        extend: [quirkCheckinInterval(15000)],
        exposes: [
            e.occupancy(),
            e.battery_low(),
            e.tamper(),
            e.battery(),
            e.battery_voltage(),
            e.enum('sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            e.enum('keep_time', ea.ALL, [30, 60, 120]).withDescription('PIR keep time in seconds'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0207', manufacturerName: '_TZ3000_m0vaazab'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_ufttklsz'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_nkkl7uzv'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_misw04hq'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_nlsszmzl'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_gszjt2xx'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_wlquqiiz'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_5k5vh43t'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_kxlmv9ag'},
        ],
        model: 'TS0207_repeater',
        vendor: 'Tuya',
        description: 'Repeater',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['TS0207', 'FNB54-WTS08ML1.0'],
        model: 'TS0207_water_leak_detector',
        vendor: 'Tuya',
        description: 'Water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery, fz.ignore_basic_report],
        whiteLabel: [
            {vendor: 'CR Smart Home', model: 'TS0207'},
            tuya.whitelabel('Meian', 'SW02', 'Water leak sensor', ['_TZ3000_kyb656no']),
            tuya.whitelabel('Aubess', 'IH-K665', 'Water leak sensor', ['_TZ3000_k4ej3ww2', '_TZ3000_kstbkt6a', '_TZ3000_upgcbody']),
            tuya.whitelabel('Tuya', 'TS0207_water_leak_detector_1', 'Zigbee water flood sensor + 1m probe cable', ['_TZ3000_ocjlo4ea']),
            tuya.whitelabel('Tuya', 'TS0207_water_leak_detector_3', 'Zigbee water leak sensor', ['_TYZB01_sqmd19i1']),
            tuya.whitelabel('Tuya', '899WZ', 'Water leak detector with 80DB Alarm', ['_TZ3000_mugyhz0q']),
            tuya.whitelabel('Niceboy', 'ORBIS Water Sensor', 'Water leak sensor', ['_TZ3000_awvmkayh']),
            tuya.whitelabel('Nous', 'E4', 'Water Leakage Sensor)', ['_TZ3000_0s9gukzt']),
        ],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: (device, options) => {
            const exps: Expose[] = [e.water_leak(), e.battery_low(), e.battery()];
            const noTamperModels = [
                // manufacturerName for models without a tamper sensor
                '_TZ3000_mugyhz0q', // Tuya 899WZ
                '_TZ3000_k4ej3ww2', // Aubess IH-K665
                '_TZ3000_kstbkt6a', // Aubess IH-K665
                '_TZ3000_upgcbody', // Zigbee water leak sensor
            ];
            if (!device || !noTamperModels.includes(device.manufacturerName)) {
                exps.push(e.tamper());
            }
            exps.push(e.linkquality());
            return exps;
        },
    },
    {
        fingerprint: [{modelID: 'TS0207', manufacturerName: '_TZ3210_tgvtvdoc'}],
        model: 'RB-SRAIN01',
        vendor: 'Tuya',
        description: 'Solar rain sensor',
        fromZigbee: [tuya.fz.datapoints],
        extend: [iasZoneAlarm({zoneType: 'rain', zoneAttributes: ['alarm_1']}), battery({percentageReporting: false})],
        exposes: [
            e.illuminance().withUnit('lx'),
            e.numeric('illuminance_average_20min', ea.STATE).withUnit('lx').withDescription('Illuminance average for the last 20 minutes'),
            e.numeric('illuminance_maximum_today', ea.STATE).withUnit('lx').withDescription('Illuminance maximum for the last 24 hours'),
            e.binary('cleaning_reminder', ea.STATE, true, false).withDescription('Cleaning reminder'),
            e.numeric('rain_intensity', ea.STATE).withUnit('mV').withDescription('Rainfall intensity'),
        ],
        meta: {
            tuyaDatapoints: [
                [4, 'battery', tuya.valueConverter.raw],
                [101, 'illuminance', tuya.valueConverter.raw],
                [102, 'illuminance_average_20min', tuya.valueConverter.raw],
                [103, 'illuminance_maximum_today', tuya.valueConverter.raw],
                [104, 'cleaning_reminder', tuya.valueConverter.trueFalse0],
                [105, 'rain_intensity', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0101', ['_TYZB01_ijihzffk', '_TZ3210_tfxwxklq', '_TZ3210_2dfy6tol']),
        model: 'TS0101',
        vendor: 'Tuya',
        description: 'Zigbee Socket',
        whiteLabel: [
            {vendor: 'Larkkey', model: 'PS080'},
            {vendor: 'Mercator Ikuü', model: 'SPBS01G'},
            tuya.whitelabel('Mercator Ikuü', 'SISW01', 'Inline Switch', ['_TZ3210_2dfy6tol']),
        ],
        extend: [tuya.modernExtend.tuyaOnOff()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0108', manufacturerName: '_TYZB01_7yidyqxd'}],
        model: 'TS0108',
        vendor: 'Tuya',
        description: 'Socket with 2 USB',
        whiteLabel: [{vendor: 'Larkkey', model: 'PS580'}],
        extend: [tuya.modernExtend.tuyaOnOff()],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {l1: 1, l2: 7};
        },
        meta: {multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_myd45weu', '_TZE200_ga1maeof', '_TZE200_2se8efxh', '_TZE204_myd45weu']),
        model: 'TS0601_soil',
        vendor: 'Tuya',
        description: 'Soil sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.temperature(), e.soil_moisture(), tuya.exposes.temperatureUnit(), e.battery(), tuya.exposes.batteryState()],
        meta: {
            tuyaDatapoints: [
                [3, 'soil_moisture', tuya.valueConverter.raw],
                [5, 'temperature', tuya.valueConverter.raw],
                [9, 'temperature_unit', tuya.valueConverter.temperatureUnit],
                [14, 'battery_state', tuya.valueConverter.batteryState],
                [15, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE284_g2e6cpnw', '_TZE284_sgabhwa6']),
        model: 'TS0601_soil_2',
        vendor: 'Tuya',
        description: 'Soil sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.soil_moisture(),
            e.numeric('temperature', ea.STATE).withUnit('°C').withValueMin(-10).withValueMax(60).withDescription('Soil temperature'),
            e.numeric('temperature_f', ea.STATE).withUnit('°F').withValueMin(14).withValueMax(140).withDescription('Soil temperature'),
            e
                .numeric('temperature_sensitivity', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(0.3)
                .withValueMax(1)
                .withValueStep(0.1)
                .withDescription('Temperature sensitivity'),
            e.numeric('humidity_sensitivity', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(5).withDescription('Humidity sensitivity'),
            e.enum('temperature_alarm', ea.STATE, ['lower_alarm', 'upper_alarm', 'cancel']).withDescription('Temperature alarm state'),
            e.enum('humidity_alarm', ea.STATE, ['lower_alarm', 'upper_alarm', 'cancel']).withDescription('Humidity alarm state'),
            e
                .numeric('max_temperature_alarm', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(0)
                .withValueMax(60)
                .withDescription('Upper temperature limit'),
            e
                .numeric('min_temperature_alarm', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(0)
                .withValueMax(60)
                .withDescription('Lower temperature limit'),
            e.numeric('max_humidity_alarm', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100).withDescription('Upper humidity limit'),
            e.numeric('min_humidity_alarm', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100).withDescription('Lower humidity limit'),
            e.numeric('schedule_periodic', ea.STATE_SET).withUnit('min').withValueMin(5).withValueMax(60).withDescription('Report sensitivity'),
            e.battery(),
            tuya.exposes.batteryState(),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    101,
                    'temperature_alarm',
                    tuya.valueConverterBasic.lookup({
                        lower_alarm: tuya.enum(0),
                        upper_alarm: tuya.enum(1),
                        cancel: tuya.enum(2),
                    }),
                ],
                [
                    102,
                    'humidity_alarm',
                    tuya.valueConverterBasic.lookup({
                        lower_alarm: tuya.enum(0),
                        upper_alarm: tuya.enum(1),
                        cancel: tuya.enum(2),
                    }),
                ],
                [3, 'soil_moisture', tuya.valueConverter.raw],
                [5, 'temperature', tuya.valueConverter.divideBy10],
                [110, 'temperature_f', tuya.valueConverter.divideBy10],
                [107, 'temperature_sensitivity', tuya.valueConverter.divideBy10],
                [108, 'humidity_sensitivity', tuya.valueConverter.raw],
                [103, 'max_temperature_alarm', tuya.valueConverter.divideBy10],
                [104, 'min_temperature_alarm', tuya.valueConverter.divideBy10],
                [105, 'max_humidity_alarm', tuya.valueConverter.raw],
                [106, 'min_humidity_alarm', tuya.valueConverter.raw],
                [109, 'schedule_periodic', tuya.valueConverter.raw],
                [15, 'battery', tuya.valueConverter.raw],
                [14, 'battery_state', tuya.valueConverter.batteryState],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE284_aao3yzhs']),
        model: 'TS0601_soil_3',
        vendor: 'Tuya',
        description: 'Soil sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.temperature(), e.soil_moisture(), tuya.exposes.temperatureUnit(), e.battery(), tuya.exposes.batteryState()],
        meta: {
            tuyaDatapoints: [
                [3, 'soil_moisture', tuya.valueConverter.raw],
                [5, 'temperature', tuya.valueConverter.divideBy10],
                [9, 'temperature_unit', tuya.valueConverter.temperatureUnit],
                [14, 'battery_state', tuya.valueConverter.batteryState],
                [15, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE200_ip2akl4w',
            '_TZE200_1agwnems',
            '_TZE200_la2c2uo9',
            '_TZE200_579lguh2',
            '_TZE200_vucankjx',
            '_TZE200_4mh6tyyo',
            '_TZE204_hlx9tnzb',
            '_TZE204_n9ctkb6j',
            '_TZE204_9qhuzgo0',
            '_TZE200_9cxuhakf',
            '_TZE200_a0syesf5',
            '_TZE200_3p5ydos3',
            '_TZE200_swaamsoy',
            '_TZE200_ojzhk75b',
            '_TZE200_w4cryh2i',
            '_TZE200_dfxkcots',
            '_TZE200_9i9dt8is',
            '_TZE200_ctq0k47x',
            '_TZE200_ebwgzdqq',
            '_TZE204_vevc4c6g',
            '_TZE200_0nauxa0p',
        ]),
        model: 'TS0601_dimmer_1_gang_1',
        vendor: 'Tuya',
        description: '1 gang smart dimmer',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightnessWithMinMax(),
            tuya.exposes.countdown(),
            tuya.exposes.lightType(),
            e.power_on_behavior().withAccess(ea.STATE_SET),
            tuya.exposes.backlightModeOffNormalInverted().withAccess(ea.STATE_SET),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness', tuya.valueConverter.scale0_254to0_1000],
                [4, 'light_type', tuya.valueConverter.lightType],
                [5, 'max_brightness', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehavior],
                [21, 'backlight_mode', tuya.valueConverter.backlightModeOffNormalInverted],
            ],
        },
        whiteLabel: [
            {vendor: 'Lerlink', model: 'X706U'},
            {vendor: 'Moes', model: 'ZS-EUD_1gang'},
            {vendor: 'Larkkey', model: 'ZSTY-SM-1DMZG-EU'},
            {vendor: 'Earda', model: 'EDM-1ZAA-EU'},
            {vendor: 'Earda', model: 'EDM-1ZAB-EU'},
            {vendor: 'Earda', model: 'EDM-1ZBA-EU'},
            {vendor: 'Mercator Ikuü', model: 'SSWD01'},
            {vendor: 'Moes', model: 'ZS-USD'},
            {vendor: 'Moes', model: 'EDM-1ZBB-EU'},
            tuya.whitelabel('Moes', 'ZS-SR-EUD-1', 'Star ring smart dimmer switch 1 gang', ['_TZE204_hlx9tnzb']),
            tuya.whitelabel('Moes', 'MS-105Z', 'Smart Dimmer module', ['_TZE200_la2c2uo9']),
            tuya.whitelabel('Mercator Ikuü', 'SSWM-DIMZ', 'Switch Mechanism', ['_TZE200_9cxuhakf']),
            tuya.whitelabel('Mercator Ikuü', 'SSWRM-ZB', 'Rotary dimmer mechanism', ['_TZE200_a0syesf5']),
            tuya.whitelabel('Lonsonho', 'EDM-1ZBB-EU', 'Smart Dimmer Switch', ['_TZE200_0nauxa0p']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_whpb9yts']),
        model: 'TS0601_dimmer_1_gang_2',
        vendor: 'Tuya',
        description: '1 gang smart dimmer',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightness(),
            tuya.exposes.countdown(),
            tuya.exposes.lightType(),
            e.power_on_behavior().withAccess(ea.STATE_SET),
            tuya.exposes.backlightModeOffNormalInverted().withAccess(ea.STATE_SET),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [3, 'brightness', tuya.valueConverter.scale0_254to0_1000],
                [4, 'light_type', tuya.valueConverter.lightType],
                [5, 'max_brightness', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehavior],
                [21, 'backlight_mode', tuya.valueConverter.backlightModeOffNormalInverted],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_fjjbhx9d', '_TZE200_e3oitdyu', '_TZE200_gwkapsoq', '_TZE204_zenj4lxv']),
        model: 'TS0601_dimmer_2',
        vendor: 'Tuya',
        description: '2 gang smart dimmer',
        whiteLabel: [
            {vendor: 'Moes', model: 'ZS-EUD_2gang'},
            {vendor: 'Moes', model: 'MS-105B'}, // _TZE200_e3oitdyu
            tuya.whitelabel('Moes', 'ZS-SR-EUD-2', 'Star ring smart dimmer switch 2 gangs', ['_TZE204_zenj4lxv']),
        ],
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {l1: 1, l2: 1}}),
            tuya.modernExtend.dpLight({
                state: {
                    dp: 1,
                    type: tuya.dataTypes.bool,
                    valueOn: ['ON', true],
                    valueOff: ['OFF', false],
                    skip: tuya.skip.stateOnAndBrightnessPresent,
                },
                brightness: {dp: 2, type: tuya.dataTypes.number, scale: [0, 254, 0, 1000]},
                min: {dp: 3, type: tuya.dataTypes.number, scale: [0, 254, 0, 1000]},
                max: {dp: 5, type: tuya.dataTypes.number, scale: [0, 254, 0, 1000]},
                endpoint: 'l1',
            }),
            tuya.modernExtend.dpNumeric({
                name: 'countdown',
                dp: 6,
                type: tuya.dataTypes.number,
                expose: tuya.exposes.countdown(),
                endpoint: 'l1',
            }),
            tuya.modernExtend.dpLight({
                state: {
                    dp: 7,
                    type: tuya.dataTypes.bool,
                    valueOn: ['ON', true],
                    valueOff: ['OFF', false],
                    skip: tuya.skip.stateOnAndBrightnessPresent,
                },
                brightness: {dp: 8, type: tuya.dataTypes.number, scale: [0, 254, 0, 1000]},
                min: {dp: 9, type: tuya.dataTypes.number, scale: [0, 254, 0, 1000]},
                max: {dp: 11, type: tuya.dataTypes.number, scale: [0, 254, 0, 1000]},
                endpoint: 'l2',
            }),
            tuya.modernExtend.dpNumeric({
                name: 'countdown',
                dp: 12,
                type: tuya.dataTypes.number,
                expose: tuya.exposes.countdown(),
                endpoint: 'l2',
            }),
            tuya.modernExtend.dpPowerOnBehavior({
                dp: 14,
                type: tuya.dataTypes.enum,
            }),
            tuya.modernExtend.dpBacklightMode({
                dp: 21,
                type: tuya.dataTypes.enum,
            }),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_vm1gyrso', '_TZE204_1v1dxkck', '_TZE204_znvwzxkq', '_TZE284_znvwzxkq']),
        model: 'TS0601_dimmer_3',
        vendor: 'Tuya',
        description: '3 gang smart dimmer',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint('l1'),
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint('l2'),
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint('l3'),
            tuya.exposes.countdown().withEndpoint('l1'),
            tuya.exposes.countdown().withEndpoint('l2'),
            tuya.exposes.countdown().withEndpoint('l3'),
            e.power_on_behavior().withAccess(ea.STATE_SET),
            tuya.exposes.backlightModeOffNormalInverted().withAccess(ea.STATE_SET),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [5, 'max_brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown_l1', tuya.valueConverter.countdown],
                [7, 'state_l2', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [8, 'brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [9, 'min_brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [11, 'max_brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [12, 'countdown_l2', tuya.valueConverter.countdown],
                [15, 'state_l3', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [16, 'brightness_l3', tuya.valueConverter.scale0_254to0_1000],
                [17, 'min_brightness_l3', tuya.valueConverter.scale0_254to0_1000],
                [19, 'max_brightness_l3', tuya.valueConverter.scale0_254to0_1000],
                [20, 'countdown_l3', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehaviorEnum],
                [21, 'backlight_mode', tuya.valueConverter.backlightModeOffNormalInverted],
            ],
        },
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1};
        },
        whiteLabel: [
            {vendor: 'Moes', model: 'ZS-EUD_3gang'},
            tuya.whitelabel('Moes', 'ZS-SR-EUD-3', 'Star ring smart dimmer switch 3 gangs', ['_TZE204_1v1dxkck']),
            tuya.whitelabel('Zemismart', 'ZN2S-RS3E-DH', '3 gang dimmer', ['_TZE204_znvwzxkq', '_TZE284_znvwzxkq']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_bxoo2swd', '_TZE200_tsxpl0d0']),
        model: 'TS0601_dimmer_4',
        vendor: 'Tuya',
        description: '2 gang smart dimmer module',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint('l1'),
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint('l2'),
            tuya.exposes.countdown().withEndpoint('l1'),
            tuya.exposes.countdown().withEndpoint('l2'),
            tuya.exposes.lightType().withEndpoint('l1'),
            tuya.exposes.lightType().withEndpoint('l2'),
            e.enum('power_on_behavior', ea.STATE_SET, ['off', 'on', 'previous']),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [4, 'light_type_l1', tuya.valueConverterBasic.lookup({led: tuya.enum(0), incandescent: tuya.enum(1), halogen: tuya.enum(2)})],
                [5, 'max_brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown_l1', tuya.valueConverter.countdown],
                [7, 'state_l2', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [8, 'brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [9, 'min_brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [10, 'light_type_l2', tuya.valueConverterBasic.lookup({led: tuya.enum(0), incandescent: tuya.enum(1), halogen: tuya.enum(2)})],
                [11, 'max_brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [12, 'countdown_l2', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverterBasic.lookup({off: tuya.enum(0), on: tuya.enum(1), previous: tuya.enum(2)})],
            ],
        },
        endpoint: (device) => {
            return {l1: 1, l2: 1};
        },
        whiteLabel: [
            tuya.whitelabel('Moes', 'ZM-105B-M', '2 gang smart dimmer module', ['_TZE204_bxoo2swd']),
            tuya.whitelabel('KnockautX', 'FMD2C018', '2 gang smart dimmer module', ['_TZE200_tsxpl0d0']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_dcnsggvz']),
        model: 'TS0601_dimmer_5',
        vendor: 'Tuya',
        description: '1 gang smart dimmer module',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightnessWithMinMax(),
            e.enum('power_on_behavior', ea.STATE_SET, ['off', 'on', 'previous']),
            tuya.exposes.countdown(),
            tuya.exposes.lightType(),
            tuya.exposes.switchType(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness', tuya.valueConverter.scale0_254to0_1000],
                [4, 'light_type', tuya.valueConverterBasic.lookup({led: tuya.enum(0), incandescent: tuya.enum(1), halogen: tuya.enum(2)})],
                [4, 'light_type', tuya.valueConverter.lightType],
                [5, 'max_brightness', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverterBasic.lookup({off: tuya.enum(0), on: tuya.enum(1), previous: tuya.enum(2)})],
                [57, 'switch_type', tuya.valueConverterBasic.lookup({toggle: tuya.enum(0), state: tuya.enum(1), momentary: tuya.enum(2)})],
            ],
        },
        whiteLabel: [{vendor: 'Moes', model: 'MS-105-M'}],
    },
    {
        fingerprint: [
            {
                modelID: 'TS0601',
                manufacturerName: '_TZE204_5cuocqty',
            },
        ],
        model: 'ZDMS16-1',
        vendor: 'Avatto',
        description: 'Zigbee 1 channel Dimmer',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightnessWithMinMax(),
            tuya.exposes.countdown(),
            tuya.exposes.switchType(),
            e.power_on_behavior().withAccess(ea.STATE_SET),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness', tuya.valueConverter.scale0_254to0_1000],
                [4, 'switch_type', tuya.valueConverter.switchType2],
                [5, 'max_brightness', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehaviorEnum],
            ],
        },
    },
    {
        fingerprint: [
            {
                modelID: 'TS0601',
                manufacturerName: '_TZE204_o9gyszw2',
            },
        ],
        model: 'ZDMS16-2',
        vendor: 'Avatto',
        description: 'Zigbee 2 channels Dimmer',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint('l1'),
            tuya.exposes.countdown().withEndpoint('l1'),
            tuya.exposes.switchType().withEndpoint('l1'),
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint('l2'),
            tuya.exposes.countdown().withEndpoint('l2'),
            tuya.exposes.switchType().withEndpoint('l2'),
            e.power_on_behavior().withAccess(ea.STATE_SET),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [4, 'switch_type_l1', tuya.valueConverter.switchType2],
                [5, 'max_brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown_l1', tuya.valueConverter.countdown],
                [7, 'state_l2', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [8, 'brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [9, 'min_brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [10, 'switch_type_l2', tuya.valueConverter.switchType2],
                [11, 'max_brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [12, 'countdown_l2', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehaviorEnum],
            ],
        },
        endpoint: (device) => {
            return {l1: 1, l2: 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_p0gzbqct']),
        model: 'TS0601_dimmer_knob',
        vendor: 'Tuya',
        description: 'Zigbee smart knob dimmer',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightness().withMinBrightness().setAccess('min_brightness', ea.STATE_SET),
            tuya.exposes.lightType(),
            tuya.exposes.indicatorModeNoneRelayPos(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness', tuya.valueConverter.scale0_254to0_1000],
                [4, 'light_type', tuya.valueConverter.lightType],
                [21, 'indicator_mode', tuya.valueConverterBasic.lookup({none: 0, relay: 1, pos: 2})],
            ],
        },
        whiteLabel: [
            {vendor: 'Moes', model: 'WS-SY-EURD'},
            {vendor: 'Moes', model: 'WS-SY-EURD-WH-MS'},
        ],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_oiymh3qu'}],
        model: 'TS011F_socket_module',
        vendor: 'Tuya',
        description: 'Socket module',
        extend: [tuya.modernExtend.tuyaOnOff()],
        whiteLabel: [
            {vendor: 'LoraTap', model: 'RR400ZB'},
            {vendor: 'LoraTap', model: 'SP400ZB'},
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS011F', manufacturerName: '_TZ3000_wxtp7c5y'},
            {modelID: 'TS011F', manufacturerName: '_TYZB01_mtunwanm'},
        ],
        model: 'TS011F_wall_outlet',
        vendor: 'Tuya',
        description: 'In-wall outlet',
        extend: [tuya.modernExtend.tuyaOnOff()],
        whiteLabel: [
            {vendor: 'Teekar', model: 'SWP86-01OG'},
            tuya.whitelabel('ClickSmart+', 'CMA30035', '1 gang socket outlet', ['_TYZB01_mtunwanm']),
            {vendor: 'BSEED', model: 'Zigbee Socket'},
        ],
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_u9kkqh5o'}],
        model: 'CSP043',
        vendor: 'ClickSmart+',
        description: '1 gang switch module with neutral wire',
        extend: [onOff({powerOnBehavior: false})],
    },
    {
        fingerprint: [{modelID: 'TS0012', manufacturerName: '_TZ3000_biakwrag'}],
        model: 'CSP042',
        vendor: 'ClickSmart+',
        description: '2 gang switch module without neutral wire',
        extend: [tuya.modernExtend.tuyaOnOff({switchType: false, endpoints: ['l1', 'l2']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['power_on_behavior']},
    },
    {
        fingerprint: tuya.fingerprint('TS110F', ['_TZ3000_estfrmup', '_TZ3000_ktuoyvt5']),
        model: 'CSP051',
        vendor: 'ClickSmart+',
        description: '1 gang smart dimmer switch module without neutral',
        extend: [light()],
        whiteLabel: [tuya.whitelabel('Lonsonho', 'QS-Zigbee-D02-TRIAC-L', '1 gang smart dimmer switch module without neutral', ['_TZ3000_ktuoyvt5'])],
    },
    {
        fingerprint: [
            {modelID: 'isltm67\u0000', manufacturerName: '_TYST11_pisltm67'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pisltm67'},
        ],
        model: 'S-LUX-ZB',
        vendor: 'Tuya',
        description: 'Light sensor',
        fromZigbee: [legacy.fromZigbee.SLUXZB],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.battery(), e.illuminance_lux(), e.linkquality(), e.enum('brightness_level', ea.STATE, ['LOW', 'MEDIUM', 'HIGH'])],
    },
    {
        zigbeeModel: ['TS130F'],
        model: 'TS130F',
        vendor: 'Tuya',
        description: 'Curtain/blind switch',
        fromZigbee: [fz.cover_position_tilt, tuya.fz.indicator_mode, fz.tuya_cover_options, tuya.fz.backlight_mode_off_on],
        toZigbee: [
            tz.cover_state,
            tz.cover_position_tilt,
            tz.tuya_cover_calibration,
            tz.tuya_cover_reversal,
            tuya.tz.backlight_indicator_mode_2,
            tuya.tz.backlight_indicator_mode_1,
        ],
        meta: {coverInverted: true},
        whiteLabel: [
            {vendor: 'LoraTap', model: 'SC400'},
            tuya.whitelabel('Zemismart', 'ZN-LC1E', 'Smart curtain/shutter switch', ['_TZ3000_74hsp7qy']),
            tuya.whitelabel('Nous', 'L12Z', 'Smart ZigBee Curtain Module L12Z', ['_TZ3000_jwv3cwak']),
            tuya.whitelabel('Danor', 'SK-Z802C-US', 'Smart curtain/shutter switch', ['_TZ3000_8h7wgocw']),
            tuya.whitelabel('Nous', 'B4Z', 'Curtain switch', ['_TZ3000_yruungrl']),
        ],
        exposes: (device) => {
            const exps = [
                e.cover_position(),
                e.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']),
                e.binary('calibration', ea.ALL, 'ON', 'OFF'),
                e.binary('motor_reversal', ea.ALL, 'ON', 'OFF'),
                e.numeric('calibration_time', ea.STATE).withUnit('s').withDescription('Calibration time'),
            ];
            if (!device || device.manufacturerName !== ('_TZ3210_xbpt8ewc' || '_TZ3000_1dd0d5yi')) {
                exps.push(tuya.exposes.indicatorMode(), tuya.exposes.backlightModeOffOn());
            }
            exps.push(e.linkquality());
            return exps;
        },
    },
    {
        fingerprint: [{modelID: 'TS130F', manufacturerName: '_TZ3000_1dd0d5yi'}],
        model: 'MS-108ZR',
        vendor: 'Moes',
        description: 'Zigbee + RF curtain switch module',
        meta: {coverInverted: true},
        whiteLabel: [tuya.whitelabel('QA', 'QACZ1', 'Curtain switch', ['_TZ3210_xbpt8ewc'])],
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.tuya_cover_options, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.moes_cover_calibration, tz.cover_position_tilt, tz.tuya_cover_reversal],
        exposes: [
            e.cover_position(),
            e.numeric('calibration_time', ea.ALL).withValueMin(0).withValueMax(100),
            e.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']),
            e.binary('motor_reversal', ea.ALL, 'ON', 'OFF'),
        ],
    },
    {
        zigbeeModel: ['qnazj70', 'kjintbl'],
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_oisqyl4o'},
            {modelID: 'TS0601', manufacturerName: '_TZ3000_uim07oem'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_js3mgbjb'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_7deq70b8'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_ptaqh9tk'},
        ],
        model: 'TS0601_switch',
        vendor: 'Tuya',
        description: '1, 2, 3 or 4 gang switch',
        exposes: [
            e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET),
        ],
        fromZigbee: [fz.ignore_basic_report, legacy.fromZigbee.tuya_switch],
        toZigbee: [legacy.toZigbee.tuya_switch_state],
        meta: {multiEndpoint: true},
        whiteLabel: [
            {vendor: 'Norklmes', model: 'MKS-CM-W5'},
            {vendor: 'Somgoms', model: 'ZSQB-SMB-ZB'},
            {vendor: 'Moes', model: 'WS-EUB1-ZG'},
            {vendor: 'AVATTO', model: 'ZGB-WS-EU'},
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {l1: 1, l2: 1, l3: 1, l4: 1};
        },
    },
    {
        zigbeeModel: ['TS0301'],
        model: 'TS0301',
        vendor: 'Tuya',
        description: 'Cover',
        extend: [battery(), windowCovering({controls: ['lift', 'tilt']})],
        whiteLabel: [tuya.whitelabel('Yookee', 'D10110_1', 'Smart blind', ['_TZE200_9caxna4s'])],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE200_aqnazj70',
            '_TZE200_di3tfv5b',
            '_TZE200_mexisfik',
            '_TZE204_6wi2mope',
            '_TZE204_iik0pquw',
            '_TZE204_aagrxlbd',
        ]),
        model: 'TS0601_switch_4_gang_1',
        vendor: 'Tuya',
        description: '4 gang switch',
        exposes: [
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.switch().withEndpoint('l4'),
        ],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        whiteLabel: [
            tuya.whitelabel('ZYXH', 'TY-04Z', '4 gang switch', ['_TZE204_iik0pquw']),
            {vendor: 'Norklmes', model: 'MKS-CM-W5'},
            {vendor: 'Somgoms', model: 'ZSQB-SMB-ZB'},
            {vendor: 'Moes', model: 'WS-EUB1-ZG'},
            {vendor: 'AVATTO', model: 'ZGB-WS-EU'},
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
            ],
        },
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_jwsjbxjs', '_TZE200_leaqthqq']),
        model: 'TS0601_switch_5_gang',
        vendor: 'Tuya',
        description: '5 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.switch().withEndpoint('l4'),
            tuya.exposes.switch().withEndpoint('l5'),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_mwvfvw8g', '_TZE200_wnp4d4va', '_TZE200_cduqh1l0', '_TZE200_emxxanvi']),
        model: 'TS0601_switch_6_gang',
        vendor: 'Tuya',
        description: '6 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        exposes: [
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.switch().withEndpoint('l4'),
            tuya.exposes.switch().withEndpoint('l5'),
            tuya.exposes.switch().withEndpoint('l6'),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1};
        },
        whiteLabel: [tuya.whitelabel('Mercator Ikuü', 'SSW06G', '6 Gang switch', ['_TZE200_wnp4d4va'])],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_ojtqawav', '_TZE204_gbagoilo']),
        model: 'TS0601_switch_1_gang',
        vendor: 'Tuya',
        description: '1 gang switch',
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, legacy.fromZigbee.tuya_switch],
        toZigbee: [legacy.toZigbee.tuya_switch_state],
        whiteLabel: [tuya.whitelabel('Shawader', 'SMKG-1KNL-US/TZB-W', '1 gang switch', ['_TZE204_ojtqawav'])],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_gbagoilo']),
        model: 'MG-ZG01W',
        vendor: 'Tuya',
        description: '1 gang switch with power meter',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET), e.voltage(), e.current(), e.power()],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [21, 'current', tuya.valueConverter.divideBy1000],
                [22, 'power', tuya.valueConverter.divideBy10],
                [23, 'voltage', tuya.valueConverter.divideBy10],
            ],
        },
        endpoint: (device) => {
            return {l1: 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nkjintbl', '_TZE200_ji1gn7rw', '_TZE200_3t91nb6k', '_TZE204_wvovwe9h', '_TZE204_3t91nb6k']),
        model: 'TS0601_switch_2_gang',
        vendor: 'Tuya',
        description: '2 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET), e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, legacy.fromZigbee.tuya_switch],
        toZigbee: [legacy.toZigbee.tuya_switch_state],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {l1: 1, l2: 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nh9m9emk']),
        model: 'MG-ZG02W',
        vendor: 'Tuya',
        description: '2 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET), e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET)],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
            ],
        },
        endpoint: (device) => {
            return {l1: 1, l2: 1};
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_kyfqmmyl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2hf7x9n3'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_atpwqgml'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_bynnczcb'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_atpwqgml'},
        ],
        model: 'TS0601_switch_3_gang',
        vendor: 'Tuya',
        description: '3 gang switch',
        whiteLabel: [{vendor: 'NOVADIGITAL', model: 'WS-US-ZB', description: 'Interruptor touch Zigbee 3 Teclas'}],
        exposes: [
            e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
        ],
        fromZigbee: [fz.ignore_basic_report, legacy.fromZigbee.tuya_switch],
        toZigbee: [legacy.toZigbee.tuya_switch_state],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {l1: 1, l2: 1, l3: 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_go3tvswy']),
        model: 'MG-ZG03W',
        vendor: 'Tuya',
        description: '3 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
            ],
        },
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0215A', [
            '_TZ3000_4fsgukof',
            '_TZ3000_wr2ucaj9',
            '_TZ3000_zsh6uat3',
            '_TZ3000_tj4pwzzm',
            '_TZ3000_2izubafb',
            '_TZ3000_pkfazisv',
            '_TZ3000_0dumfk2z',
            '_TZ3000_ssp0maqm',
            '_TZ3000_p3fph1go',
        ]),
        model: 'TS0215A_sos',
        vendor: 'Tuya',
        description: 'SOS button',
        fromZigbee: [fz.command_emergency, fz.battery],
        exposes: [e.battery(), e.battery_voltage(), e.action(['emergency'])],
        toZigbee: [],
        whiteLabel: [
            tuya.whitelabel('Tuya', 'BT400B', 'Zigbee Panic Button', ['_TZ3000_0dumfk2z']),
            tuya.whitelabel('Woox', 'R7052', 'Smart SOS button', ['_TZ3000_ssp0maqm']),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genTime', 'genBasic', 'ssIasAce', 'ssIasZone']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_p6ju8myv'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_0zrccfgx'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_fsiepnrh'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_ug1vtuzn'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_eo3dttwe'},
        ],
        model: 'TS0215A_remote',
        vendor: 'Tuya',
        description: 'Security remote control',
        fromZigbee: [fz.command_arm, fz.command_emergency, fz.battery],
        exposes: [e.battery(), e.action(['disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        toZigbee: [],
        whiteLabel: [
            {vendor: 'Woox', model: 'R7054'},
            {vendor: 'Nedis', model: 'ZBRC10WT'},
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genTime', 'genBasic', 'ssIasAce', 'ssIasZone']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0503A', manufacturerName: '_TZ3000_obacbukl'}],
        model: 'TS0503A',
        vendor: 'Tuya',
        description: 'Led strip controller',
        extend: [tuya.modernExtend.tuyaLight({color: true})],
    },
    {
        zigbeeModel: ['TS0503A'],
        model: 'TYZS1L',
        vendor: 'Tuya',
        description: 'Led strip controller HSB',
        exposes: [e.light_colorhs()],
        fromZigbee: [fz.on_off, fz.tuya_led_controller],
        toZigbee: [tz.tuya_led_controller, tz.ignore_transition, tz.ignore_rate],
    },
    {
        zigbeeModel: ['TS0502A'],
        model: 'TS0502A',
        vendor: 'Tuya',
        description: 'Light controller',
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}})],
        whiteLabel: [
            tuya.whitelabel('Lidl', 'HG06492B', 'Livarno Lux E14 candle CCT', ['_TZ3000_oborybow']),
            tuya.whitelabel('Lidl', 'HG06492A/HG08130A', 'Livarno Lux GU10 spot CCT', ['_TZ3000_el5kt5im']),
            tuya.whitelabel('Lidl', 'HG06492C/HG08130C/HG09154C', 'Livarno Lux E27 bulb CCT', ['_TZ3000_49qchf10']),
            tuya.whitelabel('Lidl', '14147206L', 'Livarno Lux ceiling light', ['_TZ3000_rylaozuc', '_TZ3000_5fkufhn1']),
            tuya.whitelabel('Lidl', '14153905L', 'Livarno Home LED floor lamp', ['_TZ3000_8uaoilu9']),
        ],
        configure: async (device, coordinatorEndpoint) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        zigbeeModel: ['TS0502B'],
        model: 'TS0502B',
        vendor: 'Tuya',
        description: 'Light controller',
        whiteLabel: [
            tuya.whitelabel('Mercator Ikuü', 'SMI7040', 'Ford Batten Light', ['_TZ3000_zw7wr5uo']),
            {vendor: 'Mercator Ikuü', model: 'SMD9300', description: 'Donovan Panel Light'},
            tuya.whitelabel('Aldi', 'F122SB62H22A4.5W', 'LIGHTWAY smart home LED-lamp - filament', ['_TZ3000_g1glzzfk']),
            tuya.whitelabel('MiBoxer', 'FUT035Z+', 'Dual white LED controller', [
                '_TZ3210_frm6149r',
                '_TZ3210_jtifm80b',
                '_TZ3210_xwqng7ol',
                '_TZB210_lmqquxus',
            ]),
            tuya.whitelabel('MiBoxer', 'E2-ZR', '2 in 1 LED controller', ['_TZB210_ayx58ft5']),
            tuya.whitelabel('Lidl', '14156408L', 'Livarno Lux smart LED ceiling light', ['_TZ3210_c2iwpxf1']),
        ],
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}, configureReporting: true})],
        configure: async (device, coordinatorEndpoint) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
        },
    },
    {
        zigbeeModel: ['TS0504A'],
        model: 'TS0504A',
        vendor: 'Tuya',
        description: 'RGBW LED controller',
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_sosdczdl'}],
        model: 'TS0505A_led',
        vendor: 'Tuya',
        description: 'RGB+CCT LED',
        toZigbee: [tz.on_off, tz.tuya_led_control],
        fromZigbee: [fz.on_off, fz.tuya_led_controller, fz.brightness, fz.ignore_basic_report],
        exposes: [e.light_brightness_colortemp_colorhs([153, 500]).removeFeature('color_temp_startup')],
    },
    {
        zigbeeModel: ['TS0505A'],
        model: 'TS0505A',
        vendor: 'Tuya',
        description: 'RGB+CCT light controller',
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: undefined}, color: true})],
        whiteLabel: [
            tuya.whitelabel('Lidl', 'HG06106B', 'Livarno Lux E14 candle RGB', ['_TZ3000_odygigth']),
            tuya.whitelabel('Lidl', 'HG06106A', 'Livarno Lux GU10 spot RGB', ['_TZ3000_kdpxju99']),
            tuya.whitelabel('Lidl', 'HG06106C', 'Livarno Lux E27 bulb RGB', ['_TZ3000_dbou1ap4']),
            tuya.whitelabel('Lidl', '14148906L', 'Livarno Lux mood light RGB+CCT', ['_TZ3000_9cpuaca6']),
            tuya.whitelabel('Lidl', '14149505L/14149506L_1', 'Livarno Lux light bar RGB+CCT (black/white)', ['_TZ3000_gek6snaj']),
            tuya.whitelabel('Mycket', 'MS-SP-LE27WRGB', 'E27 RGBW bulb', ['_TZ3000_evag0pvn']),
            tuya.whitelabel('Lidl', 'HG06104A', 'Livarno Lux smart LED light strip 2.5m', ['_TZ3000_riwp3k79', '_TZ3000_riwp3k79']),
        ],
        configure: async (device, coordinatorEndpoint) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{manufacturerName: '_TZ2000_a476raq2'}],
        zigbeeModel: ['TS0201', 'SNTZ003', 'TY0201'],
        model: 'TS0201',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor with display',
        fromZigbee: [fzLocal.TS0201_battery, fz.temperature, fzLocal.TS0201_humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: tuya.configureMagicPacket,
        whiteLabel: [
            {vendor: 'BlitzWolf', model: 'BW-IS4'},
            tuya.whitelabel('Tuya', 'TS0201_1', 'Zigbee 3.0 temperature humidity sensor with display', ['_TZ3210_alxkwn0h']),
            tuya.whitelabel('Tuya', 'ZTH01/ZTH02', 'Temperature and humidity sensor', ['_TZ3000_0s1izerx']),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0201', manufacturerName: '_TZ3000_bguser20'},
            {modelID: 'TS0201', manufacturerName: '_TZ3000_yd2e749y'},
            {modelID: 'TS0201', manufacturerName: '_TZ3000_6uzkisv2'},
            {modelID: 'TS0201', manufacturerName: '_TZ3000_xr3htd96'},
            {modelID: 'TS0201', manufacturerName: '_TZ3000_fllyghyj'},
            {modelID: 'TS0201', manufacturerName: '_TZ3000_saiqcn0y'},
        ],
        model: 'WSD500A',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fzLocal.TS0201_battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: tuya.configureMagicPacket,
        whiteLabel: [tuya.whitelabel('Tuya', 'TH02Z', 'Temperature and humidity sensor', ['_TZ3000_fllyghyj', '_TZ3000_saiqcn0y'])],
        meta: {
            battery: {
                // These sensors do send a Battery Percentage Remaining (0x0021)
                // value, but is usually incorrect. For example, a coin battery tested
                // with a load tester may show 80%, but report 2.5V / 1%. This voltage
                // calculation matches what ZHA does by default.
                // https://github.com/Koenkk/zigbee2mqtt/discussions/17337
                // https://github.com/zigpy/zha-device-handlers/blob/c6ed94a52a469e72b32ece2a92d528060c7fd034/zhaquirks/__init__.py#L195-L228
                voltageToPercentage: '3V_1500_2800',
            },
        },
    },
    {
        fingerprint: [...tuya.fingerprint('TS0201', ['_TZ3000_dowj6gyi', '_TZ3000_8ybe88nf']), {manufacturerName: '_TZ3000_zl1kmjqx'}],
        model: 'IH-K009',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fzLocal.TS0201_battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: tuya.configureMagicPacket,
        whiteLabel: [tuya.whitelabel('Tuya', 'RSH-HS06_1', 'Temperature & humidity sensor', ['_TZ3000_zl1kmjqx'])],
    },
    {
        fingerprint: tuya.fingerprint('SM0201', ['_TYZB01_cbiezpds', '_TYZB01_zqvwka4k']),
        model: 'SM0201',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor with LED screen',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_3zofvcaa', '_TZ3000_pvlvoxvt']),
        model: 'TS011F_2_gang_2_usb_wall',
        vendor: 'Tuya',
        description: '2 gang 2 usb wall outlet',
        extend: [tuya.modernExtend.tuyaOnOff({backlightModeLowMediumHigh: true, endpoints: ['l1', 'l2', 'l3', 'l4'], childLock: true})],
        endpoint: () => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            for (const endpointID of [1, 2, 3, 4]) {
                const endpoint = device.getEndpoint(endpointID);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                await reporting.onOff(endpoint);
            }
        },
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_bep7ccew']),
        model: 'TS011F_2_gang_power',
        vendor: 'Tuya',
        description: '2 gang socket with power monitoring and USB',
        extend: [
            deviceEndpoints({endpoints: {left: 1, right: 2}, multiEndpointSkip: ['current', 'voltage', 'power', 'energy']}),
            onOff({powerOnBehavior: false, endpointNames: ['l1', 'l2']}),
            identify(),
            electricityMeter(),
        ],
    },
    {
        zigbeeModel: ['TS0041'],
        fingerprint: [{manufacturerName: '_TZ3000_tk3s5tyg'}],
        model: 'TS0041',
        vendor: 'Tuya',
        description: 'Wireless switch with 1 button',
        whiteLabel: [
            {vendor: 'Smart9', model: 'S9TSZGB'},
            {vendor: 'Lonsonho', model: 'TS0041'},
            {vendor: 'Benexmart', model: 'ZM-sui1'},
            tuya.whitelabel('Tuya', 'SH-SC07', 'Button scene switch', ['_TZ3000_mrpevh8p']),
            tuya.whitelabel('Tuya', 'MINI-ZSB', 'Smart button', ['_TZ3000_qgwcxxws']),
            tuya.whitelabel('Nous', 'LZ4', 'Wireless switch button', ['_TZ3000_6km7djcm']),
        ],
        exposes: [e.battery(), e.action(['single', 'double', 'hold'])],
        fromZigbee: [tuya.fz.on_off_action, fz.battery],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        /*
         * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
         * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
         * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
         * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
         */
    },
    {
        zigbeeModel: ['TS0042'],
        model: 'TS0042',
        vendor: 'Tuya',
        description: 'Wireless switch with 2 buttons',
        whiteLabel: [
            {vendor: 'Smart9', model: 'S9TSZGB'},
            {vendor: 'Lonsonho', model: 'TS0042'},
            {vendor: 'ClickSmart+', model: 'CSPGM2075PW'},
        ],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold'])],
        fromZigbee: [tuya.fz.on_off_action, fz.battery],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        /*
         * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
         * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
         * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
         * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
         */
    },
    {
        zigbeeModel: ['TS0043'],
        model: 'TS0043',
        vendor: 'Tuya',
        description: 'Wireless switch with 3 buttons',
        whiteLabel: [
            {vendor: 'Smart9', model: 'S9TSZGB'},
            {vendor: 'Lonsonho', model: 'TS0043'},
            {vendor: 'LoraTap', model: 'SS600ZB'},
        ],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold', '3_single', '3_double', '3_hold'])],
        fromZigbee: [tuya.fz.on_off_action, fz.battery],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        /*
         * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
         * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
         * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
         * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
         */
    },
    {
        zigbeeModel: ['TS0044'],
        model: 'TS0044',
        vendor: 'Tuya',
        description: 'Wireless switch with 4 buttons',
        whiteLabel: [
            {vendor: 'Lonsonho', model: 'TS0044'},
            {vendor: 'Haozee', model: 'ESW-OZAA-EU'},
            {vendor: 'LoraTap', model: 'SS6400ZB'},
            {vendor: 'Moes', model: 'ZT-SY-EU-G-4S-WH-MS'},
            tuya.whitelabel('Moes', 'ZT-SR-EU4', 'Star Ring 4 Gang Scene Switch', ['_TZ3000_a4xycprs']),
            tuya.whitelabel('Tuya', 'TS0044_1', 'Zigbee 4 button remote - 12 scene', ['_TZ3000_dziaict4', '_TZ3000_mh9px7cq', '_TZ3000_j61x9rxn']),
            tuya.whitelabel('Tuya', 'TM-YKQ004', 'Zigbee 4 button remote - 12 scene', ['_TZ3000_u3nv1jwk']),
        ],
        fromZigbee: [tuya.fz.on_off_action, fz.battery],
        exposes: [
            e.battery(),
            e.action([
                '1_single',
                '1_double',
                '1_hold',
                '2_single',
                '2_double',
                '2_hold',
                '3_single',
                '3_double',
                '3_hold',
                '4_single',
                '4_double',
                '4_hold',
            ]),
        ],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        /*
         * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
         * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
         * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
         * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
         */
    },
    {
        fingerprint: tuya.fingerprint('TS004F', [
            '_TZ3000_nuombroo',
            '_TZ3000_xabckq1v',
            '_TZ3000_czuyt8lz',
            '_TZ3000_0ht8dnxj',
            '_TZ3000_b3mgfu0d',
            '_TZ3000_11pg3ima',
            '_TZ3000_et7afzxz',
        ]),
        model: 'TS004F',
        vendor: 'Tuya',
        description: 'Wireless switch with 4 buttons',
        exposes: [
            e.battery(),
            e
                .enum('operation_mode', ea.ALL, ['command', 'event'])
                .withDescription('Operation mode: "command" - for group control, "event" - for clicks'),
            e.action([
                'on',
                'off',
                'brightness_step_up',
                'brightness_step_down',
                'brightness_move_up',
                'brightness_move_down',
                'color_temperature_step_up',
                'color_temperature_step_down',
                'brightness_stop',
                '1_single',
                '1_double',
                '1_hold',
                '2_single',
                '2_double',
                '2_hold',
                '3_single',
                '3_double',
                '3_hold',
                '4_single',
                '4_double',
                '4_hold',
            ]),
        ],
        fromZigbee: [
            fz.battery,
            tuya.fz.on_off_action,
            fz.tuya_operation_mode,
            fz.command_on,
            fz.command_off,
            fz.command_step,
            fz.command_move,
            fz.command_stop,
            fz.command_step_color_temperature,
        ],
        whiteLabel: [tuya.whitelabel('Zemismart', 'ZMR4', 'Wireless switch with 4 buttons', ['_TZ3000_11pg3ima', '_TZ3000_et7afzxz'])],
        toZigbee: [tz.tuya_operation_mode],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {tuyaOperationMode: 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xe001, [0xd011]);
            } catch (err) {
                /* do nothing */
            }
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            for (const ep of [1, 2, 3, 4]) {
                // Not all variants have all endpoints
                // https://github.com/Koenkk/zigbee2mqtt/issues/15730#issuecomment-1364498358
                if (device.getEndpoint(ep)) {
                    await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genOnOff']);
                }
            }
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS004F', ['_TZ3000_r0o2dahu']),
        model: 'TS004F_6_button',
        vendor: 'Tuya',
        description: 'Wireless switch with 6 buttons',
        exposes: [
            e.battery(),
            e
                .enum('operation_mode', ea.ALL, ['command', 'event'])
                .withDescription('Operation mode: "command" - for group control, "event" - for clicks'),
            e.action([
                'on',
                'off',
                'brightness_step_up',
                'brightness_step_down',
                'brightness_move_up',
                'brightness_move_down',
                '1_single',
                '1_double',
                '1_hold',
                '2_single',
                '2_double',
                '2_hold',
                '3_single',
                '3_double',
                '3_hold',
                '4_single',
                '4_double',
                '4_hold',
                '5_single',
                '5_double',
                '5_hold',
                '6_single',
                '6_double',
                '6_hold',
            ]),
        ],
        fromZigbee: [fz.battery, tuya.fz.on_off_action, fz.tuya_operation_mode, fz.command_on, fz.command_off, fz.command_step, fz.command_move],
        toZigbee: [tz.tuya_operation_mode],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {tuyaOperationMode: 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xe001, [0xd011]);
            } catch (err) {
                /* do nothing */
            }
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            for (const ep of [1, 2, 3, 4, 5, 6]) {
                // Not all variants have all endpoints
                // https://github.com/Koenkk/zigbee2mqtt/issues/15730#issuecomment-1364498358
                if (device.getEndpoint(ep)) {
                    await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genOnOff']);
                }
            }
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_dzuqwsyg', '_TZE204_dzuqwsyg']),
        model: 'BAC-003',
        vendor: 'Tuya',
        description: 'FCU thermostat temperature controller',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e
                .climate()
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'cool', 'heat', 'fan_only'], ea.STATE_SET)
                .withFanMode(['low', 'medium', 'high', 'auto'], ea.STATE_SET)
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET)
                .withPreset(['auto', 'manual'])
                .withLocalTemperatureCalibration(-3, 3, 1, ea.STATE_SET),
            e
                .numeric('deadzone_temperature', ea.STATE_SET)
                .withUnit('°C')
                .withValueMax(5)
                .withValueMin(1)
                .withValueStep(1)
                .withPreset('default', 1, 'Default value')
                .withDescription('The delta between local_temperature and current_heating_setpoint to trigger activity'),
            e.child_lock(),
            e
                .text('schedule', ea.STATE_SET)
                .withDescription(
                    'Schedule will work with "auto" preset. In this mode, the device executes ' +
                        'a preset week programming temperature time and temperature. Schedule can contains 12 segments. ' +
                        'All 12 segments should be defined. It should be defined in the following format: "hh:mm/tt". ' +
                        'Segments should be divided by space symbol. ' +
                        'Example: "06:00/20 11:30/21 13:30/22 17:30/23 06:00/24 12:00/23 14:30/22 17:30/21 06:00/19 12:30/20 14:30/21 18:30/20"',
                ),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    null,
                    {
                        from: (v, meta) => {
                            return v === true
                                ? {state: 'ON', system_mode: meta.state.system_mode_device ? meta.state.system_mode_device : 'cool'}
                                : {state: 'OFF', system_mode: 'off'};
                        },
                    },
                ],
                [
                    null,
                    'system_mode',
                    {
                        // Extend system_mode to support 'off' in addition to 'cool', 'heat' and 'fan_only'
                        to: async (v: string, meta) => {
                            const entity = meta.device.endpoints[0];

                            // Power State
                            await tuya.sendDataPointBool(entity, 1, v !== 'off', 'dataRequest', 1);

                            switch (v) {
                                case 'cool':
                                    await tuya.sendDataPointEnum(entity, 2, 0, 'dataRequest', 1);
                                    break;
                                case 'heat':
                                    await tuya.sendDataPointEnum(entity, 2, 1, 'dataRequest', 1);
                                    break;
                                case 'fan_only':
                                    await tuya.sendDataPointEnum(entity, 2, 2, 'dataRequest', 1);
                                    break;
                            }
                        },
                    },
                ],
                [
                    2,
                    null,
                    {
                        // Map system_mode back to both 'state' and 'system_mode'
                        from: (v: number, meta) => {
                            const modes = ['cool', 'heat', 'fan_only'];

                            return {
                                system_mode: modes[v],
                                system_mode_device: modes[v],
                            };
                        },
                    },
                ],
                [4, 'preset', tuya.valueConverterBasic.lookup({manual: true, auto: false})],
                [16, 'current_heating_setpoint', tuya.valueConverter.raw],
                [24, 'local_temperature', tuya.valueConverter.divideBy10],
                [26, 'deadzone_temperature', tuya.valueConverter.raw],
                [27, 'local_temperature_calibration', tuya.valueConverter.localTemperatureCalibration],
                [28, 'fan_mode', tuya.valueConverterBasic.lookup({low: tuya.enum(0), medium: tuya.enum(1), high: tuya.enum(2), auto: tuya.enum(3)})],
                [40, 'child_lock', tuya.valueConverter.lockUnlock],
                [
                    101,
                    'schedule',
                    {
                        to: (v: string, meta) => {
                            const regex = /((?<h>[01][0-9]|2[0-3]):(?<m>[0-5][0-9])\/(?<t>[0-3][0-9](\.[0,5]|)))/gm;
                            const matches = [...v.matchAll(regex)];

                            if (matches.length == 12) {
                                return matches.reduce((arr, m) => {
                                    arr.push(parseInt(m.groups.h));
                                    arr.push(parseInt(m.groups.m));
                                    arr.push(parseFloat(m.groups.t) * 2);
                                    return arr;
                                }, []);
                            }

                            logger.warning('Ignoring invalid or incomplete schedule', NS);
                        },
                        from: (v: number[], meta) => {
                            let r = '';

                            for (let i = 0; i < 12; i++) {
                                r += `${v[i * 3].toString().padStart(2, '0')}:${v[i * 3 + 1].toString().padStart(2, '0')}/${v[i * 3 + 2] / 2}`;

                                if (i < 11) {
                                    r += ' ';
                                }
                            }

                            return r;
                        },
                    },
                ],
            ],
        },
        whiteLabel: [
            tuya.whitelabel('Tuya', 'BAC-003', 'FCU thermostat temperature controller', ['_TZE204_dzuqwsyg']),
            tuya.whitelabel('Tuya', 'BAC-002-ALZB', 'FCU thermostat temperature controller', ['_TZE200_dzuqwsyg']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_qq9mpfhw'}],
        model: 'TS0601_water_sensor',
        vendor: 'Tuya',
        description: 'Water leak sensor',
        fromZigbee: [legacy.fromZigbee.tuya_water_leak, fz.ignore_basic_report],
        exposes: [e.water_leak()],
        toZigbee: [],
        whiteLabel: [{vendor: 'Neo', model: 'NAS-WS02B0'}],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_jthf7vb6'}],
        model: 'WLS-100z',
        vendor: 'Tuya',
        description: 'Water leak sensor',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_raw, legacy.fromZigbee.wls100z_water_leak],
        toZigbee: [],
        onEvent: tuya.onEventSetTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.battery(), e.water_leak()],
    },
    {
        fingerprint: tuya.fingerprint('TS0001', [
            '_TZ3000_xkap8wtb',
            '_TZ3000_qnejhcsu',
            '_TZ3000_x3ewpzyr',
            '_TZ3000_mkhkxx1p',
            '_TZ3000_tgddllx4',
            '_TZ3000_kqvb5akv',
            '_TZ3000_g92baclx',
            '_TZ3000_qlai3277',
            '_TZ3000_qaabwu5c',
            '_TZ3000_ikuxinvo',
            '_TZ3000_hzlsaltw',
        ]),
        model: 'TS0001_power',
        description: 'Switch with power monitoring',
        vendor: 'Tuya',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, tuya.fz.power_outage_memory, tuya.fz.switch_type],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tuya.tz.switch_type],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        exposes: [
            e.switch(),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            tuya.exposes.switchType(),
            e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore']).withDescription('Recover state after power outage'),
        ],
        whiteLabel: [
            tuya.whitelabel('Nous', 'B2Z', '1 gang switch with power monitoring', ['_TZ3000_qlai3277']),
            tuya.whitelabel('Colorock', 'CR-MNZ1', '1 gang switch 30A with power monitoring', ['_TZ3000_tgddllx4']),
            tuya.whitelabel('Nous', 'L6Z', 'Switch with power monitoring', ['_TZ3000_qaabwu5c']),
            tuya.whitelabel('Tuya', 'TS0001_power_polling', 'Switch with power monitoring (via polling)', ['_TZ3000_x3ewpzyr']),
        ],
        onEvent: async (type, data, device, options) => {
            if (['_TZ3000_x3ewpzyr'].includes(device.manufacturerName)) {
                await tuya.onEventMeasurementPoll(type, data, device, options, true, true);
            }
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0002', ['_TZ3000_aaifmpuq', '_TZ3000_irrmjcgi', '_TZ3000_huvxrx4i']),
        model: 'TS0002_power',
        vendor: 'Tuya',
        description: '2 gang switch with power monitoring',
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, endpoints: ['l1', 'l2'], electricalMeasurements: true})],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['energy', 'current', 'voltage', 'power']},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Tuya', 'XSH01B', '2 gang switch module with power monitoring', ['_TZ3000_irrmjcgi']),
            tuya.whitelabel('Nous', 'B3Z', '2 gang switch module with power monitoring', ['_TZ3000_aaifmpuq']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS000F', ['_TZ3000_xkap8wtb']),
        model: 'TS000F_power',
        description: 'Switch with power monitoring',
        vendor: 'Tuya',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, tuya.fz.power_on_behavior_1, tuya.fz.switch_type],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tuya.tz.switch_type],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        whiteLabel: [{vendor: 'Aubess', model: 'WHD02'}],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.power_on_behavior(), tuya.exposes.switchType()],
    },
    {
        zigbeeModel: ['TS0001'],
        model: 'TS0001',
        vendor: 'Tuya',
        description: '1 gang switch',
        extend: [tuya.modernExtend.tuyaOnOff()],
        whiteLabel: [
            {vendor: 'CR Smart Home', model: 'TS0001', description: 'Valve control'},
            {vendor: 'Lonsonho', model: 'X701'},
            {vendor: 'Bandi', model: 'BDS03G1'},
            tuya.whitelabel('Nous', 'B1Z', '1 gang switch', ['_TZ3000_ctftgjwb']),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0001', ['_TZ3000_myaaknbq', '_TZ3000_cpozgbrx']),
        model: 'TS0001_switch_module_1',
        vendor: 'Tuya',
        description: '1 gang switch module',
        extend: [tuya.modernExtend.tuyaOnOff({indicatorMode: true, backlightModeOffOn: true, onOffCountdown: true})],
        whiteLabel: [
            tuya.whitelabel('PSMART', 'T441', '1 gang switch module', ['_TZ3000_myaaknbq']),
            tuya.whitelabel('PSMART', 'T461', '1 gang switch module', ['_TZ3000_cpozgbrx']),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_gbshwgag'}],
        model: 'TS0001_switch_module_2',
        vendor: 'TuYa',
        description: '1 gang switch with backlight',
        extend: [tuya.modernExtend.tuyaOnOff({powerOnBehavior2: true, backlightModeOffOn: true, indicatorMode: true})],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },

    ////////////////////////
    // TS0002 DEFINITIONS //
    ////////////////////////

    {
        // TS0002 model with only on/off capability
        fingerprint: tuya.fingerprint('TS0002', [
            '_TZ3000_01gpyda5',
            '_TZ3000_bvrlqyj7',
            '_TZ3000_7ed9cqgi',
            '_TZ3000_zmy4lslw',
            '_TZ3000_ruxexjfz',
            '_TZ3000_4xfqlgqo',
            '_TZ3000_eei0ubpy',
            '_TZ3000_qaa59zqd',
            '_TZ3000_lmlsduws',
            '_TZ3000_lugaswf8',
            '_TZ3000_fbjdkph9',
        ]),
        model: 'TS0002_basic',
        vendor: 'Tuya',
        description: '2 gang switch module',
        whiteLabel: [
            {vendor: 'OXT', model: 'SWTZ22'},
            {vendor: 'Moes', model: 'ZM-104B-M'},
            tuya.whitelabel('pcblab.io', 'RR620ZB', '2 gang Zigbee switch module', ['_TZ3000_4xfqlgqo']),
            tuya.whitelabel('Nous', 'L13Z', '2 gang switch', ['_TZ3000_ruxexjfz']),
            tuya.whitelabel('Tuya', 'ZG-2002-RF', 'Three mode Zigbee Switch', ['_TZ3000_lugaswf8']),
            tuya.whitelabel('Mercator Ikuü', 'SSW02', '2 gang switch', ['_TZ3000_fbjdkph9']),
        ],
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, endpoints: ['l1', 'l2']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        // TS0002 model with limited functionality available
        fingerprint: tuya.fingerprint('TS0002', [
            '_TZ3000_fisb3ajo',
            '_TZ3000_5gey1ohx',
            '_TZ3000_mtnpt6ws',
            '_TZ3000_mufwv0ry',
            '_TZ3000_54hjn4vs',
            '_TZ3000_aa5t61rh',
            '_TZ3000_in5qxhtt',
            '_TZ3000_ogpla3lh',
            '_TZ3000_i9w5mehz',
        ]),
        model: 'TS0002_limited',
        vendor: 'Tuya',
        description: '2 gang switch module',
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, indicatorMode: true, backlightModeOffOn: true, endpoints: ['l1', 'l2']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('AVATTO', 'ZWSM16-2-Zigbee', '2 gang switch module', ['_TZ3000_mtnpt6ws']),
            tuya.whitelabel('PSMART', 'T442', '2 gang switch module', ['_TZ3000_mufwv0ry']),
            tuya.whitelabel('Lonsonho', 'X702A', '2 gang switch with backlight', ['_TZ3000_54hjn4vs', '_TZ3000_aa5t61rh']),
            tuya.whitelabel('Homeetec', '37022463-1', '2 Gang switch with backlight', ['_TZ3000_in5qxhtt']),
            tuya.whitelabel('RoomsAI', '37022463-2', '2 Gang switch with backlight', ['_TZ3000_ogpla3lh']),
        ],
    },
    {
        // TS0002 2 gang switch module with all available features. This is the default for TS0002 devices.
        model: 'TS0002',
        zigbeeModel: ['TS0002'],
        vendor: 'Tuya',
        description: '2-Gang switch with backlight, countdown and inching',
        extend: [
            tuya.modernExtend.tuyaOnOff({
                switchType: true,
                powerOnBehavior2: true,
                backlightModeOffOn: true,
                indicatorMode: true,
                onOffCountdown: true,
                inchingSwitch: true,
                endpoints: ['l1', 'l2'],
            }),
            tuya.clusters.addTuyaCommonPrivateCluster(),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Zemismart', 'TB26-2', '2 Gang switch with backlight, countdown, inching', ['_TZ3000_ywubfuvt']),
            {vendor: 'Zemismart', model: 'ZM-CSW002-D_switch'},
            {vendor: 'Lonsonho', model: 'X702'},
            {vendor: 'AVATTO', model: 'ZTS02'},
        ],
    },

    ////////////////////////
    // TS0003 DEFINITIONS //
    ////////////////////////

    {
        fingerprint: tuya.fingerprint('TS0003', ['_TZ3000_rhkfbfcv', '_TZ3000_empogkya', '_TZ3000_lubfc1t5', '_TZ3000_lsunm46z', '_TZ3000_v4l4b0lp']),
        model: 'TS0003_switch_3_gang_with_backlight',
        vendor: 'Tuya',
        description: '3-Gang switch with backlight',
        extend: [tuya.modernExtend.tuyaOnOff({powerOnBehavior2: true, indicatorMode: true, backlightModeOffOn: true, endpoints: ['l1', 'l2', 'l3']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Lonsonho', 'X703A', '3 Gang switch with backlight', ['_TZ3000_rhkfbfcv']),
            tuya.whitelabel('Zemismart', 'ZM-L03E-Z', '3 gang switch with neutral', ['_TZ3000_empogkya', '_TZ3000_lsunm46z']),
            tuya.whitelabel('Tuya', 'M10Z', '2 gang switch with 20A power socket', ['_TZ3000_lubfc1t5']),
        ],
    },
    {
        zigbeeModel: ['TS0003'],
        model: 'TS0003',
        vendor: 'Tuya',
        description: '3 gang switch',
        extend: [
            deviceEndpoints({endpoints: {left: 1, center: 2, right: 3}}),
            onOff({endpointNames: ['left', 'center', 'right'], powerOnBehavior: false}),
        ],
        whiteLabel: [
            {vendor: 'BSEED', model: 'TS0003', description: 'Zigbee switch'},
            tuya.whitelabel('Tuya', 'TS0003_1', '3 gang switch', ['_TZ3000_ouwfc1qj']),
            tuya.whitelabel('Zemismart', 'TB26-3', '3 gang switch', ['_TZ3000_eqsair32']),
        ],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0003', ['_TZ3000_4o16jdca', '_TZ3000_odzoiovu', '_TZ3000_hbic3ka3', '_TZ3000_lvhy15ix']),
        model: 'TS0003_switch_module_2',
        vendor: 'Tuya',
        description: '3 gang switch module',
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, indicatorMode: true, endpoints: ['l1', 'l2', 'l3']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [tuya.whitelabel('AVATTO', 'ZWSM16-3-Zigbee', '3 gang switch module', ['_TZ3000_hbic3ka3'])],
    },
    {
        fingerprint: tuya.fingerprint('TS0003', ['_TZ3000_vsasbzkf', '_TZ3000_nnwehhst']),
        model: 'TS0003_switch_module_1',
        vendor: 'Tuya',
        description: '3 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ23'}],
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, backlightModeOffOn: true, endpoints: ['l1', 'l2', 'l3']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },

    {
        fingerprint: tuya.fingerprint('TS0001', [
            '_TZ3000_tqlv4ug4',
            '_TZ3000_gjrubzje',
            '_TZ3000_tygpxwqa',
            '_TZ3000_4rbqgcuv',
            '_TZ3000_veu2v775',
            '_TZ3000_prits6g4',
        ]),
        model: 'TS0001_switch_module',
        vendor: 'Tuya',
        description: '1 gang switch module',
        whiteLabel: [
            {vendor: 'OXT', model: 'SWTZ21'},
            {vendor: 'Moes', model: 'ZM-104-M'},
            tuya.whitelabel('AVATTO', 'ZWSM16-1-Zigbee', '1 gang switch module', ['_TZ3000_4rbqgcuv']),
        ],
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, onOffCountdown: true})],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0004', ['_TZ3000_ltt60asa', '_TZ3000_mmkbptmx']),
        model: 'TS0004_switch_module',
        vendor: 'Tuya',
        description: '4 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ27'}],
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, endpoints: ['l1', 'l2', 'l3', 'l4']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: [
            'owvfni3\u0000',
            'owvfni3',
            'u1rkty3',
            'aabybja', // Curtain motors
            'mcdj3aq',
            'mcdj3aq\u0000', // Tubular motors
        ],
        fingerprint: [
            // Curtain motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_5zbp6j0u'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nkoabg8w'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xuzcvlku'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_4vobcgd3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nogaemzt'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_r0jdjrvi'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pk0sfzvr'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fdtjuw7u'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zpzndjez'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wmcdj3aq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cowvfni3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_rddyvrci'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nueqqe6k'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_bqcqqjpb'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xaabybja'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_rmymn92d'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_feolm6rk'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_3i3exuay'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_tvrvdj6o'},
            {modelID: 'zo2pocs\u0000', manufacturerName: '_TYST11_fzo2pocs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_b2u1drdv'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ol5jlkkr'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_guvc7pdy'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zxxfv8wi'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_1fuxihti'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_1fuxihti'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_57hjqelq'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_m1wl5fvq '},
            // Roller blinds:
            {modelID: 'TS0601', manufacturerName: '_TZE200_fctwhugx'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_hsgrhjpf'},
            // Window pushers:
            {modelID: 'TS0601', manufacturerName: '_TZE200_g5wdnuow'},
            // Tubular motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_5sbebbzs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_udank5zs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zuz7f94z'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nv6nxo0c'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_3ylew7b4'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_llm0epxg'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_n1aauwb4'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xu4a5rhj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_bjzrowv2'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_bjzrowv2'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_axgvo9jh'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_gaj531w3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_yia0p3tr'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_rsj5pu8y'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_xu4a5rhj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2odrmqwq'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_lh3arisb'},
        ],
        model: 'TS0601_cover_1',
        vendor: 'Tuya',
        description: 'Curtain motor/roller blind motor/window pusher/tubular motor',
        whiteLabel: [
            {vendor: 'Yushun', model: 'YS-MT750'},
            tuya.whitelabel('Yushun', 'YS-MT750L', 'Curtain motor', ['_TZE200_bqcqqjpb', '_TZE200_gaj531w3']),
            {vendor: 'Zemismart', model: 'ZM79E-DT'},
            {vendor: 'Binthen', model: 'BCM100D'},
            {vendor: 'Binthen', model: 'CV01A'},
            {vendor: 'Zemismart', model: 'M515EGB'},
            {vendor: 'Oz Smart Things', model: 'ZM85EL-1Z'},
            {vendor: 'Tuya', model: 'M515EGZT'},
            {vendor: 'Tuya', model: 'DT82LEMA-1.2N'},
            {vendor: 'Tuya', model: 'ZD82TN', description: 'Curtain motor'},
            {vendor: 'Larkkey', model: 'ZSTY-SM-1SRZG-EU'},
            {vendor: 'Zemismart', model: 'AM43', description: 'Roller blind motor'},
            {vendor: 'Zemismart', model: 'M2805EGBZTN', description: 'Tubular motor'},
            {vendor: 'Zemismart', model: 'BCM500DS-TYZ', description: 'Curtain motor'},
            {vendor: 'A-OK', model: 'AM25', description: 'Tubular motor'},
            {vendor: 'Alutech', model: 'AM/R-Sm', description: 'Tubular motor'},
            tuya.whitelabel('Shenzhen Golden Security Technology', 'GM46', 'Curtain motor', ['_TZE204_guvc7pdy']),
            {vendor: 'Quoya', model: 'AT8510-TY'},
            tuya.whitelabel('Somgoms', 'ZSTY-SM-1DMZG-US-W_1', 'Curtain switch', ['_TZE200_axgvo9jh']),
            tuya.whitelabel('HUARUI', 'CMD900LE', 'Lithium battery intelligent curtain opening and closing motor', ['_TZE200_zxxfv8wi']),
            tuya.whitelabel('Novato', 'WPK', 'Smart curtain track', ['_TZE204_lh3arisb']),
        ],
        fromZigbee: [legacy.fromZigbee.tuya_cover, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.tuya_cover_control, legacy.toZigbee.tuya_cover_options],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            e
                .composite('options', 'options', ea.STATE_SET)
                .withFeature(e.numeric('motor_speed', ea.STATE_SET).withValueMin(0).withValueMax(255).withDescription('Motor speed'))
                .withFeature(e.binary('reverse_direction', ea.STATE_SET, true, false).withDescription('Reverse the motor direction')),
        ],
    },
    {
        fingerprint: [
            // Curtain motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_eegnwoyw'},
        ],
        model: 'TS0601_cover_2',
        vendor: 'Tuya',
        description: 'Curtain motor fixed speed',
        whiteLabel: [{vendor: 'Zemismart', model: 'BCM100DB'}],
        fromZigbee: [legacy.fromZigbee.tuya_cover, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.tuya_cover_control],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
    {
        fingerprint: [
            // Curtain motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_cpbo62rn'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_libht6ua'},
        ],
        model: 'TS0601_cover_6',
        vendor: 'Tuya',
        description: 'Cover motor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.text('work_state', ea.STATE),
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.battery(),
            e.enum('opening_mode', ea.STATE_SET, ['tilt', 'lift']).withDescription('Opening mode'),
            e.enum('motor_direction', ea.STATE_SET, ['left', 'right']).withDescription('Motor side'),
            e.enum('set_upper_limit', ea.STATE_SET, ['start', 'stop']).withDescription('Learning'),
            e.enum('factory_reset', ea.STATE_SET, ['SET']).withDescription('Remove limits'),
        ],
        whiteLabel: [tuya.whitelabel('Tuya', 'LY-108', 'Cover', ['_TZE200_cpbo62rn'])],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({CLOSE: tuya.enum(2), STOP: tuya.enum(1), OPEN: tuya.enum(0)})],
                [2, 'position', tuya.valueConverter.coverPositionInverted],
                [3, 'position', tuya.valueConverter.coverPositionInverted],
                [4, 'opening_mode', tuya.valueConverterBasic.lookup({tilt: tuya.enum(0), lift: tuya.enum(1)})],
                [7, 'work_state', tuya.valueConverterBasic.lookup({standby: tuya.enum(0), success: tuya.enum(1), learning: tuya.enum(2)})],
                [13, 'battery', tuya.valueConverter.raw],
                [101, 'motor_direction', tuya.valueConverterBasic.lookup({left: tuya.enum(0), right: tuya.enum(1)})],
                [102, 'set_upper_limit', tuya.valueConverterBasic.lookup({start: tuya.enum(1), stop: tuya.enum(0)})],
                [107, 'factory_reset', tuya.valueConverter.setLimit],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_zvo63cmo']),
        model: 'TS0601_cover_7',
        vendor: 'Tuya',
        description: 'Cover motor',
        onEvent: tuya.onEvent(),
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET), e.battery()],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'position', tuya.valueConverter.raw],
                // motor_direction doesn't work: https://github.com/Koenkk/zigbee2mqtt/issues/18103
                // [5, 'motor_direction', tuya.valueConverterBasic.lookup({'normal': tuya.enum(0), 'reversed': tuya.enum(1)})],
                [101, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_r0jdjrvi', '_TZE200_g5xqosu7', '_TZE284_fzo2pocs']),
        model: 'TS0601_cover_8',
        vendor: 'Tuya',
        description: 'Cover motor',
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        options: [exposes.options.invert_cover()],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.enum('reverse_direction', ea.STATE_SET, ['forward', 'back']).withDescription('Reverse the motor direction'),
            e.binary('motor_fault', ea.STATE, true, false).withDescription('Motor Fault'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPositionInverted],
                [3, 'position', tuya.valueConverter.coverPositionInverted],
                [5, 'reverse_direction', tuya.valueConverterBasic.lookup({forward: tuya.enum(0), back: tuya.enum(1)})],
                [12, 'motor_fault', tuya.valueConverter.trueFalse1],
            ],
        },
        whiteLabel: [
            // https://www.amazon.ae/dp/B09JG92Z88
            // Tuya ZigBee Intelligent Curtain Blind Switch Electric Motorized Curtain Roller
            tuya.whitelabel('Lilistore', 'TS0601_lilistore', 'Cover motor', ['_TZE204_r0jdjrvi']),
            tuya.whitelabel('Zemismart', 'ZM90E-DT250N/A400', 'Window opener', ['_TZE204_r0jdjrvi']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_p2qzzazi']),
        model: 'TS0601_cover_9',
        vendor: 'Tuya',
        description: 'Cover motor',
        onEvent: tuya.onEvent(),
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET), e.battery()],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'position', tuya.valueConverter.raw],
                [5, 'motor_direction', tuya.valueConverterBasic.lookup({normal: tuya.enum(0), reversed: tuya.enum(1)})],
                [101, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_clm4gdw4', '_TZE200_2vfxweng']),
        model: 'TS0601_cover_10',
        vendor: 'Tuya',
        description: 'Cover motor',
        onEvent: tuya.onEvent(),
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.enum('motor_direction', ea.STATE_SET, ['normal', 'reversed']).withDescription('Set the motor direction'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({OPEN: tuya.enum(2), STOP: tuya.enum(1), CLOSE: tuya.enum(0)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'position', tuya.valueConverter.raw],
                [5, 'motor_direction', tuya.valueConverterBasic.lookup({normal: false, reversed: true})],
            ],
        },
    },
    {
        zigbeeModel: ['kud7u2l'],
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_ckud7u2l'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ywdxldoj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_do5qy8zo'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cwnjrr72'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pvvbommb'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9sfg7gm0'}, // HomeCloud
            {modelID: 'TS0601', manufacturerName: '_TZE200_2atgpdho'}, // HY367
            {modelID: 'TS0601', manufacturerName: '_TZE200_cpmgn2cf'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_znlqjmih'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_8thwkzxl'}, // Tervix eva2
            {modelID: 'TS0601', manufacturerName: '_TZE200_4eeyebrt'}, // Immax 07732B
            {modelID: 'TS0601', manufacturerName: '_TZE200_8whxpsiw'}, // EVOLVEO
            {modelID: 'TS0601', manufacturerName: '_TZE200_xby0s3ta'}, // Sandy Beach HY367
            {modelID: 'TS0601', manufacturerName: '_TZE200_7fqkphoq'}, // AFINTEK
            {modelID: 'TS0601', manufacturerName: '_TZE200_rufdtfyv'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_lpwgshtl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_rk1wojce'}, // Emos P5630S
        ],
        model: 'TS0601_thermostat',
        vendor: 'Tuya',
        description: 'Radiator valve with thermostat',
        whiteLabel: [
            {vendor: 'Moes', model: 'HY368'},
            {vendor: 'Moes', model: 'HY369RT'},
            {vendor: 'SHOJZJ', model: '378RT'},
            {vendor: 'Silvercrest', model: 'TVR01'},
            {vendor: 'Immax', model: '07732B'},
            tuya.whitelabel('Immax', '07732L', 'Radiator valve with thermostat', ['_TZE200_rufdtfyv']),
            {vendor: 'Evolveo', model: 'Heat M30'},
            tuya.whitelabel('Emos', 'P5630S', 'Radiator valve with thermostat', ['_TZE200_rk1wojce']),
        ],
        meta: {tuyaThermostatPreset: legacy.thermostatPresets, tuyaThermostatSystemMode: legacy.thermostatSystemModes3},
        ota: ota.zigbeeOTA,
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [legacy.fromZigbee.tuya_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [
            legacy.toZigbee.tuya_thermostat_child_lock,
            legacy.toZigbee.tuya_thermostat_window_detection,
            legacy.toZigbee.tuya_thermostat_valve_detection,
            legacy.toZigbee.tuya_thermostat_current_heating_setpoint,
            legacy.toZigbee.tuya_thermostat_auto_lock,
            legacy.toZigbee.tuya_thermostat_calibration,
            legacy.toZigbee.tuya_thermostat_min_temp,
            legacy.toZigbee.tuya_thermostat_max_temp,
            legacy.toZigbee.tuya_thermostat_boost_time,
            legacy.toZigbee.tuya_thermostat_comfort_temp,
            legacy.toZigbee.tuya_thermostat_eco_temp,
            legacy.toZigbee.tuya_thermostat_force_to_mode,
            legacy.toZigbee.tuya_thermostat_force,
            legacy.toZigbee.tuya_thermostat_preset,
            legacy.toZigbee.tuya_thermostat_window_detect,
            legacy.toZigbee.tuya_thermostat_schedule,
            legacy.toZigbee.tuya_thermostat_week,
            legacy.toZigbee.tuya_thermostat_schedule_programming_mode,
            legacy.toZigbee.tuya_thermostat_away_mode,
            legacy.toZigbee.tuya_thermostat_away_preset,
        ],
        exposes: [
            e.child_lock(),
            e.window_detection(),
            e.binary('window_open', ea.STATE, true, false).withDescription('Window open?'),
            e.battery_low(),
            e.valve_detection(),
            e.position(),
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(
                    ['heat', 'auto', 'off'],
                    ea.STATE_SET,
                    'Mode of this device, in the `heat` mode the TS0601 will remain continuously heating, i.e. it does not regulate ' +
                        'to the desired temperature. If you want TRV to properly regulate the temperature you need to use mode `auto` ' +
                        'instead setting the desired temperature.',
                )
                .withLocalTemperatureCalibration(-9, 9, 0.5, ea.STATE_SET)
                .withPreset(['schedule', 'manual', 'boost', 'complex', 'comfort', 'eco', 'away'])
                .withRunningState(['idle', 'heat'], ea.STATE),
            e.auto_lock(),
            e.away_mode(),
            e.away_preset_days(),
            e.boost_time(),
            e.comfort_temperature(),
            e.eco_temperature(),
            e.force(),
            e.max_temperature().withValueMin(16).withValueMax(70),
            e.min_temperature(),
            e.away_preset_temperature(),
            e.week(),
            e
                .text('workdays_schedule', ea.STATE_SET)
                .withDescription('Workdays schedule, 6 entries max, example: "00:20/5°C 01:20/5°C 6:59/15°C 18:00/5°C 20:00/5°C 23:30/5°C"'),
            e
                .text('holidays_schedule', ea.STATE_SET)
                .withDescription('Holidays schedule, 6 entries max, example: "00:20/5°C 01:20/5°C 6:59/15°C 18:00/5°C 20:00/5°C 23:30/5°C"'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_g2ki0ejr']),
        model: 'BAB-1413_Pro',
        vendor: 'Tuya',
        description: 'Thermostat radiator valve',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(),
            e.child_lock(),
            e.max_temperature().withValueMin(15).withValueMax(45),
            e.min_temperature().withValueMin(5).withValueMax(15),
            e.window_detection(),
            e.open_window_temperature().withValueMin(5).withValueMax(25),
            e.comfort_temperature().withValueMin(5).withValueMax(35),
            e.eco_temperature().withValueMin(5).withValueMax(35),
            e.holiday_temperature().withValueMin(5).withValueMax(35),
            e
                .climate()
                .withPreset(['auto', 'manual', 'holiday', 'comfort'])
                .withLocalTemperatureCalibration(-9, 9, 0.1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET, 'Only for Homeassistant')
                .withRunningState(['idle', 'heat'], ea.STATE_SET),
            tuya.exposes.frostProtection(
                'When Anti-Freezing function is activated, the temperature in the house is kept ' +
                    'at 8 °C, the device display "AF".press the pair button to cancel.',
            ),
            e
                .numeric('boost_timeset_countdown', ea.STATE_SET)
                .withUnit('s')
                .withDescription(
                    'Setting ' +
                        'minimum 0 - maximum 465 seconds boost time. The boost function is activated. The remaining ' +
                        'time for the function will be counted down in seconds ( 465 to 0 ).',
                )
                .withValueMin(0)
                .withValueMax(465),
            e
                .composite('schedule', 'schedule', ea.STATE_SET)
                .withFeature(e.enum('week_day', ea.SET, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
                .withFeature(e.text('schedule', ea.SET))
                .withDescription(
                    'Schedule will work with "auto" preset. In this mode, the device executes ' +
                        'a preset week programming temperature time and temperature. Before using these properties, check `working_day` ' +
                        'property. Each day can contain up to 10 segments. At least 1 segment should be defined. Different count of segments ' +
                        'can be defined for each day, e.g., 3 segments for Monday, 5 segments for Thursday, etc. It should be defined in the ' +
                        'following format: `hours:minutes/temperature`. Minutes can be only tens, i.e., 00, 10, 20, 30, 40, 50. Segments should ' +
                        'be divided by space symbol. Each day should end with the last segment of 24:00. Examples: `04:00/20 08:30/22 10:10/18 ' +
                        '18:40/24 22:50/19.5`; `06:00/21.5 17:20/26 24:00/18`. The temperature will be set from the beginning/start of one ' +
                        'period and until the next period, e.g., `04:00/20 24:00/22` means that from 00:00 to 04:00 temperature will be 20 ' +
                        'degrees and from 04:00 to 00:00 temperature will be 22 degrees.',
                ),
            ...tuya.exposes.scheduleAllDays(ea.STATE, 'HH:MM/C'),
            e.binary('valve', ea.STATE, 'CLOSED', 'OPEN'),
            e.enum('factory_reset', ea.STATE_SET, ['SET']).withDescription('Remove limits'),
            tuya.exposes.errorStatus(),
        ],
        meta: {
            tuyaDatapoints: [
                [49, 'running_state', tuya.valueConverterBasic.lookup({heat: tuya.enum(1), idle: tuya.enum(0)})],
                [49, 'system_mode', tuya.valueConverterBasic.lookup({heat: tuya.enum(1), off: tuya.enum(0)})],
                [
                    2,
                    'preset',
                    tuya.valueConverterBasic.lookup({comfort: tuya.enum(3), auto: tuya.enum(0), manual: tuya.enum(2), holiday: tuya.enum(1)}),
                ],
                [4, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [5, 'local_temperature', tuya.valueConverter.divideBy10],
                [6, 'battery', tuya.valueConverter.raw],
                [7, 'child_lock', tuya.valueConverter.lockUnlock],
                [9, 'max_temperature_limit', tuya.valueConverter.divideBy10],
                [10, 'min_temperature_limit', tuya.valueConverter.divideBy10],
                [14, 'window_detection', tuya.valueConverter.onOff],
                [16, 'open_window_temperature', tuya.valueConverter.divideBy10],
                [17, 'open_window_time', tuya.valueConverter.raw],
                [18, 'backlight', tuya.valueConverter.raw],
                [19, 'factory_reset', tuya.valueConverter.setLimit],
                [21, 'holiday_temperature', tuya.valueConverter.raw],
                [24, 'comfort_temperature', tuya.valueConverter.divideBy10],
                [25, 'eco_temperature', tuya.valueConverter.divideBy10],
                [28, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [29, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [30, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [31, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [32, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [33, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [34, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [35, 'error_status', tuya.valueConverter.raw],
                [36, 'frost_protection', tuya.valueConverter.onOff],
                [37, 'boost_heating', tuya.valueConverter.onOff],
                [38, 'boost_time', tuya.valueConverter.countdown],
                [39, 'Switch Scale', tuya.valueConverter.raw],
                [47, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration1],
                [48, 'valve_testing', tuya.valueConverter.raw],
                [49, 'valve', tuya.valueConverterBasic.lookup({OPEN: 1, CLOSE: 0})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE200_68nvbio9',
            '_TZE200_pw7mji0l',
            '_TZE200_cf1sl3tj',
            '_TZE200_nw1r9hp6',
            '_TZE200_9p5xmj5r',
            '_TZE200_eevqq1uv',
        ]),
        model: 'TS0601_cover_3',
        vendor: 'Tuya',
        description: 'Cover motor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        options: [exposes.options.invert_cover()],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(),
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.enum('reverse_direction', ea.STATE_SET, ['forward', 'back']).withDescription('Reverse the motor direction'),
            e.enum('border', ea.STATE_SET, ['up', 'down', 'up_delete', 'down_delete', 'remove_top_bottom']),
            e.enum('click_control', ea.STATE_SET, ['up', 'down']).withDescription('Single motor steps'),
            e.binary('motor_fault', ea.STATE, true, false),
        ],
        whiteLabel: [
            tuya.whitelabel('Zemismart', 'ZM16EL-03/33', 'Cover motor', ['_TZE200_68nvbio9']),
            tuya.whitelabel('Zemismart', 'ZM25EL', 'Cover motor', ['_TZE200_pw7mji0l']),
            tuya.whitelabel('Zemismart', 'ZM85EL-2Z', 'Roman Rod I type U curtains track', ['_TZE200_cf1sl3tj', '_TZE200_nw1r9hp6']),
            tuya.whitelabel('Hiladuo', 'B09M3R35GC', 'Motorized roller shade', ['_TZE200_9p5xmj5r']),
        ],
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'position', tuya.valueConverter.raw],
                [5, 'reverse_direction', tuya.valueConverterBasic.lookup({forward: tuya.enum(0), back: tuya.enum(1)})],
                [12, 'motor_fault', tuya.valueConverter.trueFalse1],
                [13, 'battery', tuya.valueConverter.raw],
                [
                    16,
                    'border',
                    tuya.valueConverterBasic.lookup({
                        up: tuya.enum(0),
                        down: tuya.enum(1),
                        up_delete: tuya.enum(2),
                        down_delete: tuya.enum(3),
                        remove_top_bottom: tuya.enum(4),
                    }),
                ],
                [20, 'click_control', tuya.valueConverterBasic.lookup({up: tuya.enum(0), down: tuya.enum(1)})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_zah67ekd', '_TZE200_icka1clh']),
        model: 'TS0601_cover_4',
        vendor: 'Tuya',
        description: 'Cover',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.enum('motor_direction', ea.STATE_SET, ['normal', 'reversed']).withDescription('Set the motor direction'),
            e.numeric('motor_speed', ea.STATE_SET).withValueMin(0).withValueMax(255).withDescription('Motor speed').withUnit('rpm'),
            e.enum('opening_mode', ea.STATE_SET, ['tilt', 'lift']).withDescription('Opening mode'),
            e.enum('set_upper_limit', ea.SET, ['SET']).withDescription('Set the upper limit, to reset limits use factory_reset'),
            e.enum('set_bottom_limit', ea.SET, ['SET']).withDescription('Set the bottom limit, to reset limits use factory_reset'),
            e.binary('factory_reset', ea.SET, true, false).withDescription('Factory reset the device'),
        ],
        whiteLabel: [tuya.whitelabel('Moes', 'AM43-0.45/40-ES-EB', 'Roller blind/shades drive motor', ['_TZE200_zah67ekd', '_TZE200_icka1clh'])],
        configure: async (device, coordinatorEndpoint) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'position', tuya.valueConverter.raw],
                [5, 'motor_direction', tuya.valueConverter.tubularMotorDirection],
                [7, null, null], // work_state, not useful, ignore
                [101, 'opening_mode', tuya.valueConverterBasic.lookup({tilt: tuya.enum(0), lift: tuya.enum(1)})],
                [102, 'factory_reset', tuya.valueConverter.raw],
                [103, 'set_upper_limit', tuya.valueConverter.setLimit],
                [104, 'set_bottom_limit', tuya.valueConverter.setLimit],
                [105, 'motor_speed', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE200_sur6q7ko' /* model: '3012732', vendor: 'LSC Smart Connect' */,
            '_TZE200_hue3yfsn' /* model: 'TV02-Zigbee', vendor: 'Tuya' */,
            '_TZE200_e9ba97vf' /* model: 'TV01-ZB', vendor: 'Moes' */,
            '_TZE200_husqqvux' /* model: 'TSL-TRV-TV01ZG', vendor: 'Tesla Smart' */,
            '_TZE200_lnbfnyxd' /* model: 'TSL-TRV-TV01ZG', vendor: 'Tesla Smart' */,
            '_TZE200_lllliz3p' /* model: 'TV02-Zigbee', vendor: 'Tuya' */,
            '_TZE200_mudxchsu' /* model: 'TV05-ZG curve', vendor: 'Tuya' */,
            '_TZE200_7yoranx2' /* model: 'TV01-ZB', vendor: 'Moes' */,
            '_TZE200_kds0pmmv' /* model: 'TV01-ZB', vendor: 'Moes' */,
            '_TZE200_py4cm3he' /* model: 'TV06-Zigbee', vendor: 'Tuya' */,
        ]),
        model: 'TV02-Zigbee',
        vendor: 'Tuya',
        description: 'Thermostat radiator valve',
        whiteLabel: [
            {vendor: 'Moes', model: 'TV01-ZB'},
            {vendor: 'AVATTO', model: 'TRV06'},
            {vendor: 'Tesla Smart', model: 'TSL-TRV-TV01ZG'},
            {vendor: 'Unknown/id3.pl', model: 'GTZ08'},
            tuya.whitelabel('Moes', 'ZTRV-ZX-TV01-MS', 'Thermostat radiator valve', ['_TZE200_7yoranx2']),
            tuya.whitelabel('Moes', 'TV01-ZB', 'Thermostat radiator valve', ['_TZE200_e9ba97vf', '_TZE200_kds0pmmv']),
        ],
        ota: ota.zigbeeOTA,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery_low(),
            e.child_lock(),
            e.open_window(),
            e.open_window_temperature().withValueMin(5).withValueMax(30),
            e.comfort_temperature().withValueMin(5).withValueMax(30),
            e.eco_temperature().withValueMin(5).withValueMax(30),
            e
                .climate()
                .withPreset(['auto', 'manual', 'holiday'])
                .withLocalTemperatureCalibration(-5, 5, 0.1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET, 'Only for Homeassistant'),
            e
                .binary('heating_stop', ea.STATE_SET, 'ON', 'OFF')
                .withDescription(
                    'Battery life can be prolonged' +
                        ' by switching the heating off. To achieve this, the valve is closed fully. To activate the ' +
                        'heating stop, the device display "HS", press the pair button to cancel.',
                ),
            tuya.exposes.frostProtection(
                'When Anti-Freezing function is activated, the temperature in the house is kept ' +
                    'at 8 °C, the device display "AF".press the pair button to cancel.',
            ),
            e
                .numeric('boost_timeset_countdown', ea.STATE_SET)
                .withUnit('s')
                .withDescription(
                    'Setting ' +
                        'minimum 0 - maximum 465 seconds boost time. The boost (â¨) function is activated. The remaining ' +
                        'time for the function will be counted down in seconds ( 465 to 0 ).',
                )
                .withValueMin(0)
                .withValueMax(465),
            e.holiday_temperature().withValueMin(5).withValueMax(30),
            e
                .text('holiday_start_stop', ea.STATE_SET)
                .withDescription(
                    'The holiday mode will automatically start ' +
                        'at the set time starting point and run the holiday temperature. Can be defined in the following format: ' +
                        '`startYear/startMonth/startDay startHours:startMinutes | endYear/endMonth/endDay endHours:endMinutes`. ' +
                        'For example: `2022/10/01 16:30 | 2022/10/21 18:10`. After the end of holiday mode, it switches to "auto" ' +
                        'mode and uses schedule.',
                ),
            e
                .enum('working_day', ea.STATE_SET, ['mon_sun', 'mon_fri+sat+sun', 'separate'])
                .withDescription(
                    '`mon_sun` ' +
                        '- schedule for Monday used for each day (define it only for Monday). `mon_fri+sat+sun` - schedule for ' +
                        'workdays used from Monday (define it only for Monday), Saturday and Sunday are defined separately. `separate` ' +
                        '- schedule for each day is defined separately.',
                ),
            e
                .composite('schedule', 'schedule', ea.SET)
                .withFeature(e.enum('week_day', ea.SET, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
                .withFeature(e.text('schedule', ea.SET))
                .withDescription(
                    'Schedule will work with "auto" preset. In this mode, the device executes ' +
                        'a preset week programming temperature time and temperature. Before using these properties, check `working_day` ' +
                        'property. Each day can contain up to 10 segments. At least 1 segment should be defined. Different count of segments ' +
                        'can be defined for each day, e.g., 3 segments for Monday, 5 segments for Thursday, etc. It should be defined in the ' +
                        'following format: `hours:minutes/temperature`. Minutes can be only tens, i.e., 00, 10, 20, 30, 40, 50. Segments should ' +
                        'be divided by space symbol. Each day should end with the last segment of 24:00. Examples: `04:00/20 08:30/22 10:10/18 ' +
                        '18:40/24 22:50/19.5`; `06:00/21.5 17:20/26 24:00/18`. The temperature will be set from the beginning/start of one ' +
                        'period and until the next period, e.g., `04:00/20 24:00/22` means that from 00:00 to 04:00 temperature will be 20 ' +
                        'degrees and from 04:00 to 00:00 temperature will be 22 degrees.',
                ),
            ...tuya.exposes.scheduleAllDays(ea.STATE, 'HH:MM/C'),
            e.binary('online', ea.STATE_SET, 'ON', 'OFF').withDescription('The current data request from the device.'),
            tuya.exposes.errorStatus(),
        ],
        meta: {
            tuyaDatapoints: [
                [2, 'preset', tuya.valueConverter.tv02Preset()],
                [8, 'open_window', tuya.valueConverter.onOff],
                [10, null, tuya.valueConverter.TV02FrostProtection],
                [10, 'frost_protection', tuya.valueConverter.TV02FrostProtection],
                [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [24, 'local_temperature', tuya.valueConverter.divideBy10],
                [27, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration1],
                [
                    31,
                    'working_day',
                    tuya.valueConverterBasic.lookup({mon_sun: tuya.enum(0), 'mon_fri+sat+sun': tuya.enum(1), separate: tuya.enum(2)}),
                ],
                [32, 'holiday_temperature', tuya.valueConverter.divideBy10],
                [35, 'battery_low', tuya.valueConverter.trueFalse0],
                [40, 'child_lock', tuya.valueConverter.lockUnlock],
                [45, 'error_status', tuya.valueConverter.raw],
                [46, 'holiday_start_stop', tuya.valueConverter.thermostatHolidayStartStop],
                [101, 'boost_timeset_countdown', tuya.valueConverter.raw],
                [102, 'open_window_temperature', tuya.valueConverter.divideBy10],
                [104, 'comfort_temperature', tuya.valueConverter.divideBy10],
                [105, 'eco_temperature', tuya.valueConverter.divideBy10],
                [106, 'schedule', tuya.valueConverter.thermostatScheduleDaySingleDP],
                [107, null, tuya.valueConverter.TV02SystemMode],
                [107, 'system_mode', tuya.valueConverter.TV02SystemMode],
                [107, 'heating_stop', tuya.valueConverter.TV02SystemMode],
                [115, 'online', tuya.valueConverter.onOffNotStrict],
                [108, 'schedule_monday', tuya.valueConverter.thermostatScheduleDaySingleDP],
                [112, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDaySingleDP],
                [109, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDaySingleDP],
                [113, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDaySingleDP],
                [110, 'schedule_friday', tuya.valueConverter.thermostatScheduleDaySingleDP],
                [114, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDaySingleDP],
                [111, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDaySingleDP],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_0hg58wyk' /* model: 'S366', vendor: 'Cloud Even' */]),
        model: 'TS0601_thermostat_2',
        vendor: 'Tuya',
        description: 'Thermostat radiator valve',
        whiteLabel: [{vendor: 'S366', model: 'Cloud Even'}],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        meta: {
            tuyaDatapoints: [
                [1, 'system_mode', tuya.valueConverterBasic.lookup({heat: true, off: false})],
                [2, 'preset', tuya.valueConverterBasic.lookup({manual: tuya.enum(0), holiday: tuya.enum(1), program: tuya.enum(2)})],
                [3, null, null], // TODO: Unknown DP
                [8, 'open_window', tuya.valueConverter.onOff],
                [10, 'frost_protection', tuya.valueConverter.onOff],
                [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [24, 'local_temperature', tuya.valueConverter.divideBy10],
                [27, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration1],
                [35, 'battery_low', tuya.valueConverter.trueFalse0],
                [40, 'child_lock', tuya.valueConverter.lockUnlock],
                [45, 'error_status', tuya.valueConverter.raw],
                [101, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [102, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [103, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [104, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [105, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [106, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [107, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDP],
            ],
        },
        exposes: [
            e.battery_low(),
            e.child_lock(),
            e.open_window(),
            tuya.exposes.frostProtection(),
            tuya.exposes.errorStatus(),
            e
                .climate()
                .withSystemMode(['off', 'heat'], ea.STATE_SET)
                .withPreset(['manual', 'holiday', 'program'])
                .withLocalTemperatureCalibration(-5, 5, 0.1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE200_bvu2wnxz' /* model: 'ME167', vendor: 'AVATTO' */,
            '_TZE200_6rdj8dzm' /* model: 'ME167', vendor: 'AVATTO' */,
            '_TZE200_p3dbf6qs' /* model: 'ME168', vendor: 'AVATTO' */,
            '_TZE200_rxntag7i' /* model: 'ME168', vendor: 'AVATTO' */,
        ]),
        model: 'TS0601_thermostat_3',
        vendor: 'Tuya',
        description: 'Thermostatic radiator valve',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        whiteLabel: [
            tuya.whitelabel('AVATTO', 'ME167', 'Thermostatic radiator valve', ['_TZE200_bvu2wnxz', '_TZE200_6rdj8dzm']),
            tuya.whitelabel('AVATTO', 'ME168', 'Thermostatic radiator valve', ['_TZE200_p3dbf6qs', '_TZE200_rxntag7i']),
        ],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.child_lock(),
            e.battery_low(),
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['auto', 'heat', 'off'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
            e
                .binary('scale_protection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription(
                    'If the heat sink is not fully opened within ' +
                        'two weeks or is not used for a long time, the valve will be blocked due to silting up and the heat sink will not be ' +
                        'able to be used. To ensure normal use of the heat sink, the controller will automatically open the valve fully every ' +
                        'two weeks. It will run for 30 seconds per time with the screen displaying "Ad", then return to its normal working state ' +
                        'again.',
                ),
            e
                .binary('frost_protection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription(
                    'When the room temperature is lower than 5 °C, the valve opens; when the temperature rises to 8 °C, the valve closes.',
                ),
            e.numeric('error', ea.STATE).withDescription('If NTC is damaged, "Er" will be on the TRV display.'),
        ],
        meta: {
            tuyaDatapoints: [
                [2, 'system_mode', tuya.valueConverterBasic.lookup({auto: tuya.enum(0), heat: tuya.enum(1), off: tuya.enum(2)})],
                [3, 'running_state', tuya.valueConverterBasic.lookup({heat: tuya.enum(0), idle: tuya.enum(1)})],
                [4, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [5, 'local_temperature', tuya.valueConverter.divideBy10],
                [7, 'child_lock', tuya.valueConverter.lockUnlock],
                [28, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(1)],
                [29, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(2)],
                [30, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(3)],
                [31, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(4)],
                [32, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(5)],
                [33, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(6)],
                [34, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(7)],
                [35, null, tuya.valueConverter.errorOrBatteryLow],
                [36, 'frost_protection', tuya.valueConverter.onOff],
                [39, 'scale_protection', tuya.valueConverter.onOff],
                [47, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration2],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_pcdmj88b']),
        model: 'TS0601_thermostat_4',
        vendor: 'Tuya',
        description: 'Thermostatic radiator valve',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.child_lock(),
            e.battery(),
            e.battery_low(),
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withPreset(['schedule', 'holiday', 'manual', 'comfort', 'eco'])
                .withSystemMode(['off', 'heat'], ea.STATE)
                .withLocalTemperatureCalibration(-3, 3, 1, ea.STATE_SET),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
            e.holiday_temperature().withValueMin(5).withValueMax(30),
            e.comfort_temperature().withValueMin(5).withValueMax(30),
            e.eco_temperature().withValueMin(5).withValueMax(30),
            e
                .binary('scale_protection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription(
                    'If the heat sink is not fully opened within ' +
                        'two weeks or is not used for a long time, the valve will be blocked due to silting up and the heat sink will not be ' +
                        'able to be used. To ensure normal use of the heat sink, the controller will automatically open the valve fully every ' +
                        'two weeks. It will run for 30 seconds per time with the screen displaying "Ad", then return to its normal working state ' +
                        'again.',
                ),
            e
                .binary('frost_protection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription(
                    'When the room temperature is lower than 5 °C, the valve opens; when the temperature rises to 8 °C, the valve closes.',
                ),
            e.numeric('error', ea.STATE).withDescription('If NTC is damaged, "Er" will be on the TRV display.'),
            e.binary('boost_heating', ea.STATE_SET, 'ON', 'OFF').withDescription('Boost Heating: the device will enter the boost heating mode.'),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    2,
                    'preset',
                    tuya.valueConverterBasic.lookup({
                        schedule: tuya.enum(0),
                        holiday: tuya.enum(1),
                        manual: tuya.enum(2),
                        comfort: tuya.enum(3),
                        eco: tuya.enum(4),
                    }),
                ],
                [4, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [5, 'local_temperature', tuya.valueConverter.divideBy10],
                [6, 'battery', tuya.valueConverter.raw],
                [7, 'child_lock', tuya.valueConverter.lockUnlock],
                [21, 'holiday_temperature', tuya.valueConverter.divideBy10],
                [24, 'comfort_temperature', tuya.valueConverter.divideBy10],
                [25, 'eco_temperature', tuya.valueConverter.divideBy10],
                [28, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(1)],
                [29, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(2)],
                [30, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(3)],
                [31, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(4)],
                [32, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(5)],
                [33, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(6)],
                [34, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(7)],
                [35, 'fault_alarm', tuya.valueConverter.errorOrBatteryLow],
                [36, 'frost_protection', tuya.valueConverter.onOff],
                [37, 'boost_heating', tuya.valueConverter.onOff],
                [39, 'scale_protection', tuya.valueConverter.onOff],
                [47, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration2],
                [49, 'system_mode', tuya.valueConverterBasic.lookup({off: tuya.enum(0), heat: tuya.enum(1)})],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'v90ladg\u0000', manufacturerName: '_TYST11_wv90ladg'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wv90ladg'},
        ],
        model: 'HT-08',
        vendor: 'ETOP',
        description: 'Wall-mount thermostat',
        fromZigbee: [
            legacy.fromZigbee.tuya_thermostat_weekly_schedule_1,
            legacy.fromZigbee.etop_thermostat,
            fz.ignore_basic_report,
            fz.ignore_tuya_set_time,
        ],
        toZigbee: [
            legacy.toZigbee.etop_thermostat_system_mode,
            legacy.toZigbee.etop_thermostat_away_mode,
            legacy.toZigbee.tuya_thermostat_child_lock,
            legacy.toZigbee.tuya_thermostat_current_heating_setpoint,
            legacy.toZigbee.tuya_thermostat_weekly_schedule,
        ],
        onEvent: tuya.onEventSetTime,
        meta: {
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: 101,
            },
        },
        exposes: [
            e.child_lock(),
            e.away_mode(),
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE),
        ],
    },
    {
        fingerprint: [
            {modelID: 'dpplnsn\u0000', manufacturerName: '_TYST11_2dpplnsn'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2dpplnsn'},
        ],
        model: 'HT-10',
        vendor: 'ETOP',
        description: 'Radiator valve',
        fromZigbee: [
            legacy.fromZigbee.tuya_thermostat_weekly_schedule_1,
            legacy.fromZigbee.etop_thermostat,
            fz.ignore_basic_report,
            fz.ignore_tuya_set_time,
        ],
        toZigbee: [
            legacy.toZigbee.etop_thermostat_system_mode,
            legacy.toZigbee.etop_thermostat_away_mode,
            legacy.toZigbee.tuya_thermostat_child_lock,
            legacy.toZigbee.tuya_thermostat_current_heating_setpoint,
            legacy.toZigbee.tuya_thermostat_weekly_schedule,
        ],
        onEvent: tuya.onEventSetTime,
        meta: {
            timeout: 20000, // TRV wakes up every 10sec
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: 101,
            },
        },
        exposes: [
            e.battery_low(),
            e.child_lock(),
            e.away_mode(),
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_a4bpgplm'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_dv8abrrz'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_z1tyspqw'},
        ],
        model: 'TS0601_thermostat_1',
        vendor: 'Tuya',
        description: 'Thermostatic radiator valve',
        whiteLabel: [tuya.whitelabel('id3', 'GTZ06', 'Thermostatic radiator valve', ['_TZE200_z1tyspqw'])],
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(),
            e.child_lock(),
            e.max_temperature(),
            e.min_temperature(),
            e.position(),
            e.window_detection(),
            e.binary('window', ea.STATE, 'CLOSED', 'OPEN').withDescription('Window status closed or open '),
            e.binary('alarm_switch', ea.STATE, 'ON', 'OFF').withDescription('Thermostat in error state'),
            e
                .climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperatureCalibration(-30, 30, 0.1, ea.STATE_SET)
                .withPreset(
                    ['auto', 'manual', 'off', 'on'],
                    'MANUAL MODE ☝ - In this mode, the device executes manual temperature setting. ' +
                        'When the set temperature is lower than the "minimum temperature", the valve is closed (forced closed). ' +
                        'AUTO MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. ' +
                        'ON - In this mode, the thermostat stays open ' +
                        'OFF - In this mode, the thermostat stays closed',
                )
                .withSystemMode(['auto', 'heat', 'off'], ea.STATE)
                .withRunningState(['idle', 'heat'], ea.STATE),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
            e
                .binary('boost_heating', ea.STATE_SET, 'ON', 'OFF')
                .withDescription(
                    'Boost Heating: press and hold "+" for 3 seconds, ' +
                        'the device will enter the boost heating mode, and the ▷╵◁ will flash. The countdown will be displayed in the APP',
                ),
            e.numeric('boost_time', ea.STATE_SET).withUnit('min').withDescription('Countdown in minutes').withValueMin(0).withValueMax(1000),
        ],
        meta: {
            tuyaDatapoints: [
                [1, null, tuya.valueConverter.thermostatSystemModeAndPreset(null)],
                [1, 'system_mode', tuya.valueConverter.thermostatSystemModeAndPreset('system_mode')],
                [1, 'preset', tuya.valueConverter.thermostatSystemModeAndPreset('preset')],
                [2, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [3, 'local_temperature', tuya.valueConverter.divideBy10],
                [4, 'boost_heating', tuya.valueConverter.onOff],
                [5, 'boost_time', tuya.valueConverter.countdown],
                [6, 'running_state', tuya.valueConverterBasic.lookup({heat: 1, idle: 0})],
                [7, 'window', tuya.valueConverterBasic.lookup({OPEN: 1, CLOSE: 0})],
                [8, 'window_detection', tuya.valueConverter.onOff],
                [12, 'child_lock', tuya.valueConverter.lockUnlock],
                [13, 'battery', tuya.valueConverter.raw],
                [14, 'alarm_switch', tuya.valueConverter.onOff],
                [15, 'min_temperature', tuya.valueConverter.divideBy10],
                [16, 'max_temperature', tuya.valueConverter.divideBy10],
                [17, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(1)],
                [18, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(2)],
                [19, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(3)],
                [20, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(4)],
                [21, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(5)],
                [22, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(6)],
                [23, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(7)],
                [101, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration1],
                [102, 'position', tuya.valueConverter.divideBy10],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_rtrmfadk'}],
        model: 'TRV601',
        vendor: 'Tuya',
        description: 'Thermostatic radiator valve.',
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(),
            e.child_lock(),
            e.max_temperature(),
            e.min_temperature(),
            e.position(),
            e.window_detection(),
            e.binary('window', ea.STATE, 'OPEN', 'CLOSE').withDescription('Window status closed or open '),
            e.binary('alarm_switch', ea.STATE, 'ON', 'OFF').withDescription('Thermostat in error state'),
            e
                .climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperatureCalibration(-30, 30, 0.1, ea.STATE_SET)
                .withPreset(
                    ['auto', 'manual', 'off', 'on'],
                    'MANUAL MODE ☝ - In this mode, the device executes manual temperature setting. ' +
                        'When the set temperature is lower than the "minimum temperature", the valve is closed (forced closed). ' +
                        'AUTO MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. ' +
                        'ON - In this mode, the thermostat stays open ' +
                        'OFF - In this mode, the thermostat stays closed',
                )
                .withSystemMode(['auto', 'heat', 'off'], ea.STATE)
                .withRunningState(['idle', 'heat'], ea.STATE),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
            e
                .enum('mode', ea.STATE_SET, ['comfort', 'eco'])
                .withDescription(
                    'Hysteresis - comfort > switches off/on exactly at reached ' +
                        'temperature with valve smooth from 0 to 100%, eco > 0.5 degrees above or below, valve either 0 or 100%',
                ),
        ],
        meta: {
            tuyaDatapoints: [
                [1, null, tuya.valueConverter.thermostatSystemModeAndPreset(null)],
                [1, 'system_mode', tuya.valueConverter.thermostatSystemModeAndPreset('system_mode')],
                [1, 'preset', tuya.valueConverter.thermostatSystemModeAndPreset('preset')],
                [2, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [3, 'local_temperature', tuya.valueConverter.divideBy10],
                [6, 'running_state', tuya.valueConverterBasic.lookup({heat: 1, idle: 0})],
                [7, 'window', tuya.valueConverterBasic.lookup({OPEN: 1, CLOSE: 0})],
                [8, 'window_detection', tuya.valueConverter.onOff],
                [12, 'child_lock', tuya.valueConverter.lockUnlock],
                [13, 'battery', tuya.valueConverter.raw],
                [14, 'alarm_switch', tuya.valueConverter.onOff],
                [15, 'min_temperature', tuya.valueConverter.divideBy10],
                [16, 'max_temperature', tuya.valueConverter.divideBy10],
                [17, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(1)],
                [18, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(2)],
                [19, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(3)],
                [20, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(4)],
                [21, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(5)],
                [22, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(6)],
                [23, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(7)],
                [101, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration1],
                [108, 'position', tuya.valueConverter.divideBy10],
                [114, 'mode', tuya.valueConverterBasic.lookup({comfort: tuya.enum(0), eco: tuya.enum(1)})],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_rtrmfadk'}],
        model: 'TRV602',
        vendor: 'Tuya',
        description: 'Thermostatic radiator valve.',
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(),
            e.child_lock(),
            e.max_temperature(),
            e.min_temperature(),
            e.position(),
            e.window_detection(),
            e.binary('window', ea.STATE, 'OPEN', 'CLOSE').withDescription('Window status closed or open '),
            e.binary('alarm_switch', ea.STATE, 'ON', 'OFF').withDescription('Thermostat in error state'),
            e
                .climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperatureCalibration(-30, 30, 0.1, ea.STATE_SET)
                .withPreset(
                    ['auto', 'manual', 'off', 'on'],
                    'MANUAL MODE ☝ - In this mode, the device executes manual temperature setting. ' +
                        'When the set temperature is lower than the "minimum temperature", the valve is closed (forced closed). ' +
                        'AUTO MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. ' +
                        'ON - In this mode, the thermostat stays open ' +
                        'OFF - In this mode, the thermostat stays closed',
                )
                .withSystemMode(['auto', 'heat', 'off'], ea.STATE)
                .withRunningState(['idle', 'heat'], ea.STATE),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
            e.enum('display_brightness', ea.STATE_SET, ['high', 'medium', 'low']).withDescription('Display brightness'),
            e.enum('screen_orientation', ea.STATE_SET, ['up', 'right', 'down', 'left']).withDescription('Screen orientation'),
            e
                .enum('mode', ea.STATE_SET, ['comfort', 'eco'])
                .withDescription(
                    'Hysteresis - comfort > switches off/on exactly at reached ' +
                        'temperature with valve smooth from 0 to 100%, eco > 0.5 degrees above or below, valve either 0 or 100%',
                ),
        ],
        meta: {
            tuyaDatapoints: [
                [1, null, tuya.valueConverter.thermostatSystemModeAndPreset(null)],
                [1, 'system_mode', tuya.valueConverter.thermostatSystemModeAndPreset('system_mode')],
                [1, 'preset', tuya.valueConverter.thermostatSystemModeAndPreset('preset')],
                [2, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [3, 'local_temperature', tuya.valueConverter.divideBy10],
                [6, 'running_state', tuya.valueConverterBasic.lookup({heat: 1, idle: 0})],
                [7, 'window', tuya.valueConverterBasic.lookup({OPEN: 1, CLOSE: 0})],
                [8, 'window_detection', tuya.valueConverter.onOff],
                [12, 'child_lock', tuya.valueConverter.lockUnlock],
                [13, 'battery', tuya.valueConverter.raw],
                [14, 'alarm_switch', tuya.valueConverter.onOff],
                [15, 'min_temperature', tuya.valueConverter.divideBy10],
                [16, 'max_temperature', tuya.valueConverter.divideBy10],
                [17, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(1)],
                [18, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(2)],
                [19, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(3)],
                [20, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(4)],
                [21, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(5)],
                [22, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(6)],
                [23, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(7)],
                [101, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration1],
                [108, 'position', tuya.valueConverter.divideBy10],
                [111, 'display_brightness', tuya.valueConverterBasic.lookup({high: tuya.enum(0), medium: tuya.enum(1), low: tuya.enum(2)})],
                [
                    113,
                    'screen_orientation',
                    tuya.valueConverterBasic.lookup({
                        up: tuya.enum(0),
                        right: tuya.enum(1),
                        down: tuya.enum(2),
                        left: tuya.enum(3),
                    }),
                ],
                [114, 'mode', tuya.valueConverterBasic.lookup({comfort: tuya.enum(0), eco: tuya.enum(1)})],
            ],
        },
    },
    {
        zigbeeModel: ['TS0121'],
        model: 'TS0121_plug',
        description: '10A UK or 16A EU smart plug',
        whiteLabel: [
            {vendor: 'BlitzWolf', model: 'BW-SHP13'},
            {vendor: 'Connecte', model: '4500990'},
            {vendor: 'Connecte', model: '4500991'},
            {vendor: 'Connecte', model: '4500992'},
            {vendor: 'Connecte', model: '4500993'},
        ],
        vendor: 'Tuya',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, tuya.fz.power_outage_memory, tuya.fz.indicator_mode],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tuya.tz.backlight_indicator_mode_1],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1,
                acVoltageDivisor: 1,
                acCurrentMultiplier: 1,
                acCurrentDivisor: 1000,
                acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
            try {
                await reporting.currentSummDelivered(endpoint);
                await reporting.rmsVoltage(endpoint, {change: 5});
                await reporting.rmsCurrent(endpoint, {change: 50});
                await reporting.activePower(endpoint, {change: 10});
            } catch (error) {
                /* fails for some https://github.com/Koenkk/zigbee2mqtt/issues/11179
                                and https://github.com/Koenkk/zigbee2mqtt/issues/16864 */
            }
            await endpoint.read('genOnOff', ['onOff', 'moesStartUpOnOff', 'tuyaBacklightMode']);
        },
        options: [exposes.options.measurement_poll_interval()],
        // This device doesn't support reporting correctly.
        // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
        exposes: [
            e.switch(),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore']).withDescription('Recover state after power outage'),
            e.enum('indicator_mode', ea.ALL, ['off', 'off/on', 'on/off']).withDescription('LED indicator mode'),
        ],
        onEvent: (type, data, device, options) => tuya.onEventMeasurementPoll(type, data, device, options, true, false),
    },
    {
        fingerprint: [{modelID: 'TS0111', manufacturerName: '_TYZB01_ymcdbl3u'}],
        model: 'TS0111_valve',
        vendor: 'Tuya',
        whiteLabel: [{vendor: 'Tuya', model: 'SM-AW713Z'}],
        description: 'Smart water/gas valve',
        extend: [tuya.modernExtend.tuyaOnOff({indicatorMode: true})],
    },
    {
        // Note: below you will find the TS011F_plug_2 and TS011F_plug_3. These are identified via a fingerprint and
        // thus preferred above the TS011F_plug_1 if the fingerprint matches
        zigbeeModel: ['TS011F'],
        model: 'TS011F_plug_1',
        description: 'Smart plug (with power monitoring)',
        vendor: 'Tuya',
        whiteLabel: [
            {vendor: 'LELLKI', model: 'TS011F_plug'},
            {vendor: 'Neo', model: 'NAS-WR01B'},
            {vendor: 'BlitzWolf', model: 'BW-SHP15'},
            {vendor: 'BlitzWolf', model: 'BW-SHP13'},
            {vendor: 'MatSee Plus', model: 'PJ-ZSW01'},
            {vendor: 'MODEMIX', model: 'MOD037'},
            {vendor: 'MODEMIX', model: 'MOD048'},
            {vendor: 'Coswall', model: 'CS-AJ-DE2U-ZG-11'},
            {vendor: 'Aubess', model: 'TS011F_plug_1'},
            tuya.whitelabel('Nous', 'A1Z', 'Smart plug (with power monitoring)', ['_TZ3000_2putqrmw']),
            tuya.whitelabel('Moes', 'MOES_plug', 'Smart plug (with power monitoring)', ['_TZ3000_yujkchbz']),
            tuya.whitelabel('Moes', 'ZK-EU', 'Smart wallsocket (with power monitoring)', ['_TZ3000_ss98ec5d']),
            tuya.whitelabel('Nous', 'A1Z', 'Smart plug (with power monitoring)', ['_TZ3000_ksw8qtmt']),
            tuya.whitelabel('Elivco', 'LSPA9', 'Smart plug (with power monitoring)', ['_TZ3000_okaz9tjs']),
        ],
        ota: ota.zigbeeOTA,
        extend: [
            tuya.modernExtend.tuyaOnOff({
                electricalMeasurements: true,
                electricalMeasurementsFzConverter: fzLocal.TS011F_electrical_measurement,
                powerOutageMemory: true,
                indicatorMode: true,
                childLock: true,
                onOffCountdown: true,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});

            if (!['_TZ3000_0zfrhq4i', '_TZ3000_okaz9tjs', '_TZ3000_typdpbpg'].includes(device.manufacturerName)) {
                // Gives INVALID_DATA_TYPE error for _TZ3000_0zfrhq4i (as well as a few others in issue 20028)
                // https://github.com/Koenkk/zigbee2mqtt/discussions/19680#discussioncomment-7667035
                await reporting.activePower(endpoint, {change: 10});
            }
            await reporting.currentSummDelivered(endpoint);
            const acCurrentDivisor = device.manufacturerName === '_TZ3000_typdpbpg' ? 2000 : 1000;
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            utils.attachOutputCluster(device, 'genOta');
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint('TS011F', [
            '_TZ3000_hyfvrar3',
            '_TZ3000_v1pdxuqq',
            '_TZ3000_8a833yls',
            '_TZ3000_bfn1w0mm',
            '_TZ3000_nzkqcvvs',
            '_TZ3000_rtcrrvia',
        ]),
        model: 'TS011F_plug_2',
        description: 'Smart plug (without power monitoring)',
        vendor: 'Tuya',
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, indicatorMode: true, childLock: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS011F', applicationVersion: 160, priority: -1},
            {modelID: 'TS011F', applicationVersion: 100, priority: -1},
            {modelID: 'TS011F', applicationVersion: 69, priority: -1},
            {modelID: 'TS011F', applicationVersion: 68, priority: -1},
            {modelID: 'TS011F', applicationVersion: 65, priority: -1},
            {modelID: 'TS011F', applicationVersion: 64, priority: -1},
            {modelID: 'TS011F', softwareBuildID: '1.0.5\u0000', priority: -1},
        ],
        model: 'TS011F_plug_3',
        description: 'Smart plug (with power monitoring by polling)',
        vendor: 'Tuya',
        whiteLabel: [
            {vendor: 'VIKEFON', model: 'TS011F'},
            {vendor: 'BlitzWolf', model: 'BW-SHP15'},
            {vendor: 'AVATTO', model: 'MIUCOT10Z'},
            {vendor: 'Neo', model: 'NAS-WR01B'},
            {vendor: 'Neo', model: 'PLUG-001SPB2'},
            tuya.whitelabel('Tuya', 'BSD29_1', 'Smart plug (with power monitoring by polling)', ['_TZ3000_okaz9tjs']),
        ],
        ota: ota.zigbeeOTA,
        extend: [tuya.modernExtend.tuyaOnOff({electricalMeasurements: true, powerOutageMemory: true, indicatorMode: true, childLock: true})],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            utils.attachOutputCluster(device, 'genOta');
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        onEvent: (type, data, device, options) =>
            tuya.onEventMeasurementPoll(
                type,
                data,
                device,
                options,
                true, // polling for voltage, current and power
                [100, 160].includes(device.applicationVersion) || ['1.0.5\u0000'].includes(device.softwareBuildID), // polling for energy
            ),
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_in5s3wn1', '_TZ3000_wbloefbf']),
        model: 'TS011F_switch_5_gang',
        description: '2 gang 2 usb 1 wall ac outlet',
        whiteLabel: [{vendor: 'Milfra', model: 'M11Z'}],
        vendor: 'Tuya',
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, childLock: true, endpoints: ['l1', 'l2', 'l3', 'l4', 'l5']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_dlug3kbc']),
        model: 'TS011F_3_gang',
        description: '3 gang wall ac outlet',
        vendor: 'Tuya',
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, childLock: true, endpoints: ['l1', 'l2', 'l3']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            for (const ep of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genOnOff']);
            }
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_0zaf1cr8', '_TZE204_ntcy3xu1']),
        model: 'TS0601_smoke_1',
        vendor: 'Tuya',
        description: 'Smoke sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.smoke(), e.tamper(), e.battery_low()],
        meta: {
            tuyaDatapoints: [
                [1, 'smoke', tuya.valueConverter.trueFalse0],
                [4, 'tamper', tuya.valueConverter.raw],
                [14, 'battery_low', tuya.valueConverter.trueFalse0],
            ],
        },
        whiteLabel: [tuya.whitelabel('Nous', 'E8', 'Smoke sensor', ['_TZE200_0zaf1cr8'])],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_ntcy3xu1'}],
        model: 'TS0601_smoke_6',
        vendor: 'Tuya',
        description: 'Smoke sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.smoke(), e.tamper(), tuya.exposes.batteryState()],
        meta: {
            tuyaDatapoints: [
                [1, 'smoke', tuya.valueConverter.trueFalse0],
                [4, 'tamper', tuya.valueConverter.raw],
                [14, 'battery_state', tuya.valueConverter.batteryState],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_m9skfctm', '_TZE200_rccxox8p']),
        model: 'PA-44Z',
        vendor: 'Tuya',
        description: 'Photoelectric smoke detector',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.smoke(),
            e.battery(),
            tuya.exposes.silence(),
            e.test(),
            e.numeric('smoke_concentration', ea.STATE).withUnit('ppm').withDescription('Parts per million of smoke detected'),
            e.binary('device_fault', ea.STATE, true, false).withDescription('Indicates a fault with the device'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'smoke', tuya.valueConverter.trueFalse0],
                [2, 'smoke_concentration', tuya.valueConverter.divideBy10],
                [11, 'device_fault', tuya.valueConverter.raw],
                [15, 'battery', tuya.valueConverter.raw],
                [16, 'silence', tuya.valueConverter.raw],
                [101, 'test', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_ux5v4dbd'}, // [KnockautX / Brelag AG, Switzerland](https://www.brelag.com)
        ],
        vendor: 'Tuya',
        model: 'TS0601_smoke_3',
        description: 'Photoelectric smoke detector',
        whiteLabel: [{vendor: 'KnockautX', model: 'SMOAL024'}],
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [e.smoke(), tuya.exposes.batteryState()],
        meta: {
            tuyaDatapoints: [
                /**
                 * According to the Vendor "KnockautX / Brelag AG" DP 16 "muffling"
                 * is supported as well. But it was not possible to verify this using
                 * SMOLA024 devices - therefore it is not included in the device definition.
                 *
                 * Data Transfer Type: Send and Report
                 * Data Type: Bool
                 * muffling: 16,
                 */
                [1, 'smoke', tuya.valueConverter.trueFalse0],
                [14, 'battery_state', tuya.valueConverter.batteryState],
            ],
        },
    },
    {
        zigbeeModel: ['5p1vj8r'],
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_t5p1vj8r', '_TZE200_uebojraa', '_TZE200_vzekyi4c', '_TZE200_yh7aoahi', '_TZE200_dq1mfjug']),
        model: 'TS0601_smoke_4',
        vendor: 'Tuya',
        description: 'Smoke sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [e.smoke(), e.battery(), tuya.exposes.batteryState()],
        meta: {
            tuyaDatapoints: [
                [1, 'smoke', tuya.valueConverter.trueFalse0],
                [14, 'battery_state', tuya.valueConverter.batteryState],
                [15, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ytibqbra']),
        model: 'TS0601_smoke_5',
        vendor: 'Tuya',
        description: 'Smoke sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.smoke(),
            e.tamper(),
            e.battery(),
            tuya.exposes.faultAlarm(),
            tuya.exposes.silence(),
            e.binary('alarm', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable the alarm'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'smoke', tuya.valueConverter.trueFalse0],
                [4, 'tamper', tuya.valueConverter.raw],
                [11, 'fault_alarm', tuya.valueConverter.trueFalse1],
                [15, 'battery', tuya.valueConverter.raw],
                [16, 'silence', tuya.valueConverter.raw],
                [17, 'alarm', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_e2bedvo9', '_TZE200_dnz6yvl2']),
        model: 'ZSS-QY-SSD-A-EN',
        vendor: 'Tuya',
        description: 'Smart smoke alarm',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.smoke(),
            tuya.exposes.faultAlarm(),
            tuya.exposes.batteryState(),
            e.battery(),
            tuya.exposes.silence(),
            tuya.exposes.selfTest(),
            e.numeric('smoke_concentration', ea.STATE).withUnit('ppm').withDescription('Parts per million of smoke detected'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'smoke', tuya.valueConverter.trueFalse0],
                [2, 'smoke_concentration', tuya.valueConverter.divideBy10],
                [11, 'fault_alarm', tuya.valueConverter.trueFalse1],
                [14, 'battery_state', tuya.valueConverter.batteryState],
                [15, 'battery', tuya.valueConverter.raw],
                [16, 'silence', tuya.valueConverter.raw],
                [17, 'self_test', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_5d3vhjro'}],
        model: 'SA12IZL',
        vendor: 'Tuya',
        description: 'Smart smoke alarm',
        meta: {timeout: 30000, disableDefaultResponse: true},
        fromZigbee: [legacy.fromZigbee.SA12IZL],
        toZigbee: [legacy.toZigbee.SA12IZL_silence_siren, legacy.toZigbee.SA12IZL_alarm],
        exposes: [
            e.battery(),
            e.binary('smoke', ea.STATE, true, false).withDescription('Smoke alarm status'),
            e.enum('battery_level', ea.STATE, ['low', 'middle', 'high']).withDescription('Battery level state'),
            e.binary('alarm', ea.STATE_SET, true, false).withDescription('Enable the alarm'),
            e.binary('silence_siren', ea.STATE_SET, true, false).withDescription('Silence the siren'),
        ],
        onEvent: tuya.onEventSetTime,
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_cjbofhxw', '_TZE284_cjbofhxw']),
        model: 'PJ-MGW1203',
        vendor: 'Tuya',
        description: 'Clamp meter',
        fromZigbee: [tuya.fz.datapoints, tuya.fz.gateway_connection_status],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.current(), e.power(), e.voltage(), e.energy()],
        meta: {
            tuyaDatapoints: [
                [18, 'current', tuya.valueConverter.divideBy1000],
                [19, 'power', tuya.valueConverter.divideBy10],
                [20, 'voltage', tuya.valueConverter.divideBy10],
                [101, 'energy', tuya.valueConverter.divideBy1000],
            ],
        },
        whiteLabel: [tuya.whitelabel('Tuya', 'PJ-1203-W', 'Electricity energy monitor', ['_TZE284_cjbofhxw'])],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_bkkmqmyo', '_TZE200_eaac7dkw', '_TZE204_bkkmqmyo']),
        model: 'TS0601_din_1',
        vendor: 'Tuya',
        description: 'Zigbee DIN energy meter',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch(),
            e.ac_frequency(),
            e.energy(),
            e.power(),
            e.power_factor().withUnit('%'),
            e.voltage(),
            e.current(),
            e.produced_energy(),
            e.power_reactive(),
            e.numeric('energy_reactive', ea.STATE).withUnit('kVArh').withDescription('Sum of reactive energy'),
            e.numeric('total_energy', ea.STATE).withUnit('kWh').withDescription('Total consumed and produced energy'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [6, null, tuya.valueConverter.phaseVariant1], // voltage and current
                [16, 'state', tuya.valueConverter.onOff],
                [101, 'total_energy', tuya.valueConverter.divideBy100], // total energy produced + consumed
                [102, 'produced_energy', tuya.valueConverter.divideBy100],
                [103, 'power', tuya.valueConverter.raw],
                [105, 'ac_frequency', tuya.valueConverter.divideBy100],
                [109, 'energy_reactive', tuya.valueConverter.divideBy100], // reactive energy in VArh
                [110, 'power_reactive', tuya.valueConverter.raw], // reactive power
                [111, 'power_factor', tuya.valueConverter.divideBy10],
                // Ignored for now; we don't know what the values mean
                [9, null, null], // Fault - we don't know the possible values here
                [17, null, null], // Alarm set1 - value seems garbage "AAAAAAAAAAAAAABkAAEOAACqAAAAAAAKAAAAAAAA"
                [18, null, null], // 18 - Alarm set2 - value seems garbage "AAUAZAAFAB4APAAAAAAAAAA="
            ],
        },
        whiteLabel: [
            {vendor: 'Tuya', model: 'RC-MCB'},
            tuya.whitelabel('RTX', 'ZCR1-40EM', 'Zigbee DIN energy meter', ['_TZE204_wbhaespm']),
            tuya.whitelabel('Hiking', 'DDS238-2', 'Single phase DIN-rail energy meter with switch function', [
                '_TZE200_bkkmqmyo',
                '_TZE204_bkkmqmyo',
            ]),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_wbhaespm']),
        model: 'STB3L-125-ZJ',
        vendor: 'SUTON',
        description: 'Zigbee DIN RCBO energy meter',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch(),
            e.energy(),
            e
                .enum('fault', ea.STATE, [
                    'clear',
                    'short_circuit_alarm',
                    'surge_alarm',
                    'overload_alarm',
                    'leakagecurr_alarm',
                    'temp_dif_fault',
                    'fire_alarm',
                    'high_power_alarm',
                    'self_test_alarm',
                    'ov_cr',
                    'unbalance_alarm',
                    'ov_vol',
                    'undervoltage_alarm',
                    'miss_phase_alarm',
                    'outage_alarm',
                    'magnetism_alarm',
                    'credit_alarm',
                    'no_balance_alarm',
                ])
                .withDescription('Fault status of the device (clear = nothing)'),
            tuya.exposes.voltageWithPhase('a'),
            tuya.exposes.voltageWithPhase('b'),
            tuya.exposes.voltageWithPhase('c'),
            tuya.exposes.powerWithPhase('a'),
            tuya.exposes.powerWithPhase('b'),
            tuya.exposes.powerWithPhase('c'),
            tuya.exposes.currentWithPhase('a'),
            tuya.exposes.currentWithPhase('b'),
            tuya.exposes.currentWithPhase('c'),
            e.temperature(),
            e.binary('leakage_test', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn ON to perform a leagage test'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [6, null, tuya.valueConverter.phaseVariant2WithPhase('a')],
                [7, null, tuya.valueConverter.phaseVariant2WithPhase('b')],
                [8, null, tuya.valueConverter.phaseVariant2WithPhase('c')],
                [
                    9,
                    'fault',
                    tuya.valueConverterBasic.lookup({
                        clear: 0,
                        short_circuit_alarm: 1,
                        surge_alarm: 2,
                        overload_alarm: 4,
                        leakagecurr_alarm: 8,
                        temp_dif_fault: 16,
                        fire_alarm: 32,
                        high_power_alarm: 64,
                        self_test_alarm: 128,
                        ov_cr: 256,
                        unbalance_alarm: 512,
                        ov_vol: 1024,
                        undervoltage_alarm: 2048,
                        miss_phase_alarm: 4096,
                        outage_alarm: 8192,
                        magnetism_alarm: 16384,
                        credit_alarm: 32768,
                        no_balance_alarm: 65536,
                    }),
                ],
                [16, 'state', tuya.valueConverter.onOff],
                [21, 'leakage_test', tuya.valueConverter.onOff], // Leakage test
                [102, 'temperature', tuya.valueConverter.divideBy10],
                // Ignored for now; we don't know what the values mean
                [12, null, null], // Clear energy`
                [13, null, null],
                [14, null, null], // Leakage current
                [15, null, null],
            ],
        },
        whiteLabel: [{vendor: 'SUTON', model: 'STB3L-125/ZJ'}],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_lsanae15', '_TZE204_lsanae15']),
        model: 'TS0601_din_2',
        vendor: 'Tuya',
        description: 'Zigbee DIN energy meter',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch(),
            e.energy(),
            e.power(),
            e.voltage(),
            e.current(),
            e
                .enum('fault', ea.STATE, [
                    'clear',
                    'over_current_threshold',
                    'over_power_threshold',
                    'over_voltage threshold',
                    'wrong_frequency_threshold',
                ])
                .withDescription('Fault status of the device (clear = nothing)'),
            e.enum('threshold_1', ea.STATE, ['not_set', 'over_current_threshold', 'over_voltage_threshold']).withDescription('State of threshold_1'),
            e
                .binary('threshold_1_protection', ea.STATE, 'ON', 'OFF')
                .withDescription('OFF - alarm only, ON - relay will be off when threshold reached'),
            e
                .numeric('threshold_1_value', ea.STATE)
                .withDescription('Can be in Volt or Ampere depending on threshold setting. Setup the value on the device'),
            e.enum('threshold_2', ea.STATE, ['not_set', 'over_current_threshold', 'over_voltage_threshold']).withDescription('State of threshold_2'),
            e
                .binary('threshold_2_protection', ea.STATE, 'ON', 'OFF')
                .withDescription('OFF - alarm only, ON - relay will be off when threshold reached'),
            e.numeric('threshold_2_value', ea.STATE).withDescription('Setup value on the device'),
            e.binary('clear_fault', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn ON to clear last the fault'),
            e.text('meter_id', ea.STATE).withDescription('Meter ID (ID of device)'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [3, null, null], // Monthly, but sends data only after request
                [4, null, null], // Dayly, but sends data only after request
                [6, null, tuya.valueConverter.phaseVariant2], // voltage and current
                [
                    10,
                    'fault',
                    tuya.valueConverterBasic.lookup({
                        clear: 0,
                        over_current_threshold: 1,
                        over_power_threshold: 2,
                        over_voltage_threshold: 4,
                        wrong_frequency_threshold: 8,
                    }),
                ],
                [11, null, null], // Frozen - strange function, in native app - nothing is clear
                [16, 'state', tuya.valueConverter.onOff],
                [17, null, tuya.valueConverter.threshold], // It's settable, but can't write converter
                [18, 'meter_id', tuya.valueConverter.raw],
                [20, 'clear_fault', tuya.valueConverter.onOff], // Clear fault
                [21, null, null], // Forward Energy T1 - don't know what this
                [22, null, null], // Forward Energy T2 - don't know what this
                [23, null, null], // Forward Energy T3 - don't know what this
                [24, null, null], // Forward Energy T4 - don't know what this
            ],
        },
        whiteLabel: [tuya.whitelabel('MatSee Plus', 'DAC2161C', 'Smart Zigbee energy meter 80A din rail', ['_TZE200_lsanae15', '_TZE204_lsanae15'])],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_rhblgy0z', '_TZE204_rhblgy0z']),
        model: 'TS0601_din_3',
        vendor: 'Tuya',
        description: 'Zigbee DIN energy meter',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        whiteLabel: [{vendor: 'XOCA', model: 'DAC2161C'}],
        exposes: [
            tuya.exposes.switch(),
            e.energy(),
            e.produced_energy(),
            e.power(),
            e.voltage(),
            e.current(),
            e
                .enum('fault', ea.STATE, [
                    'clear',
                    'over_current_threshold',
                    'over_power_threshold',
                    'over_voltage threshold',
                    'wrong_frequency_threshold',
                ])
                .withDescription('Fault status of the device (clear = nothing)'),
            e.enum('threshold_1', ea.STATE, ['not_set', 'over_current_threshold', 'over_voltage_threshold']).withDescription('State of threshold_1'),
            e
                .binary('threshold_1_protection', ea.STATE, 'ON', 'OFF')
                .withDescription('OFF - alarm only, ON - relay will be off when threshold reached'),
            e
                .numeric('threshold_1_value', ea.STATE)
                .withDescription('Can be in Volt or Ampere depending on threshold setting. Setup the value on the device'),
            e.enum('threshold_2', ea.STATE, ['not_set', 'over_current_threshold', 'over_voltage_threshold']).withDescription('State of threshold_2'),
            e
                .binary('threshold_2_protection', ea.STATE, 'ON', 'OFF')
                .withDescription('OFF - alarm only, ON - relay will be off when threshold reached'),
            e.numeric('threshold_2_value', ea.STATE).withDescription('Setup value on the device'),
            e.binary('clear_fault', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn ON to clear last the fault'),
            e.text('meter_id', ea.STATE).withDescription('Meter ID (ID of device)'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                [3, null, null], // Monthly, but sends data only after request
                [4, null, null], // Dayly, but sends data only after request
                [6, null, tuya.valueConverter.phaseVariant2], // voltage and current
                [
                    10,
                    'fault',
                    tuya.valueConverterBasic.lookup({
                        clear: 0,
                        over_current_threshold: 1,
                        over_power_threshold: 2,
                        over_voltage_threshold: 4,
                        wrong_frequency_threshold: 8,
                    }),
                ],
                [11, null, null], // Frozen - strange function, in native app - nothing is clear
                [16, 'state', tuya.valueConverter.onOff],
                [17, null, tuya.valueConverter.threshold], // It's settable, but can't write converter
                [18, 'meter_id', tuya.valueConverter.raw],
                [20, 'clear_fault', tuya.valueConverter.onOff], // Clear fault
                [21, null, null], // Forward Energy T1 - don't know what this
                [22, null, null], // Forward Energy T2 - don't know what this
                [23, null, null], // Forward Energy T3 - don't know what this
                [24, null, null], // Forward Energy T4 - don't know what this
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_byzdayie'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fsb6zw01'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ewxhg6o9'},
        ],
        model: 'TS0601_din',
        vendor: 'Tuya',
        description: 'Zigbee smart energy meter DDS238-2 Zigbee',
        fromZigbee: [legacy.fromZigbee.tuya_dinrail_switch],
        toZigbee: [legacy.toZigbee.tuya_switch_state],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
        exposes: [e.switch().setAccess('state', ea.STATE_SET), e.voltage(), e.power(), e.current(), e.energy()],
    },
    {
        fingerprint: [{modelID: 'TS1101', manufacturerName: '_TZ3000_xfs39dbf'}],
        model: 'TS1101_dimmer_module_1ch',
        vendor: 'Tuya',
        description: 'Zigbee dimmer module 1 channel',
        extend: [tuyaLight({minBrightness: 'attribute'})],
    },
    {
        fingerprint: [{modelID: 'TS1101', manufacturerName: '_TZ3000_7ysdnebc'}],
        model: 'TS1101_dimmer_module_2ch',
        vendor: 'Tuya',
        description: 'Zigbee dimmer module 2 channel',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ25'}],
        extend: [
            deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            tuyaLight({minBrightness: 'attribute', endpointNames: ['l1', 'l2'], configureReporting: true}),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
        },
    },
    {
        zigbeeModel: ['RH3001'],
        fingerprint: [
            {
                type: 'EndDevice',
                manufacturerID: 4098,
                applicationVersion: 66,
                endpoints: [{ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 10, 1, 1280], outputClusters: [25]}],
            },
        ],
        model: 'SNTZ007',
        vendor: 'Tuya',
        description: 'Rechargeable Zigbee contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ignore_time_read],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        whiteLabel: [{vendor: 'BlitzWolf', model: 'BW-IS2'}],
    },
    {
        zigbeeModel: ['RH3040'],
        model: 'RH3040',
        vendor: 'Tuya',
        description: 'PIR sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        whiteLabel: [
            {vendor: 'Samotech', model: 'SM301Z'},
            {vendor: 'Nedis', model: 'ZBSM10WT'},
        ],
        exposes: [e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['TS0115'],
        model: 'TS0115',
        vendor: 'Tuya',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (10A or 16A)',
        extend: [tuya.modernExtend.tuyaOnOff({endpoints: ['l1', 'l2', 'l3', 'l4', 'l5']})],
        whiteLabel: [{vendor: 'UseeLink', model: 'SM-SO306E/K/M'}],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 7};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['genOnOff']);
            await device.getEndpoint(1).read('genOnOff', ['onOff', 'moesStartUpOnOff']);
            await device.getEndpoint(2).read('genOnOff', ['onOff']);
            await device.getEndpoint(3).read('genOnOff', ['onOff']);
            await device.getEndpoint(4).read('genOnOff', ['onOff']);
            await device.getEndpoint(7).read('genOnOff', ['onOff']);
        },
    },
    {
        zigbeeModel: ['RH3052'],
        model: 'TT001ZAV20',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0011', manufacturerName: '_TZ3000_l8fsgo6p'}],
        zigbeeModel: ['TS0011'],
        model: 'TS0011',
        vendor: 'Tuya',
        description: 'Smart light switch - 1 gang',
        extend: [tuya.modernExtend.tuyaOnOff({backlightModeOffNormalInverted: true})],
        whiteLabel: [
            {vendor: 'Vrey', model: 'VR-X712U-0013'},
            {vendor: 'TUYATEC', model: 'GDKES-01TZXD'},
            {vendor: 'Lonsonho', model: 'QS-Zigbee-S05-L', description: '1 gang smart switch module without neutral wire'},
            {vendor: 'Mercator Ikuü', model: 'SSW01'},
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0011', manufacturerName: '_TZ3000_qmi1cfuq'},
            {modelID: 'TS0011', manufacturerName: '_TZ3000_txpirhfq'},
            {modelID: 'TS0011', manufacturerName: '_TZ3000_ji4araar'},
        ],
        model: 'TS0011_switch_module',
        vendor: 'Tuya',
        description: '1 gang switch module - (without neutral)',
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true})],
        whiteLabel: [
            {vendor: 'AVATTO', model: '1gang N-ZLWSM01'},
            {vendor: 'SMATRUL', model: 'TMZ02L-16A-W'},
            {vendor: 'Aubess', model: 'TMZ02L-16A-B'},
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0012'],
        model: 'TS0012',
        vendor: 'Tuya',
        description: 'Smart light switch - 2 gang',
        whiteLabel: [
            {vendor: 'Vrey', model: 'VR-X712U-0013'},
            {vendor: 'TUYATEC', model: 'GDKES-02TZXD'},
            {vendor: 'Earda', model: 'ESW-2ZAA-EU'},
            {vendor: 'Moes', model: 'ZS-US2-BK-MS'},
            tuya.whitelabel('Moes', 'ZS-EUB_2gang', 'Smart light switch - 2 gang', ['_TZ3000_18ejxno0']),
        ],
        extend: [tuya.modernExtend.tuyaOnOff({backlightModeOffNormalInverted: true, endpoints: ['left', 'right']})],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0012', manufacturerName: '_TZ3000_jl7qyupf'},
            {modelID: 'TS0012', manufacturerName: '_TZ3000_nPGIPl5D'},
            {modelID: 'TS0012', manufacturerName: '_TZ3000_kpatq5pq'},
            {modelID: 'TS0012', manufacturerName: '_TZ3000_ljhbw1c9'},
            {modelID: 'TS0012', manufacturerName: '_TZ3000_4zf0crgo'},
        ],
        model: 'TS0012_switch_module',
        vendor: 'Tuya',
        description: '2 gang switch module - (without neutral)',
        whiteLabel: [
            {vendor: 'AVATTO', model: '2gang N-ZLWSM01'},
            tuya.whitelabel('AVATTO', 'LZWSM16-2', '2 gang switch module - (without neutral)', ['_TZ3000_kpatq5pq', '_TZ3000_ljhbw1c9']),
        ],
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, endpoints: ['left', 'right']})],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0013'],
        model: 'TS0013',
        vendor: 'Tuya',
        description: 'Smart light switch - 3 gang without neutral wire',
        extend: [tuya.modernExtend.tuyaOnOff({backlightModeOffNormalInverted: true, endpoints: ['left', 'center', 'right']})],
        endpoint: (device) => {
            return {left: 1, center: 2, right: 3};
        },
        whiteLabel: [{vendor: 'TUYATEC', model: 'GDKES-03TZXD'}],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            try {
                for (const ID of [1, 2, 3]) {
                    const endpoint = device.getEndpoint(ID);
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                }
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/4872
            }
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0013', manufacturerName: '_TZ3000_ypgri8yz'},
            {modelID: 'TS0013', manufacturerName: '_TZ3000_sznawwyw'},
        ],
        model: 'TS0013_switch_module',
        vendor: 'Tuya',
        description: '3 gang switch module - (without neutral)',
        whiteLabel: [
            {vendor: 'AVATTO', model: '3gang N-ZLWSM01'},
            tuya.whitelabel('AVATTO', 'LZWSM16-3', '3 gang switch module - (without neutral)', ['_TZ3000_sznawwyw']),
            tuya.whitelabel('Girier', 'ZB08', '3 Channel Switch Module-L - (No Neutral Wire)', ['_TZ3000_ypgri8yz']),
        ],
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, endpoints: ['left', 'center', 'right']})],
        endpoint: (device) => {
            return {left: 1, center: 2, right: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            try {
                for (const ID of [1, 2, 3]) {
                    const endpoint = device.getEndpoint(ID);
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                }
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/4872
            }
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0014'],
        model: 'TS0014',
        vendor: 'Tuya',
        description: 'Smart light switch - 4 gang without neutral wire',
        extend: [tuya.modernExtend.tuyaOnOff({backlightModeLowMediumHigh: true, endpoints: ['l1', 'l2', 'l3', 'l4']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        whiteLabel: [
            {vendor: 'TUYATEC', model: 'GDKES-04TZXD'},
            {vendor: 'Vizo', model: 'VZ-222S'},
            {vendor: 'MakeGood', model: 'MG-ZG04W/B/G'},
            {vendor: 'Mercator Ikuü', model: 'SSW04'},
        ],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            try {
                for (const ID of [1, 2, 3, 4]) {
                    const endpoint = device.getEndpoint(ID);
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                }
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/4872
            }
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['gq8b1uv'],
        model: 'gq8b1uv',
        vendor: 'Tuya',
        description: 'Zigbee smart dimmer',
        fromZigbee: [legacy.fromZigbee.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.tuya_dimmer_state, legacy.toZigbee.tuya_dimmer_level],
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: ['HY0017', '005f0c3b'],
        model: 'U86KCJ-ZP',
        vendor: 'Tuya',
        description: 'Smart 6 key scene wall switch',
        fromZigbee: [fzLocal.scenes_recall_scene_65029],
        exposes: [e.action(['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5', 'scene_6'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0026'],
        model: 'TS0026',
        vendor: 'Tuya',
        description: '6 button scene wall switch',
        fromZigbee: [fzLocal.scenes_recall_scene_65029, fzLocal.scene_recall],
        exposes: [e.action(['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5', 'scene_6'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['q9mpfhw'],
        model: 'SNTZ009',
        vendor: 'Tuya',
        description: 'Water leak sensor',
        fromZigbee: [legacy.fromZigbee.tuya_water_leak, fz.ignore_basic_report],
        exposes: [e.water_leak()],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0004'],
        model: 'TS0004',
        vendor: 'Tuya',
        description: 'Smart light switch - 4 gang with neutral wire',
        extend: [tuya.modernExtend.tuyaOnOff({powerOnBehavior2: true, backlightModeOffOn: true, endpoints: ['l1', 'l2', 'l3', 'l4']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        whiteLabel: [
            tuya.whitelabel('Tuya', 'DS-111', 'Smart light switch - 4 gang with neutral wire', ['_TZ3000_mdj7kra9']),
            tuya.whitelabel('MHCOZY', 'TYWB 4ch-RF', '4 channel relay', ['_TZ3000_u3oupgdy', '_TZ3000_imaccztn']),
            tuya.whitelabel('Avatto', 'TS0004_1', 'Smart light switch - 4 gang with neutral wire', ['_TZ3000_nivavasg', '_TZ3000_gexniqbq']),
        ],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0726'],
        model: 'TS0726',
        vendor: 'Tuya',
        description: '4 gang switch with neutral wire',
        fromZigbee: [fz.on_off, tuya.fz.power_on_behavior_2, fz.ignore_basic_report, fzLocal.TS0726_action],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_2, tzLocal.TS0726_switch_mode],
        exposes: [
            ...[1, 2, 3, 4].map((ep) => e.switch().withEndpoint(`l${ep}`)),
            ...[1, 2, 3, 4].map((ep) => e.power_on_behavior().withEndpoint(`l${ep}`)),
            ...[1, 2, 3, 4].map((ep) => e.enum('switch_mode', ea.STATE_SET, ['switch', 'scene']).withEndpoint(`l${ep}`)),
            e.action(['scene_1', 'scene_2', 'scene_3', 'scene_4']),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            for (const ep of [1, 2, 3, 4]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genOnOff']);
            }
        },
    },
    {
        zigbeeModel: ['TS0006'],
        model: 'TS0006',
        vendor: 'Tuya',
        description: '6 gang switch module with neutral wire',
        extend: [tuya.modernExtend.tuyaOnOff()],
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.switch().withEndpoint('l5'),
            e.switch().withEndpoint('l6'),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5, l6: 6};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [tuya.whitelabel('AVATTO', 'TS0006_1', '4 gang switch module with neutral wire and socket', ['_TZ3000_cvis4qmw'])],
    },
    {
        zigbeeModel: ['HY0080'],
        model: 'U86KWF-ZPSJ',
        vendor: 'Tuya',
        description: 'Environment controller',
        fromZigbee: [legacy.fromZigbee.thermostat_att_report, fz.fan],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower,
            tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_relay_status_log,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration,
            tz.fan_mode,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat'], ea.ALL)
                .withRunningState(['idle', 'heat', 'cool'], ea.STATE)
                .withLocalTemperatureCalibration(-30, 30, 0.1, ea.ALL)
                .withPiHeatingDemand(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
            await reporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ['6dfgetq'],
        model: 'D3-DPWK-TY',
        vendor: 'Tuya',
        description: 'HVAC controller',
        exposes: [
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)
                .withRunningState(['idle', 'heat', 'cool'], ea.STATE),
        ],
        fromZigbee: [legacy.fromZigbee.tuya_thermostat, fz.ignore_basic_report, legacy.fromZigbee.tuya_dimmer],
        meta: {tuyaThermostatSystemMode: legacy.thermostatSystemModes2, tuyaThermostatPreset: legacy.thermostatPresets},
        toZigbee: [
            legacy.toZigbee.tuya_thermostat_current_heating_setpoint,
            legacy.toZigbee.tuya_thermostat_system_mode,
            legacy.toZigbee.tuya_thermostat_fan_mode,
            legacy.toZigbee.tuya_dimmer_state,
        ],
    },
    {
        zigbeeModel: ['E220-KR4N0Z0-HA', 'JZ-ZB-004'],
        model: 'E220-KR4N0Z0-HA',
        vendor: 'Tuya',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (16A)',
        extend: [tuya.modernExtend.tuyaOnOff()],
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'), e.switch().withEndpoint('l4')],
        whiteLabel: [{vendor: 'LEELKI', model: 'WP33-EU'}],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0216'],
        model: 'TS0216',
        vendor: 'Tuya',
        description: 'Sound and flash siren',
        fromZigbee: [fz.ts0216_siren, fz.battery],
        exposes: [
            e.battery(),
            e.binary('alarm', ea.STATE_SET, true, false),
            e.numeric('volume', ea.ALL).withValueMin(0).withValueMax(100).withDescription('Volume of siren'),
        ],
        toZigbee: [tz.ts0216_alarm, tz.ts0216_duration, tz.ts0216_volume],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_znzs7yaw'}],
        model: 'HY08WE',
        vendor: 'Tuya',
        description: 'Wall-mount thermostat',
        fromZigbee: [legacy.fromZigbee.hy_thermostat, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.hy_thermostat],
        onEvent: tuya.onEventSetTime,
        exposes: [
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_g9a3awaj'}],
        model: 'ZWT07',
        vendor: 'Tuya',
        description: 'Wall-mount thermostat',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEvent({timeStart: '1970'}),
        configure: tuya.configureMagicPacket,
        exposes: [
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 60, 0.5, ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withPreset(['manual', 'program'])
                .withLocalTemperature(),
            e.binary('frost', ea.STATE_SET, 'ON', 'OFF').withDescription('Antifreeze function'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'system_mode', tuya.valueConverterBasic.lookup({heat: true, off: false})],
                [2, 'preset', tuya.valueConverterBasic.lookup({manual: tuya.enum(1), program: tuya.enum(0)})],
                [36, 'running_state', tuya.valueConverterBasic.lookup({heat: 1, idle: 0})],
                [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [24, 'local_temperature', tuya.valueConverter.divideBy10],
                [10, 'frost', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_2ekuz3dz'}],
        model: 'X5H-GB-B',
        vendor: 'Tuya',
        description: 'Wall-mount thermostat',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_set_time, legacy.fromZigbee.x5h_thermostat],
        toZigbee: [legacy.toZigbee.x5h_thermostat],
        whiteLabel: [
            {vendor: 'Beok', model: 'TGR85-ZB'},
            {vendor: 'AVATTO', model: 'ZWT-100-16A'},
        ],
        exposes: [
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 60, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9.9, 9.9, 0.1, ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withPreset(['manual', 'program']),
            e.temperature_sensor_select(['internal', 'external', 'both']),
            e
                .text('schedule', ea.STATE_SET)
                .withDescription(
                    'There are 8 periods in the schedule in total. ' +
                        '6 for workdays and 2 for holidays. It should be set in the following format for each of the periods: ' +
                        '`hours:minutes/temperature`. All periods should be set at once and delimited by the space symbol. ' +
                        'For example: `06:00/20.5 08:00/15 11:30/15 13:30/15 17:00/22 22:00/15 06:00/20 22:00/15`. ' +
                        "The thermostat doesn't report the schedule by itself even if you change it manually from device",
                ),
            e.child_lock(),
            e.week(),
            e.enum('brightness_state', ea.STATE_SET, ['off', 'low', 'medium', 'high']).withDescription('Screen brightness'),
            e.binary('sound', ea.STATE_SET, 'ON', 'OFF').withDescription('Switches beep sound when interacting with thermostat'),
            e.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF').withDescription('Antifreeze function'),
            e.binary('factory_reset', ea.STATE_SET, 'ON', 'OFF').withDescription("Resets all settings to default. Doesn't unpair device."),
            e
                .numeric('heating_temp_limit', ea.STATE_SET)
                .withUnit('°C')
                .withValueMax(60)
                .withValueMin(5)
                .withValueStep(1)
                .withPreset('default', 35, 'Default value')
                .withDescription('Heating temperature limit'),
            e
                .numeric('deadzone_temperature', ea.STATE_SET)
                .withUnit('°C')
                .withValueMax(9.5)
                .withValueMin(0.5)
                .withValueStep(0.5)
                .withPreset('default', 1, 'Default value')
                .withDescription('The delta between local_temperature and current_heating_setpoint to trigger Heat'),
            e
                .numeric('upper_temp', ea.STATE_SET)
                .withUnit('°C')
                .withValueMax(95)
                .withValueMin(35)
                .withValueStep(1)
                .withPreset('default', 60, 'Default value'),
        ],
        onEvent: tuya.onEventSetTime,
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_viy9ihs7', '_TZE204_lzriup1j', '_TZE204_xnbkhhdr']),
        model: 'ZWT198/ZWT100-BH',
        vendor: 'Tuya',
        description: 'Avatto wall thermostat',
        onEvent: tuya.onEvent({timeStart: '1970'}),
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('factory_reset', ea.STATE_SET, 'ON', 'OFF').withDescription('Full factory reset, use with caution!'),
            e.child_lock(),
            e.temperature_sensor_select(['internal', 'external', 'both']),
            e
                .climate()
                .withSystemMode(['off', 'heat'], ea.STATE_SET)
                .withPreset(['manual', 'auto', 'temporary_manual'])
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9.9, 9.9, 0.1, ea.STATE_SET),
            e.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF').withDescription('Antifreeze function'),
            e
                .max_temperature_limit()
                .withUnit('°C')
                .withValueMin(15)
                .withValueMax(90)
                .withValueStep(0.5)
                .withPreset('default', 60, 'Default value')
                .withDescription('Maximum upper temperature'),
            e
                .numeric('deadzone_temperature', ea.STATE_SET)
                .withUnit('°C')
                .withValueMax(10)
                .withValueMin(0.5)
                .withValueStep(0.5)
                .withPreset('default', 1, 'Default value')
                .withDescription('The delta between local_temperature (5<t<35)and current_heating_setpoint to trigger Heat'),
            e.enum('backlight_mode', ea.STATE_SET, ['off', 'low', 'medium', 'high']).withDescription('Intensity of the backlight'),
            e.enum('working_day', ea.STATE_SET, ['disabled', '6-1', '5-2', '7']).withDescription('Workday setting'),
            e.text('schedule_weekday', ea.STATE_SET).withDescription('Workdays (6 times `hh:mm/cc.c°C`)'),
            e.text('schedule_holiday', ea.STATE_SET).withDescription('Holidays (2 times `hh:mm/cc.c°C)`'),
            // ============== exposes for found, but not functional datapoints:
            /*
            e.min_temperature_limit() // dp 16
                .withValueMin(5)
                .withValueMax(15)
                .withValueStep(0.5)
                .withPreset('default', 10, 'Default value')
                .withDescription('dp16 is listed in Tuya, but no communication from device'),

            e.binary('dp105', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('dp105 is not listed in Tuya, but device sends datapoint, binary: true/false'),

            e.binary('dp111', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('dp111 is not listed in Tuya, but device sends datapoint, binary: true/false'),
            */
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'system_mode', tuya.valueConverterBasic.lookup({heat: true, off: false})],
                [2, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [3, 'local_temperature', tuya.valueConverter.divideBy10],
                [
                    4,
                    'preset',
                    tuya.valueConverterBasic.lookup((_, device) => {
                        // https://github.com/Koenkk/zigbee2mqtt/issues/21353#issuecomment-1938328429
                        if (device.manufacturerName === '_TZE200_viy9ihs7') {
                            return {auto: tuya.enum(1), manual: tuya.enum(0), temporary_manual: tuya.enum(2)};
                        } else {
                            return {auto: tuya.enum(0), manual: tuya.enum(1), temporary_manual: tuya.enum(2)};
                        }
                    }),
                ],
                [9, 'child_lock', tuya.valueConverter.lockUnlock],
                [11, 'faultalarm', tuya.valueConverter.raw],
                [15, 'max_temperature_limit', tuya.valueConverter.divideBy10],
                [19, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration3],
                [101, 'running_state', tuya.valueConverterBasic.lookup({heat: tuya.enum(1), idle: tuya.enum(0)})],
                [102, 'frost_protection', tuya.valueConverter.onOff],
                [103, 'factory_reset', tuya.valueConverter.onOff],
                [104, 'working_day', tuya.valueConverter.workingDay],
                [106, 'sensor', tuya.valueConverterBasic.lookup({internal: tuya.enum(0), external: tuya.enum(1), both: tuya.enum(2)})],
                [107, 'deadzone_temperature', tuya.valueConverter.divideBy10],
                [109, null, tuya.valueConverter.ZWT198_schedule],
                [109, 'schedule_weekday', tuya.valueConverter.ZWT198_schedule],
                [109, 'schedule_holiday', tuya.valueConverter.ZWT198_schedule],
                [110, 'backlight_mode', tuya.valueConverter.backlightModeOffLowMediumHigh],
                // ============== found but not functional datapoints:

                // [16, 'min_temperature_limit', tuya.valueConverter.divideBy10],  // datapoint listed in Tuya, but no communication from device
                // [105, 'dp105', tuya.valueConverter.onOff],                      // not listed in Tuya, but device sends datapoint
                // [111, 'dp111', tuya.valueConverter.onOff],                      // not listed in Tuya, but device sends datapoint

                // These are the schedule values in bytes, 8 periods in total (4 bytes per period).
                // For each period:
                // 1st byte: hour
                // 2nd byte: minute
                // 3rd, 4th bytes: temperature multiplied by 10
                // On the device last 2 periods are ignored if schedule_mode is 7day. When schedule_mode is disabled,
                // scheduling can't be configured at all on the device.
                // For example, if schedule_mode is weekday/sat+sun and this byte array is received:
                // [6,10,1,144,8,10,0,170,11,40,0,170,12,40,0,170,17,10,0,230,22,10,0,170,8,5,0,200,23,0,0,160]
                // Then the schedule is:
                // Mon-Fri: 6:10 --> 40C, 8:10 --> 17C, 11:40 --> 17C, 12:40 --> 17C, 17:10 --> 23C, 22:10 --> 17C
                // Sat-Sun: 8:05 --> 20C, 23:00 --> 16C
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0222', ['_TZ3000_kky16aay', '_TZE204_myd45weu']),
        model: 'TS0222_temperature_humidity',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fzLocal.TS0222_humidity, fz.battery, fz.temperature, fz.illuminance],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        exposes: [e.battery(), e.temperature(), e.humidity(), e.illuminance()],
        whiteLabel: [tuya.whitelabel('Tuya', 'QT-07S', 'Soil sensor', ['_TZE204_myd45weu'])],
    },
    {
        fingerprint: tuya.fingerprint('TS0222', ['_TZ3000_t9qqxn70']),
        model: 'THE01860A',
        vendor: 'Tuya',
        description: 'Temp & humidity flower sensor with illuminance',
        fromZigbee: [fz.humidity, fz.battery, fz.temperature, fz.illuminance],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        exposes: [e.battery(), e.temperature(), e.humidity(), e.illuminance_lux()],
    },
    {
        fingerprint: [
            {modelID: 'TS0222', manufacturerName: '_TYZB01_4mdqxxnn'},
            {modelID: 'TS0222', manufacturerName: '_TYZB01_m6ec2pgj'},
        ],
        model: 'TS0222',
        vendor: 'Tuya',
        description: 'Light intensity sensor',
        fromZigbee: [fz.battery, fz.illuminance, legacy.fromZigbee.TS0222],
        toZigbee: [],
        exposes: [e.battery(), e.illuminance(), e.illuminance_lux()],
        configure: tuya.configureMagicPacket,
    },
    {
        zigbeeModel: ['TS0210'],
        model: 'TS0210',
        vendor: 'Tuya',
        description: 'Vibration sensor',
        whiteLabel: [tuya.whitelabel('Niceboy', 'ORBIS Vibration Sensor', 'Vibration sensor', ['_TYZB01_821siati'])],
        fromZigbee: [fz.battery, fz.ias_vibration_alarm_1_with_timeout],
        toZigbee: [tz.TS0210_sensitivity],
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.vibration(),
            e
                .numeric('sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(50)
                .withDescription(
                    'Sensitivty of the sensor (0 = highest sensitivity, 50 = lowest sensitivity). ' +
                        'Press button on the device right before changing this',
                ),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_8ply8mjj']),
        model: 'COZIGVS',
        vendor: 'Conecto',
        description: 'Vibration sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.vibration(),
            e
                .numeric('sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(2)
                .withDescription(
                    'Sensitivity of the sensor (single press the button when muted to switch between' +
                        ' low (one beep), medium (two beeps) and max (three beeps))',
                ),
            e.text('buzzer_mute', ea.STATE).withDescription('ON when buzzer is muted (double press the button on device to toggle)'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'vibration', tuya.valueConverter.trueFalse1],
                [101, 'sensitivity', tuya.valueConverter.raw],
                [103, 'buzzer_mute', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS011F', manufacturerName: '_TZ3000_8bxrzyxz'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_ky0fq4ho'},
        ],
        model: 'TS011F_din_smart_relay',
        description: 'Din smart relay (with power monitoring)',
        vendor: 'Tuya',
        fromZigbee: [
            fz.on_off,
            fz.electrical_measurement,
            fz.metering,
            fz.ignore_basic_report,
            tuya.fz.power_outage_memory,
            fz.tuya_relay_din_led_indicator,
        ],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tz.tuya_relay_din_led_indicator],
        whiteLabel: [{vendor: 'MatSee Plus', model: 'ATMS1602Z'}],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        exposes: [
            e.switch(),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore']).withDescription('Recover state after power outage'),
            e.enum('indicator_mode', ea.STATE_SET, ['off', 'on_off', 'off_on']).withDescription('Relay LED indicator mode'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_qeuvnohg'}],
        model: 'TS011F_din_smart_relay_polling',
        description: 'Din smart relay (with power monitoring via polling)',
        vendor: 'Tuya',
        fromZigbee: [
            fz.on_off,
            fz.electrical_measurement,
            fz.metering,
            fz.ignore_basic_report,
            tuya.fz.power_outage_memory,
            fz.tuya_relay_din_led_indicator,
        ],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tz.tuya_relay_din_led_indicator],
        whiteLabel: [tuya.whitelabel('Tongou', 'TO-Q-SY1-JZT', 'Din smart relay (with power monitoring via polling)', ['_TZ3000_qeuvnohg'])],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        exposes: [
            e.switch(),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore']).withDescription('Recover state after power outage'),
            e.enum('indicator_mode', ea.STATE_SET, ['off', 'on_off', 'off_on']).withDescription('Relay LED indicator mode'),
        ],
        options: [exposes.options.measurement_poll_interval()],
        onEvent: (type, data, device, options) => tuya.onEventMeasurementPoll(type, data, device, options, true, false),
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_7issjl2q'}],
        model: 'ATMS1601Z',
        description: 'Din smart relay (without power monitoring)',
        vendor: 'Tuya',
        fromZigbee: [fz.on_off, fz.ignore_basic_report, tuya.fz.power_outage_memory, fz.tuya_relay_din_led_indicator],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tz.tuya_relay_din_led_indicator],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            device.save();
        },
        exposes: [
            e.switch(),
            e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore']).withDescription('Recover state after power outage'),
            e.enum('indicator_mode', ea.STATE_SET, ['off', 'on_off', 'off_on']).withDescription('Relay LED indicator mode'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_nklqjk62', '_TZE200_nklqjk62']),
        model: 'PJ-ZGD01',
        vendor: 'Tuya',
        description: 'Garage door opener',
        fromZigbee: [legacy.fromZigbee.matsee_garage_door_opener, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.matsee_garage_door_opener, legacy.toZigbee.tuya_data_point_test],
        whiteLabel: [{vendor: 'MatSee Plus', model: 'PJ-ZGD01'}],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.binary('trigger', ea.STATE_SET, true, false).withDescription('Trigger the door movement'),
            e.binary('garage_door_contact', ea.STATE, true, false),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_wfxuhoea'}],
        model: 'GDC311ZBQ1',
        vendor: 'Tuya',
        description: 'LoraTap garage door opener with wireless sensor',
        fromZigbee: [legacy.fromZigbee.matsee_garage_door_opener, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.matsee_garage_door_opener, legacy.toZigbee.tuya_data_point_test],
        whiteLabel: [{vendor: 'LoraTap', model: 'GDC311ZBQ1'}],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.binary('trigger', ea.STATE_SET, true, false).withDescription('Trigger the door movement'),
            e
                .binary('garage_door_contact', ea.STATE, false, true)
                .withDescription('Indicates if the garage door contact is closed (= true) or open (= false)'),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0603', manufacturerName: '_TZE608_c75zqghm'},
            {modelID: 'TS0603', manufacturerName: '_TZE608_fmemczv1'},
        ],
        model: 'TS0603',
        vendor: 'Tuya',
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.raw],
                [3, 'garage_door_contact', tuya.valueConverter.trueFalseInvert],
                [12, null, null],
            ],
        },
        description: 'Garage door opener',
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.binary('state', ea.STATE_SET, true, false).withDescription('Trigger the door movement'),
            e
                .binary('garage_door_contact', ea.STATE, true, false)
                .withDescription('Indicates if the garage door contact is closed (= true) or open (= false)'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_qaaysllp'}],
        model: 'LCZ030',
        vendor: 'Tuya',
        description: 'Temperature & humidity & illuminance sensor with display',
        fromZigbee: [fz.battery, fz.illuminance, fz.temperature, fz.humidity, fz.ts0201_temperature_humidity_alarm],
        toZigbee: [tz.ts0201_temperature_humidity_alarm],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            // Enables reporting of measurement state changes
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genBasic',
                'genPowerCfg',
                'msTemperatureMeasurement',
                'msIlluminanceMeasurement',
                'msRelativeHumidity',
                'manuSpecificTuya_2',
            ]);
        },
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            e.illuminance(),
            e.illuminance_lux(),
            e
                .numeric('alarm_temperature_max', ea.STATE_SET)
                .withUnit('°C')
                .withDescription('Alarm temperature max')
                .withValueMin(-20)
                .withValueMax(80),
            e
                .numeric('alarm_temperature_min', ea.STATE_SET)
                .withUnit('°C')
                .withDescription('Alarm temperature min')
                .withValueMin(-20)
                .withValueMax(80),
            e.numeric('alarm_humidity_max', ea.STATE_SET).withUnit('%').withDescription('Alarm humidity max').withValueMin(0).withValueMax(100),
            e.numeric('alarm_humidity_min', ea.STATE_SET).withUnit('%').withDescription('Alarm humidity min').withValueMin(0).withValueMax(100),
            e.enum('alarm_humidity', ea.STATE, ['below_min_humdity', 'over_humidity', 'off']).withDescription('Alarm humidity status'),
            e.enum('alarm_temperature', ea.STATE, ['below_min_temperature', 'over_temperature', 'off']).withDescription('Alarm temperature status'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_auin8mzr'}],
        model: 'TS0601_motion_sensor',
        vendor: 'Tuya',
        description: 'Human presence sensor AIR',
        fromZigbee: [legacy.fromZigbee.tuya_motion_sensor],
        toZigbee: [legacy.toZigbee.tuya_motion_sensor],
        exposes: [
            e.occupancy(),
            e.enum('o_sensitivity', ea.STATE_SET, Object.values(legacy.msLookups.OSensitivity)).withDescription('O-Sensitivity mode'),
            e.enum('v_sensitivity', ea.STATE_SET, Object.values(legacy.msLookups.VSensitivity)).withDescription('V-Sensitivity mode'),
            e.enum('led_status', ea.STATE_SET, ['ON', 'OFF']).withDescription('Led status switch'),
            e.numeric('vacancy_delay', ea.STATE_SET).withUnit('sec').withDescription('Vacancy delay').withValueMin(0).withValueMax(1000),
            e.numeric('light_on_luminance_prefer', ea.STATE_SET).withDescription('Light-On luminance prefer').withValueMin(0).withValueMax(10000),
            e.numeric('light_off_luminance_prefer', ea.STATE_SET).withDescription('Light-Off luminance prefer').withValueMin(0).withValueMax(10000),
            e.enum('mode', ea.STATE_SET, Object.values(legacy.msLookups.Mode)).withDescription('Working mode'),
            e.numeric('luminance_level', ea.STATE).withDescription('Luminance level'),
            e.numeric('reference_luminance', ea.STATE).withDescription('Reference luminance'),
            e.numeric('vacant_confirm_time', ea.STATE).withDescription('Vacant confirm time'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_lu01t0zl', '_TZE200_vrfecyku', '_TZE200_ypprdwsl', '_TZE200_jkbljri7']),
        model: 'MIR-HE200-TY',
        vendor: 'Tuya',
        description: 'Human presence sensor with fall function',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.sendDataPointEnum(endpoint, legacy.dataPoints.trsfTumbleSwitch, 0);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
        },
        exposes: [
            e.illuminance_lux(),
            e.presence(),
            e.occupancy(),
            e.numeric('motion_speed', ea.STATE).withDescription('Speed of movement'),
            e
                .enum('motion_direction', ea.STATE, ['standing_still', 'moving_forward', 'moving_backward'])
                .withDescription('direction of movement from the point of view of the radar'),
            e
                .numeric('radar_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription('Sensitivity of the radar'),
            e
                .enum('radar_scene', ea.STATE_SET, ['default', 'area', 'toilet', 'bedroom', 'parlour', 'office', 'hotel'])
                .withDescription('Presets for sensitivity for presence and movement'),
            e.enum('tumble_switch', ea.STATE_SET, ['ON', 'OFF']).withDescription('Tumble status switch'),
            e
                .numeric('fall_sensitivity', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription('Fall sensitivity of the radar'),
            e
                .numeric('tumble_alarm_time', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(5)
                .withValueStep(1)
                .withUnit('min')
                .withDescription('Tumble alarm time'),
            e.enum('fall_down_status', ea.STATE, ['none', 'maybe_fall', 'fall']).withDescription('Fall down status'),
            e.text('static_dwell_alarm', ea.STATE).withDescription('Static dwell alarm'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [2, 'radar_sensitivity', tuya.valueConverter.raw],
                [102, 'occupancy', tuya.valueConverter.trueFalse1],
                [103, 'illuminance_lux', tuya.valueConverter.raw],
                [105, 'tumble_switch', tuya.valueConverter.plus1],
                [106, 'tumble_alarm_time', tuya.valueConverter.raw],
                [112, 'radar_scene', tuya.valueConverterBasic.lookup({default: 0, area: 1, toilet: 2, bedroom: 3, parlour: 4, office: 5, hotel: 6})],
                [114, 'motion_direction', tuya.valueConverterBasic.lookup({standing_still: 0, moving_forward: 1, moving_backward: 2})],
                [115, 'motion_speed', tuya.valueConverter.raw],
                [116, 'fall_down_status', tuya.valueConverterBasic.lookup({none: 0, maybe_fall: 1, fall: 2})],
                [117, 'static_dwell_alarm', tuya.valueConverter.raw],
                [118, 'fall_sensitivity', tuya.valueConverter.raw],
                // Below are ignored
                [101, null, null], // reset_flag_code
                [104, null, null], // detection_flag_code
                [107, null, null], // radar_check_end_code
                [108, null, null], // radar_check_start_code
                [109, null, null], // hw_version_code
                [110, null, null], // sw_version_code
                [111, null, null], // radar_id_code
            ],
        },
    },
    {
        zigbeeModel: ['TS0046'],
        model: 'TS0046',
        vendor: 'Tuya',
        description: 'Wireless switch with 6 buttons',
        whiteLabel: [{vendor: 'LoraTap', model: 'SS9600ZB'}],
        fromZigbee: [tuya.fz.on_off_action, fz.battery],
        exposes: [
            e.battery(),
            e.action([
                '1_single',
                '1_double',
                '1_hold',
                '2_single',
                '2_double',
                '2_hold',
                '3_single',
                '3_double',
                '3_hold',
                '4_single',
                '4_double',
                '4_hold',
                '5_single',
                '5_double',
                '5_hold',
                '6_single',
                '6_double',
                '6_hold',
            ]),
        ],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: tuya.fingerprint('TS004F', ['_TZ3000_g9g2xnch', '_TZ3000_pcqjmcud']),
        model: 'YSR-MINI-Z',
        vendor: 'Tuya',
        description: '2 in 1 dimming remote control and scene control',
        exposes: [
            e.battery(),
            e.action([
                'on',
                'off',
                'brightness_move_up',
                'brightness_step_up',
                'brightness_step_down',
                'brightness_move_down',
                'brightness_stop',
                'color_temperature_step_down',
                'color_temperature_step_up',
                '1_single',
                '1_double',
                '1_hold',
                '2_single',
                '2_double',
                '2_hold',
                '3_single',
                '3_double',
                '3_hold',
                '4_single',
                '4_double',
                '4_hold',
            ]),
            e
                .enum('operation_mode', ea.ALL, ['command', 'event'])
                .withDescription('Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        fromZigbee: [
            fz.battery,
            fz.command_on,
            fz.command_off,
            fz.command_step,
            fz.command_move,
            fz.command_stop,
            fz.command_step_color_temperature,
            tuya.fz.on_off_action,
            fz.tuya_operation_mode,
        ],
        toZigbee: [tz.tuya_operation_mode],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {tuyaOperationMode: 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xe001, [0xd011]);
            } catch (err) {
                /* do nothing */
            }
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_hkdl5fmv'}],
        model: 'TS0601_rcbo',
        vendor: 'Tuya',
        whiteLabel: [
            {vendor: 'HOCH', model: 'ZJSBL7-100Z'},
            {vendor: 'WDYK', model: 'ZJSBL7-100Z'},
        ],
        description: 'DIN mount RCBO with smart energy metering',
        fromZigbee: [legacy.fromZigbee.hoch_din],
        toZigbee: [legacy.toZigbee.hoch_din],
        exposes: [
            e.text('meter_number', ea.STATE).withDescription('Meter number'),
            e.binary('state', ea.STATE_SET, 'ON', 'OFF').withDescription('State'),
            e.text('alarm', ea.STATE).withDescription('Alarm text'),
            e.binary('trip', ea.STATE_SET, 'trip', 'clear').withDescription('Trip'),
            e.binary('child_lock', ea.STATE_SET, 'ON', 'OFF').withDescription('Child lock'),
            e.enum('power_on_behavior', ea.STATE_SET, ['off', 'on', 'previous']).withDescription('Power on behavior'),
            e.numeric('countdown_timer', ea.STATE_SET).withValueMin(0).withValueMax(86400).withUnit('s').withDescription('Countdown timer'),
            e.numeric('voltage_rms', ea.STATE).withUnit('V').withDescription('Voltage RMS'),
            e.numeric('current', ea.STATE).withUnit('A').withDescription('Current'),
            e.numeric('current_average', ea.STATE).withUnit('A').withDescription('Current average'),
            e.power(),
            e.voltage(),
            e.energy(),
            e.temperature(),
            e.numeric('power_l1', ea.STATE).withUnit('W').withDescription('Instantaneous measured power on phase 1'),
            e.numeric('power_l2', ea.STATE).withUnit('W').withDescription('Instantaneous measured power on phase 2'),
            e.numeric('power_l3', ea.STATE).withUnit('W').withDescription('Instantaneous measured power on phase 3'),
            e.numeric('energy_consumed', ea.STATE).withUnit('kWh').withDescription('Consumed energy'),
            e.enum('clear_device_data', ea.SET, ['']).withDescription('Clear device data'),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS004F', manufacturerName: '_TZ3000_4fjiwweb'},
            {modelID: 'TS004F', manufacturerName: '_TZ3000_uri7ongn'},
            {modelID: 'TS004F', manufacturerName: '_TZ3000_ixla93vd'},
            {modelID: 'TS004F', manufacturerName: '_TZ3000_qja6nq5z'},
            {modelID: 'TS004F', manufacturerName: '_TZ3000_abrsvsou'},
        ],
        model: 'ERS-10TZBVK-AA',
        vendor: 'Tuya',
        description: 'Smart knob',
        fromZigbee: [
            fz.command_step,
            fz.command_toggle,
            fz.command_move_hue,
            fz.command_step_color_temperature,
            fz.command_stop_move_raw,
            fz.tuya_multi_action,
            fz.tuya_operation_mode,
            fz.battery,
        ],
        toZigbee: [tz.tuya_operation_mode],
        exposes: [
            e.action([
                'toggle',
                'brightness_step_up',
                'brightness_step_down',
                'color_temperature_step_up',
                'color_temperature_step_down',
                'saturation_move',
                'hue_move',
                'hue_stop',
                'single',
                'double',
                'hold',
                'rotate_left',
                'rotate_right',
            ]),
            e.numeric('action_step_size', ea.STATE).withValueMin(0).withValueMax(255),
            e.numeric('action_transition_time', ea.STATE).withUnit('s'),
            e.numeric('action_rate', ea.STATE).withValueMin(0).withValueMax(255),
            e.battery(),
            e
                .enum('operation_mode', ea.ALL, ['command', 'event'])
                .withDescription('Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {tuyaOperationMode: 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xe001, [0xd011]);
            } catch (err) {
                /* do nothing */
            }
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_kzm5w4iz'}],
        model: 'TS0601_vibration_sensor',
        vendor: 'Tuya',
        description: 'Smart vibration sensor',
        fromZigbee: [legacy.fromZigbee.tuya_smart_vibration_sensor],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.vibration()],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_yi4jtqq1'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_khx7nnka'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_khx7nnka'},
        ],
        model: 'XFY-CGQ-ZIGB',
        vendor: 'Tuya',
        description: 'Illuminance sensor',
        fromZigbee: [legacy.fromZigbee.tuya_illuminance_sensor],
        toZigbee: [],
        exposes: [e.illuminance_lux(), e.brightness_state()],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_kltffuzl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fwoorn8y'},
        ],
        model: 'TM001-ZA/TM081',
        vendor: 'Tuya',
        description: 'Door and window sensor',
        fromZigbee: [legacy.fromZigbee.tm081],
        toZigbee: [],
        exposes: [e.contact(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_2m38mh6k'}],
        model: 'SS9600ZB',
        vendor: 'Tuya',
        description: '6 gang remote',
        exposes: [
            e.battery(),
            e.action([
                '1_single',
                '1_double',
                '1_hold',
                '2_single',
                '2_double',
                '2_hold',
                '3_single',
                '3_double',
                '3_hold',
                '4_single',
                '4_double',
                '4_hold',
                '5_single',
                '5_double',
                '5_hold',
                '6_single',
                '6_double',
                '6_hold',
            ]),
        ],
        fromZigbee: [legacy.fromZigbee.tuya_remote],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0052'],
        model: 'TS0052',
        vendor: 'Tuya',
        description: 'Zigbee dimmer module 1 channel',
        extend: [tuyaLight({powerOnBehavior: true, configureReporting: true, switchType: true, minBrightness: 'attribute'})],
        whiteLabel: [tuya.whitelabel('Tuya', 'FS-05R', 'Mini dimmable switch 1 channel', ['_TZ3000_mgusv51k'])],
    },
    {
        fingerprint: tuya.fingerprint('TS0052', ['_TZ3000_zjtxnoft', '_TZ3000_kvwrdf47']),
        model: 'TS0052_2',
        vendor: 'Tuya',
        description: 'Zigbee dimmer module 2 channel',
        extend: [
            deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            tuyaLight({powerOnBehavior: true, configureReporting: true, switchType: true, minBrightness: 'attribute', endpointNames: ['l1', 'l2']}),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_ikvncluo'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_lyetpprm'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_jva8ink8'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_xpq2rzhq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_holel4dk'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xpq2rzhq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wukb7rhc'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_xsm7l9xa'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_ztc6ggyl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ztc6ggyl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_sgpeacqp'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_fwondbzy'},
        ],
        model: 'TS0601_smart_human_presence_sensor_1',
        vendor: 'Tuya',
        description: 'Smart Human presence sensor',
        fromZigbee: [legacy.fz.tuya_smart_human_presense_sensor],
        toZigbee: [legacy.tz.tuya_smart_human_presense_sensor],
        whiteLabel: [
            tuya.whitelabel('Tuya', 'ZY-M100-L', 'Ceiling human breathe sensor', ['_TZE204_ztc6ggyl']),
            tuya.whitelabel('Moes', 'ZSS-QY-HP', 'Human presence sensor', ['_TZE204_fwondbzy']),
        ],
        exposes: [
            e.illuminance_lux(),
            e.presence(),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1).withDescription('sensitivity of the radar'),
            e
                .numeric('minimum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9.5)
                .withValueStep(0.15)
                .withDescription('Minimum range')
                .withUnit('m'),
            e
                .numeric('maximum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9.5)
                .withValueStep(0.15)
                .withDescription('Maximum range')
                .withUnit('m'),
            e
                .numeric('detection_delay', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withDescription('Detection delay')
                .withUnit('s'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0).withValueMax(1500).withValueStep(1).withDescription('Fading time').withUnit('s'),
            // e.text('cli', ea.STATE).withDescription('not recognize'),
            e
                .enum('self_test', ea.STATE, Object.values(legacy.tuyaHPSCheckingResult))
                .withDescription('Self_test, possible results: checking, check_success, check_failure, others, comm_fault, radar_fault.'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_sxm7l9xa', '_TZE204_e5m9c5hl']),
        model: 'ZY-M100-S_1',
        vendor: 'Tuya',
        description: 'Mini human breathe sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        whiteLabel: [tuya.whitelabel('Wenzhi', 'WZ-M100-W', 'Human presence sensor', ['_TZE204_e5m9c5hl'])],
        exposes: [
            e.illuminance_lux(),
            e.presence(),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1).withDescription('sensitivity of the radar'),
            e
                .numeric('minimum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9.5)
                .withValueStep(0.15)
                .withDescription('Minimum range')
                .withUnit('m'),
            e
                .numeric('maximum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9.5)
                .withValueStep(0.15)
                .withDescription('Maximum range')
                .withUnit('m'),
            e
                .numeric('detection_delay', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withDescription('Detection delay')
                .withUnit('s'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0.5).withValueMax(1500).withValueStep(1).withDescription('Fading time').withUnit('s'),
        ],
        meta: {
            tuyaDatapoints: [
                [104, 'illuminance_lux', tuya.valueConverter.raw],
                [105, 'presence', tuya.valueConverter.trueFalse1],
                [106, 'radar_sensitivity', tuya.valueConverter.raw],
                [107, 'maximum_range', tuya.valueConverter.divideBy100],
                [108, 'minimum_range', tuya.valueConverter.divideBy100],
                [109, 'target_distance', tuya.valueConverter.divideBy100],
                [110, 'fading_time', tuya.valueConverter.divideBy10],
                [111, 'detection_delay', tuya.valueConverter.divideBy10],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_qasjif9e', '_TZE204_ztqnh5cg']),
        model: 'ZY-M100-S_2',
        vendor: 'Tuya',
        description: 'Mini human breathe sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.illuminance_lux(),
            e.presence(),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1).withDescription('sensitivity of the radar'),
            e
                .numeric('minimum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9.5)
                .withValueStep(0.15)
                .withDescription('Minimum range')
                .withUnit('m'),
            e
                .numeric('maximum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9.5)
                .withValueStep(0.15)
                .withDescription('Maximum range')
                .withUnit('m'),
            e
                .numeric('detection_delay', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withDescription('Detection delay')
                .withUnit('s'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0.5).withValueMax(1500).withValueStep(1).withDescription('Fading time').withUnit('s'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [9, 'target_distance', tuya.valueConverter.divideBy100],
                [104, 'illuminance_lux', tuya.valueConverter.raw],
                [2, 'radar_sensitivity', tuya.valueConverter.raw],
                [4, 'maximum_range', tuya.valueConverter.divideBy100],
                [3, 'minimum_range', tuya.valueConverter.divideBy100],
                [102, 'fading_time', tuya.valueConverter.divideBy10],
                [101, 'detection_delay', tuya.valueConverter.divideBy10],
            ],
        },
        whiteLabel: [tuya.whitelabel('iHseno', 'TY_24G_Sensor_V2', 'Human presence sensor 24G', ['_TZE204_ztqnh5cg'])],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_laokfqwu']),
        model: 'WZ-M100',
        vendor: 'Wenzhi',
        description: 'Human presence sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.illuminance_lux(),
            e.presence(),
            e
                .numeric('target_distance', ea.STATE)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.01)
                .withDescription('Distance to target')
                .withUnit('m'),
            e.numeric('sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(9).withValueStep(1).withDescription('sensitivity of the radar'),
            e
                .numeric('minimum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10.0)
                .withValueStep(0.1)
                .withDescription('minimum detection range')
                .withUnit('m'),
            e
                .numeric('maximum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10.0)
                .withValueStep(0.1)
                .withDescription('maximum detection range')
                .withUnit('m'),
            e
                .numeric('interval_time', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(3600)
                .withValueStep(1)
                .withDescription('interval_time')
                .withUnit('s'),
            e
                .numeric('detection_delay', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10.0)
                .withValueStep(0.1)
                .withDescription('detection delay')
                .withUnit('s'),
            e
                .numeric('fading_time', ea.STATE_SET)
                .withValueMax(1500)
                .withValueMin(5)
                .withValueStep(5)
                .withDescription('presence timeout')
                .withUnit('s'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [2, 'sensitivity', tuya.valueConverter.raw],
                [3, 'minimum_range', tuya.valueConverter.divideBy100],
                [4, 'maximum_range', tuya.valueConverter.divideBy100],
                [9, 'target_distance', tuya.valueConverter.divideBy100],
                [103, 'illuminance_lux', tuya.valueConverter.raw],
                [104, 'interval_time', tuya.valueConverter.raw],
                [105, 'detection_delay', tuya.valueConverter.divideBy10],
                [106, 'fading_time', tuya.valueConverter.divideBy10],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0225', ['_TZE200_hl0ss9oa']),
        model: 'ZG-205ZL',
        vendor: 'Tuya',
        description: '24Ghz/5.8GHz human presence sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.presence(),
            e.enum('motion_state', ea.STATE, ['none', 'large', 'small', 'static']).withDescription('Motion state'),
            e.illuminance_lux(),
            e
                .numeric('fading_time', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(3600)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('Presence keep time'),
            e
                .numeric('large_motion_detection_distance', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Large motion detection distance'),
            e
                .numeric('large_motion_detection_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withUnit('x')
                .withDescription('Large motion detection sensitivity'),
            e
                .numeric('small_motion_detection_distance', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Small motion detection distance'),
            e
                .numeric('small_motion_detection_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withUnit('x')
                .withDescription('Small motion detection sensitivity'),
            e
                .numeric('static_detection_distance', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Static detection distance'),
            e
                .numeric('static_detection_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withUnit('x')
                .withDescription('Static detection sensitivity'),
            e.enum('mode', ea.STATE_SET, ['off', 'arm', 'alarm', 'doorbell']).withDescription('Working mode'),
            e.enum('alarm_volume', ea.STATE_SET, ['mute', 'low', 'medium', 'high']).withDescription('Alarm volume'),
            e.numeric('alarm_time', ea.STATE_SET).withValueMin(1).withValueMax(60).withValueStep(1).withUnit('m').withDescription('Alarm time'),
            e.binary('light_mode', ea.STATE_SET, 'ON', 'OFF').withDescription('LED indicator mode'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [20, 'illuminance_lux', tuya.valueConverter.raw],
                [
                    11,
                    'motion_state',
                    tuya.valueConverterBasic.lookup({
                        none: tuya.enum(0),
                        large: tuya.enum(1),
                        small: tuya.enum(2),
                        static: tuya.enum(3),
                    }),
                ],
                [12, 'fading_time', tuya.valueConverter.raw],
                [13, 'large_motion_detection_distance', tuya.valueConverter.divideBy100],
                [15, 'large_motion_detection_sensitivity', tuya.valueConverter.raw],
                [14, 'small_motion_detection_distance', tuya.valueConverter.divideBy100],
                [16, 'small_motion_detection_sensitivity', tuya.valueConverter.raw],
                [103, 'static_detection_distance', tuya.valueConverter.divideBy100],
                [104, 'static_detection_sensitivity', tuya.valueConverter.raw],
                [105, 'mode', tuya.valueConverterBasic.lookup({arm: tuya.enum(0), off: tuya.enum(1), alarm: tuya.enum(2), doorbell: tuya.enum(3)})],
                [
                    102,
                    'alarm_volume',
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        medium: tuya.enum(1),
                        high: tuya.enum(2),
                        mute: tuya.enum(3),
                    }),
                ],
                [101, 'alarm_time', tuya.valueConverter.raw],
                [24, 'light_mode', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_whkgqxse'}],
        model: 'JM-TRH-ZGB-V1',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor with clock',
        fromZigbee: [legacy.fromZigbee.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [legacy.toZigbee.nous_lcd_temperature_humidity_sensor],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            e
                .numeric('temperature_report_interval', ea.STATE_SET)
                .withUnit('min')
                .withValueMin(5)
                .withValueMax(60)
                .withValueStep(5)
                .withDescription('Temperature Report interval'),
            e.enum('temperature_unit_convert', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Current display unit'),
            e.enum('temperature_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm']).withDescription('Temperature alarm status'),
            e.numeric('max_temperature', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60).withDescription('Alarm temperature max'),
            e.numeric('min_temperature', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60).withDescription('Alarm temperature min'),
            e.enum('humidity_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm']).withDescription('Humidity alarm status'),
            e.numeric('max_humidity', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100).withDescription('Alarm humidity max'),
            e.numeric('min_humidity', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100).withDescription('Alarm humidity min'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_zyrdrmno'}],
        model: 'ZB-Sm',
        vendor: 'Tuya',
        description: 'Tubular motor',
        fromZigbee: [legacy.fromZigbee.zb_sm_cover, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.zb_sm_cover],
        onEvent: tuya.onEventSetTime,
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.enum('goto_positon', ea.SET, ['25', '50', '75', 'FAVORITE']),
            e.enum('motor_state', ea.STATE, ['OPENING', 'CLOSING', 'STOPPED']),
            e.numeric('active_power', ea.STATE).withDescription('Active power').withUnit('mWt'),
            e.numeric('cycle_count', ea.STATE).withDescription('Cycle count'),
            e.numeric('cycle_time', ea.STATE).withDescription('Cycle time').withUnit('ms'),
            e.enum('top_limit', ea.STATE_SET, ['SET', 'CLEAR']).withDescription('Setup or clear top limit'),
            e.enum('bottom_limit', ea.STATE_SET, ['SET', 'CLEAR']).withDescription('Setup or clear bottom limit'),
            e.numeric('favorite_position', ea.STATE_SET).withValueMin(0).withValueMax(100).withDescription('Favorite position of this cover'),
            e.binary(`reverse_direction`, ea.STATE_SET, true, false).withDescription(`Inverts the cover direction`),
            e.text('motor_type', ea.STATE),
            e.enum('report', ea.SET, ['']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS1201', [
            '_TZ3290_7v1k4vufotpowp9z',
            '_TZ3290_rlkmy85q4pzoxobl',
            '_TZ3290_jxvzqatwgsaqzx1u',
            '_TZ3290_lypnqvlem5eq1ree',
        ]),
        model: 'ZS06',
        vendor: 'Tuya',
        description: 'Universal smart IR remote control',
        fromZigbee: [
            fzZosung.zosung_send_ir_code_00,
            fzZosung.zosung_send_ir_code_01,
            fzZosung.zosung_send_ir_code_02,
            fzZosung.zosung_send_ir_code_03,
            fzZosung.zosung_send_ir_code_04,
            fzZosung.zosung_send_ir_code_05,
        ],
        toZigbee: [tzZosung.zosung_ir_code_to_send, tzZosung.zosung_learn_ir_code],
        exposes: [ez.learn_ir_code(), ez.learned_ir_code(), ez.ir_code_to_send()],
        whiteLabel: [
            tuya.whitelabel('Tuya', 'UFO-R4Z', 'Universal smart IR remote control', ['_TZ3290_rlkmy85q4pzoxobl']),
            tuya.whitelabel('QA', 'QAIRZPRO', 'Infrared hub pro', ['_TZ3290_jxvzqatwgsaqzx1u', '_TZ3290_lypnqvlem5eq1ree']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_itnrsufe'}],
        model: 'KCTW1Z',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor with LCD',
        fromZigbee: [fz.temperature, fzLocal.humidity10, fzLocal.temperature_unit, fz.battery, fz.ignore_tuya_set_time],
        toZigbee: [tzLocal.temperature_unit],
        onEvent: tuya.onEventSetLocalTime,
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            e.battery_voltage(),
            e.enum('temperature_unit', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Current display unit'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_0u3bj3rc'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_v6ossqfy'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_mx6u6l4y'},
        ],
        model: 'TS0601_human_presence_sensor',
        vendor: 'Tuya',
        description: 'Human presence sensor Zigbee',
        fromZigbee: [legacy.fromZigbee.hpsz],
        toZigbee: [legacy.toZigbee.hpsz],
        onEvent: tuya.onEventSetLocalTime,
        exposes: [
            e.presence(),
            e.numeric('duration_of_attendance', ea.STATE).withUnit('min').withDescription('Shows the presence duration in minutes'),
            e.numeric('duration_of_absence', ea.STATE).withUnit('min').withDescription('Shows the duration of the absence in minutes'),
            e.binary('led_state', ea.STATE_SET, true, false).withDescription('Turns the onboard LED on or off'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_qoy0ekbd', '_TZE200_znbl8dj5', '_TZE200_a8sdabtg', '_TZE200_dikkika5']),
        model: 'ZG-227ZL',
        vendor: 'Tuya',
        description: 'Temperature & humidity LCD sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.temperature(),
            e.humidity(),
            tuya.exposes.temperatureUnit(),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
            e.battery(),
        ],
        whiteLabel: [
            tuya.whitelabel('Tuya', 'ZG-227Z', 'Temperature and humidity sensor', ['_TZE200_a8sdabtg']),
            tuya.whitelabel('KOJIMA', 'KOJIMA-THS-ZG-LCD', 'Temperature and humidity sensor', ['_TZE200_dikkika5']),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'temperature', tuya.valueConverter.divideBy10],
                [2, 'humidity', tuya.valueConverter.raw],
                [4, 'battery', tuya.valueConverter.raw],
                [9, 'temperature_unit', tuya.valueConverter.temperatureUnit],
                [23, 'temperature_calibration', tuya.valueConverter.divideBy10],
                [24, 'humidity_calibration', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_j7sgd8po']),
        model: 'S8',
        vendor: 'SODA',
        description: 'S8 premium window handle',
        extend: [],
        toZigbee: [tuya.tz.datapoints],
        fromZigbee: [tuya.fz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(),
            e.battery_low(),
            e.binary('vacation', ea.STATE_SET, 'ON', 'OFF').withDescription('Vacation mode'),
            e.enum('alarm', ea.STATE, ['ALARM', 'IDLE']).withDescription('Alarm'),
            e.binary('alarm_switch', ea.STATE_SET, 'ON', 'OFF').withDescription('Alarm enable'),
            e.binary('handlesound', ea.STATE_SET, 'ON', 'OFF').withDescription('Handle closed sound'),
            e.enum('opening_mode', ea.STATE, ['closed', 'tilted']).withDescription('Window tilt'),
            e.temperature(),
            e.humidity(),
            e.binary('keysound', ea.STATE_SET, 'ON', 'OFF').withDescription('Key beep sound'),
            e.enum('sensitivity', ea.STATE_SET, ['off', 'low', 'medium', 'high', 'max']).withDescription('Sensitivity of the alarm sensor'),
            e.enum('position', ea.STATE, ['up', 'right', 'down', 'left']),
            e.enum('button_left', ea.STATE, ['released', 'pressed']),
            e.enum('button_right', ea.STATE, ['released', 'pressed']),
            e
                .numeric('duration', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(300)
                .withValueStep(1)
                .withUnit('sec')
                .withDescription('Duration of the alarm')
                .withPreset('default', 180, 'Default value'),
            e
                .numeric('update_frequency', ea.STATE_SET)
                .withUnit('min')
                .withDescription('Update frequency')
                .withValueMin(0)
                .withValueMax(700)
                .withPreset('default', 20, 'Default value'),
            e.enum('calibrate', ea.STATE_SET, ['clear', 'execute']),
        ],
        meta: {
            tuyaDatapoints: [
                [3, 'battery', tuya.valueConverter.raw],
                [8, 'temperature', tuya.valueConverter.divideBy10],
                [101, 'humidity', tuya.valueConverter.raw],
                [102, 'alarm', tuya.valueConverterBasic.lookup({IDLE: tuya.enum(0), ALARM: tuya.enum(1)})],
                [103, 'opening_mode', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), tilted: tuya.enum(1)})],
                [104, 'position', tuya.valueConverterBasic.lookup({left: tuya.enum(4), up: tuya.enum(1), down: tuya.enum(2), right: tuya.enum(3)})],
                [105, 'button_left', tuya.valueConverterBasic.lookup({released: tuya.enum(0), pressed: tuya.enum(1)})],
                [106, 'button_right', tuya.valueConverterBasic.lookup({released: tuya.enum(0), pressed: tuya.enum(1)})],
                [107, 'vacation', tuya.valueConverterBasic.lookup({OFF: tuya.enum(0), ON: tuya.enum(1)})],
                [
                    108,
                    'sensitivity',
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        low: tuya.enum(1),
                        medium: tuya.enum(2),
                        high: tuya.enum(3),
                        max: tuya.enum(4),
                    }),
                ],
                [109, 'alarm_switch', tuya.valueConverterBasic.lookup({OFF: tuya.enum(0), ON: tuya.enum(1)})],
                [110, 'update_frequency', tuya.valueConverter.raw],
                [111, 'keysound', tuya.valueConverterBasic.lookup({OFF: tuya.enum(0), ON: tuya.enum(1)})],
                [112, 'battery_low', tuya.valueConverterBasic.lookup({ON: tuya.enum(0), OFF: tuya.enum(1)})],
                [113, 'duration', tuya.valueConverter.raw],
                [114, 'handlesound', tuya.valueConverterBasic.lookup({OFF: tuya.enum(0), ON: tuya.enum(1)})],
                [120, 'calibrate', tuya.valueConverterBasic.lookup({clear: tuya.enum(0), execute: tuya.enum(1)})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ysm4dsb1']),
        model: 'RSH-HS06',
        vendor: 'Tuya',
        description: 'Temperature and humidity sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEvent({queryOnDeviceAnnounce: true}),
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await device.getEndpoint(1).command('manuSpecificTuya', 'dataQuery', {});
        },
        exposes: [
            e.temperature(),
            e.humidity(),
            tuya.exposes.temperatureUnit(),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'temperature', tuya.valueConverter.divideBy10],
                [2, 'humidity', tuya.valueConverter.raw],
                [4, 'battery', tuya.valueConverter.raw],
                [9, 'temperature_unit', tuya.valueConverter.temperatureUnit],
                [23, 'temperature_calibration', tuya.valueConverter.divideBy10],
                [24, 'humidity_calibration', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_n8dljorx']),
        model: 'ZG-102Z',
        vendor: 'Tuya',
        description: 'Door sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.contact(), e.battery()],
        meta: {
            tuyaDatapoints: [
                [1, 'contact', tuya.valueConverter.inverse],
                [2, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_pay2byax', '_TZE200_ijey4q29']),
        model: 'ZG-102ZL',
        vendor: 'Tuya',
        description: 'Luminance door sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.contact(),
            e.illuminance().withUnit('lx'),
            e.battery(),
            e
                .numeric('illuminance_interval', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(720)
                .withValueStep(1)
                .withUnit('minutes')
                .withDescription('Brightness acquisition interval (refresh and update only while active)'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'contact', tuya.valueConverter.inverse],
                [101, 'illuminance', tuya.valueConverter.raw],
                [2, 'battery', tuya.valueConverter.raw],
                [102, 'illuminance_interval', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_f1pvdgoh']),
        model: 'TS0601_pir',
        vendor: 'Tuya',
        description: 'Haozee PIR sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEvent(),
        configure: tuya.configureMagicPacket,
        exposes: [e.occupancy(), e.illuminance(), e.battery()],
        meta: {
            tuyaDatapoints: [
                [1, 'occupancy', tuya.valueConverter.trueFalse0],
                [4, 'battery', tuya.valueConverter.raw],
                [101, 'illuminance', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_8isdky6j'},
            {modelID: 'TS0225', manufacturerName: '_TZE200_p6fuhvez'},
        ],
        model: 'ZG-225Z',
        vendor: 'Tuya',
        description: 'Gas sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.gas(),
            tuya.exposes.gasValue().withUnit('ppm'),
            e.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']).withDescription('Gas sensor sensitivity'),
            e.enum('ring', ea.STATE_SET, ['ring1', 'ring2']).withDescription('Ring'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'gas', tuya.valueConverter.trueFalse0],
                [2, 'gas_value', tuya.valueConverter.raw],
                [101, 'sensitivity', tuya.valueConverterBasic.lookup({low: tuya.enum(0), medium: tuya.enum(1), high: tuya.enum(2)})],
                [6, 'ring', tuya.valueConverterBasic.lookup({ring1: tuya.enum(0), ring2: tuya.enum(1)})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_3towulqd', '_TZE200_1ibpyhdc', '_TZE200_bh3n6gk8', '_TZE200_ttcovulf']),
        model: 'ZG-204ZL',
        vendor: 'Tuya',
        description: 'Luminance motion sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.occupancy(),
            e.illuminance().withUnit('lx'),
            e.battery(),
            e
                .enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high'])
                .withDescription('PIR sensor sensitivity (refresh and update only while active)'),
            e
                .enum('keep_time', ea.STATE_SET, ['10', '30', '60', '120'])
                .withDescription('PIR keep time in seconds (refresh and update only while active)'),
            e
                .numeric('illuminance_interval', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(720)
                .withValueStep(1)
                .withUnit('minutes')
                .withDescription('Brightness acquisition interval (refresh and update only while active)'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'occupancy', tuya.valueConverter.trueFalse0],
                [4, 'battery', tuya.valueConverter.raw],
                [9, 'sensitivity', tuya.valueConverterBasic.lookup({low: tuya.enum(0), medium: tuya.enum(1), high: tuya.enum(2)})],
                [10, 'keep_time', tuya.valueConverterBasic.lookup({'10': tuya.enum(0), '30': tuya.enum(1), '60': tuya.enum(2), '120': tuya.enum(3)})],
                [12, 'illuminance', tuya.valueConverter.raw],
                [102, 'illuminance_interval', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0225', ['_TZE200_2aaelwxk']),
        model: 'ZG-205Z/A',
        vendor: 'Tuya',
        description: '5.8Ghz/24Ghz Human presence sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.presence(),
            e.illuminance().withUnit('lx'),
            e
                .numeric('large_motion_detection_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withUnit('x')
                .withDescription('Motion detection sensitivity'),
            e
                .numeric('large_motion_detection_distance', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Motion detection distance'),
            e.enum('motion_state', ea.STATE, ['none', 'small', 'medium', 'large']).withDescription('State of the motion'),
            e
                .numeric('fading_time', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('For how much time presence should stay true after detecting it'),
            e
                .numeric('medium_motion_detection_distance', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Medium motion detection distance'),
            e
                .numeric('medium_motion_detection_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withUnit('x')
                .withDescription('Medium motion detection sensitivity'),
            e.binary('indicator', ea.STATE_SET, 'ON', 'OFF').withDescription('LED Indicator'),
            e
                .numeric('small_detection_distance', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Small detection distance'),
            e
                .numeric('small_detection_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withUnit('x')
                .withDescription('Small detection sensitivity'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [2, 'large_motion_detection_sensitivity', tuya.valueConverter.raw],
                [4, 'large_motion_detection_distance', tuya.valueConverter.divideBy100],
                [
                    101,
                    'motion_state',
                    tuya.valueConverterBasic.lookup({none: tuya.enum(0), large: tuya.enum(1), medium: tuya.enum(2), small: tuya.enum(3)}),
                ],
                [102, 'fading_time', tuya.valueConverter.raw],
                [104, 'medium_motion_detection_distance', tuya.valueConverter.divideBy100],
                [105, 'medium_motion_detection_sensitivity', tuya.valueConverter.raw],
                [106, 'illuminance', tuya.valueConverter.raw],
                [107, 'indicator', tuya.valueConverter.onOff],
                [108, 'small_detection_distance', tuya.valueConverter.divideBy100],
                [109, 'small_detection_sensitivity', tuya.valueConverter.raw],
                // Not exposed DPs/untested
                // [103, 'motion_false_detection', tuya.valueConverter.raw],
                // [113, 'breathe_false_detection', tuya.valueConverter.raw],
                // [3, 'mov_minimum_distance', tuya.valueConverter.raw],
                // [110, 'micro_minimum_distance', tuya.valueConverter.raw],
                // [111, 'motionless_minimum_distance', tuya.valueConverter.raw],
                // [112, 'reset_setting', tuya.valueConverter.raw],
                // [114, 'time', tuya.valueConverter.raw],
                // [115, 'alarm_time', tuya.valueConverter.raw],
                // [116, 'alarm_volume', tuya.valueConverterBasic.lookup(
                //  {'low': tuya.enum(0), 'medium': tuya.enum(1), 'high': tuya.enum(2), 'mute': tuya.enum(3)})],
                // [117, 'working_mode', tuya.valueConverterBasic.lookup(
                // {'arm': tuya.enum(0), 'off': tuya.enum(1), 'alarm': tuya.enum(2),  'doorbell': tuya.enum(3)})],
                // [118, 'auto1', tuya.valueConverter.raw],
                // [119, 'auto2', tuya.valueConverter.raw],
                // [120, 'auto3', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_2aaelwxk', '_TZE200_kb5noeto']),
        model: 'ZG-204ZM',
        vendor: 'Tuya',
        description: 'PIR 24Ghz human presence sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.presence(),
            e.enum('motion_state', ea.STATE, ['none', 'large', 'small', 'static']).withDescription('Motion state'),
            e.illuminance_lux(),
            e.battery(),
            e
                .numeric('fading_time', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('Presence keep time'),
            e
                .numeric('static_detection_distance', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Static detection distance'),
            e
                .numeric('static_detection_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withUnit('x')
                .withDescription('Static detection sensitivity'),
            e.binary('indicator', ea.STATE_SET, 'ON', 'OFF').withDescription('LED indicator mode'),
            e
                .enum('motion_detection_mode', ea.STATE_SET, ['only_pir', 'pir_and_radar', 'only_radar'])
                .withDescription('Motion detection mode (Firmware version>=0122052017)'),
            e
                .numeric('motion_detection_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withUnit('x')
                .withDescription('Motion detection sensitivity (Firmware version>=0122052017)'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [106, 'illuminance_lux', tuya.valueConverter.raw],
                [
                    101,
                    'motion_state',
                    tuya.valueConverterBasic.lookup({
                        none: tuya.enum(0),
                        large: tuya.enum(1),
                        small: tuya.enum(2),
                        static: tuya.enum(3),
                    }),
                ],
                [102, 'fading_time', tuya.valueConverter.raw],
                [4, 'static_detection_distance', tuya.valueConverter.divideBy100],
                [2, 'static_detection_sensitivity', tuya.valueConverter.raw],
                [107, 'indicator', tuya.valueConverter.onOff],
                [121, 'battery', tuya.valueConverter.raw],
                [
                    122,
                    'motion_detection_mode',
                    tuya.valueConverterBasic.lookup({
                        only_pir: tuya.enum(0),
                        pir_and_radar: tuya.enum(1),
                        only_radar: tuya.enum(2),
                    }),
                ],
                [123, 'motion_detection_sensitivity', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS110E', ['_TZ3210_zxbtub8r', '_TZ3210_k1msuvg6']),
        model: 'TS110E_1gang_1',
        vendor: 'Tuya',
        description: '1 channel dimmer',
        extend: [light({powerOnBehavior: false, configureReporting: true})],
        fromZigbee: [tuya.fz.power_on_behavior_1, fz.TS110E_switch_type, fz.TS110E, fz.on_off],
        toZigbee: [tz.TS110E_light_onoff_brightness, tuya.tz.power_on_behavior_1, tz.TS110E_options],
        exposes: [e.power_on_behavior(), tuya.exposes.switchType(), e.min_brightness(), e.max_brightness()],
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: tuya.fingerprint('TS110E', ['_TZ3210_ngqk6jia', '_TZ3210_weaqkhab']),
        model: 'TS110E_1gang_2',
        vendor: 'Tuya',
        description: '1 channel dimmer',
        whiteLabel: [
            tuya.whitelabel('Lonsonho', 'QS-Zigbee-D02-TRIAC-L_1', '1 channel dimmer', ['_TZ3210_weaqkhab']),
            tuya.whitelabel('Lonsonho', 'QS-Zigbee-D02-TRIAC-LN_1', '1 channel dimmer', ['_TZ3210_ngqk6jia']),
        ],
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.TS110E, fz.TS110E_light_type, tuya.fz.power_on_behavior_1, fz.on_off],
        toZigbee: [tz.TS110E_onoff_brightness, tz.TS110E_options, tuya.tz.power_on_behavior_1, tz.light_brightness_move],
        exposes: [
            e.light_brightness().withMinBrightness().withMaxBrightness(),
            tuya.exposes.lightType().withAccess(ea.ALL),
            e.power_on_behavior().withAccess(ea.ALL),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS110E', ['_TZ3210_ysfo0wla']),
        model: 'EKAC-T3095Z',
        vendor: 'Ekaza',
        description: '1 channel dimmer',
        fromZigbee: [fz.TS110E, tuya.fz.power_on_behavior_1, fz.on_off],
        toZigbee: [tz.TS110E_onoff_brightness, tz.TS110E_options, tuya.tz.power_on_behavior_1, tz.light_brightness_move],
        exposes: [e.light_brightness().withMinBrightness().withMaxBrightness(), e.power_on_behavior().withAccess(ea.ALL)],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS110E', manufacturerName: '_TZ3210_wdexaypg'},
            {modelID: 'TS110E', manufacturerName: '_TZ3210_3mpwqzuu'},
        ],
        model: 'TS110E_2gang_1',
        vendor: 'Tuya',
        description: '2 channel dimmer',
        extend: [
            deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            light({powerOnBehavior: false, endpointNames: ['l1', 'l2'], configureReporting: true}),
        ],
        fromZigbee: [tuya.fz.power_on_behavior_1, fz.TS110E_switch_type, fz.TS110E],
        toZigbee: [tz.TS110E_light_onoff_brightness, tuya.tz.power_on_behavior_1, tz.TS110E_options],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.min_brightness().withEndpoint('l1'),
            e.max_brightness().withEndpoint('l1'),
            e.min_brightness().withEndpoint('l2'),
            e.max_brightness().withEndpoint('l2'),
            e.power_on_behavior(),
            tuya.exposes.switchType().withEndpoint('l1'),
            tuya.exposes.switchType().withEndpoint('l2'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS110E', ['_TZ3210_pagajpog', '_TZ3210_4ubylghk', '_TZ3210_vfwhhldz']),
        model: 'TS110E_2gang_2',
        vendor: 'Tuya',
        description: '2 channel dimmer',
        fromZigbee: [fz.TS110E, fz.TS110E_light_type, tuya.fz.power_on_behavior_1, fz.on_off],
        toZigbee: [tz.TS110E_onoff_brightness, tz.TS110E_options, tuya.tz.power_on_behavior_1, tz.light_brightness_move],
        meta: {multiEndpoint: true},
        exposes: [
            e.light_brightness().withMinBrightness().withMaxBrightness().withEndpoint('l1'),
            e.light_brightness().withMinBrightness().withMaxBrightness().withEndpoint('l2'),
            e.power_on_behavior().withAccess(ea.ALL),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nslr42tt']),
        model: 'TS0601_3_phase_clamp_meter',
        vendor: 'Tuya',
        description: '3-phase clamp power meter',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        whiteLabel: [
            {vendor: 'MatSee Plus', model: 'PC321-Z-TY'},
            {vendor: 'OWON', model: 'PC321-Z-TY'},
        ],
        exposes: [
            e.ac_frequency(),
            e.temperature(),
            e.current(),
            e.power(),
            e.energy(),
            tuya.exposes.energyWithPhase('a'),
            tuya.exposes.energyWithPhase('b'),
            tuya.exposes.energyWithPhase('c'),
            tuya.exposes.voltageWithPhase('a'),
            tuya.exposes.voltageWithPhase('b'),
            tuya.exposes.voltageWithPhase('c'),
            tuya.exposes.powerWithPhase('a'),
            tuya.exposes.powerWithPhase('b'),
            tuya.exposes.powerWithPhase('c'),
            tuya.exposes.currentWithPhase('a'),
            tuya.exposes.currentWithPhase('b'),
            tuya.exposes.currentWithPhase('c'),
            tuya.exposes.powerFactorWithPhase('a'),
            tuya.exposes.powerFactorWithPhase('b'),
            tuya.exposes.powerFactorWithPhase('c'),
        ],
        meta: {
            multiEndpointSkip: ['power_factor', 'power_factor_phase_b', 'power_factor_phase_c', 'energy'],
            tuyaDatapoints: [
                [132, 'ac_frequency', tuya.valueConverter.raw],
                [133, 'temperature', tuya.valueConverter.divideBy10],
                [1, 'energy', tuya.valueConverter.divideBy100],
                [101, 'energy_a', tuya.valueConverter.divideBy1000],
                [111, 'energy_b', tuya.valueConverter.divideBy1000],
                [121, 'energy_c', tuya.valueConverter.divideBy1000],
                [131, 'current', tuya.valueConverter.divideBy1000],
                [9, 'power', tuya.valueConverter.raw],
                [102, 'power_factor_a', tuya.valueConverter.raw],
                [112, 'power_factor_b', tuya.valueConverter.raw],
                [122, 'power_factor_c', tuya.valueConverter.raw],
                [6, null, tuya.valueConverter.phaseVariant2WithPhase('a')],
                [7, null, tuya.valueConverter.phaseVariant2WithPhase('b')],
                [8, null, tuya.valueConverter.phaseVariant2WithPhase('c')],
                [134, 'device_status', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_x8fp01wi', '_TZE204_x8fp01wi']),
        model: 'TS0601_3_phase_clamp_meter_relay',
        vendor: 'Tuya',
        description: '3-phase clamp power meter with relay',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        whiteLabel: [{vendor: 'Wenzhou Taiye Electric', model: 'TAC7361C BI'}],
        exposes: [
            e.switch().setAccess('state', ea.STATE_SET),
            e.power(),
            e.energy(),
            e.produced_energy(),
            tuya.exposes.voltageWithPhase('a'),
            tuya.exposes.voltageWithPhase('b'),
            tuya.exposes.voltageWithPhase('c'),
            tuya.exposes.powerWithPhase('a'),
            tuya.exposes.powerWithPhase('b'),
            tuya.exposes.powerWithPhase('c'),
            tuya.exposes.currentWithPhase('a'),
            tuya.exposes.currentWithPhase('b'),
            tuya.exposes.currentWithPhase('c'),
        ],
        meta: {
            tuyaDatapoints: [
                [16, 'state', tuya.valueConverter.onOff],
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                [9, 'power', tuya.valueConverter.power],
                [6, null, tuya.valueConverter.phaseVariant2WithPhase('a')],
                [7, null, tuya.valueConverter.phaseVariant2WithPhase('b')],
                [8, null, tuya.valueConverter.phaseVariant2WithPhase('c')],
            ],
        },
    },
    {
        zigbeeModel: ['TS0049'],
        model: 'TS0049',
        vendor: 'Tuya',
        description: 'Water valve',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.errorStatus(),
            tuya.exposes.switch(),
            tuya.exposes.batteryState(),
            tuya.exposes.countdown().withValueMin(0).withValueMax(255).withUnit('minutes').withDescription('Max on time in minutes'),
        ],
        meta: {
            tuyaSendCommand: 'sendData',
            tuyaDatapoints: [
                [26, 'error_status', tuya.valueConverter.raw],
                [101, 'state', tuya.valueConverter.onOff],
                [111, 'countdown', tuya.valueConverter.raw],
                [115, 'battery_state', tuya.valueConverter.batteryState],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_r32ctezx']),
        model: 'TS0601_fan_switch',
        vendor: 'Tuya',
        description: 'Fan switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch(),
            e.power_on_behavior(['off', 'on']).withAccess(ea.STATE_SET),
            tuya.exposes.countdown().withValueMin(0).withValueMax(43200).withUnit('s').withDescription('Max ON time in seconds'),
            e.numeric('fan_speed', ea.STATE_SET).withValueMin(1).withValueMax(5).withValueStep(1).withDescription('Speed off the fan'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [2, 'countdown', tuya.valueConverter.countdown],
                [
                    3,
                    'fan_speed',
                    tuya.valueConverterBasic.lookup({'1': tuya.enum(0), '2': tuya.enum(1), '3': tuya.enum(2), '4': tuya.enum(3), '5': tuya.enum(4)}),
                ],
                [11, 'power_on_behavior', tuya.valueConverterBasic.lookup({off: tuya.enum(0), on: tuya.enum(1)})],
            ],
        },
        whiteLabel: [{vendor: 'Lerlink', model: 'T2-Z67/T2-W67'}],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_hmqzfqml', '_TZE200_qanl25yu']),
        model: 'TS0601_fan_and_light_switch',
        vendor: 'Tuya',
        description: 'Fan & light switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('status_indication', ea.STATE_SET, 'ON', 'OFF').withDescription('Light switch'),
            tuya.exposes.switch(),
            e.power_on_behavior(['OFF', 'ON']).withAccess(ea.STATE_SET),
            e.enum('fan_speed', ea.STATE_SET, ['minimum', 'medium', 'maximum']).withDescription('Speed of the fan'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [101, 'fan_speed', tuya.valueConverterBasic.lookup({minimum: tuya.enum(0), medium: tuya.enum(1), maximum: tuya.enum(2)})],
                [11, 'power_on_behavior', tuya.valueConverterBasic.lookup({OFF: tuya.enum(0), ON: tuya.enum(1)})],
                [5, 'status_indication', tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [{vendor: 'Liwokit', model: 'Fan+Light-01'}],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_lawxy9e2', '_TZE204_lawxy9e2']),
        model: 'TS0601_fan_5_levels_and_light_switch',
        vendor: 'Tuya',
        description: 'Fan with 5 levels & light switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('status_indication', ea.STATE_SET, 'ON', 'OFF').withDescription('Light switch'),
            tuya.exposes.switch(),
            e.power_on_behavior(['OFF', 'ON']).withAccess(ea.STATE_SET).withDescription('Fan On Off'),
            e.numeric('fan_speed', ea.STATE_SET).withValueMin(1).withValueMax(5).withValueStep(1).withDescription('Speed off the fan'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [
                    3,
                    'fan_speed',
                    tuya.valueConverterBasic.lookup(
                        {'1': tuya.enum(0), '2': tuya.enum(1), '3': tuya.enum(2), '4': tuya.enum(3), '5': tuya.enum(4)},
                        '5',
                    ),
                ],
                [11, 'power_on_behavior', tuya.valueConverterBasic.lookup({OFF: tuya.enum(0), ON: tuya.enum(1)})],
                [5, 'status_indication', tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [{vendor: 'Liwokit', model: 'Fan+Light-01'}],
    },
    {
        zigbeeModel: ['TS0224'],
        model: 'TS0224',
        vendor: 'Tuya',
        description: 'Smart light & sound siren',
        fromZigbee: [],
        toZigbee: [tz.warning, tzLocal.TS0224],
        exposes: [
            e.warning(),
            e.binary('light', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn the light of the alarm ON/OFF'),
            e
                .numeric('duration', ea.STATE_SET)
                .withValueMin(60)
                .withValueMax(3600)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('Duration of the alarm'),
            e.enum('volume', ea.STATE_SET, ['mute', 'low', 'medium', 'high']).withDescription('Volume of the alarm'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0041', ['_TZ3000_fa9mlvja']),
        model: 'IH-K663',
        vendor: 'Tuya',
        description: 'Smart button',
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double'])],
        fromZigbee: [tuya.fz.on_off_action, fz.battery],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: tuya.fingerprint('TS011F', [
            '_TZ3000_cayepv1a',
            '_TZ3000_lepzuhto',
            '_TZ3000_qystbcjg',
            '_TZ3000_zrm3oxsh',
            '_TZ3000_303avxxt',
            '_TZ3000_zjchz7pd',
        ]),
        model: 'TS011F_with_threshold',
        description: 'Din rail switch with power monitoring and threshold settings',
        vendor: 'Tuya',
        ota: ota.zigbeeOTA,
        extend: [
            tuya.modernExtend.tuyaOnOff({
                electricalMeasurements: true,
                electricalMeasurementsFzConverter: fzLocal.TS011F_electrical_measurement,
                powerOutageMemory: true,
                indicatorMode: true,
            }),
        ],
        fromZigbee: [fz.temperature, fzLocal.TS011F_threshold],
        toZigbee: [tzLocal.TS011F_threshold],
        exposes: (device, options) => {
            const exposes: Expose[] = [e.linkquality()];
            if (device?.manufacturerName !== '_TZ3000_303avxxt' && device?.manufacturerName !== '_TZ3000_zjchz7pd') {
                exposes.push(
                    e.temperature(),
                    e
                        .numeric('temperature_threshold', ea.STATE_SET)
                        .withValueMin(40)
                        .withValueMax(100)
                        .withValueStep(1)
                        .withUnit('*C')
                        .withDescription('High temperature threshold'),
                    e.binary('temperature_breaker', ea.STATE_SET, 'ON', 'OFF').withDescription('High temperature breaker'),
                );
            }
            exposes.push(
                e
                    .numeric('power_threshold', ea.STATE_SET)
                    .withValueMin(1)
                    .withValueMax(26)
                    .withValueStep(1)
                    .withUnit('kW')
                    .withDescription('High power threshold'),
                e.binary('power_breaker', ea.STATE_SET, 'ON', 'OFF').withDescription('High power breaker'),
                e
                    .numeric('over_current_threshold', ea.STATE_SET)
                    .withValueMin(1)
                    .withValueMax(64)
                    .withValueStep(1)
                    .withUnit('A')
                    .withDescription('Over-current threshold'),
                e.binary('over_current_breaker', ea.STATE_SET, 'ON', 'OFF').withDescription('Over-current breaker'),
                e
                    .numeric('over_voltage_threshold', ea.STATE_SET)
                    .withValueMin(220)
                    .withValueMax(265)
                    .withValueStep(1)
                    .withUnit('V')
                    .withDescription('Over-voltage threshold'),
                e.binary('over_voltage_breaker', ea.STATE_SET, 'ON', 'OFF').withDescription('Over-voltage breaker'),
                e
                    .numeric('under_voltage_threshold', ea.STATE_SET)
                    .withValueMin(76)
                    .withValueMax(240)
                    .withValueStep(1)
                    .withUnit('V')
                    .withDescription('Under-voltage threshold'),
                e.binary('under_voltage_breaker', ea.STATE_SET, 'ON', 'OFF').withDescription('Under-voltage breaker'),
            );
            return exposes;
        },
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await endpoint.command('genBasic', 'tuyaSetup', {});
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        whiteLabel: [
            tuya.whitelabel('Tongou', 'TO-Q-SY2-163JZT', 'Smart circuit breaker', ['_TZ3000_cayepv1a']),
            tuya.whitelabel('EARU', 'EAKCB-T-M-Z', 'Smart circuit breaker', ['_TZ3000_lepzuhto']),
            tuya.whitelabel('EARU', 'EAYCB-Z-2P', 'Smart circuit breaker with leakage protection', ['_TZ3000_zrm3oxsh']),
            tuya.whitelabel('UNSH', 'SMKG-1KNL-EU-Z', 'Smart circuit Breaker', ['_TZ3000_qystbcjg']),
            tuya.whitelabel('Tomzn', 'TOB9Z-M', 'Smart circuit breaker', ['_TZ3000_303avxxt']),
            tuya.whitelabel('Immax', '07573L', 'Smart circuit breaker', ['_TZ3000_zjchz7pd']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS000F', ['_TZ3000_hdc8bbha']),
        model: 'QS-Zigbee-SEC01-U',
        vendor: 'Tuya',
        description: 'Zigbee 3.0 smart light switch module 1 gang',
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true})],
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint('TS000F', ['_TZ3000_m8f3z8ju']),
        model: 'QS-Zigbee-SEC02-U',
        vendor: 'Tuya',
        description: 'Zigbee 3.0 smart light switch module 2 gang',
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, endpoints: ['l1', 'l2']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0001', manufacturerName: '_TZ3000_bmqxalil'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_w1tcofu8'},
        ],
        model: 'TS0001_switch_1_gang',
        vendor: 'Tuya',
        description: '1-Gang switch with backlight',
        extend: [tuya.modernExtend.tuyaOnOff({powerOnBehavior2: true, backlightModeOffOn: true})],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Homeetec', 'Homeetec_37022454', '1 Gang switch with backlight', ['_TZ3000_bmqxalil']),
            tuya.whitelabel('RoomsAI', 'RoomsAI_37022454', '1 Gang switch with backlight', ['_TZ3000_w1tcofu8']),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0003', manufacturerName: '_TZ3000_pv4puuxi'},
            {modelID: 'TS0003', manufacturerName: '_TZ3000_avky2mvc'},
        ],
        model: 'TS0003_switch_3_gang',
        vendor: 'Tuya',
        description: '3-Gang switch with backlight',
        extend: [tuya.modernExtend.tuyaOnOff({powerOnBehavior2: true, backlightModeOffOn: true, endpoints: ['left', 'center', 'right']})],
        endpoint: (device) => {
            return {left: 1, center: 2, right: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Homeetec', '37022474_1', '3 Gang switch with backlight', ['_TZ3000_pv4puuxi']),
            tuya.whitelabel('RoomsAI', '37022474_2', '3 Gang switch with backlight', ['_TZ3000_avky2mvc']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_hewlydpz'}],
        model: 'TS0601_switch_4_gang_2',
        vendor: 'Tuya',
        description: '4 gang switch with backlight',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.switch().withEndpoint('l4'),
            tuya.exposes.backlightModeOffOn(),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [7, 'backlight_mode', tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [tuya.whitelabel('Homeetec', '37022714', '4 Gang switch with backlight', ['_TZE200_hewlydpz'])],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_p6vz3wzt'}],
        model: 'TS0601_cover_5',
        vendor: 'Tuya',
        description: 'Curtain/blind switch',
        options: [exposes.options.invert_cover()],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.enum('calibration', ea.STATE_SET, ['START', 'END']).withDescription('Calibration'),
            e.binary('backlight_mode', ea.STATE_SET, 'ON', 'OFF').withDescription('Backlight'),
            e.enum('motor_steering', ea.STATE_SET, ['FORWARD', 'BACKWARD']).withDescription('Motor Steering'),
            e.binary('child_lock', ea.STATE_SET, 'ON', 'OFF').withDescription('Child Lock'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'calibration', tuya.valueConverterBasic.lookup({START: tuya.enum(0), END: tuya.enum(1)})],
                [7, 'backlight_mode', tuya.valueConverter.onOff],
                [8, 'motor_steering', tuya.valueConverterBasic.lookup({FORWARD: tuya.enum(0), BACKWARD: tuya.enum(1)})],
                [103, 'child_lock', tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [tuya.whitelabel('Homeetec', '37022483', 'Curtain/blind switch', ['_TZE200_p6vz3wzt'])],
    },
    {
        zigbeeModel: ['TS030F'],
        model: 'TS030F',
        vendor: 'Tuya',
        description: 'Smart blind controller',
        fromZigbee: [fz.cover_position_tilt, fz.tuya_cover_options_2],
        toZigbee: [tz.cover_position_tilt, tz.cover_state, tzLocal.TS030F_border, tz.moes_cover_calibration, tz.tuya_cover_reversal],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        whiteLabel: [tuya.whitelabel('Lidl', 'HG09648', 'Livarno roller blinds', ['_TZB000_42ha4rsc'])],
        exposes: [
            e.cover_position(),
            e.enum('border', ea.SET, ['up', 'down', 'up_delete', 'down_delete']),
            e.numeric('calibration_time', ea.ALL).withValueMin(0).withValueMax(100),
            e
                .binary('motor_reversal', ea.ALL, 'ON', 'OFF')
                .withDescription(
                    'Reverse the motor, resets all endpoints! Also the upper border after hardware initialisation. Be careful!' +
                        'After this you have to turn off and turn on the roller so that it can drive into the uppest position.',
                ),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_jhkttplm'}],
        model: 'TS0601_cover_with_1_switch',
        vendor: 'Tuya',
        description: 'Curtain/blind switch with 1 Gang switch',
        options: [exposes.options.invert_cover()],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            tuya.exposes.switch().withEndpoint('l1'),
            e.enum('calibration', ea.STATE_SET, ['START', 'END']).withDescription('Calibration'),
            e.binary('backlight_mode', ea.STATE_SET, 'ON', 'OFF').withDescription('Backlight'),
            e.enum('motor_steering', ea.STATE_SET, ['FORWARD', 'BACKWARD']).withDescription('Motor Steering'),
            e.binary('child_lock', ea.STATE_SET, 'ON', 'OFF').withDescription('Child Lock'),
        ],
        endpoint: (device) => {
            return {l1: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'calibration', tuya.valueConverterBasic.lookup({START: tuya.enum(0), END: tuya.enum(1)})],
                [7, 'backlight_mode', tuya.valueConverter.onOff],
                [8, 'motor_steering', tuya.valueConverterBasic.lookup({FORWARD: tuya.enum(0), BACKWARD: tuya.enum(1)})],
                [101, 'state_l1', tuya.valueConverter.onOff],
                [103, 'child_lock', tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [tuya.whitelabel('Homeetec', '37022493', 'Curtain/blind switch with 1 Gang switch', ['_TZE200_jhkttplm'])],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_5nldle7w'}],
        model: 'TS0601_cover_with_2_switch',
        vendor: 'Tuya',
        description: 'Curtain/blind switch with 2 Gang switch',
        options: [exposes.options.invert_cover()],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            e.enum('calibration', ea.STATE_SET, ['START', 'END']).withDescription('Calibration'),
            e.binary('backlight_mode', ea.STATE_SET, 'ON', 'OFF').withDescription('Backlight'),
            e.enum('motor_steering', ea.STATE_SET, ['FORWARD', 'BACKWARD']).withDescription('Motor Steering'),
            e.binary('child_lock', ea.STATE_SET, 'ON', 'OFF').withDescription('Child Lock'),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'calibration', tuya.valueConverterBasic.lookup({START: tuya.enum(0), END: tuya.enum(1)})],
                [7, 'backlight_mode', tuya.valueConverter.onOff],
                [8, 'motor_steering', tuya.valueConverterBasic.lookup({FORWARD: tuya.enum(0), BACKWARD: tuya.enum(1)})],
                [101, 'state_l2', tuya.valueConverter.onOff],
                [102, 'state_l1', tuya.valueConverter.onOff],
                [103, 'child_lock', tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [tuya.whitelabel('Homeetec', '37022173', 'Curtain/blind switch with 2 Gang switch', ['_TZE200_5nldle7w'])],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_bcusnqt8'}],
        model: 'SPM01',
        vendor: 'Tuya',
        description: 'Smart energy monitor for 1P+N system',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.voltage(),
            e.power(),
            e.current(),
            // Change the description according to the specifications of the device
            e.energy().withDescription('Total forward active energy'),
            e.produced_energy().withDescription('Total reverse active energy'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                [
                    6,
                    null,
                    {
                        from: (v: Buffer) => {
                            return {
                                voltage: v.readUint16BE(0) / 10,
                                current: ((v.readUint8(2) << 16) + (v.readUint8(3) << 8) + v.readUint8(4)) / 1000,
                                power: (v.readUint8(5) << 16) + (v.readUint8(6) << 8) + v.readUint8(7),
                            };
                        },
                    },
                ],
                [6, 'voltage', tuya.valueConverter.raw],
                [6, 'current', tuya.valueConverter.raw],
                [6, 'power', tuya.valueConverter.raw],
                // [9,'',tuya.valueConverter.raw] // Unknown / datatype=5 (bitmap)
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE204_ves1ycwx'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ves1ycwx'},
        ],
        model: 'SPM02',
        vendor: 'Tuya',
        description: 'Smart energy monitor for 3P+N system',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.voltageWithPhase('X'),
            tuya.exposes.voltageWithPhase('Y'),
            tuya.exposes.voltageWithPhase('Z'),
            tuya.exposes.powerWithPhase('X'),
            tuya.exposes.powerWithPhase('Y'),
            tuya.exposes.powerWithPhase('Z'),
            tuya.exposes.currentWithPhase('X'),
            tuya.exposes.currentWithPhase('Y'),
            tuya.exposes.currentWithPhase('Z'),
            // Change the description according to the specifications of the device
            e.energy().withDescription('Total forward active energy'),
            e.produced_energy().withDescription('Total reverse active energy'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                [6, null, tuya.valueConverter.phaseVariant2WithPhase('X')],
                [7, null, tuya.valueConverter.phaseVariant2WithPhase('Y')],
                [8, null, tuya.valueConverter.phaseVariant2WithPhase('Z')],
                // [9,'',tuya.valueConverter.raw] // Unknown / datatype=5 (bitmap)
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_qhlxve78'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_qhlxve78'},
        ],
        model: 'SPM01V2',
        vendor: 'Tuya',
        description: 'Smart energy monitor for 1P+N system',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.voltage(),
            e.power(),
            e.current(),
            e.energy().withDescription('Total forward active energy'),
            e.produced_energy().withDescription('Total reverse active energy'),
            e.power_factor().withUnit('%'),
            e.ac_frequency(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                // [6, null, tuya.valueConverter.phaseVariant3],
                [15, 'power_factor', tuya.valueConverter.raw],
                // [16, 'clear_energy', tuya.valueConverter.onOff],
                [101, 'ac_frequency', tuya.valueConverter.divideBy100],
                [102, 'voltage', tuya.valueConverter.divideBy10],
                [103, 'current', tuya.valueConverter.divideBy1000],
                [104, 'power', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE204_v9hkz2yn'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_v9hkz2yn'},
        ],
        model: 'SPM02V2',
        vendor: 'Tuya',
        description: 'Smart energy monitor for 3P+N system',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.voltageWithPhase('a'),
            tuya.exposes.voltageWithPhase('b'),
            tuya.exposes.voltageWithPhase('c'),
            tuya.exposes.powerWithPhase('a'),
            tuya.exposes.powerWithPhase('b'),
            tuya.exposes.powerWithPhase('c'),
            tuya.exposes.currentWithPhase('a'),
            tuya.exposes.currentWithPhase('b'),
            tuya.exposes.currentWithPhase('c'),
            e.energy().withDescription('Total forward active energy'),
            e.produced_energy().withDescription('Total reverse active energy'),
            e.power_factor().withUnit('%'),
            e.power(),
            e.ac_frequency(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                // [6, null, tuya.valueConverter.phaseVariant2WithPhase('X')],
                // [7, null, tuya.valueConverter.phaseVariant2WithPhase('Y')],
                // [8, null, tuya.valueConverter.phaseVariant2WithPhase('Z')],
                [15, 'power_factor', tuya.valueConverter.raw],
                [101, 'ac_frequency', tuya.valueConverter.divideBy100],
                [102, 'voltage_a', tuya.valueConverter.divideBy10],
                [103, 'current_a', tuya.valueConverter.divideBy1000],
                [104, 'power_a', tuya.valueConverter.raw],
                [105, 'voltage_b', tuya.valueConverter.divideBy10],
                [106, 'current_b', tuya.valueConverter.divideBy1000],
                [107, 'power_b', tuya.valueConverter.raw],
                [108, 'voltage_c', tuya.valueConverter.divideBy10],
                [109, 'current_c', tuya.valueConverter.divideBy1000],
                [110, 'power_c', tuya.valueConverter.raw],
                [111, 'power', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE204_ugekduaj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ugekduaj'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_iwn0gpzz'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_iwn0gpzz'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_loejka0i'},
        ],
        model: 'SDM01',
        vendor: 'Tuya',
        description: 'Smart energy monitor for 3P+N system',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        whiteLabel: [tuya.whitelabel('Nous', 'D4Z', 'Smart energy monitor for 3P+N system', ['_TZE204_loejka0i'])],
        exposes: [
            tuya.exposes.voltageWithPhase('a'),
            tuya.exposes.voltageWithPhase('b'),
            tuya.exposes.voltageWithPhase('c'),
            tuya.exposes.powerWithPhase('a'),
            tuya.exposes.powerWithPhase('b'),
            tuya.exposes.powerWithPhase('c'),
            tuya.exposes.currentWithPhase('a'),
            tuya.exposes.currentWithPhase('b'),
            tuya.exposes.currentWithPhase('c'),
            e.energy().withDescription('Total forward active energy'),
            e.produced_energy().withDescription('Total reverse active energy'),
            e.power_factor().withUnit('%').withDescription('Total power factor'),
            e.power().withDescription('Total active power'),
            e.ac_frequency(),
            tuya.exposes.energyWithPhase('a'),
            tuya.exposes.energyWithPhase('b'),
            tuya.exposes.energyWithPhase('c'),
            tuya.exposes.energyProducedWithPhase('a'),
            tuya.exposes.energyProducedWithPhase('b'),
            tuya.exposes.energyProducedWithPhase('c'),
            tuya.exposes.powerFactorWithPhase('a'),
            tuya.exposes.powerFactorWithPhase('b'),
            tuya.exposes.powerFactorWithPhase('c'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                [15, 'power_factor', tuya.valueConverter.raw],
                [101, 'ac_frequency', tuya.valueConverter.divideBy100],
                [102, 'voltage_a', tuya.valueConverter.divideBy10],
                [103, 'current_a', tuya.valueConverter.divideBy1000],
                [104, 'power_a', tuya.valueConverter.raw],
                [105, 'voltage_b', tuya.valueConverter.divideBy10],
                [106, 'current_b', tuya.valueConverter.divideBy1000],
                [107, 'power_b', tuya.valueConverter.raw],
                [108, 'voltage_c', tuya.valueConverter.divideBy10],
                [109, 'current_c', tuya.valueConverter.divideBy1000],
                [110, 'power_c', tuya.valueConverter.raw],
                [111, 'power', tuya.valueConverter.raw],
                [112, 'energy_a', tuya.valueConverter.divideBy100],
                [114, 'energy_b', tuya.valueConverter.divideBy100],
                [116, 'energy_c', tuya.valueConverter.divideBy100],
                [113, 'energy_produced_a', tuya.valueConverter.divideBy100],
                [115, 'energy_produced_b', tuya.valueConverter.divideBy100],
                [117, 'energy_produced_c', tuya.valueConverter.divideBy100],
                [118, 'power_factor_a', tuya.valueConverter.raw],
                [119, 'power_factor_b', tuya.valueConverter.raw],
                [120, 'power_factor_c', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_ac0fhfiq']),
        model: 'TS0601_bidirectional_energy meter',
        vendor: 'Tuya',
        description: 'Bidirectional energy meter with 150A Current Clamp',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.energy(),
            e.produced_energy(),
            e.power(),
            e.voltage(),
            e.current(),
            e.enum('energy_flow', ea.STATE, ['consuming', 'producing']).withDescription('Direction of energy'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                [6, null, tuya.valueConverter.phaseVariant3],
                [102, 'energy_flow', tuya.valueConverterBasic.lookup({consuming: 0, producing: 1})],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_vmcgja59'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_dvosyycn'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wktrysab'},
        ],
        model: 'TS0601_switch_8',
        vendor: 'Tuya',
        description: 'ZYXH 8 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.switch().withEndpoint('l4'),
            tuya.exposes.switch().withEndpoint('l5'),
            tuya.exposes.switch().withEndpoint('l6'),
            tuya.exposes.switch().withEndpoint('l7'),
            tuya.exposes.switch().withEndpoint('l8'),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1, l7: 1, l8: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [0x65, 'state_l7', tuya.valueConverter.onOff],
                [0x66, 'state_l8', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_adlblwab'}],
        model: 'TS0601_switch_8_2',
        vendor: 'Tuya',
        description: '8 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.switch().withEndpoint('l4'),
            tuya.exposes.switch().withEndpoint('l5'),
            tuya.exposes.switch().withEndpoint('l6'),
            tuya.exposes.switch().withEndpoint('l7'),
            tuya.exposes.switch().withEndpoint('l8'),
            tuya.exposes.countdown().withEndpoint('l1'),
            tuya.exposes.countdown().withEndpoint('l2'),
            tuya.exposes.countdown().withEndpoint('l3'),
            tuya.exposes.countdown().withEndpoint('l4'),
            tuya.exposes.countdown().withEndpoint('l5'),
            tuya.exposes.countdown().withEndpoint('l6'),
            tuya.exposes.countdown().withEndpoint('l7'),
            tuya.exposes.countdown().withEndpoint('l8'),
            e.power_on_behavior().withAccess(ea.STATE_SET),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1, l7: 1, l8: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [7, 'state_l7', tuya.valueConverter.onOff],
                [8, 'state_l8', tuya.valueConverter.onOff],
                [9, 'countdown_l1', tuya.valueConverter.countdown],
                [10, 'countdown_l2', tuya.valueConverter.countdown],
                [11, 'countdown_l3', tuya.valueConverter.countdown],
                [12, 'countdown_l4', tuya.valueConverter.countdown],
                [13, 'countdown_l5', tuya.valueConverter.countdown],
                [14, 'countdown_l6', tuya.valueConverter.countdown],
                [15, 'countdown_l7', tuya.valueConverter.countdown],
                [16, 'countdown_l8', tuya.valueConverter.countdown],
                [27, 'power_on_behavior', tuya.valueConverter.powerOnBehaviorEnum],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_7sjncirf']),
        model: 'TS0601_switch_10',
        vendor: 'Tuya',
        description: '10 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [...Array.from({length: 10}, (_, i) => tuya.exposes.switch().withEndpoint(`l${i + 1}`))],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1, l7: 1, l8: 1, l9: 1, l10: 1, l11: 1, l12: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [0x65, 'state_l7', tuya.valueConverter.onOff],
                [0x66, 'state_l8', tuya.valueConverter.onOff],
                [0x67, 'state_l9', tuya.valueConverter.onOff],
                [0x68, 'state_l10', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_dqolcpcp']),
        model: 'TS0601_switch_12',
        vendor: 'Tuya',
        description: 'ZXYH 12 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [...Array.from({length: 12}, (_, i) => tuya.exposes.switch().withEndpoint(`l${i + 1}`))],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1, l7: 1, l8: 1, l9: 1, l10: 1, l11: 1, l12: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [0x65, 'state_l7', tuya.valueConverter.onOff],
                [0x66, 'state_l8', tuya.valueConverter.onOff],
                [0x67, 'state_l9', tuya.valueConverter.onOff],
                [0x68, 'state_l10', tuya.valueConverter.onOff],
                [0x69, 'state_l11', tuya.valueConverter.onOff],
                [0x6a, 'state_l12', tuya.valueConverter.onOff],
            ],
        },
    },

    // TS011F
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_8fdayfch', '_TZ3000_1hwjutgo', '_TZ3000_lnggrqqi', '_TZ3000_tvuarksa']),
        model: 'TS011F_1',
        vendor: 'Tuya',
        description: 'Switch',
        extend: [tuya.modernExtend.tuyaOnOff()],
        whiteLabel: [
            {vendor: 'Mumubiz', model: 'ZJSB9-80Z'},
            tuya.whitelabel('KTNNKG', 'ZB1248-10A', 'Relay switch', ['_TZ3000_8fdayfch']),
            tuya.whitelabel('UseeLink', 'SM-AZ713', 'Smart water/gas valve', ['_TZ3000_tvuarksa']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_rqbjepe8', '_TZ3000_uwkja6z1']),
        model: 'TS011F_4',
        description: '2 gang plug',
        vendor: 'Tuya',
        ota: ota.zigbeeOTA,
        extend: [
            tuya.modernExtend.tuyaOnOff({
                electricalMeasurements: true,
                powerOutageMemory: true,
                indicatorMode: true,
                childLock: true,
                endpoints: ['l1', 'l2'],
            }),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['energy', 'current', 'voltage', 'power']},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        onEvent: (type, data, device, options) => tuya.onEventMeasurementPoll(type, data, device, options, true, false),
        whiteLabel: [tuya.whitelabel('Nous', 'A4Z', '2 gang outdoor plug', ['_TZ3000_rqbjepe8', '_TZ3000_uwkja6z1'])],
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_cfnprab5', '_TZ3000_o005nuxx', '_TZ3000_gdyjfvgm']),
        model: 'TS011F_5',
        description: '5 gang switch',
        vendor: 'Tuya',
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, childLock: true, endpoints: ['l1', 'l2', 'l3', 'l4', 'l5']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            for (const ID of [1, 2, 3, 4, 5]) {
                await reporting.bind(device.getEndpoint(ID), coordinatorEndpoint, ['genOnOff']);
            }
        },
        whiteLabel: [
            tuya.whitelabel('UseeLink', 'SM-0306E-2W', '4 gang switch, with USB', ['_TZ3000_cfnprab5']),
            tuya.whitelabel('UseeLink', 'SM-O301-AZ', 'AU 4 plug 10A power board + USB', ['_TZ3000_o005nuxx']),
        ],
    },
    {
        zigbeeModel: ['SM0202'],
        model: 'SM0202',
        vendor: 'Tuya',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.linkquality(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        whiteLabel: [
            tuya.whitelabel('Cleverio', 'SS200', 'Motion sensor', ['_TYZB01_z2umiwvq']),
            tuya.whitelabel('Marmitek', 'SM0202_1', 'Motion sensor', ['_TYZB01_yr95mpib']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0001', ['_TZ3210_dse8ogfy', '_TZ3210_j4pdtz9v']),
        model: 'TS0001_fingerbot',
        vendor: 'Tuya',
        description: 'Zigbee fingerbot plus',
        whiteLabel: [tuya.whitelabel('Adaprox', 'TS0001_fingerbot_1', 'Zigbee fingerbot plus', ['_TZ3210_dse8ogfy'])],
        fromZigbee: [fz.on_off, tuya.fz.datapoints],
        toZigbee: [tz.on_off, tuya.tz.datapoints],
        exposes: [
            e.switch(),
            e.battery(),
            e.enum('mode', ea.STATE_SET, ['click', 'switch', 'program']).withDescription('Working mode'),
            e.numeric('lower', ea.STATE_SET).withValueMin(50).withValueMax(100).withValueStep(1).withUnit('%').withDescription('Down movement limit'),
            e.numeric('upper', ea.STATE_SET).withValueMin(0).withValueMax(50).withValueStep(1).withUnit('%').withDescription('Up movement limit'),
            e.numeric('delay', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('s').withDescription('Sustain time'),
            e.binary('reverse', ea.STATE_SET, 'ON', 'OFF').withDescription('Reverse'),
            e.binary('touch', ea.STATE_SET, 'ON', 'OFF').withDescription('Touch controll'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
        meta: {
            tuyaSendCommand: 'sendData',
            tuyaDatapoints: [
                [0x65, 'mode', tuya.valueConverterBasic.lookup({click: tuya.enum(0), switch: tuya.enum(1), program: tuya.enum(2)})],
                [0x66, 'lower', tuya.valueConverter.raw],
                [0x67, 'delay', tuya.valueConverter.raw],
                [0x68, 'reverse', tuya.valueConverterBasic.lookup({ON: tuya.enum(1), OFF: tuya.enum(0)})],
                [0x69, 'battery', tuya.valueConverter.raw],
                [0x6a, 'upper', tuya.valueConverter.raw],
                [0x6b, 'touch', tuya.valueConverterBasic.lookup({ON: true, OFF: false})],
                // ? [0x6c, '', tuya.valueConverter.onOff],
                [0x6d, 'program', tuya.valueConverter.raw],
                // ? [0x70, '', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_8eazvzo6']),
        model: 'SWS6TZ-WHITE',
        vendor: 'Tuya',
        description: '6 gang wall switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.switch().withEndpoint('l5'),
            e.switch().withEndpoint('l6'),
            e.current(),
            e.power(),
            e.voltage(),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [21, 'current', tuya.valueConverter.divideBy1000],
                [22, 'power', tuya.valueConverter.divideBy10],
                [23, 'voltage', tuya.valueConverter.divideBy10],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_0j5jma9b'}],
        model: 'ZS-TYG3-SM-61Z',
        vendor: 'Tuya',
        description: 'Smart switch (4 gang + 2 scene) with backlight and neutral wire',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch().withDescription('All Switches'),
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.switch().withEndpoint('l4'),
            tuya.exposes.switch().withEndpoint('l5'),
            tuya.exposes.switch().withEndpoint('l6'),
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            tuya.exposes.countdown().withEndpoint('l1'),
            tuya.exposes.countdown().withEndpoint('l2'),
            tuya.exposes.countdown().withEndpoint('l3'),
            tuya.exposes.countdown().withEndpoint('l4'),
            tuya.exposes.countdown().withEndpoint('l5'),
            tuya.exposes.countdown().withEndpoint('l6'),
            e.power_on_behavior().withAccess(ea.STATE_SET),
        ],
        onEvent: tuya.onEventSetTime,
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1, state: 1, backlight: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [7, 'countdown_l1', tuya.valueConverter.countdown],
                [8, 'countdown_l2', tuya.valueConverter.countdown],
                [9, 'countdown_l3', tuya.valueConverter.countdown],
                [10, 'countdown_l4', tuya.valueConverter.countdown],
                [11, 'countdown_l5', tuya.valueConverter.countdown],
                [12, 'countdown_l6', tuya.valueConverter.countdown],
                [13, 'state', tuya.valueConverter.onOff],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehaviorEnum],
                [16, 'backlight_mode', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_wunufsil'}],
        model: 'ZS-TYG3-SM-21Z',
        vendor: 'Tuya',
        description: '2 gang smart switch with backlight and neutral wire',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch().withDescription('All Switches'),
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            tuya.exposes.countdown().withEndpoint('l1'),
            tuya.exposes.countdown().withEndpoint('l2'),
            e.power_on_behavior().withAccess(ea.STATE_SET),
        ],
        onEvent: tuya.onEventSetTime,
        endpoint: (device) => {
            return {l1: 1, l2: 1, state: 1, backlight: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [7, 'countdown_l1', tuya.valueConverter.countdown],
                [8, 'countdown_l2', tuya.valueConverter.countdown],
                [13, 'state', tuya.valueConverter.onOff],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehaviorEnum],
                [16, 'backlight_mode', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_vhy3iakz'}],
        model: 'ZS-TYG3-SM-31Z',
        vendor: 'Tuya',
        description: '3 gang smart switch with backlight and neutral wire',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch().withDescription('All Switches'),
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            tuya.exposes.countdown().withEndpoint('l1'),
            tuya.exposes.countdown().withEndpoint('l2'),
            tuya.exposes.countdown().withEndpoint('l3'),
            e.power_on_behavior(['off', 'on', 'previous']).withAccess(ea.STATE_SET),
        ],
        onEvent: tuya.onEventSetTime,
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, state: 1, backlight: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [7, 'countdown_l1', tuya.valueConverter.countdown],
                [8, 'countdown_l2', tuya.valueConverter.countdown],
                [9, 'countdown_l3', tuya.valueConverter.countdown],
                [13, 'state', tuya.valueConverter.onOff],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehaviorEnum],
                [16, 'backlight_mode', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_k6jhsr0q'}],
        model: 'ZS-TYG3-SM-41Z',
        vendor: 'Tuya',
        description: '4 gang smart switch with backlight and neutral wire',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch().withDescription('All Switches'),
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.switch().withEndpoint('l4'),
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            tuya.exposes.countdown().withEndpoint('l1'),
            tuya.exposes.countdown().withEndpoint('l2'),
            tuya.exposes.countdown().withEndpoint('l3'),
            tuya.exposes.countdown().withEndpoint('l4'),
            e.power_on_behavior(['off', 'on', 'previous']).withAccess(ea.STATE_SET),
        ],
        onEvent: tuya.onEventSetTime,
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, state: 1, backlight: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [7, 'countdown_l1', tuya.valueConverter.countdown],
                [8, 'countdown_l2', tuya.valueConverter.countdown],
                [9, 'countdown_l3', tuya.valueConverter.countdown],
                [10, 'countdown_l4', tuya.valueConverter.countdown],
                [13, 'state', tuya.valueConverter.onOff],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehaviorEnum],
                [16, 'backlight_mode', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nvodulvi']),
        model: 'M9-zigbee-SL',
        vendor: 'Tuya',
        description: 'Smart Switch (4 gang + 4 scene) with neutral wire and motion sensing',
        fromZigbee: [tuya.fz.datapoints, fz.ias_occupancy_only_alarm_2, tuya.fz.indicator_mode],
        toZigbee: [tuya.tz.datapoints, tuya.tz.power_on_behavior_1, tuya.tz.backlight_indicator_mode_1],
        configure: tuya.configureMagicPacket,
        exposes: [
            ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => tuya.exposes.switch().withEndpoint(`l${i}`)),
            ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => e.power_on_behavior().withAccess(ea.STATE_SET).withEndpoint(`l${i}`)),
            ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => tuya.exposes.switchMode().withEndpoint(`l${i}`)),
            ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => tuya.exposes.lightMode().withEndpoint(`l${i}`)),
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            e.action(['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5', 'scene_6', 'scene_7', 'scene_8']),
            e.presence(),
            new exposes.Numeric('delay', ea.STATE_SET).withUnit('sec').withDescription('light off delay').withValueMin(0).withValueMax(1000),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1, state: 1, backlight: 1, l7: 1, l8: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [16, 'backlight_mode', tuya.valueConverter.onOff],
                [29, 'power_on_behavior_l1', tuya.valueConverter.powerOnBehaviorEnum],
                [30, 'power_on_behavior_l2', tuya.valueConverter.powerOnBehaviorEnum],
                [31, 'power_on_behavior_l3', tuya.valueConverter.powerOnBehaviorEnum],
                [32, 'power_on_behavior_l4', tuya.valueConverter.powerOnBehaviorEnum],
                [33, 'power_on_behavior_l5', tuya.valueConverter.powerOnBehaviorEnum],
                [34, 'power_on_behavior_l6', tuya.valueConverter.powerOnBehaviorEnum],
                [101, 'action', tuya.valueConverter.static('scene_1')],
                [102, 'action', tuya.valueConverter.static('scene_2')],
                [103, 'action', tuya.valueConverter.static('scene_3')],
                [104, 'action', tuya.valueConverter.static('scene_4')],
                [105, 'presence', tuya.valueConverter.raw],
                [106, 'delay', tuya.valueConverter.raw],
                [108, 'action', tuya.valueConverter.static('scene_5')],
                [109, 'action', tuya.valueConverter.static('scene_6')],
                [110, 'action', tuya.valueConverter.static('scene_7')],
                [111, 'action', tuya.valueConverter.static('scene_8')],
                [112, 'state_l7', tuya.valueConverter.onOff],
                [113, 'state_l8', tuya.valueConverter.onOff],
                [114, 'switch_mode_l1', tuya.valueConverter.switchMode],
                [115, 'switch_mode_l2', tuya.valueConverter.switchMode],
                [116, 'switch_mode_l3', tuya.valueConverter.switchMode],
                [117, 'switch_mode_l4', tuya.valueConverter.switchMode],
                [118, 'switch_mode_l5', tuya.valueConverter.switchMode],
                [119, 'switch_mode_l6', tuya.valueConverter.switchMode],
                [120, 'switch_mode_l7', tuya.valueConverter.switchMode],
                [121, 'switch_mode_l8', tuya.valueConverter.switchMode],
                [122, 'light_mode_l1', tuya.valueConverter.lightMode],
                [123, 'light_mode_l2', tuya.valueConverter.lightMode],
                [124, 'light_mode_l3', tuya.valueConverter.lightMode],
                [125, 'light_mode_l4', tuya.valueConverter.lightMode],
                [126, 'light_mode_l5', tuya.valueConverter.lightMode],
                [127, 'light_mode_l6', tuya.valueConverter.lightMode],
                [128, 'light_mode_l7', tuya.valueConverter.lightMode],
                [129, 'light_mode_l8', tuya.valueConverter.lightMode],
                [130, 'power_on_behavior_l7', tuya.valueConverter.powerOnBehaviorEnum],
                [131, 'power_on_behavior_l8', tuya.valueConverter.powerOnBehaviorEnum],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_sooucan5', '_TZE204_oqtpvx51']),
        model: 'YXZBRB58',
        vendor: 'Tuya',
        description: 'Smart human presence sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.illuminance_lux(),
            e.presence(),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1).withDescription('Sensitivity of the radar'),
            e
                .numeric('minimum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withDescription('Minimum range')
                .withUnit('m'),
            e
                .numeric('maximum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withDescription('Maximum range')
                .withUnit('m'),
            e
                .numeric('detection_delay', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withDescription('Detection delay')
                .withUnit('s'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0).withValueMax(1500).withValueStep(1).withDescription('Fading time').withUnit('s'),
            e
                .enum('radar_scene', ea.STATE_SET, ['default', 'bathroom', 'bedroom', 'sleeping', 'unknown'])
                .withDescription('Presets for sensitivity for presence and movement'),
        ],
        meta: {
            tuyaDatapoints: [
                [0x01, 'presence', tuya.valueConverter.trueFalse1],
                [0x02, 'radar_sensitivity', tuya.valueConverter.raw],
                [0x03, 'minimum_range', tuya.valueConverter.divideBy100],
                [0x04, 'maximum_range', tuya.valueConverter.divideBy100],
                [0x65, 'illuminance_lux', tuya.valueConverter.raw],
                [0x66, 'detection_delay', tuya.valueConverter.divideBy10],
                [0x67, 'fading_time', tuya.valueConverter.divideBy10],
                [
                    0x68,
                    'radar_scene',
                    tuya.valueConverterBasic.lookup({
                        default: tuya.enum(0),
                        bathroom: tuya.enum(1),
                        bedroom: tuya.enum(2),
                        sleeping: tuya.enum(3),
                        unknown: tuya.enum(4),
                    }),
                ],
                [0x69, 'target_distance', tuya.valueConverter.divideBy100],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_86nbew0j', '_TZE200_io0zdqh1', '_TZE200_drs6j6m5', '_TZE200_ywe90lt0', '_TZE200_qyss8gjy']),
        model: 'TS0601_light',
        vendor: 'Tuya',
        description: 'Light',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [tuya.exposes.lightBrightness(), e.power_on_behavior().withAccess(ea.STATE_SET)],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'power_on_behavior', tuya.valueConverter.powerOnBehavior],
                [3, 'brightness', tuya.valueConverter.scale0_254to0_1000],
            ],
        },
        whiteLabel: [
            tuya.whitelabel('Ltech', 'TY-12-100-400-W1Z', '12W 100-400mA Zigbee CC Dimmable LED driver', ['_TZE200_86nbew0j']),
            tuya.whitelabel('Ltech', 'TY-75-24-G2Z2', '150W 24V Zigbee CV tunable white LED driver', ['_TZE200_io0zdqh1']),
            tuya.whitelabel('Lifud', 'LF-AAZ012-0400-42', 'Zigbee dimmable LED driver 4-40W 220-240Vac', ['_TZE200_drs6j6m5']),
            tuya.whitelabel('Lifud', 'LF-GAZ150A6250-24', 'Lifud Zigbee LED Driver CCT 150W 24V', ['_TZE200_ywe90lt0']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_k7mfgaen', '_TZE204_fncxk3ob']),
        model: 'YXZBSL',
        vendor: 'Tuya',
        description: 'Smart siren',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.binary('alarm', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn the light of the alarm ON/OFF'),
            e.enum('type', ea.STATE_SET, ['sound', 'light', 'sound+light', 'normal']).withDescription('Alarm type'),
            e.enum('volume', ea.STATE_SET, ['mute', 'low', 'middle', 'high']).withDescription('Volume of the alarm'),
            e
                .enum('ringtone', ea.STATE_SET, [
                    'melody1',
                    'melody2',
                    'melody3',
                    'melody4',
                    'melody5',
                    'melody6',
                    'melody7',
                    'melody8',
                    'door',
                    'water',
                    'temperature',
                    'entered',
                    'left',
                ])
                .withDescription('Ringtone of the alarm'),
            e.enum('power_type', ea.STATE, ['battery', 'cable']).withDescription('Power type'),
            e
                .numeric('duration', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(60)
                .withValueStep(1)
                .withUnit('min')
                .withDescription('Duration of the alarm'),
            e.enum('battery_level', ea.STATE, ['low', 'middle', 'high']).withDescription('Battery level state'),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    'type',
                    tuya.valueConverterBasic.lookup({
                        sound: tuya.enum(0),
                        light: tuya.enum(1),
                        'sound+light': tuya.enum(2),
                        normal: tuya.enum(3),
                    }),
                ],
                [
                    5,
                    'volume',
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        middle: tuya.enum(1),
                        high: tuya.enum(2),
                        mute: tuya.enum(3),
                    }),
                ],
                [6, 'power_type', tuya.valueConverterBasic.lookup({cable: false, battery: true})],
                [7, 'duration', tuya.valueConverter.raw],
                [13, 'alarm', tuya.valueConverter.onOff],
                [
                    14,
                    'battery_level',
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        middle: tuya.enum(1),
                        high: tuya.enum(2),
                    }),
                ],
                [15, 'battery', tuya.valueConverter.raw],
                [
                    21,
                    'ringtone',
                    tuya.valueConverterBasic.lookup({
                        melody1: tuya.enum(0),
                        melody2: tuya.enum(1),
                        melody3: tuya.enum(2),
                        melody4: tuya.enum(3),
                        melody5: tuya.enum(4),
                        melody6: tuya.enum(5),
                        melody7: tuya.enum(6),
                        melody8: tuya.enum(7),
                        door: tuya.enum(8),
                        water: tuya.enum(9),
                        temperature: tuya.enum(10),
                        entered: tuya.enum(11),
                        left: tuya.enum(12),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_vmcgja59']),
        model: 'ZYXH',
        vendor: 'Tuya',
        description: '24 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [...Array.from(Array(24).keys()).map((ep) => tuya.exposes.switch().withEndpoint(`l${ep + 1}`))],
        endpoint: (device) => {
            return {
                l1: 1,
                l2: 1,
                l3: 1,
                l4: 1,
                l5: 1,
                l6: 1,
                l7: 1,
                l8: 1,
                l9: 1,
                l10: 1,
                l11: 1,
                l12: 1,
                l13: 1,
                l14: 1,
                l15: 1,
                l16: 1,
                l17: 1,
                l18: 1,
                l19: 1,
                l20: 1,
                l21: 1,
                l22: 1,
                l23: 1,
                l24: 1,
            };
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [0x65, 'state_l7', tuya.valueConverter.onOff],
                [0x66, 'state_l8', tuya.valueConverter.onOff],
                [0x67, 'state_l9', tuya.valueConverter.onOff],
                [0x68, 'state_l10', tuya.valueConverter.onOff],
                [0x69, 'state_l11', tuya.valueConverter.onOff],
                [0x6a, 'state_l12', tuya.valueConverter.onOff],
                [0x6b, 'state_l13', tuya.valueConverter.onOff],
                [0x6c, 'state_l14', tuya.valueConverter.onOff],
                [0x6d, 'state_l15', tuya.valueConverter.onOff],
                [0x6e, 'state_l16', tuya.valueConverter.onOff],
                [0x6f, 'state_l17', tuya.valueConverter.onOff],
                [0x70, 'state_l18', tuya.valueConverter.onOff],
                [0x71, 'state_l19', tuya.valueConverter.onOff],
                [0x72, 'state_l20', tuya.valueConverter.onOff],
                [0x73, 'state_l21', tuya.valueConverter.onOff],
                [0x74, 'state_l22', tuya.valueConverter.onOff],
                [0x75, 'state_l23', tuya.valueConverter.onOff],
                [0x76, 'state_l24', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_ijxvkhd0']),
        model: 'ZY-M100-24G',
        vendor: 'Tuya',
        description: '24G MmWave radar human presence motion sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.enum('state', ea.STATE, ['none', 'presence', 'move']).withDescription('Presence state sensor'),
            e.presence().withDescription('Occupancy'),
            e.numeric('distance', ea.STATE).withDescription('Target distance'),
            e.illuminance_lux().withDescription('Illuminance sensor'),
            e.numeric('move_sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(10).withValueStep(1).withDescription('Motion sensitivity'),
            e.numeric('presence_sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(10).withValueStep(1).withDescription('Presence sensitivity'),
            e
                .numeric('radar_range', ea.STATE_SET)
                .withValueMin(1.5)
                .withValueMax(5.5)
                .withValueStep(1)
                .withUnit('m')
                .withDescription('Maximum range'),
            e
                .numeric('presence_timeout', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(1500)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('Fade time'),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [112, 'presence', tuya.valueConverter.trueFalse1],
                [106, 'move_sensitivity', tuya.valueConverter.divideBy10FromOnly],
                [111, 'presence_sensitivity', tuya.valueConverter.divideBy10FromOnly],
                [107, 'radar_range', tuya.valueConverter.divideBy100],
                [109, 'distance', tuya.valueConverter.divideBy100],
                [110, 'presence_timeout', tuya.valueConverter.raw],
                [104, 'illuminance_lux', tuya.valueConverter.raw],
                [102, 'illuminance_treshold_max', tuya.valueConverter.raw],
                [103, 'illuminance_treshold_min', tuya.valueConverter.raw],
                [105, 'state', tuya.valueConverterBasic.lookup({none: 0, presence: 1, move: 2})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_7gclukjs']),
        model: 'ZY-M100-24GV2',
        vendor: 'Tuya',
        description: '24G MmWave radar human presence motion sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.enum('state', ea.STATE, ['none', 'presence', 'move']).withDescription('Presence state sensor'),
            e.presence().withDescription('Occupancy'),
            e.numeric('distance', ea.STATE).withDescription('Target distance'),
            e.illuminance_lux().withDescription('Illuminance sensor'),
            e.numeric('move_sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(10).withValueStep(1).withDescription('Motion Sensitivity'),
            e.numeric('presence_sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(10).withValueStep(1).withDescription('Presence Sensitivity'),
            e
                .numeric('detection_distance_min', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(8.25)
                .withValueStep(0.75)
                .withUnit('m')
                .withDescription('Minimum range'),
            e
                .numeric('detection_distance_max', ea.STATE_SET)
                .withValueMin(0.75)
                .withValueMax(9.0)
                .withValueStep(0.75)
                .withUnit('m')
                .withDescription('Maximum range'),
            e
                .numeric('presence_timeout', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(1500)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('Fade time'),
        ],
        meta: {
            tuyaDatapoints: [
                [104, 'presence', tuya.valueConverter.trueFalse1],
                [2, 'move_sensitivity', tuya.valueConverter.divideBy10],
                [102, 'presence_sensitivity', tuya.valueConverter.divideBy10],
                [3, 'detection_distance_min', tuya.valueConverter.divideBy100],
                [4, 'detection_distance_max', tuya.valueConverter.divideBy100],
                [9, 'distance', tuya.valueConverter.divideBy100],
                [105, 'presence_timeout', tuya.valueConverter.raw],
                [103, 'illuminance_lux', tuya.valueConverter.raw],
                [1, 'state', tuya.valueConverterBasic.lookup({none: 0, presence: 1, move: 2})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_ya4ft0w4']),
        model: 'ZY-M100-24GV3',
        vendor: 'Tuya',
        description: '24G MmWave radar human presence motion sensor（added distance switch）',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.enum('state', ea.STATE, ['none', 'presence', 'move']).withDescription('Presence state sensor'),
            e.presence().withDescription('Occupancy'),
            e.numeric('distance', ea.STATE).withDescription('Target distance'),
            e.binary('find_switch', ea.STATE_SET, 'ON', 'OFF').withDescription('distance switch'),
            e.illuminance_lux().withDescription('Illuminance sensor'),
            e.numeric('move_sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(10).withValueStep(1).withDescription('Motion Sensitivity'),
            e.numeric('presence_sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(10).withValueStep(1).withDescription('Presence Sensitivity'),
            e
                .numeric('detection_distance_min', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(8.25)
                .withValueStep(0.75)
                .withUnit('m')
                .withDescription('Minimum range'),
            e
                .numeric('detection_distance_max', ea.STATE_SET)
                .withValueMin(0.75)
                .withValueMax(9.0)
                .withValueStep(0.75)
                .withUnit('m')
                .withDescription('Maximum range'),
            e
                .numeric('presence_timeout', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(15000)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('Fade time'),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    null,
                    {
                        from: function (v, meta) {
                            if (v == 0) {
                                return {
                                    state: 'none',
                                    presence: false,
                                };
                            } else if (v == 1) {
                                return {
                                    state: 'presence',
                                    presence: true,
                                };
                            } else if (v == 2) {
                                return {
                                    state: 'move',
                                    presence: true,
                                };
                            } else {
                                return {
                                    state: 'none',
                                    presence: false,
                                };
                            }
                        },
                    },
                ],
                [2, 'move_sensitivity', tuya.valueConverter.raw],
                [3, 'detection_distance_min', tuya.valueConverter.divideBy100],
                [4, 'detection_distance_max', tuya.valueConverter.divideBy100],
                [9, 'distance', tuya.valueConverter.divideBy10],
                [101, 'find_switch', tuya.valueConverter.onOff],
                [102, 'presence_sensitivity', tuya.valueConverter.raw],
                [103, 'illuminance_lux', tuya.valueConverter.raw],
                [105, 'presence_timeout', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_e9ajs4ft']),
        model: 'CTL-R1-TY-Zigbee',
        vendor: 'Tuya',
        description: '24G radar human presence motion sensor.',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.illuminance().withUnit('lx'),
            e.presence(),
            e
                .numeric('presence_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1)
                .withUnit('%')
                .withDescription('Presence sensitivity'),
            e
                .numeric('detection_range', ea.STATE_SET)
                .withValueMin(1.5)
                .withValueMax(4.5)
                .withValueStep(0.1)
                .withUnit('m')
                .withDescription('Detection range'),
            e
                .numeric('detection_delay', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(600)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('Presence detection delay'),
            e
                .numeric('illuminance_treshold_max', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(2000)
                .withValueStep(1)
                .withUnit('lx')
                .withDescription('The max illumiance threshold to turn on the light'),
            e
                .numeric('illuminance_treshold_min', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(2000)
                .withValueStep(1)
                .withUnit('lx')
                .withDescription('The min illumiance threshold to turn on the light'),
            e
                .binary('presence_illuminance_switch', ea.STATE_SET, true, false)
                .withDescription(`Whether to enable 'light_switch' illumination is between min/max threshold`),
            e
                .binary('light_switch', ea.STATE, 'ON', 'OFF')
                .withDescription('This state will determine the light on/off based on the lighting threshold and presence sensing'),
            e.binary('light_linkage', ea.STATE_SET, true, false).withDescription('Light linkage'),
            e
                .enum('detection_method', ea.STATE_SET, ['only_move', 'exist_move'])
                .withDescription(`When 'only_move' is used, presence will only be triggered when there is movement`),
            e.enum('indicator_light', ea.STATE_SET, ['presence', 'off', 'on']).withDescription('Controls when the indicator light is turned on'),
            e
                .binary('identify', ea.STATE_SET, true, false)
                .withDescription('After turning on, the indicator light quickly flashes, used to locate devices'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [2, 'presence_sensitivity', tuya.valueConverter.raw],
                [4, 'detection_range', tuya.valueConverter.divideBy10],
                [101, 'illuminance', tuya.valueConverter.raw],
                [102, 'illuminance_treshold_max', tuya.valueConverter.raw],
                [103, 'illuminance_treshold_min', tuya.valueConverter.raw],
                [104, 'detection_delay', tuya.valueConverter.raw],
                [109, 'presence_illuminance_switch', tuya.valueConverter.trueFalseEnum1],
                [105, 'light_switch', tuya.valueConverter.onOff],
                [106, 'light_linkage', tuya.valueConverter.trueFalseEnum1],
                [107, 'indicator_light', tuya.valueConverterBasic.lookup({presence: tuya.enum(0), off: tuya.enum(1), on: tuya.enum(2)})],
                [108, 'detection_method', tuya.valueConverterBasic.lookup({only_move: tuya.enum(0), exist_move: tuya.enum(1)})],
                [113, 'find_switch', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE204_sbyx0lm6',
            '_TZE204_clrdrnya',
            '_TZE204_dtzziy1e',
            '_TZE204_iaeejhvf',
            '_TZE204_mtoaryre',
            '_TZE200_mp902om5',
            '_TZE204_pfayrzcw',
            '_TZE284_4qznlkbu',
            '_TZE200_sbyx0lm6',
        ]),
        model: 'MTG075-ZB-RL',
        vendor: 'Tuya',
        description: '2.4G/5.8G human presence sensor with relay',
        whiteLabel: [
            tuya.whitelabel('Tuya', 'MTG275-ZB-RL', '2.4G/5.8G MmWave radar human presence motion sensor', ['_TZE204_dtzziy1e']),
            tuya.whitelabel('Tuya', 'MTG035-ZB-RL', 'Human presence sensor with relay', ['_TZE204_pfayrzcw']),
            tuya.whitelabel('QA', 'QASZ24R', 'mmWave 24 Ghz sensor with relay', ['_TZE284_4qznlkbu']),
        ],
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.presence(),
            e.illuminance_lux(),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            e
                .numeric('radar_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9)
                .withValueStep(1)
                .withDescription('Detection threshold for the strength of object energy'),
            e
                .numeric('detection_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(8)
                .withValueStep(0.1)
                .withUnit('m')
                .withDescription('Maximum distance detected by the sensor'),
            e
                .numeric('shield_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(8)
                .withValueStep(0.1)
                .withUnit('m')
                .withDescription('Nearest distance detected by the sensor'),
            e
                .numeric('entry_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9)
                .withValueStep(1)
                .withDescription('Sensitivity threshold triggered for the first time when the target enters the detection range'),
            e
                .numeric('entry_distance_indentation', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(8)
                .withValueStep(0.1)
                .withUnit('m')
                .withDescription('Indent the distance inward based on the dectection distance'),
            e
                .numeric('entry_filter_time', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withUnit('s')
                .withDescription('Sensitivity threshold triggered for the first time when the target enters the detection range '),
            e
                .numeric('departure_delay', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(600)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('Confirmation time after the target disappears'),
            e
                .numeric('block_time', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withUnit('s')
                .withDescription('Time for the target to be detected again after switching from manned(occupy) to unmanned(unoccupy) mode'),
            e.binary('breaker_status', ea.STATE_SET, 'ON', 'OFF').withDescription('Remotely control the breaker in standard mode'),
            e
                .enum('breaker_mode', ea.STATE_SET, ['standard', 'local'])
                .withDescription('Breaker mode: standard is remotely controlled, local is automatic'),
            e
                .numeric('illuminance_threshold', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(420)
                .withValueStep(0.1)
                .withUnit('lx')
                .withDescription('Illumination threshold for local (automatic) switching mode operation'),
            e.enum('status_indication', ea.STATE_SET, ['OFF', 'ON']).withDescription('Indicator light will flash when human presence is detected'),
            e
                .enum('sensor', ea.STATE_SET, ['on', 'off', 'occupied', 'unoccupied'])
                .withDescription(
                    `The radar sensor can be set in four states: on, off, occupied and unoccupied. For example, if set to occupied, ` +
                        `it will continue to maintain presence regardless of whether someone is present or not. If set to unoccupied, the unoccupied ` +
                        `state will be maintained permanently.`,
                ),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [2, 'radar_sensitivity', tuya.valueConverter.raw],
                [3, 'shield_range', tuya.valueConverter.divideBy100],
                [4, 'detection_range', tuya.valueConverter.divideBy100],
                [6, 'equipment_status', tuya.valueConverter.raw],
                [9, 'target_distance', tuya.valueConverter.divideBy100],
                [101, 'entry_filter_time', tuya.valueConverter.divideBy10],
                [102, 'departure_delay', tuya.valueConverter.raw],
                [103, 'cline', tuya.valueConverter.raw],
                [104, 'illuminance_lux', tuya.valueConverter.divideBy10],
                [105, 'entry_sensitivity', tuya.valueConverter.raw],
                [106, 'entry_distance_indentation', tuya.valueConverter.divideBy100],
                [107, 'breaker_mode', tuya.valueConverterBasic.lookup({standard: tuya.enum(0), local: tuya.enum(1)})],
                [108, 'breaker_status', tuya.valueConverterBasic.lookup({OFF: tuya.enum(0), ON: tuya.enum(1)})],
                [109, 'status_indication', tuya.valueConverterBasic.lookup({OFF: tuya.enum(0), ON: tuya.enum(1)})],
                [110, 'illuminance_threshold', tuya.valueConverter.divideBy10],
                [111, 'breaker_polarity', tuya.valueConverterBasic.lookup({NC: tuya.enum(0), NO: tuya.enum(1)})],
                [112, 'block_time', tuya.valueConverter.divideBy10],
                [113, 'parameter_setting_result', tuya.valueConverter.raw],
                [114, 'factory_parameters', tuya.valueConverter.raw],
                [
                    115,
                    'sensor',
                    tuya.valueConverterBasic.lookup({
                        on: tuya.enum(0),
                        off: tuya.enum(1),
                        occupied: tuya.enum(2),
                        unoccupied: tuya.enum(3),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_81yrt3lo']),
        model: 'PJ-1203A',
        vendor: 'Tuya',
        description: 'Bidirectional energy meter with 80A current clamp',
        fromZigbee: [fzLocal.PJ1203A_strict_fz_datapoints, fzLocal.PJ1203A_sync_time_increase_seq],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        options: [
            e
                .binary('late_energy_flow_a', ea.SET, true, false)
                .withDescription(`Delay channel A publication until the next energy flow update (default false).`),
            e
                .binary('late_energy_flow_b', ea.SET, true, false)
                .withDescription(`Delay channel B publication until the next energy flow update (default false).`),
            e
                .binary('signed_power_a', ea.SET, true, false)
                .withDescription(`Report energy flow direction for channel A using signed power (default false).`),
            e
                .binary('signed_power_b', ea.SET, true, false)
                .withDescription(`Report energy flow direction for channel B using signed power (default false).`),
        ],
        exposes: [
            e.ac_frequency(),
            e.voltage(),
            tuya.exposes.powerWithPhase('a'),
            tuya.exposes.powerWithPhase('b'),
            tuya.exposes.powerWithPhase('ab'),
            tuya.exposes.currentWithPhase('a'),
            tuya.exposes.currentWithPhase('b'),
            tuya.exposes.powerFactorWithPhase('a'),
            tuya.exposes.powerFactorWithPhase('b'),
            tuya.exposes.energyFlowWithPhase('a', ['sign']),
            tuya.exposes.energyFlowWithPhase('b', ['sign']),
            tuya.exposes.energyWithPhase('a'),
            tuya.exposes.energyWithPhase('b'),
            tuya.exposes.energyProducedWithPhase('a'),
            tuya.exposes.energyProducedWithPhase('b'),
            e
                .numeric('update_frequency', ea.STATE_SET)
                .withUnit('s')
                .withDescription('Update frequency')
                .withValueMin(3)
                .withValueMax(60)
                .withPreset('default', 10, 'Default value'),
            // Timestamp a and b are basically equivalent to last_seen
            // but they indicate when the unsigned value of power_a and power_b
            // were received. They can be several seconds in the past if
            // the publication was delayed because of the late_energy_flow options.
            e.numeric('timestamp_a', ea.STATE).withDescription('Timestamp at power measure (phase a)'),
            e.numeric('timestamp_b', ea.STATE).withDescription('Timestamp at power measure (phase b)'),
        ],
        meta: {
            multiEndpointSkip: ['power_factor', 'power_factor_phase_b', 'power_factor_phase_c', 'energy'],
            tuyaDatapoints: [
                [111, 'ac_frequency', tuya.valueConverter.divideBy100],
                [112, 'voltage', tuya.valueConverter.divideBy10],
                [101, null, convLocal.powerPJ1203A('a')], // power_a
                [105, null, convLocal.powerPJ1203A('b')], // power_b
                [113, null, convLocal.currentPJ1203A('a')], // current_a
                [114, null, convLocal.currentPJ1203A('b')], // current_b
                [110, null, convLocal.powerFactorPJ1203A('a')], // power_factor_a
                [121, null, convLocal.powerFactorPJ1203A('b')], // power_factor_b
                [102, null, convLocal.energyFlowPJ1203A('a')], // energy_flow_a or the sign of power_a
                [104, null, convLocal.energyFlowPJ1203A('b')], // energy_flow_b or the sign of power_b
                [115, null, convLocal.powerAbPJ1203A()],
                [106, 'energy_a', tuya.valueConverter.divideBy100],
                [108, 'energy_b', tuya.valueConverter.divideBy100],
                [107, 'energy_produced_a', tuya.valueConverter.divideBy100],
                [109, 'energy_produced_b', tuya.valueConverter.divideBy100],
                [129, 'update_frequency', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_rks0sgb7']),
        model: 'PC311-Z-TY',
        vendor: 'Tuya',
        description: 'Bidirectional energy meter with 80A current clamp',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.ac_frequency(),
            e.voltage(),
            e.power(),
            e.current(),
            e.energy(),
            e.energy_produced(),
            tuya.exposes.powerWithPhase('a'),
            tuya.exposes.powerWithPhase('b'),
            tuya.exposes.currentWithPhase('a'),
            tuya.exposes.currentWithPhase('b'),
            tuya.exposes.powerFactorWithPhase('a'),
            tuya.exposes.powerFactorWithPhase('b'),
            tuya.exposes.energyWithPhase('a'),
            tuya.exposes.energyWithPhase('b'),
            tuya.exposes.energyProducedWithPhase('a'),
            tuya.exposes.energyProducedWithPhase('b'),
        ],
        meta: {
            multiEndpointSkip: ['power_factor', 'power_factor_phase_b', 'power_factor_phase_c', 'energy'],
            tuyaDatapoints: [
                [113, 'ac_frequency', tuya.valueConverter.raw],
                [108, 'power_a', tuya.valueConverter.raw],
                [111, 'power_b', tuya.valueConverter.raw],
                [9, 'power', tuya.valueConverter.raw],
                [106, 'voltage', tuya.valueConverter.divideBy10],
                [107, 'current_a', tuya.valueConverter.divideBy1000],
                [110, 'current_b', tuya.valueConverter.divideBy1000],
                [105, 'current', tuya.valueConverter.divideBy1000],
                [109, 'power_factor_a', tuya.valueConverter.raw],
                [112, 'power_factor_b', tuya.valueConverter.raw],
                [1, 'energy', tuya.valueConverter.divideBy100],
                [101, 'energy_a', tuya.valueConverter.divideBy100],
                [103, 'energy_b', tuya.valueConverter.divideBy100],
                [102, 'energy_produced_a', tuya.valueConverter.divideBy100],
                [104, 'energy_produced_b', tuya.valueConverter.divideBy100],
                [2, 'energy_produced', tuya.valueConverter.divideBy100],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_mpbki2zm']),
        model: 'TYBAC-006',
        vendor: 'Tuya',
        description: 'Wall-mount thermostat for 2-pipe fan-coil unit',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('state', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn the thermostat ON/OFF'),
            e.child_lock(),
            e
                .climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET)
                .withSystemMode(['cool', 'heat', 'fan_only'], ea.STATE_SET)
                .withFanMode(['low', 'medium', 'high', 'auto'], ea.STATE_SET)
                .withLocalTemperatureCalibration(-5, 5, 0.5, ea.STATE_SET),
            e.min_temperature().withValueMin(5).withValueMax(15),
            e.max_temperature().withValueMin(15).withValueMax(45),
            e.binary('eco_mode', ea.STATE_SET, 'ON', 'OFF').withDescription('ECO mode ON/OFF'),
            e.max_temperature_limit().withDescription('ECO Heating energy-saving temperature (default: 20 ºC)').withValueMin(15).withValueMax(30),
            e.min_temperature_limit().withDescription('ECO Cooling energy-saving temperature (default: 26 ºC)').withValueMin(15).withValueMax(30),
            e.deadzone_temperature().withValueMin(0).withValueMax(5).withValueStep(1),
            e.binary('valve', ea.STATE, 'OPEN', 'CLOSE').withDescription('3-Way Valve State'),
            e.binary('manual_mode', ea.STATE_SET, 'ON', 'OFF').withDescription('Manual = ON or Schedule = OFF'),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [2, 'system_mode', tuya.valueConverterBasic.lookup({cool: tuya.enum(0), heat: tuya.enum(1), fan_only: tuya.enum(2)})],
                [4, 'eco_mode', tuya.valueConverter.onOff],
                [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [19, 'max_temperature', tuya.valueConverter.divideBy10],
                [24, 'local_temperature', tuya.valueConverter.divideBy10],
                [26, 'min_temperature', tuya.valueConverter.divideBy10],
                [27, 'local_temperature_calibration', tuya.valueConverter.localTemperatureCalibration],
                [28, 'fan_mode', tuya.valueConverterBasic.lookup({low: tuya.enum(0), medium: tuya.enum(1), high: tuya.enum(2), auto: tuya.enum(3)})],
                [36, 'valve', tuya.valueConverterBasic.lookup({OPEN: 0, CLOSE: 1})],
                [40, 'child_lock', tuya.valueConverter.lockUnlock],
                [103, 'deadzone_temperature', tuya.valueConverter.raw],
                [104, 'min_temperature_limit', tuya.valueConverter.divideBy10],
                [105, 'max_temperature_limit', tuya.valueConverter.divideBy10],
                [106, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(7)],
                [107, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(6)],
                [108, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(5)],
                [109, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(4)],
                [110, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(3)],
                [111, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(2)],
                [112, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(1)],
                [101, 'manual_mode', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_mhxn2jso']),
        model: 'rtsc11r',
        vendor: 'Tuya',
        description: '5.8G human presence sensor with relay',
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        exposes: [
            e.presence(),
            e.illuminance().withUnit('lx'),
            e
                .numeric('detection_delay', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withDescription('Detection delay')
                .withUnit('s'),
            e
                .numeric('detection_distance', ea.STATE)
                .withValueMin(0)
                .withValueMax(1000)
                .withValueStep(1)
                .withDescription('Distance of detected person')
                .withUnit('cm'),
            e.numeric('sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withDescription('Detection sensitivity'),
            e
                .numeric('keep_time', ea.STATE_SET)
                .withValueMin(5)
                .withValueMax(3600)
                .withValueStep(1)
                .withDescription('Detection keep time')
                .withUnit('s'),
            e
                .numeric('minimum_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(1000)
                .withValueStep(50)
                .withDescription('Minimum detection range')
                .withUnit('m'),
            e
                .numeric('maximum_range', ea.STATE_SET)
                .withValueMin(50)
                .withValueMax(1000)
                .withValueStep(50)
                .withDescription('Maximum detection range')
                .withUnit('m'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [12, 'detection_delay', tuya.valueConverter.divideBy10],
                [19, 'detection_distance', tuya.valueConverter.raw],
                [20, 'illuminance', tuya.valueConverter.raw],
                [101, 'sensitivity', tuya.valueConverter.divideBy10],
                [102, 'keep_time', tuya.valueConverter.raw],
                [111, 'minimum_range', tuya.valueConverter.divideBy100],
                [112, 'maximum_range', tuya.valueConverter.divideBy100],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_kyhbrfyl']),
        model: 'NAS-PS09B2',
        vendor: 'Neo',
        description: 'Human presence sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.occupancy(),
            e.enum('human_motion_state', ea.STATE, ['none', 'small', 'large']).withDescription('Human Motion State'),
            e
                .numeric('departure_delay', ea.STATE_SET)
                .withUnit('s')
                .withValueMin(3)
                .withValueMax(600)
                .withValueStep(1)
                .withDescription('Presence Time'),
            e
                .numeric('radar_range', ea.STATE_SET)
                .withUnit('cm')
                .withValueMin(150)
                .withValueMax(600)
                .withValueStep(75)
                .withDescription('Motion Range Detection'),
            e
                .numeric('radar_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(7)
                .withValueStep(1)
                .withDescription('Motion Detection Sensitivity'),
            e
                .numeric('presence_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(7)
                .withValueStep(1)
                .withDescription('Motionless Detection Sensitivity'),
            e
                .numeric('dis_current', ea.STATE)
                .withUnit('cm')
                .withValueMin(0)
                .withValueMax(1000)
                .withValueStep(1)
                .withLabel('Current distance')
                .withDescription('Current Distance of Detected Motion'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'occupancy', tuya.valueConverter.trueFalse1],
                [11, 'human_motion_state', tuya.valueConverterBasic.lookup({none: 0, small: 1, large: 2})],
                [12, 'departure_delay', tuya.valueConverter.raw],
                [13, 'radar_range', tuya.valueConverter.raw],
                [15, 'radar_sensitivity', tuya.valueConverter.raw],
                [16, 'presence_sensitivity', tuya.valueConverter.raw],
                [19, 'dis_current', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_v1jqz5cy', '_TZE200_d9mzkhoq']),
        model: 'BLE-YL01',
        vendor: 'Tuya',
        description: 'Smart WiFi Zigbee chlorine meter',
        whiteLabel: [
            tuya.whitelabel('Tuya', 'BLE-YL01', 'Smart WiFi Zigbee chlorine meter', ['_TZE200_v1jqz5cy']),
            tuya.whitelabel('Tuya', 'YK-S03', 'Smart pH and Chlorine Tester for Swimming Pool', ['_TZE200_d9mzkhoq']),
        ],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        // Don't query too often. Values are not always updated. https://github.com/Koenkk/zigbee2mqtt/issues/18704
        onEvent: tuya.onEvent({queryOnDeviceAnnounce: true, queryIntervalSeconds: 5 * 60}),
        configure: tuya.configureMagicPacket,
        exposes: [
            e.numeric('tds', ea.STATE).withUnit('ppm').withDescription('Total Dissolved Solids'),
            e.temperature(),
            e.battery(),
            e
                .numeric('ph', ea.STATE)
                .withUnit('pH')
                .withDescription(
                    'pH value, if the pH value is lower than 6.5, it means that the water quality ' +
                        'is too acidic and has impurities, and it is necessary to add disinfectant water for disinfection',
                ),
            e.numeric('ec', ea.STATE).withUnit('µS/cm').withDescription('Electrical conductivity'),
            e
                .numeric('orp', ea.STATE)
                .withUnit('mV')
                .withDescription(
                    'Oxidation Reduction Potential value. If the ORP value is above 850mv, it ' +
                        'means that the disinfectant has been added too much, and it is necessary to add water or change the water for neutralization. ' +
                        'If the ORP value is below 487mv, it means that too little disinfectant has been added and the pool needs to be disinfected again',
                ),
            e
                .numeric('free_chlorine', ea.STATE)
                .withUnit('mg/L')
                .withDescription(
                    'Free chlorine value. The water in the swimming pool should ' +
                        'be between 6.5-8ph and ORP should be between 487-840mv, and the chlorine value will be displayed normally. Chlorine will not ' +
                        'be displayed if either value is out of range',
                ),
            e.numeric('ph_max', ea.STATE_SET).withUnit('pH').withDescription('pH maximal value').withValueMin(0).withValueMax(20),
            e.numeric('ph_min', ea.STATE_SET).withUnit('pH').withDescription('pH minimal value').withValueMin(0).withValueMax(20),
            e
                .numeric('ec_max', ea.STATE_SET)
                .withUnit('µS/cm')
                .withDescription('Electrical Conductivity maximal value')
                .withValueMin(0)
                .withValueMax(20000),
            e
                .numeric('ec_min', ea.STATE_SET)
                .withUnit('µS/cm')
                .withDescription('Electrical Conductivity minimal value')
                .withValueMin(0)
                .withValueMax(100),
            e
                .numeric('orp_max', ea.STATE_SET)
                .withUnit('mV')
                .withDescription('Oxidation Reduction Potential maximal value')
                .withValueMin(0)
                .withValueMax(1000),
            e
                .numeric('orp_min', ea.STATE_SET)
                .withUnit('mV')
                .withDescription('Oxidation Reduction Potential minimal value')
                .withValueMin(0)
                .withValueMax(1000),
            e
                .numeric('free_chlorine_max', ea.STATE_SET)
                .withUnit('mg/L')
                .withDescription('Free Chlorine maximal value')
                .withValueMin(0)
                .withValueMax(15),
            e
                .numeric('free_chlorine_min', ea.STATE_SET)
                .withUnit('mg/L')
                .withDescription('Free Chlorine minimal value')
                .withValueMin(0)
                .withValueMax(15),
            e.numeric('salinity', ea.STATE).withUnit('ppm').withDescription('Salt value'),
            // e.numeric('backlightvalue', ea.STATE).withUnit('gg').withDescription('Backlight Value'),
        ],
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [1, 'tds', tuya.valueConverter.raw],
                [2, 'temperature', tuya.valueConverter.divideBy10],
                [7, 'battery', tuya.valueConverter.raw],
                [10, 'ph', tuya.valueConverter.divideBy100],
                [11, 'ec', tuya.valueConverter.raw],
                [101, 'orp', tuya.valueConverter.raw],
                [102, 'free_chlorine', tuya.valueConverter.divideBy10],
                // [105, 'backlightvalue', tuya.valueConverter.raw],
                [106, 'ph_max', tuya.valueConverter.divideBy10],
                [107, 'ph_min', tuya.valueConverter.divideBy10],
                [108, 'ec_max', tuya.valueConverter.raw],
                [109, 'ec_min', tuya.valueConverter.raw],
                [110, 'orp_max', tuya.valueConverter.raw],
                [111, 'orp_min', tuya.valueConverter.raw],
                [112, 'free_chlorine_max', tuya.valueConverter.divideBy10],
                [113, 'free_chlorine_min', tuya.valueConverter.divideBy10],
                [117, 'salinity', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_mgxy2d9f']),
        model: 'SP02-ZB001',
        vendor: 'iAlarm',
        description: 'Infrared motion sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [e.tamper(), e.battery(), e.occupancy()],
        meta: {
            tuyaDatapoints: [
                [1, 'occupancy', tuya.valueConverter.trueFalse0],
                [4, 'battery', tuya.valueConverter.raw],
                [5, 'tamper', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0201', ['_TZE200_iq4ygaai', '_TZE200_01fvxamo']),
        model: 'THS317-ET-TY',
        vendor: 'Tuya',
        description: 'Temperature sensor with probe',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.temperature(), e.battery()],
        whiteLabel: [tuya.whitelabel('OWON', 'THS317-ET-EY', 'Temperature sensor with probe', ['_TZE200_01fvxamo'])],
        meta: {
            tuyaDatapoints: [
                [1, 'temperature', tuya.valueConverter.divideBy10],
                [4, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_iuk8kupi', '_TZE204_iuk8kupi']),
        model: 'DCR-RQJ',
        vendor: 'Tuya',
        description: 'Carbon monoxide sensor gas leak detector',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [e.gas(), tuya.exposes.gasValue().withUnit('LEL %'), e.carbon_monoxide(), e.co()],
        meta: {
            tuyaDatapoints: [
                [1, 'gas', tuya.valueConverter.trueFalseEnum0],
                [2, 'gas_value', tuya.valueConverter.divideBy1000],
                [18, 'carbon_monoxide', tuya.valueConverter.trueFalseEnum0],
                [19, 'co', tuya.valueConverter.divideBy100],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nojsjtj2']),
        model: 'ZG-101Z',
        vendor: 'Loginovo',
        description: 'SOS button',
        extend: [
            tuya.modernExtend.combineActions([
                tuya.modernExtend.dpAction({dp: 26, lookup: {sos: 0}}),
                tuya.modernExtend.dpAction({dp: 29, lookup: {emergency: 0}}),
            ]),
            iasZoneAlarm({zoneType: 'generic', zoneAttributes: ['battery_low']}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_muvkrjr5']),
        model: 'SZR07U',
        vendor: 'Tuya',
        description: '24GHz millimeter wave radar',
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        exposes: [
            e.presence(),
            e
                .numeric('detection_range', ea.STATE_SET)
                .withValueMin(1.5)
                .withValueMax(6)
                .withValueStep(0.75)
                .withUnit('m')
                .withDescription('Maximum range'),
            e
                .numeric('radar_sensitivity', ea.STATE_SET)
                .withValueMin(68)
                .withValueMax(90)
                .withValueStep(1)
                .withDescription('Sensitivity of the radar'),
            e
                .numeric('target_distance', ea.STATE)
                .withValueMin(0)
                .withValueMax(1000)
                .withValueStep(1)
                .withDescription('Distance of detected target')
                .withUnit('cm'),
            e.binary('indicator', ea.STATE_SET, 'ON', 'OFF').withDescription('LED indicator'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(3).withValueMax(1799).withValueStep(1).withDescription('Fading time').withUnit('s'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [13, 'detection_range', tuya.valueConverter.divideBy100],
                [16, 'radar_sensitivity', tuya.valueConverter.raw],
                [19, 'target_distance', tuya.valueConverter.raw],
                [101, 'indicator', tuya.valueConverter.onOff],
                [102, null, null], // toggle to enable presence notifications in app is ignored
                [103, 'fading_time', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0004', ['_TZ3000_5ajpkyq6']),
        model: 'TS0004_switch_module_2',
        vendor: 'Tuya',
        description: '4 gang switch module',
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true, indicatorMode: true, endpoints: ['l1', 'l2', 'l3', 'l4']})],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [tuya.whitelabel('AVATTO', 'ZWSM16-4-Zigbee', '4 gang switch module', ['_TZ3000_5ajpkyq6'])],
    },
    {
        fingerprint: [{modelID: 'TS1002', manufacturerName: '_TZ3000_etufnltx'}],
        model: 'F00XN00-04-1',
        vendor: 'FORIA',
        description: 'Dimmer 4 scenes',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            battery({voltage: true}),
            tuya.modernExtend.combineActions([
                actionEnumLookup({
                    actionLookup: {scene_1: 1, scene_2: 2, scene_3: 3, scene_4: 4},
                    cluster: 'genOnOff',
                    commands: ['commandTuyaAction'],
                    attribute: 'data',
                    parse: (msg, attr) => msg.data[attr][1],
                }),
                commandsOnOff(),
                commandsLevelCtrl({commands: ['brightness_move_up', 'brightness_move_down', 'brightness_stop']}),
            ]),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_l6llgoxq', '_TZE204_kobbcyum']),
        model: 'EA4161C-BI',
        vendor: 'Tuya',
        description: 'Single-phase multifunction energy meter (DIN Module)',
        fromZigbee: [tuya.fz.datapoints, tuya.fz.gateway_connection_status],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        whiteLabel: [
            {vendor: 'XOCA', model: 'DAC4121C'},
            tuya.whitelabel('Tongou', 'TOWSMR1', 'Single-phase multifunction energy meter (DIN Module)', ['_TZE204_kobbcyum']),
        ],
        exposes: [e.current(), e.power(), e.voltage(), e.energy(), e.text('meter_id', ea.STATE).withDescription('Meter ID (ID of device)')],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [3, null, null], // Monthly, but sends data only after request
                [4, null, null], // Dayly, but sends data only after request
                [6, null, tuya.valueConverter.phaseVariant2], // voltage and current
                [
                    10,
                    'fault',
                    tuya.valueConverterBasic.lookup({
                        clear: 0,
                        over_current_threshold: 1,
                        over_power_threshold: 2,
                        over_voltage_threshold: 4,
                        wrong_frequency_threshold: 8,
                    }),
                ],
                [11, null, null], // Frozen - strange function, in native app - nothing is clear
                [16, 'state', tuya.valueConverter.onOff],
                [17, null, tuya.valueConverter.threshold], // It's settable, but can't write converter
                [18, 'meter_id', tuya.valueConverter.raw],
                [20, 'clear_fault', tuya.valueConverter.onOff], // Clear fault
                [21, null, null], // Forward Energy T1 - don't know what this
                [22, null, null], // Forward Energy T2 - don't know what this
                [23, null, null], // Forward Energy T3 - don't know what this
                [24, null, null], // Forward Energy T4 - don't know what this
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZ3000_kkerjand']),
        model: 'SZT06 V2.0',
        vendor: 'Tuya',
        description: 'Smart mini temperature and humidity sensor',
        extend: [temperature(), humidity(), identify({isSleepy: true}), battery({voltage: true})],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_pl31aqf5']),
        model: 'ZR360CDB',
        vendor: 'Zorro Alert',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        description: 'Multifunctional CO2 detector',
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.humidity(),
            e.temperature(),
            e.co2(),
            e.enum('alarm_ringtone', ea.STATE_SET, ['melody_1', 'melody_2', 'OFF']).withDescription('Ringtone of the alarm'),
            e.numeric('backlight_mode', ea.STATE_SET).withValueMin(1).withValueMax(3).withValueStep(1).withDescription('Backlight'),
            tuya.exposes.batteryState(),
            e.enum('air_quality', ea.STATE_GET, ['excellent', 'moderate', 'poor']),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'air_quality', tuya.valueConverterBasic.lookup({excellent: tuya.enum(0), moderate: tuya.enum(1), poor: tuya.enum(2)})],
                [2, 'co2', tuya.valueConverter.raw],
                [5, 'alarm_ringtone', tuya.valueConverterBasic.lookup({melody_1: tuya.enum(0), melody_2: tuya.enum(1), OFF: tuya.enum(2)})],
                [14, 'battery_state', tuya.valueConverter.batteryState],
                [17, 'backlight_mode', tuya.valueConverter.raw],
                [18, 'temperature', tuya.valueConverter.raw],
                [19, 'humidity', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS110E', ['_TZ3210_guijtl8k', '_TZ3210_hquixjeg']),
        model: 'QS-Zigbee-D04',
        vendor: 'LEDRON',
        description: '0-10v dimmer',
        fromZigbee: [fz.TS110E, fz.on_off],
        toZigbee: [tz.TS110E_onoff_brightness, tz.TS110E_options, tz.light_brightness_move],
        whiteLabel: [tuya.whitelabel('Ledron', 'QS-Zigbee-D06-DC', 'Dimmer 12-36v', ['_TZ3210_hquixjeg'])],
        exposes: [e.light_brightness().withMinBrightness().withMaxBrightness()],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_edl8pz1k', '_TZE204_edl8pz1k']),
        model: 'TS0601_floor_thermostat',
        vendor: 'Tuya',
        description: 'Zigbee thermostat for electric floors',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime, // Add this if you are getting no converter for 'commandMcuSyncTime'
        configure: tuya.configureMagicPacket,
        exposes: [
            e
                .climate()
                .withSystemMode(['off', 'heat'], ea.STATE_SET)
                .withPreset(['manual', 'auto'])
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withDescription('Floor temperature')
                .withLocalTemperatureCalibration(-9, 9, 0.1, ea.STATE_SET)
                .withDescription('Calibration floor temperature sensor'),
            e.deadzone_temperature().withValueMin(0).withValueMax(5).withValueStep(1).withDescription('Floor temperature'),
            e.child_lock(),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'system_mode', tuya.valueConverterBasic.lookup({heat: true, off: false})],
                [2, 'preset', tuya.valueConverter.tv02Preset()],
                [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [24, 'device_temperature', tuya.valueConverter.divideBy10],
                [27, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration2],
                [36, 'running_state', tuya.valueConverterBasic.lookup({heat: tuya.enum(0), idle: tuya.enum(1)})],
                [40, 'child_lock', tuya.valueConverter.lockUnlock],
                [102, 'local_temperature', tuya.valueConverter.divideBy10],
                [103, 'deadzone_temperature', tuya.valueConverter.raw],
                [110, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [109, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [108, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [107, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [106, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [105, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDP],
                [101, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDP],
            ],
        },
        whiteLabel: [{vendor: 'ELECTSMART', model: 'EST-120Z'}],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_tagezcph'}],
        model: 'PRO-900Z',
        vendor: 'ElectSmart',
        description: 'Thermostat for electric floor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('child_lock', ea.STATE_SET, 'ON', 'OFF').withLabel('Child lock'),
            e.binary('eco_mode', ea.STATE_SET, 'OFF', 'ON').withLabel('ECO mode').withDescription('Default: Off'),
            e
                .numeric('eco_temperature', ea.STATE_SET)
                .withValueMin(5)
                .withValueMax(30)
                .withValueStep(1)
                .withUnit('°C')
                .withDescription('Max temperature in ECO mode. Default: 20'),
            e.binary('valve_state', ea.STATE, false, true).withLabel('Heating in process'),
            e
                .climate()
                .withSystemMode(['off', 'heat'], ea.STATE_SET)
                .withPreset(['manual', 'auto'])
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withDescription('Default: -3'),
            e
                .numeric('deadzone_temperature', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(5)
                .withValueStep(1)
                .withUnit('°C')
                .withDescription('Hysteresis. Default: 1'),
            e.numeric('min_temperature', ea.STATE_SET).withValueMin(5).withValueMax(15).withValueStep(1).withUnit('°C').withDescription('Default: 5'),
            e
                .numeric('max_temperature', ea.STATE_SET)
                .withValueMin(15)
                .withValueMax(45)
                .withValueStep(1)
                .withUnit('°C')
                .withDescription('Default: 35'),
            e
                .numeric('min_temperature_limit', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withUnit('°C')
                .withLabel('Low temperature protection')
                .withDescription('Default: 0'),
            e
                .numeric('max_temperature_limit', ea.STATE_SET)
                .withValueMin(25)
                .withValueMax(70)
                .withValueStep(1)
                .withUnit('°C')
                .withLabel('High temperature protection')
                .withDescription('Default: 45'),
            e.temperature_sensor_select(['IN', 'OU', 'AL']).withLabel('Sensor').withDescription('Choose which sensor to use. Default: AL'),
            e
                .numeric('external_temperature_input', ea.STATE)
                .withLabel('Floor temperature')
                .withUnit('°C')
                .withDescription('Temperature from floor sensor'),
            e
                .numeric('brightness', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(8)
                .withValueStep(1)
                .withLabel('Screen brightness 06:00 - 22:00')
                .withDescription('0 - on for 10 seconds. Default: 6'),
            e
                .numeric('display_brightness', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(8)
                .withValueStep(1)
                .withLabel('Screen brightness 22:00 - 06:00')
                .withDescription('0 - on for 10 seconds. Default: 3'),
            e
                .text('schedule_monday', ea.STATE_SET)
                .withLabel('Schedule for monday')
                .withDescription('Default: 06:00/20.0 11:30/20.0 13:30/20.0 17:30/20.0'),
            e
                .text('schedule_tuesday', ea.STATE_SET)
                .withLabel('Schedule for tuesday')
                .withDescription('Default: 06:00/20.0 11:30/20.0 13:30/20.0 17:30/20.0'),
            e
                .text('schedule_wednesday', ea.STATE_SET)
                .withLabel('Schedule for wednesday')
                .withDescription('Default: 06:00/20.0 11:30/20.0 13:30/20.0 17:30/20.0'),
            e
                .text('schedule_thursday', ea.STATE_SET)
                .withLabel('Schedule for thursday')
                .withDescription('Default: 06:00/20.0 11:30/20.0 13:30/20.0 17:30/20.0'),
            e
                .text('schedule_friday', ea.STATE_SET)
                .withLabel('Schedule for friday')
                .withDescription('Default: 06:00/20.0 11:30/20.0 13:30/20.0 17:30/20.0'),
            e
                .text('schedule_saturday', ea.STATE_SET)
                .withLabel('Schedule for saturday')
                .withDescription('Default: 06:00/20.0 11:30/20.0 13:30/20.0 17:30/20.0'),
            e
                .text('schedule_sunday', ea.STATE_SET)
                .withLabel('Schedule for sunday')
                .withDescription('Default: 06:00/20.0 11:30/20.0 13:30/20.0 17:30/20.0'),
            e.enum('factory_reset', ea.STATE_SET, ['factory reset']).withLabel('Factory reset').withDescription('Reset all settings to factory ones'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'system_mode', tuya.valueConverterBasic.lookup({off: false, heat: true})],
                [2, 'preset', tuya.valueConverterBasic.lookup({auto: tuya.enum(0), manual: tuya.enum(1)})],
                [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [19, 'max_temperature', tuya.valueConverter.divideBy10],
                [24, 'local_temperature', tuya.valueConverter.divideBy10],
                [26, 'min_temperature', tuya.valueConverter.divideBy10],
                [27, 'local_temperature_calibration', tuya.valueConverter.raw],
                [28, 'factory_reset', tuya.valueConverterBasic.lookup({factory_reset: true})],
                [36, 'valve_state', tuya.valueConverter.trueFalseInvert],
                [39, 'child_lock', tuya.valueConverterBasic.lookup({ON: true, OFF: false})],
                [40, 'eco_mode', tuya.valueConverterBasic.lookup({ON: true, OFF: false})],
                [43, 'sensor', tuya.valueConverterBasic.lookup({IN: tuya.enum(0), OU: tuya.enum(2), AL: tuya.enum(1)})],
                [102, 'external_temperature_input', tuya.valueConverter.divideBy10],
                [103, 'deadzone_temperature', tuya.valueConverter.raw],
                [104, 'max_temperature_limit', tuya.valueConverter.divideBy10],
                [101, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(1)],
                [105, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(2)],
                [106, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(3)],
                [107, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(4)],
                [108, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(5)],
                [109, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(6)],
                [110, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(7)],
                [111, 'min_temperature_limit', tuya.valueConverter.divideBy10],
                [112, 'eco_temperature', tuya.valueConverter.divideBy10],
                [113, 'brightness', tuya.valueConverter.raw],
                [114, 'display_brightness', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_dsagrkvg']),
        model: 'ZPV-01',
        vendor: 'Novato',
        description: 'Battery powered smart valve',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.switch().setAccess('state', ea.STATE_SET),
            e.enum('valve_state', ea.STATE, ['close', 'unknown', 'open']).withDescription('State of the valve'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [8, 'valve_state', tuya.valueConverterBasic.lookup({unknown: tuya.enum(0), open: tuya.enum(1), closed: tuya.enum(2)})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS000F', ['_TZ3218_7fiyo3kv']),
        model: 'TYZGTH1CH-D1RF',
        vendor: 'Mumubiz',
        description: 'Smart switch with temperature/humidity sensor',
        meta: {
            tuyaSendCommand: 'sendData',
        },
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, switchType: false}),
            tuya.modernExtend.dpChildLock({dp: 0x6f}),
            tuya.modernExtend.dpTemperature({dp: 0x66}),
            tuya.modernExtend.dpHumidity({dp: 0x67}),
            tuya.modernExtend.dpNumeric({
                dp: 0x6c,
                name: 'temperature_calibration',
                type: tuya.dataTypes.number,
                valueMin: -10,
                valueMax: 10,
                valueStep: 0.1,
                unit: '°C',
                scale: 10,
                description: 'Temperature calibration',
            }),
            tuya.modernExtend.dpNumeric({
                dp: 0x6d,
                name: 'humidity_calibration',
                type: tuya.dataTypes.number,
                valueMin: -10,
                valueMax: 10,
                unit: '%',
                description: 'Humidity calibration',
            }),
            tuya.modernExtend.dpNumeric({
                dp: 0x71,
                name: 'temperature_sensitivity',
                type: tuya.dataTypes.number,
                valueMin: 0.1,
                valueMax: 1,
                valueStep: 0.1,
                unit: '°C',
                scale: 10,
                description: 'Temperature sensitivity',
            }),
            tuya.modernExtend.dpNumeric({
                dp: 0x70,
                name: 'humidity_sensitivity',
                type: tuya.dataTypes.number,
                valueMin: 1,
                valueMax: 10,
                unit: '%',
                description: 'Humidity sensitivity',
            }),
            tuya.modernExtend.dpBinary({
                name: 'manual_mode',
                dp: 0x65,
                type: tuya.dataTypes.enum,
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                description: 'Manual mode or automatic',
            }),
            modernExtendLocal.dpTHZBSettings(),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS000F', ['_TZ3218_ya5d6wth']),
        model: 'TYZGTH4CH-D1RF',
        vendor: 'Mumubiz',
        description: '4 channel changeover contact with temperature and humidity sensing',
        extend: [
            tuya.modernExtend.tuyaOnOff({powerOnBehavior2: true, onOffCountdown: true, endpoints: ['l1', 'l2', 'l3', 'l4']}),
            tuya.modernExtend.dpTemperature({dp: 102, scale: 10}),
            tuya.modernExtend.dpHumidity({dp: 103}),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        exposes: [],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            for (const ep of [1, 2, 3, 4]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genOnOff']);
            }
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_uxllnywp']),
        model: 'RT_ZCZ03Z',
        vendor: 'Tuya',
        description: 'Human presence sensor 24G',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.illuminance_lux(),
            e.presence(),
            e
                .numeric('detection_distance_max', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(840)
                .withValueStep(1)
                .withDescription('Max detection distance')
                .withUnit('cm'),
            e
                .numeric('detection_distance_min', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(840)
                .withValueStep(1)
                .withDescription('Min detection distance')
                .withUnit('cm'),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('cm'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(1).withValueMax(59).withValueStep(1).withDescription('Delay time').withUnit('s'),
            e.numeric('presence_sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(10).withValueStep(1).withDescription('Presence sensitivity'),
            e.binary('indicator', ea.STATE_SET, 'ON', 'OFF').withDescription('LED Indicator'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [101, 'target_distance', tuya.valueConverter.raw],
                [102, 'illuminance_lux', tuya.valueConverter.raw],
                [103, 'fading_time', tuya.valueConverter.raw],
                [104, 'indicator', tuya.valueConverter.onOff],
                [107, 'detection_distance_max', tuya.valueConverter.raw],
                [108, 'detection_distance_min', tuya.valueConverter.raw],
                [111, 'presence_sensitivity', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_q22avxbv', '_TZE204_mrffaamu']),
        model: 'TOQCB2-80',
        vendor: 'Tuya',
        description: 'Smart circuit breaker',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        // Important: respondToMcuVersionResponse should be false otherweise there are an avalanche of commandMcuVersionResponse messages every second.
        // queryIntervalSeconds: is doing a pooling to update device's parameters, now define to update data every 3 minutes.
        onEvent: tuya.onEvent({respondToMcuVersionResponse: false, queryIntervalSeconds: 3 * 60}),
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch(),
            e.energy(),
            e.power(),
            e.voltage(),
            e.current(),
            e.temperature(),
            tuya.exposes.voltageWithPhase('a'),
            tuya.exposes.voltageWithPhase('b'),
            tuya.exposes.voltageWithPhase('c'),
            tuya.exposes.powerWithPhase('a'),
            tuya.exposes.powerWithPhase('b'),
            tuya.exposes.powerWithPhase('c'),
            tuya.exposes.currentWithPhase('a'),
            tuya.exposes.currentWithPhase('b'),
            tuya.exposes.currentWithPhase('c'),
            e
                .enum('last_event', ea.STATE, [
                    'normal',
                    'trip_over_current',
                    'trip_over_power',
                    'trip_over_temperature',
                    'trip_voltage_1',
                    'trip_voltage_2',
                    'alarm_over_current',
                    'alarm_over_power',
                    'alarm_over_temperature',
                    'alarm_voltage_1',
                    'alarm_voltage_2',
                    'remote_on',
                    'remote_off',
                    'manual_on',
                    'manual_off',
                    'value_15',
                    'value_16',
                    'factory_reset',
                ])
                .withDescription('Last event'),
            e.enum('over_current_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached'),
            e
                .numeric('current_threshold', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(63)
                .withValueStep(1)
                .withUnit('A')
                .withDescription('Current threshold setting'),
            e.enum('under_voltage_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached'),
            e
                .numeric('under_voltage_threshold', ea.STATE_SET)
                .withValueMin(145)
                .withValueMax(220)
                .withValueStep(1)
                .withUnit('V')
                .withDescription('Under voltage threshold setting'),
            e.enum('over_voltage_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached'),
            e
                .numeric('over_voltage_threshold', ea.STATE_SET)
                .withValueMin(245)
                .withValueMax(295)
                .withValueStep(1)
                .withUnit('V')
                .withDescription('Over-voltage threshold setting'),
            e.enum('over_power_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached'),
            e
                .numeric('over_power_threshold', ea.STATE_SET)
                .withValueMin(200)
                .withValueMax(20000)
                .withValueStep(100)
                .withUnit('W')
                .withDescription('Over-power threshold setting'),
            e.enum('temperature_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached'),
            e
                .numeric('temperature_threshold', ea.STATE_SET)
                .withValueMin(-40)
                .withValueMax(100)
                .withValueStep(1)
                .withUnit('°C')
                .withDescription('Temperature threshold setting'),
            e.binary('clear_fault', ea.STATE_SET, 'ON', 'OFF').withDescription('Recover from an incident'),
            e.binary('factory_reset', ea.STATE_SET, 'ON', 'OFF').withDescription('Back to factory settings, USE WITH CAUTION'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                //[6, null, tuya.valueConverter.phaseVariant2],
                [3, null, null], // Monthly, but sends data only after request
                [4, null, null], // Dayly, but sends data only after request
                [6, null, tuya.valueConverter.phaseVariant2WithPhase('a')],
                [7, null, tuya.valueConverter.phaseVariant2WithPhase('b')],
                [8, null, tuya.valueConverter.phaseVariant2WithPhase('c')],
                [16, 'state', tuya.valueConverter.onOff],
                [102, 'over_voltage_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
                [103, 'under_voltage_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
                [104, 'over_current_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
                [105, 'over_power_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
                [107, 'temperature_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
                //109, 'online_state, unknown, I have not seen any message from this DP],
                [
                    110,
                    'last_event',
                    tuya.valueConverterBasic.lookup({
                        normal: tuya.enum(0),
                        trip_over_current: tuya.enum(1),
                        trip_over_power: tuya.enum(2),
                        trip_over_temperature: tuya.enum(3),
                        trip_voltage_1: tuya.enum(4),
                        trip_voltage_2: tuya.enum(5),
                        alarm_over_current: tuya.enum(6),
                        alarm_over_power: tuya.enum(7),
                        alarm_over_temperature: tuya.enum(8),
                        alarm_voltage_1: tuya.enum(9),
                        alarm_voltage_2: tuya.enum(10),
                        remote_on: tuya.enum(11),
                        remote_off: tuya.enum(12),
                        manual_on: tuya.enum(13),
                        manual_off: tuya.enum(14),
                        value_15: tuya.enum(15),
                        value_16: tuya.enum(16),
                        factory_reset: tuya.enum(17),
                    }),
                ],
                [112, 'clear_fault', tuya.valueConverter.onOff],
                [113, 'factory_reset', tuya.valueConverter.onOff],
                [114, 'current_threshold', tuya.valueConverter.raw],
                [115, 'over_voltage_threshold', tuya.valueConverter.raw],
                [116, 'under_voltage_threshold', tuya.valueConverter.raw],
                [118, 'temperature_threshold', tuya.valueConverter.divideBy10],
                [119, 'over_power_threshold', tuya.valueConverter.raw],
                //[125, 'forward_electricity', tuya.valueConverter.divideBy100],
                [131, 'temperature', tuya.valueConverter.divideBy10],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_nbkshs6k']),
        model: 'ZY-M100-S_3',
        vendor: 'Tuya',
        description: 'Human presence detector',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.presence(),
            e.illuminance_lux(),
            e
                .enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high'])
                .withDescription('PIR sensor sensitivity (refresh and update only while active)'),
            e.enum('keep_time', ea.STATE_SET, ['30', '60', '120']).withDescription('PIR keep time in seconds (refresh and update only while active)'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverterBasic.lookup({True: 0, False: 1})],
                [9, 'sensitivity', tuya.valueConverterBasic.lookup({low: tuya.enum(0), medium: tuya.enum(1), high: tuya.enum(2)})],
                [10, 'keep_time', tuya.valueConverterBasic.lookup({'30': tuya.enum(0), '60': tuya.enum(1), '120': tuya.enum(2)})],
                [12, 'illuminance_lux', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_dapwryy7']),
        model: 'ZG-205Z',
        vendor: 'Tuya',
        description: '5.8 GHz human presence sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        exposes: [
            e.presence(),
            e
                .enum('presence_state', ea.STATE, ['none', 'presence', 'peaceful', 'small_movement', 'large_movement'])
                .withDescription('The presence state'),
            e
                .numeric('target_distance', ea.STATE)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Target distance'),
            e.illuminance_lux(),
            e.binary('indicator', ea.STATE_SET, 'ON', 'OFF').withDescription('LED Indicator'),
            e
                .numeric('none_delay_time', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(28800)
                .withValueStep(1)
                .withUnit('Sec')
                .withDescription('Hold delay time'),
            e
                .numeric('move_detection_max', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Move detection max distance'),
            e
                .numeric('move_detection_min', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Move detection min distance'),
            e
                .numeric('small_move_detection_max', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Small move detection max distance'),
            e
                .numeric('small_move_detection_min', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Small move detection min distance'),
            e
                .numeric('breath_detection_max', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Breath detection max distance'),
            e
                .numeric('breath_detection_min', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(6)
                .withValueStep(0.01)
                .withUnit('m')
                .withDescription('Breath detection min distance'),
            e.numeric('move_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withDescription('Move sensitivity'),
            e.numeric('breath_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withDescription('Breath sensitivity'),
            e
                .numeric('small_move_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription('Small Move sensitivity'),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    null,
                    {
                        from: (v) => {
                            const lookup = {
                                none: tuya.enum(0),
                                presence: tuya.enum(1),
                                peaceful: tuya.enum(2),
                                small_movement: tuya.enum(3),
                                large_movement: tuya.enum(4),
                            };
                            const presenceState = Object.entries(lookup).find((i) => i[1].valueOf() === v)[0];
                            return {
                                presence: presenceState != 'none',
                                presence_state: presenceState,
                            };
                        },
                    },
                ],
                [101, 'target_distance', tuya.valueConverter.divideBy100],
                [102, 'illuminance_lux', tuya.valueConverter.raw],
                [103, 'none_delay_time', tuya.valueConverter.raw],
                [104, 'indicator', tuya.valueConverter.onOff],
                [107, 'move_detection_max', tuya.valueConverter.divideBy100],
                [108, 'move_detection_min', tuya.valueConverter.divideBy100],
                [109, 'breath_detection_max', tuya.valueConverter.divideBy100],
                [110, 'breath_detection_min', tuya.valueConverter.divideBy100],
                [114, 'small_move_detection_max', tuya.valueConverter.divideBy100],
                [115, 'small_move_detection_min', tuya.valueConverter.divideBy100],
                [116, 'move_sensitivity', tuya.valueConverter.raw],
                [117, 'small_move_sensitivity', tuya.valueConverter.raw],
                [118, 'breath_sensitivity', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_ncti2pro'}],
        model: 'PN6',
        vendor: 'ZSVIOT',
        description: '6-way controller',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch(),
            tuya.exposes.switchMode2().withEndpoint('l1_l2').withLabel('1-2 channels'),
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switchMode2().withEndpoint('l3_l4').withLabel('3-4 channels'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.switch().withEndpoint('l4'),
            tuya.exposes.switchMode2().withEndpoint('l5_l6').withLabel('5-6 channels'),
            tuya.exposes.switch().withEndpoint('l5'),
            tuya.exposes.switch().withEndpoint('l6'),
            tuya.exposes.switchType(),
            e.power_on_behavior(['off', 'on']).withAccess(ea.STATE_SET),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1, state: 1, l1_l2: 1, l3_l4: 1, l5_l6: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [13, 'state', tuya.valueConverter.onOff],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehaviorEnum],
                [107, 'switch_type', tuya.valueConverter.switchType],
                [113, 'switch_mode_l1_l2', tuya.valueConverter.switchMode2],
                [114, 'switch_mode_l3_l4', tuya.valueConverter.switchMode2],
                [115, 'switch_mode_l5_l6', tuya.valueConverter.switchMode2],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_iba1ckek', '_TZE200_hggxgsjj']),
        model: 'ZG-103Z',
        vendor: 'Tuya',
        description: 'Vibration sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.vibration(),
            e.tilt(),
            e.numeric('x', ea.STATE).withValueMin(0).withValueMax(256).withValueStep(1).withDescription('X coordinate'),
            e.numeric('y', ea.STATE).withValueMin(0).withValueMax(256).withValueStep(1).withDescription('Y coordinate'),
            e.numeric('z', ea.STATE).withValueMin(0).withValueMax(256).withValueStep(1).withDescription('Z coordinate'),
            e.battery(),
            e.enum('sensitivity', ea.STATE_SET, ['low', 'middle', 'high']).withDescription('Vibration detection sensitivity'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'vibration', tuya.valueConverter.trueFalseEnum1],
                [7, 'tilt', tuya.valueConverter.trueFalseEnum1],
                [101, 'x', tuya.valueConverter.raw],
                [102, 'y', tuya.valueConverter.raw],
                [103, 'z', tuya.valueConverter.raw],
                [104, 'sensitivity', tuya.valueConverterBasic.lookup({low: tuya.enum(0), middle: tuya.enum(1), high: tuya.enum(2)})],
                [105, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE204_fhvdgeuh'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_abatw3kj'},
        ],
        model: 'TS0601_din_4',
        vendor: 'Tuya',
        description: 'Din rail switch with power monitoring and threshold settings',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            // Required to get the device to start reporting
            await device.getEndpoint(1).command('manuSpecificTuya', 'dataQuery', {});
        },
        whiteLabel: [tuya.whitelabel('RTX', 'TS0601_RTX_DIN', 'Din rail switch', ['_TZE200_abatw3kj'])],
        exposes: [
            e.switch().setAccess('state', ea.STATE_SET),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.numeric('temperature', ea.STATE).withUnit('°C').withDescription('Current temperature'),
            e.numeric('leakage', ea.STATE).withUnit('mA').withDescription('Current leakage'),
        ],
        meta: {
            tuyaDatapoints: [
                [16, 'state', tuya.valueConverter.onOff],
                [1, 'energy', tuya.valueConverter.divideBy100], // Total forward energy
                [6, null, tuya.valueConverter.phaseVariant2], // Phase A voltage and current
                // [9, 'fault', tuya.valueConverter.raw], // no expose
                // [11, 'switch_prepayment', tuya.valueConverter.raw], // no expose
                // [12, 'clear_energy', tuya.valueConverter.raw], // no expose
                // [14, 'charge_energy', tuya.valueConverter.raw], // no expose
                [15, 'leakage', tuya.valueConverter.raw],
                // [102, 'reclosing_allowed_times', tuya.valueConverter.raw], // no expose
                [103, 'temperature', tuya.valueConverter.raw],
                // [104, 'reclosing_enable', tuya.valueConverter.raw], // no expose
                // [105, 'timer', tuya.valueConverter.raw], // no expose
                // [106, 'cycle_schedule', tuya.valueConverter.raw], // no expose
                // [107, 'reclose_recover_seconds', tuya.valueConverter.raw], // no expose
                // [108, 'random_timing', tuya.valueConverter.raw], // no expose
                // [109, 'switch_inching', tuya.valueConverter.raw], // no expose
                // [119, 'power_on_delay_power_on_time', tuya.valueConverter.raw], // no expose
                // [124, 'overcurrent_event_threshold_time', tuya.valueConverter.raw], // no expose
                // [125, 'time_threshold_of_lost_flow_event', tuya.valueConverter.raw], // no expose
                // [127, 'status', tuya.valueConverter.raw], // no expose
                // [134, 'relay_status_for_power_on', tuya.valueConverter.raw], // no expose
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_hcxvyxa5'}],
        model: 'ZA03',
        vendor: 'Tuya',
        description: 'Siren alarm',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('alarm', ea.STATE_SET, 'ON', 'OFF').withDescription('Sound the alarm'),
            e.enum('volume', ea.STATE_SET, ['low', 'medium', 'high', 'mute']),
            e.enum('ringtone', ea.STATE_SET, [
                'ringtone 1',
                'ringtone 2',
                'ringtone 3',
                'ringtone 4',
                'ringtone 5',
                'ringtone 6',
                'ringtone 7',
                'ringtone 8',
                'ringtone 9',
                'ringtone 10',
                'ringtone 11',
                'ringtone 12',
                'ringtone 13',
                'ringtone 14',
                'ringtone 15',
                'ringtone 16',
                'ringtone 17',
                'ringtone 18',
                'ringtone 19',
                'ringtone 20',
                'ringtone 21',
                'ringtone 22',
                'ringtone 23',
                'ringtone 24',
                'ringtone 25',
                'ringtone 26',
                'ringtone 27',
                'ringtone 28',
                'ringtone 29',
                'ringtone 30',
                'ringtone 31',
                'ringtone 32',
            ]),
            e
                .numeric('duration', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(380)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('How long the alarm sounds for when triggered'),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    5,
                    'volume',
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        medium: tuya.enum(1),
                        high: tuya.enum(2),
                        mute: tuya.enum(3),
                    }),
                ],
                [7, 'duration', tuya.valueConverter.raw],
                [13, 'alarm', tuya.valueConverter.onOff],
                [
                    21,
                    'ringtone',
                    tuya.valueConverterBasic.lookup({
                        'ringtone 1': tuya.enum(0),
                        'ringtone 2': tuya.enum(1),
                        'ringtone 3': tuya.enum(2),
                        'ringtone 4': tuya.enum(3),
                        'ringtone 5': tuya.enum(4),
                        'ringtone 6': tuya.enum(5),
                        'ringtone 7': tuya.enum(6),
                        'ringtone 8': tuya.enum(7),
                        'ringtone 9': tuya.enum(8),
                        'ringtone 10': tuya.enum(9),
                        'ringtone 11': tuya.enum(10),
                        'ringtone 12': tuya.enum(11),
                        'ringtone 13': tuya.enum(12),
                        'ringtone 14': tuya.enum(13),
                        'ringtone 15': tuya.enum(14),
                        'ringtone 16': tuya.enum(15),
                        'ringtone 17': tuya.enum(16),
                        'ringtone 18': tuya.enum(17),
                        'ringtone 19': tuya.enum(18),
                        'ringtone 20': tuya.enum(19),
                        'ringtone 21': tuya.enum(20),
                        'ringtone 22': tuya.enum(21),
                        'ringtone 23': tuya.enum(22),
                        'ringtone 24': tuya.enum(23),
                        'ringtone 25': tuya.enum(24),
                        'ringtone 26': tuya.enum(25),
                        'ringtone 27': tuya.enum(26),
                        'ringtone 28': tuya.enum(27),
                        'ringtone 29': tuya.enum(28),
                        'ringtone 30': tuya.enum(29),
                        'ringtone 31': tuya.enum(30),
                        'ringtone 32': tuya.enum(31),
                    }),
                ],
            ],
        },
    },
];

export default definitions;
module.exports = definitions;
