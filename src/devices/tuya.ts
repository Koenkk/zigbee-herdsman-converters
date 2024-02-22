import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as tuya from '../lib/tuya';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import * as libColor from '../lib/color';
import * as utils from '../lib/utils';
import * as zosung from '../lib/zosung';
import * as globalStore from '../lib/store';
import {ColorMode, colorModeLookup} from '../lib/constants';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import {KeyValue, Definition, Tz, Fz, Expose, KeyValueAny, KeyValueString} from '../lib/types';
import {onOff, quirkCheckinInterval, batteryPercentage} from '../lib/modernExtend';

const {tuyaLight} = tuya.modernExtend;

const e = exposes.presets;
const ea = exposes.access;

const fzZosung = zosung.fzZosung;
const tzZosung = zosung.tzZosung;
const ez = zosung.presetsZosung;


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
                const rgbMode = (colorMode == colorModeLookup[ColorMode.HS]);
                await entity.command('lightingColorCtrl', 'tuyaRgbMode', {enable: rgbMode});
            }

            // A transition time of 0 would be treated as about 1 second, probably some kind of fallback/default
            // transition time, so for "no transition" we use 1 (tenth of a second).
            const transtime = typeof meta.message.transition === 'number' ? (meta.message.transition * 10) : 0.1;

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
                    await entity.command('lightingColorCtrl', 'tuyaMoveToHueAndSaturationBrightness2', zclData,
                        utils.getOptions(meta.mapped, entity));
                }
            }

            // If we're in white mode, calculate a matching display color for the set color temperature. This also kind
            // of works in the other direction.
            Object.assign(newState, libColor.syncColorState(newState, meta.state, entity, meta.options, meta.logger));

            return {state: newState};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('lightingColorCtrl', ['currentHue', 'currentSaturation', 'currentLevel', 'tuyaRgbMode', 'colorTemperature']);
        },
    } satisfies Tz.Converter,
    TS110E_options: {
        key: ['min_brightness', 'max_brightness', 'light_type', 'switch_type'],
        convertSet: async (entity, key, value, meta) => {
            let payload = null;
            if (key === 'min_brightness' || key == 'max_brightness') {
                const id = key === 'min_brightness' ? 64515 : 64516;
                payload = {[id]: {value: utils.mapNumberRange(utils.toNumber(value, key), 1, 255, 0, 1000), type: 0x21}};
            } else if (key === 'light_type' || key === 'switch_type') {
                utils.assertString(value, 'light_type/switch_type');
                const lookup: KeyValue = key === 'light_type' ? {led: 0, incandescent: 1, halogen: 2} : {momentary: 0, toggle: 1, state: 2};
                payload = {64514: {value: lookup[value], type: 0x20}};
            }
            await entity.write('genLevelCtrl', payload, utils.getOptions(meta.mapped, entity));
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            let id = null;
            if (key === 'min_brightness') id = 64515;
            if (key === 'max_brightness') id = 64516;
            if (key === 'light_type' || key === 'switch_type') id = 64514;
            await entity.read('genLevelCtrl', [id]);
        },
    } satisfies Tz.Converter,
    TS110E_onoff_brightness: {
        key: ['state', 'brightness'],
        convertSet: async (entity, key, value, meta) => {
            const {message, state} = meta;
            if (message.state === 'OFF' || (message.hasOwnProperty('state') && !message.hasOwnProperty('brightness'))) {
                return await tz.on_off.convertSet(entity, key, value, meta);
            } else if (message.hasOwnProperty('brightness')) {
                // set brightness
                if (state.state === 'OFF') {
                    await entity.command('genOnOff', 'on', {}, utils.getOptions(meta.mapped, entity));
                }

                const brightness = utils.toNumber(message.brightness, 'brightness');
                const level = utils.mapNumberRange(brightness, 0, 254, 0, 1000);
                await entity.command('genLevelCtrl', 'moveToLevelTuya', {level, transtime: 100}, utils.getOptions(meta.mapped, entity));
                return {state: {state: 'ON', brightness}};
            }
        },
        convertGet: async (entity, key, meta) => {
            if (key === 'state') await tz.on_off.convertGet(entity, key, meta);
            if (key === 'brightness') await entity.read('genLevelCtrl', [61440]);
        },
    } satisfies Tz.Converter,
    TS110E_light_onoff_brightness: {
        ...tz.light_onoff_brightness,
        convertSet: async (entity, key, value, meta) => {
            const {message} = meta;
            if (message.state === 'ON' || (typeof message.brightness === 'number' && message.brightness > 1)) {
                // Does not turn off with physical press when turned on with just moveToLevelWithOnOff, required on before.
                // https://github.com/Koenkk/zigbee2mqtt/issues/15902#issuecomment-1382848150
                await entity.command('genOnOff', 'on', {}, utils.getOptions(meta.mapped, entity));
            }
            return tz.light_onoff_brightness.convertSet(entity, key, value, meta);
        },
    } satisfies Tz.Converter,
    TS0504B_color: {
        key: ['color'],
        convertSet: async (entity, key, value, meta) => {
            const color = libColor.Color.fromConverterArg(value);
            const enableWhite =
                (color.isRGB() && (color.rgb.red === 1 && color.rgb.green === 1 && color.rgb.blue === 1)) ||
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
                return {state: libColor.syncColorState(newState, meta.state, entity, meta.options, meta.logger) as KeyValue};
            } else {
                return await tz.light_color.convertSet(entity, key, value, meta);
            }
        },
    } satisfies Tz.Converter,
    TS0224: {
        key: ['light', 'duration', 'volume'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'light') {
                utils.assertString(value, 'light');
                await entity.command('genOnOff', value.toLowerCase() === 'on' ? 'on' : 'off', {}, utils.getOptions(meta.mapped, entity));
            } else if (key === 'duration') {
                await entity.write('ssIasWd', {'maxDuration': value}, utils.getOptions(meta.mapped, entity));
            } else if (key === 'volume') {
                const lookup: KeyValue = {'mute': 0, 'low': 10, 'medium': 30, 'high': 50};
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
                await entity.write('manuSpecificTuya_2', {'57355': {value: {'celsius': 0, 'fahrenheit': 1}[value], type: 48}});
                break;
            }
            default: // Unknown key
                meta.logger.warn(`Unhandled key ${key}`);
            }
        },
    } satisfies Tz.Converter,
    TS011F_threshold: {
        key: [
            'temperature_threshold', 'temperature_breaker', 'power_threshold', 'power_breaker',
            'over_current_threshold', 'over_current_breaker', 'over_voltage_threshold', 'over_voltage_breaker',
            'under_voltage_threshold', 'under_voltage_breaker',
        ],
        convertSet: async (entity, key, value, meta) => {
            const onOffLookup = {'on': 1, 'off': 0};
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
                meta.logger.warn(`Unhandled key ${key}`);
            }
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    TS0726_action: {
        cluster: 'genOnOff',
        type: ['raw'],
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
    TS110E: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('64515')) {
                result['min_brightness'] = utils.mapNumberRange(msg.data['64515'], 0, 1000, 1, 255);
            }
            if (msg.data.hasOwnProperty('64516')) {
                result['max_brightness'] = utils.mapNumberRange(msg.data['64516'], 0, 1000, 1, 255);
            }
            if (msg.data.hasOwnProperty('61440')) {
                result['brightness'] = utils.mapNumberRange(msg.data['61440'], 0, 1000, 0, 255);
            }
            return result;
        },
    } satisfies Fz.Converter,
    TS110E_light_type: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('64514')) {
                const lookup: KeyValue = {0: 'led', 1: 'incandescent', 2: 'halogen'};
                result['light_type'] = lookup[msg.data['64514']];
            }
            return result;
        },
    } satisfies Fz.Converter,
    TS110E_switch_type: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('64514')) {
                const lookup: KeyValue = {0: 'momentary', 1: 'toggle', 2: 'state'};
                const propertyName = utils.postfixWithEndpointName('switch_type', msg, model, meta);
                result[propertyName] = lookup[msg.data['64514']];
            }
            return result;
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
            const result = await fz.electrical_measurement.convert(model, msg, publish, options, meta) ?? {};
            const lookup: KeyValueString = {power: 'activePower', current: 'rmsCurrent', voltage: 'rmsVoltage'};

            // Wait 5 seconds before reporting a 0 value as this could be an invalid measurement.
            // https://github.com/Koenkk/zigbee2mqtt/issues/16709#issuecomment-1509599046
            if (result) {
                for (const key of ['power', 'current', 'voltage']) {
                    if (key in result) {
                        const value = result[key];
                        clearTimeout(globalStore.getValue(msg.endpoint, key));
                        if (value === 0) {
                            const configuredReporting = msg.endpoint.configuredReportings.find((c) =>
                                c.cluster.name === 'haElectricalMeasurement' && c.attribute.name === lookup[key]);
                            const time = ((configuredReporting ? configuredReporting.minimumReportInterval : 5) * 2) + 1;
                            globalStore.putValue(msg.endpoint, key, setTimeout(() => {
                                const payload = {[key]: value};
                                // Device takes a lot of time to report power 0 in some cases. When current == 0 we can assume power == 0
                                // https://github.com/Koenkk/zigbee2mqtt/discussions/19680#discussioncomment-7868445
                                if (key === 'current') {
                                    payload.power = 0;
                                }
                                publish(payload);
                            }, time * 1000));
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
                    result[key] = [value.readUInt8(i+1), value.readUInt16BE(i+2)];
                    i += 4;
                }
                return result;
            };
            const lookup: KeyValue = {0: 'OFF', 1: 'ON'};
            const command = msg.data[2];
            const data = msg.data.slice(3);
            if (command == 0xE6) {
                const value = splitToAttributes(data);
                return {
                    'temperature_threshold': value[0x05][1],
                    'temperature_breaker': lookup[value[0x05][0]],
                    'power_threshold': value[0x07][1],
                    'power_breaker': lookup[value[0x07][0]],
                };
            }
            if (command == 0xE7) {
                const value = splitToAttributes(data);
                return {
                    'over_current_threshold': value[0x01][1],
                    'over_current_breaker': lookup[value[0x01][0]],
                    'over_voltage_threshold': value[0x03][1],
                    'over_voltage_breaker': lookup[value[0x03][0]],
                    'under_voltage_threshold': value[0x04][1],
                    'under_voltage_breaker': lookup[value[0x04][0]],
                };
            }
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['TS0204'],
        model: 'TS0204',
        vendor: 'TuYa',
        description: 'Gas sensor',
        whiteLabel: [{vendor: 'Tesla Smart', model: 'TSL-SEN-GAS'}],
        fromZigbee: [fz.ias_gas_alarm_1, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.gas(), e.tamper()],
    },
    {
        zigbeeModel: ['TS0205'],
        model: 'TS0205',
        vendor: 'TuYa',
        description: 'Smoke sensor',
        whiteLabel: [
            {vendor: 'Tesla Smart', model: 'TSL-SEN-SMOKE'},
            {vendor: 'Dongguan Daying Electornics Technology', model: 'YG400A'},
            tuya.whitelabel('TuYa', 'TS0205_smoke_2', 'Smoke sensor', ['_TZ3210_up3pngle']),
        ],
        fromZigbee: [fz.ias_smoke_alarm_1, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.smoke(), e.battery_low(), e.tamper()],
        extend: [batteryPercentage()],
    },
    {
        zigbeeModel: ['TS0111'],
        model: 'TS0111',
        vendor: 'TuYa',
        description: 'Socket',
        extend: tuya.extend.switch(),
    },
    {
        zigbeeModel: ['TS0218'],
        model: 'TS0218',
        vendor: 'TuYa',
        description: 'Button',
        fromZigbee: [legacy.fromZigbee.TS0218_click, fz.battery],
        exposes: [e.battery(), e.action(['click'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0203'],
        model: 'TS0203',
        vendor: 'TuYa',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        whiteLabel: [
            {vendor: 'CR Smart Home', model: 'TS0203'},
            {vendor: 'TuYa', model: 'iH-F001'},
            {vendor: 'Tesla Smart', model: 'TSL-SEN-DOOR'},
            {vendor: 'Cleverio', model: 'SS100'},
            tuya.whitelabel('Niceboy', 'ORBIS Windows & Door Sensor', 'Door sensor', ['_TZ3000_qrldbmfn']),
            tuya.whitelabel('Sber', 'SBDV-00030', 'Door sensor', ['_TYZB01_epni2jgy']),
            tuya.whitelabel('TuYa', 'ZD08', 'Door sensor', ['_TZ3000_7d8yme6f']),
            tuya.whitelabel('TuYa', 'MC500A', 'Door sensor', ['_TZ3000_2mbfxlzr']),
            tuya.whitelabel('TuYa', '19DZT', 'Door sensor', ['_TZ3000_n2egfsli']),
            tuya.whitelabel('TuYa', 'DS04', 'Door sensor', ['_TZ3000_yfekcy3n']),
            tuya.whitelabel('Moes', 'ZSS-JM-GWM-C-MS', 'Smart door and window sensor', ['_TZ3000_decxrtwa']),
            tuya.whitelabel('Moes', 'ZSS-X-GWM-C', 'Door/window magnetic sensor', ['_TZ3000_gntwytxo']),
        ],
        exposes: (device, options) => {
            const exps: Expose[] = [e.contact(), e.battery_low(), e.battery(), e.battery_voltage()];
            const noTamperModels = [ // manufacturerName for models without a tamper sensor
                '_TZ3000_2mbfxlzr', // TuYa MC500A
                '_TZ3000_n2egfsli', // TuYa 19DZT
                '_TZ3000_yfekcy3n', // TuYa DS04
                '_TZ3000_bpkijo14',
                '_TZ3000_gntwytxo', // Moes ZSS-X-GWM-C
            ];
            if (!device || !noTamperModels.includes(device.manufacturerName)) {
                exps.push(e.tamper());
            }
            exps.push(e.linkquality());
            return exps;
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.batteryVoltage(endpoint);
            } catch (error) {/* Fails for some*/}
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0203', ['_TZ3210_jowhpxop']),
        model: 'TS0203_1',
        vendor: 'TuYa',
        description: 'Door sensor with scene switch',
        fromZigbee: [tuya.fz.datapoints, fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [e.action(['single', 'double', 'hold']), e.contact(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()],
        meta: {
            tuyaDatapoints: [
                [101, 'action', tuya.valueConverterBasic.lookup({'single': 0, 'double': 1, 'hold': 2})],
            ],
        },
        whiteLabel: [
            tuya.whitelabel('Linkoze', 'LKDSZ001', 'Door sensor with scene switch', ['_TZ3210_jowhpxop']),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0021', manufacturerName: '_TZ3210_3ulg9kpo'},
        ],
        model: 'LKWSZ211',
        vendor: 'TuYa',
        description: 'Scene remote with 2 keys',
        fromZigbee: [tuya.fz.datapoints, fz.ignore_basic_report],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(), e.action([
                'button_1_single', 'button_1_double', 'button_1_hold',
                'button_2_single', 'button_2_double', 'button_2_hold',
            ]),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'action',
                    tuya.valueConverterBasic.lookup({
                        'button_1_single': tuya.enum(0),
                        'button_1_double': tuya.enum(1),
                        'button_1_hold': tuya.enum(2),
                    }),
                ],
                [2, 'action',
                    tuya.valueConverterBasic.lookup({
                        'button_2_single': tuya.enum(0),
                        'button_2_double': tuya.enum(1),
                        'button_2_hold': tuya.enum(2),
                    }),
                ],
                [10, 'battery', tuya.valueConverter.raw],
            ],
        },
        whiteLabel: [
            tuya.whitelabel('Linkoze', 'LKWSZ211', 'Wireless switch (2-key)', ['_TZ3210_3ulg9kpo']),
            tuya.whitelabel('Adaprox', 'LKWSZ211', 'Remote wireless switch (2-key)', ['_TZ3210_3ulg9kpo']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_bq5c8xfe'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_bjawzodf'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_qyflbnbj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_vs0skpuc'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_44af8vyi'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zl1kmjqx'}],
        model: 'TS0601_temperature_humidity_sensor_1',
        vendor: 'TuYa',
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
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_yjjdcqsq', '_TZE200_9yapgbuv', '_TZE200_utkemkbs', '_TZE204_utkemkbs', '_TZE204_9yapgbuv',
            '_TZE204_upagmta9', '_TZE200_cirvgep4', '_TZE200_upagmta9', '_TZE204_yjjdcqsq']),
        model: 'TS0601_temperature_humidity_sensor_2',
        vendor: 'TuYa',
        description: 'Temperature and humidity sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEvent({queryOnDeviceAnnounce: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
            tuya.whitelabel('TuYa', 'ZTH01', 'Temperature and humidity sensor', ['_TZE200_yjjdcqsq', '_TZE204_yjjdcqsq']),
            tuya.whitelabel('TuYa', 'SZTH02', 'Temperature and humidity sensor', ['_TZE200_utkemkbs', '_TZE204_utkemkbs']),
            tuya.whitelabel('TuYa', 'ZTH02', 'Temperature and humidity sensor', ['_TZE200_9yapgbuv', '_TZE204_9yapgbuv']),
            tuya.whitelabel('TuYa', 'ZTH05', 'Temperature and humidity sensor', ['_TZE204_upagmta9', '_TZE200_upagmta9']),
            tuya.whitelabel('TuYa', 'ZTH08-E', 'Temperature and humidity sensor', ['_TZE200_cirvgep4']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_vvmbj46n']),
        model: 'ZTH05Z',
        vendor: 'TuYa',
        description: 'Temperature and humidity sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEvent({queryOnDeviceAnnounce: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            // Required to get the device to start reporting
            await device.getEndpoint(1).command('manuSpecificTuya', 'dataQuery', {});
        },
        exposes: [
            e.temperature(), e.humidity(), e.battery(),
            e.enum('temperature_unit', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Temperature unit'),
            e.numeric('max_temperature_alarm', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature max'),
            e.numeric('min_temperature_alarm', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature min'),
            e.numeric('max_humidity_alarm', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100).withDescription('Alarm humidity max'),
            e.numeric('min_humidity_alarm', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100).withDescription('Alarm humidity min'),
            e.enum('temperature_alarm', ea.STATE_SET, ['lower_alarm', 'upper_alarm', 'cancel']).withDescription('Temperature alarm'),
            e.enum('humidity_alarm', ea.STATE_SET, ['lower_alarm', 'upper_alarm', 'cancel']).withDescription('Humidity alarm'),
            e.numeric('temperature_periodic_report', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Temp periodic report'),
            e.numeric('humidity_periodic_report', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Humidity periodic report'),
            e.numeric('temperature_sensitivity', ea.STATE_SET).withUnit('°C').withValueMin(3).withValueMax(10).withValueStep(1)
                .withDescription('Sensitivity of temperature'),
            e.numeric('humidity_sensitivity', ea.STATE_SET).withUnit('%').withValueMin(3).withValueMax(10).withValueStep(1)
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
                [14, 'temperature_alarm', tuya.valueConverterBasic.lookup(
                    {'lower_alarm': tuya.enum(0), 'upper_alarm': tuya.enum(1), 'cancel': tuya.enum(2)})],
                [15, 'humidity_alarm', tuya.valueConverterBasic.lookup(
                    {'lower_alarm': tuya.enum(0), 'upper_alarm': tuya.enum(1), 'cancel': tuya.enum(2)})],
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
        vendor: 'TuYa',
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
        whiteLabel: [
            tuya.whitelabel('Aubess', '1005005194831629', 'Contact, temperature and humidity sensor', ['_TZE200_nvups4nh']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_vzqtvljm'}],
        model: 'TS0601_illuminance_temperature_humidity_sensor_1',
        vendor: 'TuYa',
        description: 'Illuminance, temperature & humidity sensor',
        fromZigbee: [legacy.fromZigbee.tuya_illuminance_temperature_humidity_sensor],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.illuminance_lux(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_8ygsuhe1'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_yvx5lh6k'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ryfmq5rl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_c2fmom5z'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_mja3fuja'}],
        model: 'TS0601_air_quality_sensor',
        vendor: 'TuYa',
        description: 'Air quality sensor',
        fromZigbee: [legacy.fromZigbee.tuya_air_quality],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.co2(), e.voc().withUnit('ppm'), e.formaldehyd()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_rbbx5mfq'}],
        model: 'TS0601_illuminance_temperature_humidity_sensor_2',
        vendor: 'TuYa',
        description: 'Illuminance sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.illuminance(), e.temperature().withUnit('lx'), e.humidity()],
        meta: {
            tuyaDatapoints: [
                [2, 'illuminance', tuya.valueConverter.raw],
                [6, 'temperature', tuya.valueConverter.divideBy10],
                [7, 'humidity', tuya.valueConverter.divideBy10],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_dwcarsat']),
        model: 'TS0601_smart_air_house_keeper',
        vendor: 'TuYa',
        description: 'Smart air house keeper',
        fromZigbee: [legacy.fromZigbee.tuya_air_quality],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.co2(), e.voc().withUnit('ppm'), e.formaldehyd().withUnit('µg/m³'),
            e.pm25().withValueMin(0).withValueMax(999).withValueStep(1)],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ogkdpgy2', '_TZE200_3ejwxpmu']),
        model: 'TS0601_co2_sensor',
        vendor: 'TuYa',
        description: 'NDIR co2 sensor',
        fromZigbee: [legacy.fromZigbee.tuya_air_quality],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.co2()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_7bztmfm1'}],
        model: 'TS0601_smart_CO_air_box',
        vendor: 'TuYa',
        description: 'Smart air box (carbon monoxide)',
        fromZigbee: [legacy.fromZigbee.tuya_CO],
        toZigbee: [],
        exposes: [e.carbon_monoxide(), e.co()],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ggev5fsl', '_TZE200_u319yc66', '_TZE200_kvpwq8z7']),
        model: 'TS0601_gas_sensor_1',
        vendor: 'TuYa',
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
        vendor: 'TuYa',
        description: 'Gas sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.gas(), tuya.exposes.gasValue().withUnit('LEL'), tuya.exposes.selfTest(), tuya.exposes.selfTestResult(),
            tuya.exposes.silence(),
            e.enum('alarm_ringtone', ea.STATE_SET, [
                'melody_1', 'melody_2', 'melody_3', 'melody_4', 'melody_5']).withDescription('Ringtone of the alarm'),
            e.numeric('alarm_time', ea.STATE_SET).withValueMin(1).withValueMax(180).withValueStep(1)
                .withUnit('s').withDescription('Alarm time'),
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
                [6, 'alarm_ringtone', tuya.valueConverterBasic.lookup({'melody_1': tuya.enum(0), 'melody_2': tuya.enum(1),
                    'melody_3': tuya.enum(2), 'melody_4': tuya.enum(3), 'melody_5': tuya.enum(4)})],
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
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_hktqahrq'}, {manufacturerName: '_TZ3000_hktqahrq'},
            {manufacturerName: '_TZ3000_q6a3tepg'}, {modelID: 'TS000F', manufacturerName: '_TZ3000_m9af2l6g'},
            {modelID: 'TS000F', manufacturerName: '_TZ3000_mx3vgyea'},
            {modelID: 'TS000F', manufacturerName: '_TZ3000_skueekg3'},
            {modelID: 'TS000F', manufacturerName: '_TZ3000_dlhhrhs8'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_skueekg3'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_npzfdcof'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_5ng23zjs'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_rmjr4ufz'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_v7gnj3ad'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_3a9beq8a'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_ark8nv4y'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_mx3vgyea'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_qsp2pwtf'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_46t1rvdu'}],
        model: 'WHD02',
        vendor: 'TuYa',
        whiteLabel: [
            {vendor: 'TuYa', model: 'iHSW02'}, {vendor: 'Aubess', model: 'TMZ02'},
            tuya.whitelabel('TuYa', 'QS-zigbee-S08-16A-RF', 'Wall switch module', ['_TZ3000_dlhhrhs8']),
        ],
        description: 'Wall switch module',
        extend: tuya.extend.switch({switchType: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_mvn6jl7x', '_TZ3000_raviyuvk', '_TYZB01_hlla45kx', '_TZ3000_92qd4sqa',
            '_TZ3000_zwaadvus', '_TZ3000_k6fvknrr', '_TZ3000_6s5dc9lx', '_TZ3000_helyqdvs', '_TZ3000_rgpqqmbj', '_TZ3000_8nyaanzb',
            '_TZ3000_iy2c3n6p']),
        model: 'TS011F_2_gang_wall',
        vendor: 'TuYa',
        description: '2 gang wall outlet',
        ota: ota.zigbeeOTA,
        extend: tuya.extend.switch({backlightModeLowMediumHigh: true, childLock: true, endpoints: ['l1', 'l2']}),
        whiteLabel: [
            tuya.whitelabel('ClickSmart+', 'CMA30036', '2 gang socket outlet', ['_TYZB01_hlla45kx']),
            tuya.whitelabel('Rylike', 'RY-WS02Z', '2 gang socket outlet AU', ['_TZ3000_rgpqqmbj', '_TZ3000_8nyaanzb', '_TZ3000_iy2c3n6p']),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_rk2yzt0u'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_o4cjetlm'}, {manufacturerName: '_TZ3000_o4cjetlm'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_iedbgyxt'}, {modelID: 'TS0001', manufacturerName: '_TZ3000_h3noz0a5'},
            {modelID: 'TS0001', manufacturerName: '_TYZB01_4tlksk8a'}, {modelID: 'TS0011', manufacturerName: '_TYZB01_rifa0wlb'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_5ucujjts'}, {modelID: 'TS0001', manufacturerName: '_TZ3000_h8ngtlxy'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_w0ypwa1f'}, {modelID: 'TS0001', manufacturerName: '_TZ3000_wpueorev'},
        ],
        model: 'ZN231392',
        vendor: 'TuYa',
        description: 'Smart water/gas valve',
        extend: tuya.extend.switch({indicatorMode: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genOnOff', ['onOff', 'moesStartUpOnOff']);
        },
    },
    {
        zigbeeModel: ['CK-BL702-AL-01(7009_Z102LG03-1)', 'CK-BL702-AL-01(7009_Z102LG04-2)'],
        model: 'CK-BL702-AL-01',
        vendor: 'TuYa',
        description: 'Zigbee LED bulb',
        extend: tuya.extend.light_onoff_brightness_colortemp_color({colorTempRange: [142, 500]}),
    },
    {
        zigbeeModel: ['SM0001'],
        model: 'SM0001',
        vendor: 'TuYa',
        description: 'Switch',
        extend: tuya.extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Zemismart', 'ZM-H7', 'Hand wave wall smart switch', ['_TZ3000_jcqs2mrv']),
        ],
    },
    {
        zigbeeModel: ['TS0505B'],
        model: 'TS0505B_1',
        vendor: 'TuYa',
        description: 'Zigbee RGB+CCT light',
        whiteLabel: [{vendor: 'Mercator Ikuü', model: 'SMD4106W-RGB-ZB'},
            {vendor: 'TuYa', model: 'A5C-21F7-01'}, {vendor: 'Mercator Ikuü', model: 'S9E27LED9W-RGB-Z'},
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
            tuya.whitelabel('TuYa', 'HG08007', 'Livarno Home outdoor LED band', ['_TZ3210_zbabx9wh']),
            tuya.whitelabel('Lidl', '14158704L', 'Livarno Home LED floor lamp, RGBW', ['_TZ3210_z1vlyufu']),
            tuya.whitelabel('Lidl', '14158804L', 'Livarno Home LED desk lamp RGBW', ['_TZ3210_hxtfthp5']),
            tuya.whitelabel('Lidl', 'HG07834A/HG09155A', 'Livarno Lux GU10 spot RGB', ['_TZ3000_quqaeew6']),
            tuya.whitelabel('Lidl', 'HG07834B', 'Livarno Lux E14 candle RGB', ['_TZ3000_th6zqqy6', '_TZ3000_wr6g6olr']),
            tuya.whitelabel('Lidl', 'HG08131C', 'Livarno Home outdoor E27 bulb in set with flare', ['_TZ3000_q50zhdsc']),
            tuya.whitelabel('Lidl', 'HG07834C', 'Livarno Lux E27 bulb RGB', ['_TZ3000_qd7hej8u']),
            tuya.whitelabel('Lidl', 'HG08383B', 'Livarno outdoor LED light chain', ['_TZ3000_bwlvyjwk']),
            tuya.whitelabel('Lidl', 'HG08383A', 'Livarno outdoor LED light chain', ['_TZ3000_taspddvq']),
            tuya.whitelabel('Garza Smart', 'Garza-Standard-A60', 'Standard A60 bulb', ['_TZ3210_sln7ah6r']),
            tuya.whitelabel('UR Lighting', 'TH008L10RGBCCT', '10W RGB+CCT downlight', ['_TZ3210_dn5higyl']),
            tuya.whitelabel('Lidl', 'HG08010', 'Livarno Home outdoor spotlight', ['_TZ3210_umi6vbsz']),
            tuya.whitelabel('Lidl', 'HG08008', 'Livarno Home LED ceiling light', ['_TZ3210_p9ao60da']),
            tuya.whitelabel('Lidl', 'HG08007', 'Livarno Home outdoor LED band', ['_TZ3210_zbabx9wh']),
            tuya.whitelabel('Lidl', '399629_2110', 'Livarno Lux Ceiling Panel RGB+CCT', ['_TZ3210_c0s1xloa', '_TZ3210_x13bu7za']),
            tuya.whitelabel('Skydance', 'WZ5_dim_2', 'Zigbee & RF 5 in 1 LED controller (DIM mode)', ['_TZB210_3zfp8mki']),
            tuya.whitelabel('TuYa', 'TS0505B_1_3', 'Zigbee 10W Downlight RGB CCW', ['_TZ3210_it1u8ahz']),
            tuya.whitelabel('Nous', 'P3Z', 'Smart light bulb', ['_TZ3210_cieijuw1']),
            tuya.whitelabel('Moes', 'ZLD-RCW_1', 'RGB+CCT Zigbee LED controller', ['_TZ3000_7hcgjxpc']),
            tuya.whitelabel('Moes', 'ZLD-RCW_2', 'RGB+CCT LED bulb', ['_TZ3210_rcggc0ys']),
            tuya.whitelabel('Moes', 'ZB-LZD10-RCW', '10W RGB+CCT Smart Downlight', ['_TZ3210_s9lumfhn']),
            tuya.whitelabel('MiBoxer', 'FUT106ZR', 'GU10 bulb', ['_TZB210_rwy5hexp']),
            tuya.whitelabel('TuYa', 'TS0505B_1_1', 'Zigbee 3.0 18W led light bulb E27 RGBCW', ['_TZ3210_jd3z4yig', '_TZ3210_r5afgmkl']),
            tuya.whitelabel('MiBoxer', 'FUTC11ZR', 'Outdoor light', ['_TZB210_zmppwawa']),
        ],
        extend: tuya.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500], noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0505B',
            ['_TZ3210_iystcadi', '_TZ3210_mja6r5ix', '_TZ3210_it1u8ahz']),
        model: 'TS0505B_2',
        vendor: 'TuYa',
        description: 'Zigbee RGB+CCT light',
        whiteLabel: [
            tuya.whitelabel('Lidl', '14149505L/14149506L_2', 'Livarno Lux light bar RGB+CCT (black/white)', ['_TZ3210_iystcadi']),
            tuya.whitelabel('TuYa', 'TS0505B_2_1', 'Zigbee 3.0 18W led light bulb E27 RGBCW', ['_TZ3210_mja6r5ix']),
            tuya.whitelabel('TuYa', 'TS0505B_2_2', 'Zigbee GU10/E14 5W smart bulb', ['_TZ3210_it1u8ahz']),
        ],
        toZigbee: [tz.on_off, tzLocal.led_control, tuya.tz.do_not_disturb],
        fromZigbee: [fz.on_off, fz.tuya_led_controller, fz.brightness, fz.ignore_basic_report],
        exposes: [e.light_brightness_colortemp_colorhs([143, 500]).removeFeature('color_temp_startup'), tuya.exposes.doNotDisturb()],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        zigbeeModel: ['TS0503B'],
        model: 'TS0503B',
        vendor: 'TuYa',
        description: 'Zigbee RGB light',
        whiteLabel: [
            {vendor: 'BTF-Lighting', model: 'C03Z'},
            tuya.whitelabel('MiBoxer', 'FUT037Z', 'RGB led controller', ['_TZ3210_778drfdt']),
        ],
        extend: tuya.extend.light_onoff_brightness_color(),
    },
    {
        zigbeeModel: ['TS0504B'],
        model: 'TS0504B',
        vendor: 'TuYa',
        description: 'Zigbee RGBW light',
        extend: tuya.extend.light_onoff_brightness_color(),
        exposes: [e.light_brightness_color(false)
            .setAccess('color_xy', ea.STATE_SET).setAccess('color_hs', ea.STATE_SET)],
        toZigbee: utils.replaceInArray<Tz.Converter>(tuya.extend.light_onoff_brightness_color().toZigbee, [tz.light_color], [tzLocal.TS0504B_color]),
        meta: {applyRedFix: true},
    },
    {
        zigbeeModel: ['TS0501A'],
        model: 'TS0501A',
        description: 'Zigbee light',
        vendor: 'TuYa',
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
        vendor: 'TuYa',
        extend: [tuyaLight({configureReporting: true, effect: false})],
        whiteLabel: [
            tuya.whitelabel('TuYa', 'L1(ZW)', 'Light dimmer 0-10V', ['_TZB210_rkgngb5o']),
        ],
    },
    {
        zigbeeModel: ['TS0501B'],
        model: 'TS0501B',
        description: 'Zigbee light',
        vendor: 'TuYa',
        extend: [tuyaLight()],
        whiteLabel: [
            tuya.whitelabel('MiBoxer', 'FUT036Z', 'Single color LED controller', ['_TZ3210_dxroobu3', '_TZ3210_dbilpfqk']),
            tuya.whitelabel('Mercator Ikuü', 'SMFL20W-ZB', 'Ridley Floodlight', ['_TZ3000_juq7i1fr']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TYZB01_vwqnz1sn']),
        model: 'TS0202_3',
        vendor: 'TuYa',
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
        vendor: 'TuYa',
        description: 'Motion sensor with scene switch',
        fromZigbee: [tuya.fz.datapoints, fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [tuya.tz.datapoints],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.battery(), e.battery_voltage(), e.occupancy(), e.action(['single', 'double', 'hold']),
            e.enum('light', ea.STATE, ['dark', 'bright'])],
        meta: {
            tuyaDatapoints: [
                [102, 'light', tuya.valueConverterBasic.lookup({'dark': false, 'bright': true})],
                [101, 'action', tuya.valueConverterBasic.lookup({'single': 0, 'double': 1, 'hold': 2})],
            ],
        },
        whiteLabel: [
            {vendor: 'Linkoze', model: 'LKMSZ001'},
        ],
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TYZB01_jytabjkb'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_lltemgsf'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_5nr7ncpl'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_mg4dy6z6'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_bsvqrxru'},
        ],
        model: 'TS0202_1',
        vendor: 'TuYa',
        description: 'Motion sensor',
        // Requires alarm_1_with_timeout https://github.com/Koenkk/zigbee2mqtt/issues/2818#issuecomment-776119586
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.linkquality(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint('WHD02', ['_TZ3000_hktqahrq']),
        zigbeeModel: ['TS0202'],
        model: 'TS0202',
        vendor: 'TuYa',
        description: 'Motion sensor',
        whiteLabel: [{vendor: 'Mercator Ikuü', model: 'SMA02P'},
            {vendor: 'TuYa', model: 'TY-ZPR06'},
            {vendor: 'Tesla Smart', model: 'TS0202'},
            tuya.whitelabel('MiBoxer', 'PIR1-ZB', 'PIR sensor', ['_TZ3040_wqmtjsyk']),
            tuya.whitelabel('TuYa', 'ZMS01', 'Motion sensor', ['_TZ3000_otvn3lne']),
            tuya.whitelabel('Nous', 'E2', 'Motion sensor', ['_TZ3000_h4wnrtck']),
            tuya.whitelabel('TuYa', '809WZT', 'Motion sensor', ['_TZ3040_bb6xaihh']),
            tuya.whitelabel('Niceboy', 'ORBIS Motion Sensor', 'Motion sensor', ['_TZ3000_qomxlryd']),
            tuya.whitelabel('Luminea', 'ZX-5311', 'Motion sensor', ['_TZ3000_jmrgyl7o']),
            tuya.whitelabel('TuYa', 'ZP01', 'Motion sensor', ['_TZ3000_lf56vpxj']),
            tuya.whitelabel('TuYa', 'HW500A', 'Motion sensor', ['_TZ3000_bsvqrxru']),
        ],
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1_report],
        toZigbee: [],
        exposes: (device, options) => {
            const exps: Expose[] = [e.occupancy(), e.battery_low(), e.battery(), e.battery_voltage()];
            if (!device || device.manufacturerName !== '_TZ3000_bsvqrxru') {
                exps.push(e.tamper());
            }
            exps.push(e.linkquality());
            return exps;
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            try {
                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.batteryVoltage(endpoint);
            } catch (error) {/* Fails for some https://github.com/Koenkk/zigbee2mqtt/issues/13708 */}
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3040_fwxuzcf4', '_TZ3040_msl6wxk9']),
        model: 'ZM-35H-Q',
        vendor: 'TuYa',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ZM35HQ_attr, legacy.fromZigbee.ZM35HQ_battery],
        toZigbee: [tz.ZM35HQ_attr],
        extend: [quirkCheckinInterval(15000)],
        exposes: [e.occupancy(), e.battery_low(), e.battery(),
            e.enum('sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            e.enum('keep_time', ea.ALL, [30, 60, 120]).withDescription('PIR keep time in seconds'),
        ],
        configure: tuya.configureMagicPacket,
        whiteLabel: [
            tuya.whitelabel('Aubess', '40ZH-O', 'Motion sensor', ['_TZ3040_msl6wxk9']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3000_mcxw5ehu', '_TZ3000_6ygjfyll', '_TZ3040_6ygjfyll', '_TZ3000_msl6wxk9']),
        model: 'IH012-RT01',
        vendor: 'TuYa',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.ignore_basic_report, fz.ZM35HQ_attr, fz.battery],
        toZigbee: [tz.ZM35HQ_attr],
        extend: [quirkCheckinInterval(15000)],
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.battery_voltage(),
            e.enum('sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            e.enum('keep_time', ea.ALL, [30, 60, 120]).withDescription('PIR keep time in seconds'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        whiteLabel: [
            tuya.whitelabel('TuYa', 'ZMS-102', 'Motion sensor', ['_TZ3000_msl6wxk9']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3000_o4mkahkc']),
        model: 'IH012-RT02',
        vendor: 'TuYa',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.ignore_basic_report, fz.ZM35HQ_attr, fz.battery],
        toZigbee: [tz.ZM35HQ_attr],
        extend: [quirkCheckinInterval(15000)],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage(),
            e.enum('sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            e.enum('keep_time', ea.ALL, [30, 60, 120]).withDescription('PIR keep time in seconds'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0207', manufacturerName: '_TZ3000_m0vaazab'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_ufttklsz'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_nkkl7uzv'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_misw04hq'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_nlsszmzl'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_gszjt2xx'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_wlquqiiz'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_5k5vh43t'}],
        model: 'TS0207_repeater',
        vendor: 'TuYa',
        description: 'Repeater',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['TS0207', 'FNB54-WTS08ML1.0'],
        model: 'TS0207_water_leak_detector',
        vendor: 'TuYa',
        description: 'Water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery, fz.ignore_basic_report],
        whiteLabel: [
            {vendor: 'CR Smart Home', model: 'TS0207'},
            tuya.whitelabel('Meian', 'SW02', 'Water leak sensor', ['_TZ3000_kyb656no']),
            tuya.whitelabel('Aubess', 'IH-K665', 'Water leak sensor', ['_TZ3000_k4ej3ww2', '_TZ3000_kstbkt6a', '_TZ3000_upgcbody']),
            tuya.whitelabel('TuYa', 'TS0207_water_leak_detector_1', 'Zigbee water flood sensor + 1m probe cable', ['_TZ3000_ocjlo4ea']),
            tuya.whitelabel('TuYa', 'TS0207_water_leak_detector_3', 'Zigbee water leak sensor', ['_TYZB01_sqmd19i1']),
            tuya.whitelabel('TuYa', '899WZ', 'Water leak detector with 80DB Alarm', ['_TZ3000_mugyhz0q']),
            tuya.whitelabel('Niceboy', 'ORBIS Water Sensor', 'Water leak sensor', ['_TZ3000_awvmkayh']),
            tuya.whitelabel('Nous', 'E4', 'Water Leakage Sensor)', ['_TZ3000_0s9gukzt']),
        ],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: (device, options) => {
            const exps: Expose[] = [e.water_leak(), e.battery_low(), e.battery()];
            const noTamperModels = [ // manufacturerName for models without a tamper sensor
                '_TZ3000_mugyhz0q', // TuYa 899WZ
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
        fingerprint: tuya.fingerprint('TS0101', ['_TYZB01_ijihzffk', '_TZ3210_tfxwxklq', '_TZ3210_2dfy6tol']),
        model: 'TS0101',
        vendor: 'TuYa',
        description: 'Zigbee Socket',
        whiteLabel: [
            {vendor: 'Larkkey', model: 'PS080'},
            {vendor: 'Mercator Ikuü', model: 'SPBS01G'},
            tuya.whitelabel('Mercator Ikuü', 'SISW01', 'Inline Switch', ['_TZ3210_2dfy6tol']),
        ],
        extend: tuya.extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0108', manufacturerName: '_TYZB01_7yidyqxd'}],
        model: 'TS0108',
        vendor: 'TuYa',
        description: 'Socket with 2 USB',
        whiteLabel: [{vendor: 'Larkkey', model: 'PS580'}],
        extend: tuya.extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 7};
        },
        meta: {multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_whpb9yts'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ebwgzdqq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ctq0k47x'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9i9dt8is'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_dfxkcots'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_w4cryh2i'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ojzhk75b'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_swaamsoy'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_3p5ydos3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9cxuhakf'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_a0syesf5'},
        ],
        model: 'TS0601_dimmer',
        vendor: 'TuYa',
        description: 'Zigbee smart dimmer',
        fromZigbee: [legacy.fromZigbee.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.tuya_dimmer_state, legacy.toZigbee.tuya_dimmer_level],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
        exposes: [e.light_brightness().withMinBrightness().withMaxBrightness().setAccess(
            'state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET).setAccess(
            'min_brightness', ea.STATE_SET).setAccess('max_brightness', ea.STATE_SET)],
        whiteLabel: [
            {vendor: 'Larkkey', model: 'ZSTY-SM-1DMZG-EU'},
            {vendor: 'Earda', model: 'EDM-1ZAA-EU'},
            {vendor: 'Earda', model: 'EDM-1ZAB-EU'},
            {vendor: 'Earda', model: 'EDM-1ZBA-EU'},
            {vendor: 'Mercator Ikuü', model: 'SSWD01'},
            {vendor: 'Moes', model: 'ZS-USD'},
            {vendor: 'Moes', model: 'EDM-1ZBB-EU'},
            tuya.whitelabel('Mercator Ikuü', 'SSWM-DIMZ', 'Switch Mechanism', ['_TZE200_9cxuhakf']),
            tuya.whitelabel('Mercator Ikuü', 'SSWRM-ZB', 'Rotary dimmer mechanism', ['_TZE200_a0syesf5']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_myd45weu', '_TZE200_ga1maeof']),
        model: 'TS0601_soil',
        vendor: 'TuYa',
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
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ip2akl4w', '_TZE200_1agwnems', '_TZE200_la2c2uo9', '_TZE200_579lguh2',
            '_TZE200_vucankjx', '_TZE200_4mh6tyyo', '_TZE204_hlx9tnzb', '_TZE204_n9ctkb6j', '_TZE204_9qhuzgo0']),
        model: 'TS0601_dimmer_1',
        vendor: 'TuYa',
        description: '1 gang smart dimmer',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.lightBrightnessWithMinMax(), tuya.exposes.countdown(), tuya.exposes.lightType(),
            e.power_on_behavior().withAccess(ea.STATE_SET),
            tuya.exposes.backlightModeOffNormalInverted().withAccess(ea.STATE_SET)],
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
            tuya.whitelabel('Moes', 'ZS-SR-EUD-1', 'Star ring smart dimmer switch 1 gang', ['_TZE204_hlx9tnzb']),
            tuya.whitelabel('Moes', 'MS-105Z', 'Smart Dimmer module', ['_TZE200_la2c2uo9']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_fjjbhx9d', '_TZE200_e3oitdyu', '_TZE200_gwkapsoq', '_TZE204_zenj4lxv']),
        model: 'TS0601_dimmer_2',
        vendor: 'TuYa',
        description: '2 gang smart dimmer',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint('l1'),
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint('l2'),
            tuya.exposes.countdown().withEndpoint('l1'),
            tuya.exposes.countdown().withEndpoint('l2'),
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
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehaviorEnum],
                [21, 'backlight_mode', tuya.valueConverter.backlightModeOffNormalInverted],
            ],
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1};
        },
        whiteLabel: [
            {vendor: 'Moes', model: 'ZS-EUD_2gang'},
            {vendor: 'Moes', model: 'MS-105B'}, // _TZE200_e3oitdyu
            tuya.whitelabel('Moes', 'ZS-SR-EUD-2', 'Star ring smart dimmer switch 2 gangs', ['_TZE204_zenj4lxv']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_vm1gyrso', '_TZE204_1v1dxkck']),
        model: 'TS0601_dimmer_3',
        vendor: 'TuYa',
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
            tuya.exposes.backlightModeOffNormalInverted().withAccess(ea.STATE_SET)],
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
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
        whiteLabel: [
            {vendor: 'Moes', model: 'ZS-EUD_3gang'},
            tuya.whitelabel('Moes', 'ZS-SR-EUD-3', 'Star ring smart dimmer switch 3 gangs', ['_TZE204_1v1dxkck']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_bxoo2swd', '_TZE200_tsxpl0d0']),
        model: 'TS0601_dimmer_4',
        vendor: 'TuYa',
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
                [4, 'light_type_l1', tuya.valueConverterBasic.lookup({'led': tuya.enum(0), 'incandescent': tuya.enum(1), 'halogen': tuya.enum(2)})],
                [5, 'max_brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown_l1', tuya.valueConverter.countdown],
                [7, 'state_l2', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [8, 'brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [9, 'min_brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [10, 'light_type_l2', tuya.valueConverterBasic.lookup({'led': tuya.enum(0), 'incandescent': tuya.enum(1), 'halogen': tuya.enum(2)})],
                [11, 'max_brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [12, 'countdown_l2', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverterBasic.lookup({'off': tuya.enum(0), 'on': tuya.enum(1), 'previous': tuya.enum(2)})],
            ],
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1};
        },
        whiteLabel: [
            {vendor: 'Moes', model: 'MS-105B-M'},
            tuya.whitelabel('KnockautX', 'FMD2C018', '2 gang smart dimmer module', ['_TZE200_tsxpl0d0']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_dcnsggvz', '_TZE204_5cuocqty']),
        model: 'TS0601_dimmer_5',
        vendor: 'TuYa',
        description: '1 gang smart dimmer module',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightnessWithMinMax(),
            e.enum('power_on_behavior', ea.STATE_SET, ['off', 'on', 'previous']),
            tuya.exposes.countdown(), tuya.exposes.lightType(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness', tuya.valueConverter.scale0_254to0_1000],
                [4, 'light_type', tuya.valueConverterBasic.lookup({'led': tuya.enum(0), 'incandescent': tuya.enum(1), 'halogen': tuya.enum(2)})],
                [4, 'light_type', tuya.valueConverter.lightType],
                [5, 'max_brightness', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverterBasic.lookup({'off': tuya.enum(0), 'on': tuya.enum(1), 'previous': tuya.enum(2)})],
            ],
        },
        whiteLabel: [
            {vendor: 'Moes', model: 'MS-105-M'},
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_p0gzbqct']),
        model: 'TS0601_dimmer_knob',
        vendor: 'TuYa',
        description: 'Zigbee smart knob dimmer',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.lightBrightness().withMinBrightness().setAccess('min_brightness', ea.STATE_SET), tuya.exposes.lightType(),
            tuya.exposes.indicatorModeNoneRelayPos()],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness', tuya.valueConverter.scale0_254to0_1000],
                [4, 'light_type', tuya.valueConverter.lightType],
                [21, 'indicator_mode', tuya.valueConverterBasic.lookup({'none': 0, 'relay': 1, 'pos': 2})],
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
        vendor: 'TuYa',
        description: 'Socket module',
        extend: tuya.extend.switch(),
        whiteLabel: [{vendor: 'LoraTap', model: 'RR400ZB'}, {vendor: 'LoraTap', model: 'SP400ZB'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_wxtp7c5y'},
            {modelID: 'TS011F', manufacturerName: '_TYZB01_mtunwanm'}],
        model: 'TS011F_wall_outlet',
        vendor: 'TuYa',
        description: 'In-wall outlet',
        extend: tuya.extend.switch(),
        whiteLabel: [{vendor: 'Teekar', model: 'SWP86-01OG'},
            tuya.whitelabel('ClickSmart+', 'CMA30035', '1 gang socket outlet', ['_TYZB01_mtunwanm']),
            {vendor: 'BSEED', model: 'Zigbee Socket'}],
    },
    {
        fingerprint: [{modelID: 'isltm67\u0000', manufacturerName: '_TYST11_pisltm67'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pisltm67'}],
        model: 'S-LUX-ZB',
        vendor: 'TuYa',
        description: 'Light sensor',
        fromZigbee: [legacy.fromZigbee.SLUXZB],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.battery(), e.illuminance_lux(), e.linkquality(),
            e.enum('brightness_level', ea.STATE, ['LOW', 'MEDIUM', 'HIGH'])],
    },
    {
        zigbeeModel: ['TS130F'],
        model: 'TS130F',
        vendor: 'TuYa',
        description: 'Curtain/blind switch',
        fromZigbee: [fz.cover_position_tilt, tuya.fz.indicator_mode, fz.tuya_cover_options, tuya.fz.backlight_mode_off_on],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal,
            tuya.tz.backlight_indicator_mode_2, tuya.tz.backlight_indicator_mode_1],
        meta: {coverInverted: true},
        whiteLabel: [
            {vendor: 'LoraTap', model: 'SC400'},
            tuya.whitelabel('Zemismart', 'ZN-LC1E', 'Smart curtain/shutter switch', ['_TZ3000_74hsp7qy']),
            tuya.whitelabel('Nous', 'L12Z', 'Smart ZigBee Curtain Module L12Z', ['_TZ3000_jwv3cwak']),
            tuya.whitelabel('Danor', 'SK-Z802C-US', 'Smart curtain/shutter switch', ['_TZ3000_8h7wgocw']),
        ],
        exposes: [e.cover_position(), tuya.exposes.indicatorMode(), tuya.exposes.backlightModeOffOn(),
            e.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']), e.binary('calibration', ea.ALL, 'ON', 'OFF'),
            e.binary('motor_reversal', ea.ALL, 'ON', 'OFF'),
            e.numeric('calibration_time', ea.STATE).withUnit('s').withDescription('Calibration time')],
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
        vendor: 'TuYa',
        description: '1, 2, 3 or 4 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET), e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, legacy.fromZigbee.tuya_switch],
        toZigbee: [legacy.toZigbee.tuya_switch_state],
        meta: {multiEndpoint: true},
        whiteLabel: [
            {vendor: 'Norklmes', model: 'MKS-CM-W5'},
            {vendor: 'Somgoms', model: 'ZSQB-SMB-ZB'},
            {vendor: 'Moes', model: 'WS-EUB1-ZG'},
            {vendor: 'AVATTO', model: 'ZGB-WS-EU'},
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_aqnazj70', '_TZE200_di3tfv5b', '_TZE200_mexisfik', '_TZE204_6wi2mope', '_TZE204_iik0pquw']),
        model: 'TS0601_switch_4_gang_1',
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_jwsjbxjs', '_TZE200_leaqthqq']),
        model: 'TS0601_switch_5_gang',
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1};
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
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_mwvfvw8g', '_TZE200_wnp4d4va']),
        model: 'TS0601_switch_6_gang',
        vendor: 'TuYa',
        description: '6 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1};
        },
        whiteLabel: [
            tuya.whitelabel('Mercator Ikuü', 'SSW06G', '6 Gang switch', ['_TZE200_wnp4d4va']),
        ],
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
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_ojtqawav']),
        model: 'TS0601_switch_1_gang',
        vendor: 'TuYa',
        description: '1 gang switch',
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, legacy.fromZigbee.tuya_switch],
        toZigbee: [legacy.toZigbee.tuya_switch_state],
        whiteLabel: [
            tuya.whitelabel('Shawader', 'SMKG-1KNL-US/TZB-W', '1 gang switch', ['_TZE204_ojtqawav']),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_gbagoilo']),
        model: 'MG-ZG01W',
        vendor: 'TuYa',
        description: '1 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET)],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
            ],
        },
        endpoint: (device) => {
            return {'l1': 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nkjintbl', '_TZE200_ji1gn7rw', '_TZE200_3t91nb6k', '_TZE204_wvovwe9h', '_TZE204_3t91nb6k']),
        model: 'TS0601_switch_2_gang',
        vendor: 'TuYa',
        description: '2 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, legacy.fromZigbee.tuya_switch],
        toZigbee: [legacy.toZigbee.tuya_switch_state],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nh9m9emk']),
        model: 'MG-ZG02W',
        vendor: 'TuYa',
        description: '2 gang switch',
        exposes: [
            e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
        ],
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
            return {'l1': 1, 'l2': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_kyfqmmyl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2hf7x9n3'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_atpwqgml'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_bynnczcb'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_atpwqgml'}],
        model: 'TS0601_switch_3_gang',
        vendor: 'TuYa',
        description: '3 gang switch',
        whiteLabel: [{vendor: 'NOVADIGITAL', model: 'WS-US-ZB', description: 'Interruptor touch Zigbee 3 Teclas'}],
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, legacy.fromZigbee.tuya_switch],
        toZigbee: [legacy.toZigbee.tuya_switch_state],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_go3tvswy']),
        model: 'MG-ZG03W',
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0215A', ['_TZ3000_4fsgukof', '_TZ3000_wr2ucaj9', '_TZ3000_zsh6uat3', '_TZ3000_tj4pwzzm',
            '_TZ3000_2izubafb', '_TZ3000_pkfazisv', '_TZ3000_0dumfk2z', '_TZ3000_ssp0maqm', '_TZ3000_p3fph1go']),
        model: 'TS0215A_sos',
        vendor: 'TuYa',
        description: 'SOS button',
        fromZigbee: [fz.command_emergency, fz.battery],
        exposes: [e.battery(), e.battery_voltage(), e.action(['emergency'])],
        toZigbee: [],
        whiteLabel: [
            tuya.whitelabel('TuYa', 'BT400B', 'Zigbee Panic Button', ['_TZ3000_0dumfk2z']),
            tuya.whitelabel('Woox', 'R7052', 'Smart SOS button', ['_TZ3000_ssp0maqm']),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genTime', 'genBasic', 'ssIasAce', 'ssIasZone']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0215A', manufacturerName: '_TZ3000_p6ju8myv'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_0zrccfgx'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_fsiepnrh'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_ug1vtuzn'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_eo3dttwe'}],
        model: 'TS0215A_remote',
        vendor: 'TuYa',
        description: 'Security remote control',
        fromZigbee: [fz.command_arm, fz.command_emergency, fz.battery],
        exposes: [e.battery(), e.action(['disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'Woox', model: 'R7054'}, {vendor: 'Nedis', model: 'ZBRC10WT'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genTime', 'genBasic', 'ssIasAce', 'ssIasZone']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0503A', manufacturerName: '_TZ3000_obacbukl'}],
        model: 'TS0503A',
        vendor: 'TuYa',
        description: 'Led strip controller',
        extend: tuya.extend.light_onoff_brightness_color(),
    },
    {
        zigbeeModel: ['TS0503A'],
        model: 'TYZS1L',
        vendor: 'TuYa',
        description: 'Led strip controller HSB',
        exposes: [e.light_colorhs()],
        fromZigbee: [fz.on_off, fz.tuya_led_controller],
        toZigbee: [tz.tuya_led_controller, tz.ignore_transition, tz.ignore_rate],
    },
    {
        zigbeeModel: ['TS0502A'],
        model: 'TS0502A',
        vendor: 'TuYa',
        description: 'Light controller',
        extend: tuya.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 500], noConfigure: true}),
        whiteLabel: [
            tuya.whitelabel('Lidl', 'HG06492B', 'Livarno Lux E14 candle CCT', ['_TZ3000_oborybow']),
            tuya.whitelabel('Lidl', 'HG06492A/HG08130A', 'Livarno Lux GU10 spot CCT', ['_TZ3000_el5kt5im']),
            tuya.whitelabel('Lidl', 'HG06492C/HG08130C/HG09154C', 'Livarno Lux E27 bulb CCT', ['_TZ3000_49qchf10']),
            tuya.whitelabel('Lidl', '14147206L', 'Livarno Lux ceiling light', ['_TZ3000_rylaozuc', '_TZ3000_5fkufhn1']),
            tuya.whitelabel('Lidl', '14153905L', 'Livarno Home LED floor lamp', ['_TZ3000_8uaoilu9']),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        zigbeeModel: ['TS0502B'],
        model: 'TS0502B',
        vendor: 'TuYa',
        description: 'Light controller',
        whiteLabel: [
            tuya.whitelabel('Mercator Ikuü', 'SMI7040', 'Ford Batten Light', ['_TZ3000_zw7wr5uo']),
            {vendor: 'Mercator Ikuü', model: 'SMD9300', description: 'Donovan Panel Light'},
            tuya.whitelabel('Aldi', 'F122SB62H22A4.5W', 'LIGHTWAY smart home LED-lamp - filament', ['_TZ3000_g1glzzfk']),
            tuya.whitelabel('MiBoxer', 'FUT035Z+', 'Dual white LED controller',
                ['_TZ3210_frm6149r', '_TZ3210_jtifm80b', '_TZ3210_xwqng7ol', '_TZB210_lmqquxus']),
            tuya.whitelabel('Lidl', '14156408L', 'Livarno Lux smart LED ceiling light', ['_TZ3210_c2iwpxf1']),
        ],
        extend: tuya.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 500], noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await tuya.extend.light_onoff_brightness_colortemp().configure(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.brightness(device.getEndpoint(1));
        },
    },
    {
        zigbeeModel: ['TS0504A'],
        model: 'TS0504A',
        vendor: 'TuYa',
        description: 'RGBW LED controller',
        extend: tuya.extend.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_sosdczdl'}],
        model: 'TS0505A_led',
        vendor: 'TuYa',
        description: 'RGB+CCT LED',
        toZigbee: [tz.on_off, tz.tuya_led_control],
        fromZigbee: [fz.on_off, fz.tuya_led_controller, fz.brightness, fz.ignore_basic_report],
        exposes: [e.light_brightness_colortemp_colorhs([153, 500]).removeFeature('color_temp_startup')],
    },
    {
        zigbeeModel: ['TS0505A'],
        model: 'TS0505A',
        vendor: 'TuYa',
        description: 'RGB+CCT light controller',
        extend: tuya.extend.light_onoff_brightness_colortemp_color({noConfigure: true}),
        whiteLabel: [
            tuya.whitelabel('Lidl', 'HG06106B', 'Livarno Lux E14 candle RGB', ['_TZ3000_odygigth']),
            tuya.whitelabel('Lidl', 'HG06106A', 'Livarno Lux GU10 spot RGB', ['_TZ3000_kdpxju99']),
            tuya.whitelabel('Lidl', 'HG06106C', 'Livarno Lux E27 bulb RGB', ['_TZ3000_dbou1ap4']),
            tuya.whitelabel('Lidl', '14148906L', 'Livarno Lux mood light RGB+CCT', ['_TZ3000_9cpuaca6']),
            tuya.whitelabel('Lidl', '14149505L/14149506L_1', 'Livarno Lux light bar RGB+CCT (black/white)', ['_TZ3000_gek6snaj']),
            tuya.whitelabel('Mycket', 'MS-SP-LE27WRGB', 'E27 RGBW bulb', ['_TZ3000_evag0pvn']),
            tuya.whitelabel('Lidl', 'HG06104A', 'Livarno Lux smart LED light strip 2.5m', ['_TZ3000_riwp3k79', '_TZ3000_riwp3k79']),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{manufacturerName: '_TZ2000_a476raq2'}],
        zigbeeModel: ['TS0201', 'SNTZ003', 'TY0201'],
        model: 'TS0201',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with display',
        fromZigbee: [fzLocal.TS0201_battery, fz.temperature, fzLocal.TS0201_humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: tuya.configureMagicPacket,
        whiteLabel: [
            {vendor: 'BlitzWolf', model: 'BW-IS4'},
            tuya.whitelabel('TuYa', 'TS0201_1', 'Zigbee 3.0 temperature humidity sensor with display', ['_TZ3210_alxkwn0h']),
            tuya.whitelabel('TuYa', 'ZTH01/ZTH02', 'Temperature and humidity sensor', ['_TZ3000_0s1izerx']),
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
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fzLocal.TS0201_battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: tuya.configureMagicPacket,
        whiteLabel: [
            tuya.whitelabel('TuYa', 'TH02Z', 'Temperature and humidity sensor', ['_TZ3000_fllyghyj', '_TZ3000_saiqcn0y']),
        ],
    },
    {
        fingerprint: [
            ...tuya.fingerprint('TS0201', ['_TZ3000_dowj6gyi', '_TZ3000_8ybe88nf']),
            {manufacturerName: '_TZ3000_zl1kmjqx'},
        ],
        model: 'IH-K009',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fzLocal.TS0201_battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: tuya.configureMagicPacket,
        whiteLabel: [
            tuya.whitelabel('TuYa', 'RSH-HS06_1', 'Temperature & humidity sensor', ['_TZ3000_zl1kmjqx']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('SM0201', ['_TYZB01_cbiezpds', '_TYZB01_zqvwka4k']),
        model: 'SM0201',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with LED screen',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_3zofvcaa', '_TZ3000_pvlvoxvt']),
        model: 'TS011F_2_gang_2_usb_wall',
        vendor: 'TuYa',
        description: '2 gang 2 usb wall outlet',
        extend: tuya.extend.switch({backlightModeLowMediumHigh: true, endpoints: ['l1', 'l2', 'l3', 'l4'], childLock: true}),
        endpoint: () => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            for (const endpointID of [1, 2, 3, 4]) {
                const endpoint = device.getEndpoint(endpointID);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                await reporting.onOff(endpoint);
            }
        },
    },
    {
        zigbeeModel: ['TS0041'],
        fingerprint: [{manufacturerName: '_TZ3000_tk3s5tyg'}, {modelID: 'TS0041A', manufacturerName: '_TYZB01_ub7urdza'}],
        model: 'TS0041',
        vendor: 'TuYa',
        description: 'Wireless switch with 1 button',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0041'}, {vendor: 'Benexmart', model: 'ZM-sui1'},
            tuya.whitelabel('Sber', 'SBDV-00032', 'Wireless switch with 1 button', ['_TYZB01_ub7urdza']),
            tuya.whitelabel('TuYa', 'SH-SC07', 'Button scene switch', ['_TZ3000_mrpevh8p']),
            tuya.whitelabel('TuYa', 'MINI-ZSB', 'Smart button', ['_TZ3000_qgwcxxws']),
        ],
        exposes: [e.battery(), e.action(['single', 'double', 'hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
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
        vendor: 'TuYa',
        description: 'Wireless switch with 2 buttons',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0042'},
            {vendor: 'ClickSmart+', model: 'CSPGM2075PW'}],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
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
        vendor: 'TuYa',
        description: 'Wireless switch with 3 buttons',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0043'}, {vendor: 'LoraTap', model: 'SS600ZB'}],
        exposes: [e.battery(),
            e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold', '3_single', '3_double', '3_hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
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
        vendor: 'TuYa',
        description: 'Wireless switch with 4 buttons',
        whiteLabel: [
            {vendor: 'Lonsonho', model: 'TS0044'}, {vendor: 'Haozee', model: 'ESW-OZAA-EU'},
            {vendor: 'LoraTap', model: 'SS6400ZB'}, {vendor: 'Moes', model: 'ZT-SY-EU-G-4S-WH-MS'},
            tuya.whitelabel('Moes', 'ZT-SR-EU4', 'Star Ring 4 Gang Scene Switch', ['_TZ3000_a4xycprs']),
            tuya.whitelabel('TuYa', 'TS0044_1', 'Zigbee 4 button remote - 12 scene', ['_TZ3000_dziaict4', '_TZ3000_mh9px7cq', '_TZ3000_wkai4ga5']),
            tuya.whitelabel('TuYa', 'TM-YKQ004', 'Zigbee 4 button remote - 12 scene', ['_TZ3000_u3nv1jwk']),
        ],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
            '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold'])],
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
        fingerprint: tuya.fingerprint('TS004F', ['_TZ3000_nuombroo', '_TZ3000_xabckq1v', '_TZ3000_czuyt8lz',
            '_TZ3000_0ht8dnxj']),
        model: 'TS004F',
        vendor: 'TuYa',
        description: 'Wireless switch with 4 buttons',
        exposes: [
            e.battery(),
            e.enum('operation_mode', ea.ALL, ['command', 'event']).withDescription(
                'Operation mode: "command" - for group control, "event" - for clicks'),
            e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
                'brightness_move_down', '1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
                '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold'])],
        fromZigbee: [fz.battery, fz.tuya_on_off_action, fz.tuya_operation_mode,
            fz.command_on, fz.command_off, fz.command_step, fz.command_move],
        toZigbee: [tz.tuya_operation_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
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
        vendor: 'TuYa',
        description: 'Wireless switch with 6 buttons',
        exposes: [
            e.battery(),
            e.enum('operation_mode', ea.ALL, ['command', 'event']).withDescription(
                'Operation mode: "command" - for group control, "event" - for clicks'),
            e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
                'brightness_move_down', '1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
                '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold',
                '5_single', '5_double', '5_hold', '6_single', '6_double', '6_hold'])],
        fromZigbee: [fz.battery, fz.tuya_on_off_action, fz.tuya_operation_mode,
            fz.command_on, fz.command_off, fz.command_step, fz.command_move],
        toZigbee: [tz.tuya_operation_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
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
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_dzuqwsyg']),
        model: 'BAC-003',
        vendor: 'TuYa',
        description: 'Central air conditioner thermostat temperature controller',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('state', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn the thermostat ON/OFF'),
            e.climate()
                .withSetpoint('current_heating_setpoint', 16, 30, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'cool', 'heat', 'fan_only'], ea.STATE_SET)
                .withFanMode(['low', 'medium', 'high', 'auto'], ea.STATE_SET),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [2, 'system_mode', tuya.valueConverterBasic.lookup({'cool': tuya.enum(0), 'heat': tuya.enum(1), 'fan_only': tuya.enum(2)})],
                [16, 'current_heating_setpoint', tuya.valueConverterBasic.divideBy(1)],
                [24, 'local_temperature', tuya.valueConverter.divideBy10],
                [28, 'fan_mode', tuya.valueConverterBasic.lookup(
                    {'low': tuya.enum(0), 'medium': tuya.enum(1), 'high': tuya.enum(2), 'auto': tuya.enum(3)})],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_qq9mpfhw'}],
        model: 'TS0601_water_sensor',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        fromZigbee: [legacy.fromZigbee.tuya_water_leak, fz.ignore_basic_report],
        exposes: [e.water_leak()],
        toZigbee: [],
        whiteLabel: [{vendor: 'Neo', model: 'NAS-WS02B0'}],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_jthf7vb6'}],
        model: 'WLS-100z',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_raw, legacy.fromZigbee.wls100z_water_leak],
        toZigbee: [],
        onEvent: tuya.onEventSetTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.battery(), e.water_leak()],
    },
    {
        fingerprint: tuya.fingerprint('TS0001', ['_TZ3000_xkap8wtb', '_TZ3000_qnejhcsu', '_TZ3000_x3ewpzyr',
            '_TZ3000_mkhkxx1p', '_TZ3000_tgddllx4', '_TZ3000_kqvb5akv', '_TZ3000_g92baclx']),
        model: 'TS0001_power',
        description: 'Switch with power monitoring',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report,
            tuya.fz.power_outage_memory, tuya.fz.switch_type],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tuya.tz.switch_type],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), tuya.exposes.switchType(),
            e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore']).withDescription('Recover state after power outage')],
    },
    {
        fingerprint: [{modelID: 'TS0002', manufacturerName: '_TZ3000_irrmjcgi'}],
        model: 'TS0002_power',
        vendor: 'TuYa',
        description: '2 gang switch with power monitoring',
        extend: tuya.extend.switch({switchType: true, endpoints: ['l1', 'l2'], electricalMeasurements: true}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['energy', 'current', 'voltage', 'power']},
        configure: async (device, coordinatorEndpoint, logger) => {
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
            tuya.whitelabel('TuYa', 'XSH01B', '2 gang switch module with power monitoring', ['_TZ3000_irrmjcgi']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS000F', ['_TZ3000_xkap8wtb']),
        model: 'TS000F_power',
        description: 'Switch with power monitoring',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, tuya.fz.power_on_behavior_1,
            tuya.fz.switch_type],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tuya.tz.switch_type],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        whiteLabel: [{vendor: 'Aubess', model: 'WHD02'}],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.power_on_behavior(),
            tuya.exposes.switchType()],
    },
    {
        zigbeeModel: ['TS0001'],
        model: 'TS0001',
        vendor: 'TuYa',
        description: '1 gang switch',
        extend: tuya.extend.switch(),
        whiteLabel: [{vendor: 'CR Smart Home', model: 'TS0001', description: 'Valve control'}, {vendor: 'Lonsonho', model: 'X701'},
            {vendor: 'Bandi', model: 'BDS03G1'},
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0002', ['_TZ3000_54hjn4vs', '_TZ3000_aa5t61rh']),
        model: 'TS0002_switch_module_3',
        vendor: 'TuYa',
        description: '2 gang switch with backlight',
        extend: tuya.extend.switch({powerOnBehavior2: true, indicatorMode: true, endpoints: ['l1', 'l2']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Lonsonho', 'X702A', '2 gang switch with backlight', ['_TZ3000_54hjn4vs', '_TZ3000_aa5t61rh']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0003', ['_TZ3000_rhkfbfcv', '_TZ3000_empogkya', '_TZ3000_lubfc1t5', '_TZ3000_lsunm46z']),
        model: 'TS0003_switch_3_gang_with_backlight',
        vendor: 'TuYa',
        description: '3-Gang switch with backlight',
        extend: tuya.extend.switch({powerOnBehavior2: true, indicatorMode: true, backlightModeOffOn: true, endpoints: ['l1', 'l2', 'l3']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Lonsonho', 'X703A', '3 Gang switch with backlight', ['_TZ3000_rhkfbfcv']),
            tuya.whitelabel('Zemismart', 'ZM-L03E-Z', '3 gang switch with neutral', ['_TZ3000_empogkya', '_TZ3000_lsunm46z']),
            tuya.whitelabel('TuYa', 'M10Z', '2 gang switch with 20A power socket', ['_TZ3000_lubfc1t5']),
        ],
    },
    {
        zigbeeModel: ['TS0002'],
        model: 'TS0002',
        vendor: 'TuYa',
        description: '2 gang switch',
        whiteLabel: [
            {vendor: 'Zemismart', model: 'ZM-CSW002-D_switch'},
            {vendor: 'Lonsonho', model: 'X702'},
            {vendor: 'AVATTO', model: 'ZTS02'},
            tuya.whitelabel('TuYa', 'ZG-2002-RF', 'Three mode Zigbee Switch', ['_TZ3000_lugaswf8']),
            tuya.whitelabel('Mercator Ikuü', 'SSW02', '2 gang switch', ['_TZ3000_fbjdkph9']),
        ],
        extend: tuya.extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0003'],
        model: 'TS0003',
        vendor: 'TuYa',
        description: '3 gang switch',
        extend: [onOff({endpoints: {left: 1, center: 2, right: 3}, powerOnBehavior: false})],
        whiteLabel: [{vendor: 'BSEED', model: 'TS0003', description: 'Zigbee switch'}],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0001', ['_TZ3000_tqlv4ug4', '_TZ3000_gjrubzje', '_TZ3000_tygpxwqa', '_TZ3000_4rbqgcuv', '_TZ3000_veu2v775']),
        model: 'TS0001_switch_module',
        vendor: 'TuYa',
        description: '1 gang switch module',
        whiteLabel: [
            {vendor: 'OXT', model: 'SWTZ21'},
            {vendor: 'Moes', model: 'ZM-104-M'},
            tuya.whitelabel('AVATTO', 'ZWSM16-1-Zigbee', '1 gang switch module', ['_TZ3000_4rbqgcuv']),
        ],
        extend: tuya.extend.switch({switchType: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0002', ['_TZ3000_01gpyda5', '_TZ3000_bvrlqyj7', '_TZ3000_7ed9cqgi',
            '_TZ3000_zmy4lslw', '_TZ3000_ruxexjfz', '_TZ3000_4xfqlgqo', '_TZ3000_eei0ubpy', '_TZ3000_qaa59zqd', '_TZ3000_lmlsduws']),
        model: 'TS0002_switch_module',
        vendor: 'TuYa',
        description: '2 gang switch module',
        whiteLabel: [
            {vendor: 'OXT', model: 'SWTZ22'},
            {vendor: 'Moes', model: 'ZM-104B-M'},
            tuya.whitelabel('pcblab.io', 'RR620ZB', '2 gang Zigbee switch module', ['_TZ3000_4xfqlgqo']),
            tuya.whitelabel('Nous', 'L13Z', '2 gang switch', ['_TZ3000_ruxexjfz']),
        ],
        extend: tuya.extend.switch({switchType: true, endpoints: ['l1', 'l2']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0002', ['_TZ3000_fisb3ajo', '_TZ3000_5gey1ohx', '_TZ3000_mtnpt6ws']),
        model: 'TS0002_switch_module_2',
        vendor: 'TuYa',
        description: '2 gang switch module',
        extend: tuya.extend.switch({switchType: true, indicatorMode: true, endpoints: ['l1', 'l2']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('AVATTO', 'ZWSM16-2-Zigbee', '2 gang switch module', ['_TZ3000_mtnpt6ws']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0003', ['_TZ3000_4o16jdca', '_TZ3000_odzoiovu', '_TZ3000_hbic3ka3', '_TZ3000_lvhy15ix']),
        model: 'TS0003_switch_module_2',
        vendor: 'TuYa',
        description: '3 gang switch module',
        extend: tuya.extend.switch({switchType: true, indicatorMode: true, endpoints: ['l1', 'l2', 'l3']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('AVATTO', 'ZWSM16-3-Zigbee', '3 gang switch module', ['_TZ3000_hbic3ka3']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0003', ['_TZ3000_vsasbzkf', '_TZ3000_nnwehhst']),
        model: 'TS0003_switch_module_1',
        vendor: 'TuYa',
        description: '3 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ23'}],
        extend: tuya.extend.switch({switchType: true, backlightModeOffOn: true, endpoints: ['l1', 'l2', 'l3']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0004', ['_TZ3000_ltt60asa']),
        model: 'TS0004_switch_module',
        vendor: 'TuYa',
        description: '4 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ27'}],
        extend: tuya.extend.switch({switchType: true, endpoints: ['l1', 'l2', 'l3', 'l4']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: [
            'owvfni3\u0000', 'owvfni3', 'u1rkty3', 'aabybja', // Curtain motors
            'mcdj3aq', 'mcdj3aq\u0000', // Tubular motors
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
            {modelID: 'TS0601', manufacturerName: '_TZE200_axgvo9jh'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_gaj531w3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_yia0p3tr'},
        ],
        model: 'TS0601_cover_1',
        vendor: 'TuYa',
        description: 'Curtain motor/roller blind motor/window pusher/tubular motor',
        whiteLabel: [
            {vendor: 'Yushun', model: 'YS-MT750'},
            tuya.whitelabel('Yushun', 'YS-MT750L', 'Curtain motor', ['_TZE200_bqcqqjpb', '_TZE200_gaj531w3']),
            {vendor: 'Zemismart', model: 'ZM79E-DT'},
            {vendor: 'Binthen', model: 'BCM100D'},
            {vendor: 'Binthen', model: 'CV01A'},
            {vendor: 'Zemismart', model: 'M515EGB'},
            {vendor: 'Oz Smart Things', model: 'ZM85EL-1Z'},
            {vendor: 'TuYa', model: 'M515EGZT'},
            {vendor: 'TuYa', model: 'DT82LEMA-1.2N'},
            {vendor: 'TuYa', model: 'ZD82TN', description: 'Curtain motor'},
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
        ],
        fromZigbee: [legacy.fromZigbee.tuya_cover, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.tuya_cover_control, legacy.toZigbee.tuya_cover_options],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.composite('options', 'options', ea.STATE_SET)
                .withFeature(e.numeric('motor_speed', ea.STATE_SET)
                    .withValueMin(0).withValueMax(255).withDescription('Motor speed'))
                .withFeature(e.binary('reverse_direction', ea.STATE_SET, true, false)
                    .withDescription('Reverse the motor direction'))],
    },
    {
        fingerprint: [
            // Curtain motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_eegnwoyw'},
        ],
        model: 'TS0601_cover_2',
        vendor: 'TuYa',
        description: 'Curtain motor fixed speed',
        whiteLabel: [
            {vendor: 'Zemismart', model: 'BCM100DB'},
        ],
        fromZigbee: [legacy.fromZigbee.tuya_cover, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.tuya_cover_control],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_cpbo62rn'},
        ],
        model: 'TS0601_cover_6',
        vendor: 'TuYa',
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
        whiteLabel: [
            tuya.whitelabel('TuYa', 'LY-108', 'Cover', ['_TZE200_cpbo62rn']),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({'CLOSE': tuya.enum(2), 'STOP': tuya.enum(1), 'OPEN': tuya.enum(0)})],
                [2, 'position', tuya.valueConverter.coverPositionInverted],
                [3, 'position', tuya.valueConverter.coverPositionInverted],
                [4, 'opening_mode', tuya.valueConverterBasic.lookup({'tilt': tuya.enum(0), 'lift': tuya.enum(1)})],
                [7, 'work_state', tuya.valueConverterBasic.lookup({'standby': tuya.enum(0), 'success': tuya.enum(1), 'learning': tuya.enum(2)})],
                [13, 'battery', tuya.valueConverter.raw],
                [101, 'motor_direction', tuya.valueConverterBasic.lookup({'left': tuya.enum(0), 'right': tuya.enum(1)})],
                [102, 'set_upper_limit', tuya.valueConverterBasic.lookup({'start': tuya.enum(1), 'stop': tuya.enum(0)})],
                [107, 'factory_reset', tuya.valueConverter.setLimit],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_zvo63cmo']),
        model: 'TS0601_cover_7',
        vendor: 'TuYa',
        description: 'Cover motor',
        onEvent: tuya.onEvent(),
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET), e.battery()],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({'OPEN': tuya.enum(0), 'STOP': tuya.enum(1), 'CLOSE': tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'position', tuya.valueConverter.raw],
                // motor_direction doesn't work: https://github.com/Koenkk/zigbee2mqtt/issues/18103
                // [5, 'motor_direction', tuya.valueConverterBasic.lookup({'normal': tuya.enum(0), 'reversed': tuya.enum(1)})],
                [101, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_r0jdjrvi']),
        model: 'TS0601_cover_8',
        vendor: 'TuYa',
        description: 'Cover motor',
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        options: [exposes.options.invert_cover()],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.enum('reverse_direction', ea.STATE_SET, ['forward', 'back'])
                .withDescription('Reverse the motor direction'),
            e.binary('motor_fault', ea.STATE, true, false)
                .withDescription('Motor Fault'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({'OPEN': tuya.enum(0), 'STOP': tuya.enum(1), 'CLOSE': tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPositionInverted],
                [3, 'position', tuya.valueConverter.coverPositionInverted],
                [5, 'reverse_direction', tuya.valueConverterBasic.lookup({'forward': tuya.enum(0), 'back': tuya.enum(1)})],
                [12, 'motor_fault', tuya.valueConverter.trueFalse1],
            ],
        },
        whiteLabel: [
            // https://www.amazon.ae/dp/B09JG92Z88
            // Tuya ZigBee Intelligent Curtain Blind Switch Electric Motorized Curtain Roller
            tuya.whitelabel('Lilistore', 'TS0601_lilistore', 'Cover motor', ['_TZE204_r0jdjrvi']),
        ],
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
        ],
        model: 'TS0601_thermostat',
        vendor: 'TuYa',
        description: 'Radiator valve with thermostat',
        whiteLabel: [
            {vendor: 'Moes', model: 'HY368'},
            {vendor: 'Moes', model: 'HY369RT'},
            {vendor: 'SHOJZJ', model: '378RT'},
            {vendor: 'Silvercrest', model: 'TVR01'},
            {vendor: 'Immax', model: '07732B'},
            tuya.whitelabel('Immax', '07732L', 'Radiator valve with thermostat', ['_TZE200_rufdtfyv']),
            {vendor: 'Evolveo', model: 'Heat M30'},
        ],
        meta: {tuyaThermostatPreset: legacy.thermostatPresets, tuyaThermostatSystemMode: legacy.thermostatSystemModes3},
        ota: ota.zigbeeOTA,
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [legacy.fromZigbee.tuya_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [legacy.toZigbee.tuya_thermostat_child_lock, legacy.toZigbee.tuya_thermostat_window_detection,
            legacy.toZigbee.tuya_thermostat_valve_detection,
            legacy.toZigbee.tuya_thermostat_current_heating_setpoint, legacy.toZigbee.tuya_thermostat_auto_lock,
            legacy.toZigbee.tuya_thermostat_calibration, legacy.toZigbee.tuya_thermostat_min_temp, legacy.toZigbee.tuya_thermostat_max_temp,
            legacy.toZigbee.tuya_thermostat_boost_time, legacy.toZigbee.tuya_thermostat_comfort_temp, legacy.toZigbee.tuya_thermostat_eco_temp,
            legacy.toZigbee.tuya_thermostat_force_to_mode, legacy.toZigbee.tuya_thermostat_force, legacy.toZigbee.tuya_thermostat_preset,
            legacy.toZigbee.tuya_thermostat_window_detect, legacy.toZigbee.tuya_thermostat_schedule, legacy.toZigbee.tuya_thermostat_week,
            legacy.toZigbee.tuya_thermostat_schedule_programming_mode, legacy.toZigbee.tuya_thermostat_away_mode,
            legacy.toZigbee.tuya_thermostat_away_preset],
        exposes: [
            e.child_lock(), e.window_detection(),
            e.binary('window_open', ea.STATE, true, false).withDescription('Window open?'),
            e.battery_low(), e.valve_detection(), e.position(),
            e.climate().withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withSystemMode(['heat', 'auto', 'off'], ea.STATE_SET,
                    'Mode of this device, in the `heat` mode the TS0601 will remain continuously heating, i.e. it does not regulate ' +
                    'to the desired temperature. If you want TRV to properly regulate the temperature you need to use mode `auto` ' +
                    'instead setting the desired temperature.')
                .withLocalTemperatureCalibration(-9, 9, 0.5, ea.STATE_SET)
                .withPreset(['schedule', 'manual', 'boost', 'complex', 'comfort', 'eco', 'away'])
                .withRunningState(['idle', 'heat'], ea.STATE),
            e.auto_lock(), e.away_mode(), e.away_preset_days(), e.boost_time(), e.comfort_temperature(), e.eco_temperature(), e.force(),
            e.max_temperature().withValueMin(16).withValueMax(70), e.min_temperature(), e.away_preset_temperature(),
            e.week(),
            e.text('workdays_schedule', ea.STATE_SET)
                .withDescription('Workdays schedule, 6 entries max, example: "00:20/5°C 01:20/5°C 6:59/15°C 18:00/5°C 20:00/5°C 23:30/5°C"'),
            e.text('holidays_schedule', ea.STATE_SET)
                .withDescription('Holidays schedule, 6 entries max, example: "00:20/5°C 01:20/5°C 6:59/15°C 18:00/5°C 20:00/5°C 23:30/5°C"'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_g2ki0ejr']),
        model: 'BAB-1413_Pro',
        vendor: 'TuYa',
        description: 'Thermostat radiator valve',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(), e.child_lock(),
            e.max_temperature().withValueMin(15).withValueMax(45),
            e.min_temperature().withValueMin(5).withValueMax(15),
            e.window_detection(),
            e.open_window_temperature().withValueMin(5).withValueMax(25),
            e.comfort_temperature().withValueMin(5).withValueMax(35),
            e.eco_temperature().withValueMin(5).withValueMax(35),
            e.holiday_temperature().withValueMin(5).withValueMax(35),
            e.climate().withPreset(['auto', 'manual', 'holiday', 'comfort']).withLocalTemperatureCalibration(-9, 9, 0.1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET, 'Only for Homeassistant')
                .withRunningState(['idle', 'heat'], ea.STATE_SET),
            tuya.exposes.frostProtection('When Anti-Freezing function is activated, the temperature in the house is kept '+
                    'at 8 °C, the device display "AF".press the pair button to cancel.'),
            e.numeric('boost_timeset_countdown', ea.STATE_SET).withUnit('s').withDescription('Setting '+
                    'minimum 0 - maximum 465 seconds boost time. The boost function is activated. The remaining '+
                    'time for the function will be counted down in seconds ( 465 to 0 ).').withValueMin(0).withValueMax(465),
            e.composite('schedule', 'schedule', ea.STATE_SET).withFeature(e.enum('week_day', ea.SET, ['monday', 'tuesday',
                'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).withFeature(e.text('schedule', ea.SET))
                .withDescription('Schedule will work with "auto" preset. In this mode, the device executes ' +
                'a preset week programming temperature time and temperature. Before using these properties, check `working_day` ' +
                'property. Each day can contain up to 10 segments. At least 1 segment should be defined. Different count of segments ' +
                'can be defined for each day, e.g., 3 segments for Monday, 5 segments for Thursday, etc. It should be defined in the ' +
                'following format: `hours:minutes/temperature`. Minutes can be only tens, i.e., 00, 10, 20, 30, 40, 50. Segments should ' +
                'be divided by space symbol. Each day should end with the last segment of 24:00. Examples: `04:00/20 08:30/22 10:10/18 ' +
                '18:40/24 22:50/19.5`; `06:00/21.5 17:20/26 24:00/18`. The temperature will be set from the beginning/start of one ' +
                'period and until the next period, e.g., `04:00/20 24:00/22` means that from 00:00 to 04:00 temperature will be 20 ' +
                'degrees and from 04:00 to 00:00 temperature will be 22 degrees.'),
            ...tuya.exposes.scheduleAllDays(ea.STATE, 'HH:MM/C'),
            e.binary('valve', ea.STATE, 'CLOSED', 'OPEN'),
            e.enum('factory_reset', ea.STATE_SET, ['SET']).withDescription('Remove limits'),
            tuya.exposes.errorStatus(),
        ],
        meta: {
            tuyaDatapoints: [
                [49, 'running_state', tuya.valueConverterBasic.lookup({'heat': tuya.enum(1), 'idle': tuya.enum(0)})],
                [49, 'system_mode', tuya.valueConverterBasic.lookup({'heat': tuya.enum(1), 'off': tuya.enum(0)})],
                [2, 'preset', tuya.valueConverterBasic.lookup({'comfort': tuya.enum(3), 'auto': tuya.enum(0),
                    'manual': tuya.enum(2), 'holiday': tuya.enum(1)})],
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
                [49, 'valve', tuya.valueConverterBasic.lookup({'OPEN': 1, 'CLOSE': 0})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_68nvbio9', '_TZE200_pw7mji0l', '_TZE200_cf1sl3tj', '_TZE200_nw1r9hp6', '_TZE200_9p5xmj5r']),
        model: 'TS0601_cover_3',
        vendor: 'TuYa',
        description: 'Cover motor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        options: [exposes.options.invert_cover()],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(), e.cover_position(),
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
                [1, 'state', tuya.valueConverterBasic.lookup({'OPEN': tuya.enum(0), 'STOP': tuya.enum(1), 'CLOSE': tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'position', tuya.valueConverter.raw],
                [5, 'reverse_direction', tuya.valueConverterBasic.lookup({'forward': tuya.enum(0), 'back': tuya.enum(1)})],
                [12, 'motor_fault', tuya.valueConverter.trueFalse1],
                [13, 'battery', tuya.valueConverter.raw],
                [16, 'border', tuya.valueConverterBasic.lookup({
                    'up': tuya.enum(0), 'down': tuya.enum(1), 'up_delete': tuya.enum(2), 'down_delete': tuya.enum(3),
                    'remove_top_bottom': tuya.enum(4)})],
                [20, 'click_control', tuya.valueConverterBasic.lookup({'up': tuya.enum(0), 'down': tuya.enum(1)})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_zah67ekd', '_TZE200_icka1clh']),
        model: 'TS0601_cover_4',
        vendor: 'TuYa',
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
        whiteLabel: [
            tuya.whitelabel('Moes', 'AM43-0.45/40-ES-EB', 'Roller blind/shades drive motor', ['_TZE200_zah67ekd', '_TZE200_icka1clh']),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({'OPEN': tuya.enum(0), 'STOP': tuya.enum(1), 'CLOSE': tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'position', tuya.valueConverter.raw],
                [5, 'motor_direction', tuya.valueConverter.tubularMotorDirection],
                [7, null, null], // work_state, not useful, ignore
                [101, 'opening_mode', tuya.valueConverterBasic.lookup({'tilt': tuya.enum(0), 'lift': tuya.enum(1)})],
                [102, 'factory_reset', tuya.valueConverter.raw],
                [103, 'set_upper_limit', tuya.valueConverter.setLimit],
                [104, 'set_bottom_limit', tuya.valueConverter.setLimit],
                [105, 'motor_speed', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE200_sur6q7ko', /* model: '3012732', vendor: 'LSC Smart Connect' */
            '_TZE200_hue3yfsn', /* model: 'TV02-Zigbee', vendor: 'TuYa' */
            '_TZE200_e9ba97vf', /* model: 'TV01-ZB', vendor: 'Moes' */
            '_TZE200_husqqvux', /* model: 'TSL-TRV-TV01ZG', vendor: 'Tesla Smart' */
            '_TZE200_lnbfnyxd', /* model: 'TSL-TRV-TV01ZG', vendor: 'Tesla Smart' */
            '_TZE200_lllliz3p', /* model: 'TV02-Zigbee', vendor: 'TuYa' */
            '_TZE200_mudxchsu', /* model: 'TV05-ZG curve', vendor: 'TuYa' */
            '_TZE200_7yoranx2', /* model: 'TV01-ZB', vendor: 'Moes' */
            '_TZE200_kds0pmmv', /* model: 'TV01-ZB', vendor: 'Moes' */
            '_TZE200_py4cm3he', /* model: 'TV06-Zigbee', vendor: 'TuYa' */
        ]),
        model: 'TV02-Zigbee',
        vendor: 'TuYa',
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
            e.battery_low(), e.child_lock(), e.open_window(), e.open_window_temperature().withValueMin(5).withValueMax(30),
            e.comfort_temperature().withValueMin(5).withValueMax(30), e.eco_temperature().withValueMin(5).withValueMax(30),
            e.climate().withPreset(['auto', 'manual', 'holiday']).withLocalTemperatureCalibration(-5, 5, 0.1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET, 'Only for Homeassistant'),
            e.binary('heating_stop', ea.STATE_SET, 'ON', 'OFF').withDescription('Battery life can be prolonged'+
                    ' by switching the heating off. To achieve this, the valve is closed fully. To activate the '+
                    'heating stop, the device display "HS", press the pair button to cancel.'),
            tuya.exposes.frostProtection('When Anti-Freezing function is activated, the temperature in the house is kept '+
                    'at 8 °C, the device display "AF".press the pair button to cancel.'),
            e.numeric('boost_timeset_countdown', ea.STATE_SET).withUnit('s').withDescription('Setting '+
                    'minimum 0 - maximum 465 seconds boost time. The boost (â¨) function is activated. The remaining '+
                    'time for the function will be counted down in seconds ( 465 to 0 ).').withValueMin(0).withValueMax(465),
            e.holiday_temperature().withValueMin(5).withValueMax(30),
            e.text('holiday_start_stop', ea.STATE_SET).withDescription('The holiday mode will automatically start ' +
                'at the set time starting point and run the holiday temperature. Can be defined in the following format: ' +
                '`startYear/startMonth/startDay startHours:startMinutes | endYear/endMonth/endDay endHours:endMinutes`. ' +
                'For example: `2022/10/01 16:30 | 2022/10/21 18:10`. After the end of holiday mode, it switches to "auto" ' +
                'mode and uses schedule.'),
            e.enum('working_day', ea.STATE_SET, ['mon_sun', 'mon_fri+sat+sun', 'separate']).withDescription('`mon_sun` ' +
                '- schedule for Monday used for each day (define it only for Monday). `mon_fri+sat+sun` - schedule for ' +
                'workdays used from Monday (define it only for Monday), Saturday and Sunday are defined separately. `separate` ' +
                '- schedule for each day is defined separately.'),
            e.composite('schedule', 'schedule', ea.SET).withFeature(e.enum('week_day', ea.SET, ['monday', 'tuesday',
                'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).withFeature(e.text('schedule', ea.SET))
                .withDescription('Schedule will work with "auto" preset. In this mode, the device executes ' +
                'a preset week programming temperature time and temperature. Before using these properties, check `working_day` ' +
                'property. Each day can contain up to 10 segments. At least 1 segment should be defined. Different count of segments ' +
                'can be defined for each day, e.g., 3 segments for Monday, 5 segments for Thursday, etc. It should be defined in the ' +
                'following format: `hours:minutes/temperature`. Minutes can be only tens, i.e., 00, 10, 20, 30, 40, 50. Segments should ' +
                'be divided by space symbol. Each day should end with the last segment of 24:00. Examples: `04:00/20 08:30/22 10:10/18 ' +
                '18:40/24 22:50/19.5`; `06:00/21.5 17:20/26 24:00/18`. The temperature will be set from the beginning/start of one ' +
                'period and until the next period, e.g., `04:00/20 24:00/22` means that from 00:00 to 04:00 temperature will be 20 ' +
                'degrees and from 04:00 to 00:00 temperature will be 22 degrees.'),
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
                [31, 'working_day', tuya.valueConverterBasic.lookup({'mon_sun': tuya.enum(0), 'mon_fri+sat+sun': tuya.enum(1),
                    'separate': tuya.enum(2)})],
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
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE200_0hg58wyk', /* model: 'S366', vendor: 'Cloud Even' */
        ]),
        model: 'TS0601_thermostat_2',
        vendor: 'TuYa',
        description: 'Thermostat radiator valve',
        whiteLabel: [
            {vendor: 'S366', model: 'Cloud Even'},
        ],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        meta: {
            tuyaDatapoints: [
                [1, 'system_mode', tuya.valueConverterBasic.lookup({'heat': true, 'off': false})],
                [2, 'preset', tuya.valueConverterBasic.lookup({'manual': tuya.enum(0), 'holiday': tuya.enum(1), 'program': tuya.enum(2)})],
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
            e.battery_low(), e.child_lock(), e.open_window(), tuya.exposes.frostProtection(), tuya.exposes.errorStatus(),
            e.climate()
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
            '_TZE200_bvu2wnxz', /* model: 'ME167', vendor: 'AVATTO' */
            '_TZE200_6rdj8dzm', /* model: 'ME167', vendor: 'AVATTO' */
            '_TZE200_p3dbf6qs', /* model: 'ME168', vendor: 'AVATTO' */
            '_TZE200_rxntag7i', /* model: 'ME168', vendor: 'AVATTO' */
        ]),
        model: 'TS0601_thermostat_3',
        vendor: 'TuYa',
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
            e.child_lock(), e.battery_low(),
            e.climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['auto', 'heat', 'off'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withLocalTemperatureCalibration(-3, 3, 1, ea.STATE_SET),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
            e.binary('scale_protection', ea.STATE_SET, 'ON', 'OFF').withDescription('If the heat sink is not fully opened within ' +
                'two weeks or is not used for a long time, the valve will be blocked due to silting up and the heat sink will not be ' +
                'able to be used. To ensure normal use of the heat sink, the controller will automatically open the valve fully every ' +
                'two weeks. It will run for 30 seconds per time with the screen displaying "Ad", then return to its normal working state ' +
                'again.'),
            e.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF').withDescription('When the room temperature is lower than ' +
                '5 °C, the valve opens; when the temperature rises to 8 °C, the valve closes.'),
            e.numeric('error', ea.STATE).withDescription('If NTC is damaged, "Er" will be on the TRV display.'),
        ],
        meta: {
            tuyaDatapoints: [
                [2, 'system_mode', tuya.valueConverterBasic.lookup({'auto': tuya.enum(0), 'heat': tuya.enum(1), 'off': tuya.enum(2)})],
                [3, 'running_state', tuya.valueConverterBasic.lookup({'heat': tuya.enum(0), 'idle': tuya.enum(1)})],
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
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE204_pcdmj88b',
        ]),
        model: 'TS0601_thermostat_4',
        vendor: 'TuYa',
        description: 'Thermostatic radiator valve',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.child_lock(),
            e.battery(),
            e.battery_low(),
            e.climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withPreset(['schedule', 'holiday', 'manual', 'comfort', 'eco'])
                .withSystemMode(['off', 'heat'], ea.STATE)
                .withLocalTemperatureCalibration(-3, 3, 1, ea.STATE_SET),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
            e.holiday_temperature().withValueMin(5).withValueMax(30),
            e.comfort_temperature().withValueMin(5).withValueMax(30),
            e.eco_temperature().withValueMin(5).withValueMax(30),
            e.binary('scale_protection', ea.STATE_SET, 'ON', 'OFF').withDescription('If the heat sink is not fully opened within ' +
                'two weeks or is not used for a long time, the valve will be blocked due to silting up and the heat sink will not be ' +
                'able to be used. To ensure normal use of the heat sink, the controller will automatically open the valve fully every ' +
                'two weeks. It will run for 30 seconds per time with the screen displaying "Ad", then return to its normal working state ' +
                'again.'),
            e.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF').withDescription('When the room temperature is lower than ' +
                '5 °C, the valve opens; when the temperature rises to 8 °C, the valve closes.'),
            e.numeric('error', ea.STATE).withDescription('If NTC is damaged, "Er" will be on the TRV display.'),
            e.binary('boost_heating', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Boost Heating: the device will enter the boost heating mode.'),
        ],
        meta: {
            tuyaDatapoints: [
                [2, 'preset', tuya.valueConverterBasic.lookup(
                    {'schedule': tuya.enum(0), 'holiday': tuya.enum(1), 'manual': tuya.enum(2), 'comfort': tuya.enum(3), 'eco': tuya.enum(4)})],
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
                [49, 'system_mode', tuya.valueConverterBasic.lookup({'off': tuya.enum(0), 'heat': tuya.enum(1)})],
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
        fromZigbee: [legacy.fromZigbee.tuya_thermostat_weekly_schedule_1, legacy.fromZigbee.etop_thermostat,
            fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [legacy.toZigbee.etop_thermostat_system_mode, legacy.toZigbee.etop_thermostat_away_mode, legacy.toZigbee.tuya_thermostat_child_lock,
            legacy.toZigbee.tuya_thermostat_current_heating_setpoint, legacy.toZigbee.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: 101,
            },
        },
        exposes: [e.child_lock(), e.away_mode(), e.climate().withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)],
    },
    {
        fingerprint: [{modelID: 'dpplnsn\u0000', manufacturerName: '_TYST11_2dpplnsn'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2dpplnsn'}],
        model: 'HT-10',
        vendor: 'ETOP',
        description: 'Radiator valve',
        fromZigbee: [legacy.fromZigbee.tuya_thermostat_weekly_schedule_1, legacy.fromZigbee.etop_thermostat,
            fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [legacy.toZigbee.etop_thermostat_system_mode, legacy.toZigbee.etop_thermostat_away_mode, legacy.toZigbee.tuya_thermostat_child_lock,
            legacy.toZigbee.tuya_thermostat_current_heating_setpoint, legacy.toZigbee.tuya_thermostat_weekly_schedule],
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
            e.battery_low(), e.child_lock(), e.away_mode(), e.climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_a4bpgplm'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_dv8abrrz'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_z1tyspqw'},
        ],
        model: 'TS0601_thermostat_1',
        vendor: 'TuYa',
        description: 'Thermostatic radiator valve',
        whiteLabel: [
            tuya.whitelabel('id3', 'GTZ06', 'Thermostatic radiator valve', ['_TZE200_z1tyspqw']),
        ],
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(), e.child_lock(), e.max_temperature(), e.min_temperature(),
            e.position(), e.window_detection(),
            e.binary('window', ea.STATE, 'CLOSED', 'OPEN').withDescription('Window status closed or open '),
            e.binary('alarm_switch', ea.STATE, 'ON', 'OFF').withDescription('Thermostat in error state'),
            e.climate()
                .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperatureCalibration(-30, 30, 0.1, ea.STATE_SET)
                .withPreset(['auto', 'manual', 'off', 'on'],
                    'MANUAL MODE ☝ - In this mode, the device executes manual temperature setting. ' +
                'When the set temperature is lower than the "minimum temperature", the valve is closed (forced closed). ' +
                'AUTO MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. ' +
                'ON - In this mode, the thermostat stays open ' +
                'OFF - In this mode, the thermostat stays closed')
                .withSystemMode(['auto', 'heat', 'off'], ea.STATE)
                .withRunningState(['idle', 'heat'], ea.STATE),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
            e.binary('boost_heating', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Boost Heating: press and hold "+" for 3 seconds, ' +
                'the device will enter the boost heating mode, and the ▷╵◁ will flash. The countdown will be displayed in the APP'),
            e.numeric('boost_time', ea.STATE_SET).withUnit('min').withDescription('Countdown in minutes')
                .withValueMin(0).withValueMax(1000),
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
                [6, 'running_state', tuya.valueConverterBasic.lookup({'heat': 1, 'idle': 0})],
                [7, 'window', tuya.valueConverterBasic.lookup({'OPEN': 1, 'CLOSE': 0})],
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
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_rtrmfadk'},
        ],
        model: 'TRV602',
        vendor: 'TuYa',
        description: 'Thermostatic radiator valve.',
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery(), e.child_lock(), e.max_temperature(), e.min_temperature(),
            e.position(), e.window_detection(),
            e.binary('window', ea.STATE, 'OPEN', 'CLOSE').withDescription('Window status closed or open '),
            e.binary('alarm_switch', ea.STATE, 'ON', 'OFF').withDescription('Thermostat in error state'),
            e.climate()
                .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperatureCalibration(-30, 30, 0.1, ea.STATE_SET)
                .withPreset(['auto', 'manual', 'off', 'on'],
                    'MANUAL MODE ☝ - In this mode, the device executes manual temperature setting. ' +
                    'When the set temperature is lower than the "minimum temperature", the valve is closed (forced closed). ' +
                    'AUTO MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. ' +
                    'ON - In this mode, the thermostat stays open ' +
                    'OFF - In this mode, the thermostat stays closed')
                .withSystemMode(['auto', 'heat', 'off'], ea.STATE)
                .withRunningState(['idle', 'heat'], ea.STATE),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, 'HH:MM/C HH:MM/C HH:MM/C HH:MM/C'),
            e.enum('display_brightness', ea.STATE_SET, ['high', 'medium', 'low']).withDescription('Display brightness'),
            e.enum('screen_orientation', ea.STATE_SET, ['up', 'right', 'down', 'left']).withDescription('Screen orientation'),
            e.enum('mode', ea.STATE_SET, ['comfort', 'eco']).withDescription('Hysteresis - comfort > switches off/on exactly at reached ' +
                'temperature with valve smooth from 0 to 100%, eco > 0.5 degrees above or below, valve either 0 or 100%'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, null, tuya.valueConverter.thermostatSystemModeAndPreset(null)],
                [1, 'system_mode', tuya.valueConverter.thermostatSystemModeAndPreset('system_mode')],
                [1, 'preset', tuya.valueConverter.thermostatSystemModeAndPreset('preset')],
                [2, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [3, 'local_temperature', tuya.valueConverter.divideBy10],
                [6, 'running_state', tuya.valueConverterBasic.lookup({'heat': 1, 'idle': 0})],
                [7, 'window', tuya.valueConverterBasic.lookup({'OPEN': 1, 'CLOSE': 0})],
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
                [111, 'display_brightness', tuya.valueConverterBasic.lookup({'high': tuya.enum(0), 'medium': tuya.enum(1), 'low': tuya.enum(2)})],
                [113, 'screen_orientation', tuya.valueConverterBasic.lookup({
                    'up': tuya.enum(0), 'right': tuya.enum(1), 'down': tuya.enum(2), 'left': tuya.enum(3),
                })],
                [114, 'mode', tuya.valueConverterBasic.lookup({'comfort': tuya.enum(0), 'eco': tuya.enum(1)})],
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
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, tuya.fz.power_outage_memory,
            tuya.fz.indicator_mode],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tuya.tz.backlight_indicator_mode_1],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1, acVoltageDivisor: 1, acCurrentMultiplier: 1, acCurrentDivisor: 1000, acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
            try {
                await reporting.currentSummDelivered(endpoint);
                await reporting.rmsVoltage(endpoint, {change: 5});
                await reporting.rmsCurrent(endpoint, {change: 50});
                await reporting.activePower(endpoint, {change: 10});
            } catch (error) {/* fails for some https://github.com/Koenkk/zigbee2mqtt/issues/11179
                                and https://github.com/Koenkk/zigbee2mqtt/issues/16864 */}
            await endpoint.read('genOnOff', ['onOff', 'moesStartUpOnOff', 'tuyaBacklightMode']);
        },
        options: [exposes.options.measurement_poll_interval()],
        // This device doesn't support reporting correctly.
        // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
        exposes: [e.switch(), e.power(), e.current(), e.voltage(),
            e.energy(), e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage'),
            e.enum('indicator_mode', ea.ALL, ['off', 'off/on', 'on/off']).withDescription('LED indicator mode')],
        onEvent: (type, data, device, options) => tuya.onEventMeasurementPoll(type, data, device, options, true, false),
    },
    {
        fingerprint: [{modelID: 'TS0111', manufacturerName: '_TYZB01_ymcdbl3u'}],
        model: 'TS0111_valve',
        vendor: 'TuYa',
        whiteLabel: [{vendor: 'TuYa', model: 'SM-AW713Z'}],
        description: 'Smart water/gas valve',
        extend: tuya.extend.switch({indicatorMode: true}),
    },
    {
        // Note: below you will find the TS011F_plug_2 and TS011F_plug_3. These are identified via a fingerprint and
        // thus preferred above the TS011F_plug_1 if the fingerprint matches
        zigbeeModel: ['TS011F'],
        model: 'TS011F_plug_1',
        description: 'Smart plug (with power monitoring)',
        vendor: 'TuYa',
        whiteLabel: [{vendor: 'LELLKI', model: 'TS011F_plug'}, {vendor: 'Neo', model: 'NAS-WR01B'},
            {vendor: 'BlitzWolf', model: 'BW-SHP15'}, {vendor: 'BlitzWolf', model: 'BW-SHP13'},
            {vendor: 'MatSee Plus', model: 'PJ-ZSW01'}, {vendor: 'MODEMIX', model: 'MOD037'}, {vendor: 'MODEMIX', model: 'MOD048'},
            {vendor: 'Coswall', model: 'CS-AJ-DE2U-ZG-11'}, {vendor: 'Aubess', model: 'TS011F_plug_1'},
            tuya.whitelabel('Nous', 'A1Z', 'Smart plug (with power monitoring)', ['_TZ3000_2putqrmw']),
            tuya.whitelabel('Moes', 'MOES_plug', 'Smart plug (with power monitoring)', ['_TZ3000_yujkchbz']),
            tuya.whitelabel('Moes', 'ZK-EU', 'Smart wallsocket (with power monitoring)', ['_TZ3000_ss98ec5d']),
            tuya.whitelabel('Nous', 'A1Z', 'Smart plug (with power monitoring)', ['_TZ3000_ksw8qtmt']),
        ],
        ota: ota.zigbeeOTA,
        extend: tuya.extend.switch({
            electricalMeasurements: true, electricalMeasurementsFzConverter: fzLocal.TS011F_electrical_measurement,
            powerOutageMemory: true, indicatorMode: true, childLock: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
        fingerprint: tuya.fingerprint('TS011F',
            ['_TZ3000_hyfvrar3', '_TZ3000_v1pdxuqq', '_TZ3000_8a833yls', '_TZ3000_bfn1w0mm', '_TZ3000_nzkqcvvs', '_TZ3000_rtcrrvia']),
        model: 'TS011F_plug_2',
        description: 'Smart plug (without power monitoring)',
        vendor: 'TuYa',
        extend: tuya.extend.switch({powerOutageMemory: true, indicatorMode: true, childLock: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [160, 100, 69, 68, 65, 64].map((applicationVersion) => {
            return {modelID: 'TS011F', applicationVersion, priority: -1};
        }),
        model: 'TS011F_plug_3',
        description: 'Smart plug (with power monitoring by polling)',
        vendor: 'TuYa',
        whiteLabel: [{vendor: 'VIKEFON', model: 'TS011F'}, {vendor: 'BlitzWolf', model: 'BW-SHP15'},
            {vendor: 'AVATTO', model: 'MIUCOT10Z'}, {vendor: 'Neo', model: 'NAS-WR01B'}, {vendor: 'Neo', model: 'PLUG-001SPB2'},
            tuya.whitelabel('TuYa', 'BSD29_1', 'Smart plug (with power monitoring by polling)', ['_TZ3000_okaz9tjs']),
        ],
        ota: ota.zigbeeOTA,
        extend: tuya.extend.switch({electricalMeasurements: true, powerOutageMemory: true, indicatorMode: true, childLock: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            utils.attachOutputCluster(device, 'genOta');
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        onEvent: (type, data, device, options) =>
            tuya.onEventMeasurementPoll(type, data, device, options,
                true, // polling for voltage, current and power
                [100, 160].includes(device.applicationVersion), // polling for energy
            ),
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_in5s3wn1', '_TZ3000_wbloefbf']),
        model: 'TS011F_switch_5_gang',
        description: '2 gang 2 usb 1 wall ac outlet',
        whiteLabel: [{vendor: 'Milfra', model: 'M11Z'}],
        vendor: 'TuYa',
        extend: tuya.extend.switch({powerOutageMemory: true, childLock: true, endpoints: ['l1', 'l2', 'l3', 'l4', 'l5']}),
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
        vendor: 'TuYa',
        extend: tuya.extend.switch({powerOutageMemory: true, childLock: true, endpoints: ['l1', 'l2', 'l3']}),
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            for (const ep of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genOnOff']);
            }
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE204_ntcy3xu1'},
        ],
        model: 'TS0601_smoke_1',
        vendor: 'TuYa',
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
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_ntcy3xu1'},
        ],
        model: 'TS0601_smoke_6',
        vendor: 'TuYa',
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
        vendor: 'TuYa',
        description: 'Photoelectric smoke detector',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.smoke(), e.battery(), e.test(),
            e.numeric('smoke_concentration', ea.STATE).withUnit('ppm').withDescription('Parts per million of smoke detected'),
            e.binary('device_fault', ea.STATE, true, false).withDescription('Indicates a fault with the device'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'smoke', tuya.valueConverter.trueFalse0],
                [2, 'smoke_concentration', tuya.valueConverter.divideBy10],
                [11, 'device_fault', tuya.valueConverter.raw],
                [15, 'battery', tuya.valueConverter.raw],
                [101, 'test', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_ux5v4dbd'}, // [KnockautX / Brelag AG, Switzerland](https://www.brelag.com)
        ],
        vendor: 'TuYa',
        model: 'TS0601_smoke_3',
        description: 'Photoelectric smoke detector',
        whiteLabel: [
            {vendor: 'KnockautX', model: 'SMOAL024'},
        ],
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
        vendor: 'TuYa',
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
        vendor: 'TuYa',
        description: 'Smoke sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.smoke(), e.tamper(), e.battery(), tuya.exposes.faultAlarm(),
            tuya.exposes.silence(), e.binary('alarm', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable the alarm')],
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
        vendor: 'TuYa',
        description: 'Smart smoke alarm',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [e.smoke(), tuya.exposes.faultAlarm(), tuya.exposes.batteryState(), e.battery(), tuya.exposes.silence(), tuya.exposes.selfTest(),
            e.numeric('smoke_concentration', ea.STATE).withUnit('ppm').withDescription('Parts per million of smoke detected')],
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
        vendor: 'TuYa',
        description: 'Smart smoke alarm',
        meta: {timeout: 30000, disableDefaultResponse: true},
        fromZigbee: [legacy.fromZigbee.SA12IZL],
        toZigbee: [legacy.toZigbee.SA12IZL_silence_siren, legacy.toZigbee.SA12IZL_alarm],
        exposes: [e.battery(),
            e.binary('smoke', ea.STATE, true, false).withDescription('Smoke alarm status'),
            e.enum('battery_level', ea.STATE, ['low', 'middle', 'high']).withDescription('Battery level state'),
            e.binary('alarm', ea.STATE_SET, true, false).withDescription('Enable the alarm'),
            e.binary('silence_siren', ea.STATE_SET, true, false).withDescription('Silence the siren')],
        onEvent: tuya.onEventSetTime,
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_cjbofhxw']),
        model: 'PJ-MGW1203',
        vendor: 'TuYa',
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
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_bkkmqmyo', '_TZE200_eaac7dkw', '_TZE204_wbhaespm', '_TZE204_bkkmqmyo']),
        model: 'TS0601_din_1',
        vendor: 'TuYa',
        description: 'Zigbee DIN energy meter',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.switch(), e.ac_frequency(), e.energy(), e.power(), e.power_factor().withUnit('%'),
            e.voltage(), e.current(), e.produced_energy(), e.power_reactive(),
            e.numeric('energy_reactive', ea.STATE).withUnit('kVArh').withDescription('Sum of reactive energy'),
            e.numeric('total_energy', ea.STATE).withUnit('kWh').withDescription('Total consumed and produced energy')],
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
        whiteLabel: [{vendor: 'TuYa', model: 'RC-MCB'},
            tuya.whitelabel('RTX', 'ZCR1-40EM', 'Zigbee DIN energy meter', ['_TZE204_wbhaespm']),
            tuya.whitelabel('Hiking', 'DDS238-2',
                'Single phase DIN-rail energy meter with switch function', ['_TZE200_bkkmqmyo', '_TZE204_bkkmqmyo']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_lsanae15', '_TZE204_lsanae15']),
        model: 'TS0601_din_2',
        vendor: 'TuYa',
        description: 'Zigbee DIN energy meter',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.switch(), e.energy(), e.power(), e.voltage(), e.current(),
            e.enum('fault', ea.STATE, ['clear', 'over_current_threshold', 'over_power_threshold',
                'over_voltage threshold', 'wrong_frequency_threshold']).withDescription('Fault status of the device (clear = nothing)'),
            e.enum('threshold_1', ea.STATE, ['not_set', 'over_current_threshold', 'over_voltage_threshold'])
                .withDescription('State of threshold_1'),
            e.binary('threshold_1_protection', ea.STATE, 'ON', 'OFF')
                .withDescription('OFF - alarm only, ON - relay will be off when threshold reached'),
            e.numeric('threshold_1_value', ea.STATE)
                .withDescription('Can be in Volt or Ampere depending on threshold setting. Setup the value on the device'),
            e.enum('threshold_2', ea.STATE, ['not_set', 'over_current_threshold', 'over_voltage_threshold'])
                .withDescription('State of threshold_2'),
            e.binary('threshold_2_protection', ea.STATE, 'ON', 'OFF')
                .withDescription('OFF - alarm only, ON - relay will be off when threshold reached'),
            e.numeric('threshold_2_value', ea.STATE)
                .withDescription('Setup value on the device'),
            e.binary('clear_fault', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Turn ON to clear last the fault'),
            e.text('meter_id', ea.STATE).withDescription('Meter ID (ID of device)'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [3, null, null], // Monthly, but sends data only after request
                [4, null, null], // Dayly, but sends data only after request
                [6, null, tuya.valueConverter.phaseVariant2], // voltage and current
                [10, 'fault', tuya.valueConverterBasic.lookup({'clear': 0, 'over_current_threshold': 1,
                    'over_power_threshold': 2, 'over_voltage_threshold': 4, 'wrong_frequency_threshold': 8})],
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
        whiteLabel: [
            tuya.whitelabel('MatSee Plus', 'DAC2161C', 'Smart Zigbee energy meter 80A din rail', ['_TZE200_lsanae15', '_TZE204_lsanae15']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_rhblgy0z', '_TZE204_rhblgy0z']),
        model: 'TS0601_din_3',
        vendor: 'TuYa',
        description: 'Zigbee DIN energy meter',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        whiteLabel: [{vendor: 'XOCA', model: 'DAC2161C'}],
        exposes: [tuya.exposes.switch(), e.energy(), e.produced_energy(), e.power(), e.voltage(), e.current(),
            e.enum('fault', ea.STATE, ['clear', 'over_current_threshold', 'over_power_threshold',
                'over_voltage threshold', 'wrong_frequency_threshold']).withDescription('Fault status of the device (clear = nothing)'),
            e.enum('threshold_1', ea.STATE, ['not_set', 'over_current_threshold', 'over_voltage_threshold'])
                .withDescription('State of threshold_1'),
            e.binary('threshold_1_protection', ea.STATE, 'ON', 'OFF')
                .withDescription('OFF - alarm only, ON - relay will be off when threshold reached'),
            e.numeric('threshold_1_value', ea.STATE)
                .withDescription('Can be in Volt or Ampere depending on threshold setting. Setup the value on the device'),
            e.enum('threshold_2', ea.STATE, ['not_set', 'over_current_threshold', 'over_voltage_threshold'])
                .withDescription('State of threshold_2'),
            e.binary('threshold_2_protection', ea.STATE, 'ON', 'OFF')
                .withDescription('OFF - alarm only, ON - relay will be off when threshold reached'),
            e.numeric('threshold_2_value', ea.STATE)
                .withDescription('Setup value on the device'),
            e.binary('clear_fault', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Turn ON to clear last the fault'),
            e.text('meter_id', ea.STATE).withDescription('Meter ID (ID of device)'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                [3, null, null], // Monthly, but sends data only after request
                [4, null, null], // Dayly, but sends data only after request
                [6, null, tuya.valueConverter.phaseVariant2], // voltage and current
                [10, 'fault', tuya.valueConverterBasic.lookup({'clear': 0, 'over_current_threshold': 1,
                    'over_power_threshold': 2, 'over_voltage_threshold': 4, 'wrong_frequency_threshold': 8})],
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
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_byzdayie'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fsb6zw01'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ewxhg6o9'}],
        model: 'TS0601_din',
        vendor: 'TuYa',
        description: 'Zigbee smart energy meter DDS238-2 Zigbee',
        fromZigbee: [legacy.fromZigbee.tuya_dinrail_switch],
        toZigbee: [legacy.toZigbee.tuya_switch_state],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
        exposes: [e.switch().setAccess('state', ea.STATE_SET), e.voltage(), e.power(), e.current(), e.energy()],
    },
    {
        fingerprint: [{modelID: 'TS1101', manufacturerName: '_TZ3000_xfs39dbf'}],
        model: 'TS1101_dimmer_module_1ch',
        vendor: 'TuYa',
        description: 'Zigbee dimmer module 1 channel',
        extend: [tuyaLight({minBrightness: true})],
    },
    {
        fingerprint: [{modelID: 'TS1101', manufacturerName: '_TZ3000_7ysdnebc'}],
        model: 'TS1101_dimmer_module_2ch',
        vendor: 'TuYa',
        description: 'Zigbee dimmer module 2 channel',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ25'}],
        extend: [tuyaLight({minBrightness: true, endpoints: {l1: 1, l2: 2}, configureReporting: true})],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
        },
    },
    {
        zigbeeModel: ['RH3001'],
        fingerprint: [{type: 'EndDevice', manufacturerID: 4098, applicationVersion: 66, endpoints: [
            {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 10, 1, 1280], outputClusters: [25]},
        ]}],
        model: 'SNTZ007',
        vendor: 'TuYa',
        description: 'Rechargeable Zigbee contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ignore_time_read],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        whiteLabel: [{vendor: 'BlitzWolf', model: 'BW-IS2'}],
    },
    {
        zigbeeModel: ['RH3040'],
        model: 'RH3040',
        vendor: 'TuYa',
        description: 'PIR sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        whiteLabel: [{vendor: 'Samotech', model: 'SM301Z'}, {vendor: 'Nedis', model: 'ZBSM10WT'}],
        exposes: [e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['TS0115'],
        model: 'TS0115',
        vendor: 'TuYa',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (10A or 16A)',
        extend: tuya.extend.switch({endpoints: ['l1', 'l2', 'l3', 'l4', 'l5']}),
        whiteLabel: [{vendor: 'UseeLink', model: 'SM-SO306E/K/M'}],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 7};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0011', manufacturerName: '_TZ3000_l8fsgo6p'}],
        zigbeeModel: ['TS0011'],
        model: 'TS0011',
        vendor: 'TuYa',
        description: 'Smart light switch - 1 gang',
        extend: tuya.extend.switch({backlightModeOffNormalInverted: true}),
        whiteLabel: [
            {vendor: 'Vrey', model: 'VR-X712U-0013'},
            {vendor: 'TUYATEC', model: 'GDKES-01TZXD'},
            {vendor: 'Lonsonho', model: 'QS-Zigbee-S05-L', description: '1 gang smart switch module without neutral wire'},
            {vendor: 'Mercator Ikuü', model: 'SSW01'},
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0011', manufacturerName: '_TZ3000_qmi1cfuq'},
            {modelID: 'TS0011', manufacturerName: '_TZ3000_txpirhfq'}, {modelID: 'TS0011', manufacturerName: '_TZ3000_ji4araar'}],
        model: 'TS0011_switch_module',
        vendor: 'TuYa',
        description: '1 gang switch module - (without neutral)',
        extend: tuya.extend.switch({switchType: true}),
        whiteLabel: [{vendor: 'AVATTO', model: '1gang N-ZLWSM01'}, {vendor: 'SMATRUL', model: 'TMZ02L-16A-W'},
            {vendor: 'Aubess', model: 'TMZ02L-16A-B'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0012'],
        model: 'TS0012',
        vendor: 'TuYa',
        description: 'Smart light switch - 2 gang',
        whiteLabel: [{vendor: 'Vrey', model: 'VR-X712U-0013'}, {vendor: 'TUYATEC', model: 'GDKES-02TZXD'},
            {vendor: 'Earda', model: 'ESW-2ZAA-EU'}, {vendor: 'Moes', model: 'ZS-US2-BK-MS'},
            tuya.whitelabel('Moes', 'ZS-EUB_2gang', 'Smart light switch - 2 gang', ['_TZ3000_18ejxno0']),
        ],
        extend: tuya.extend.switch({backlightModeOffNormalInverted: true, endpoints: ['left', 'right']}),
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0012', manufacturerName: '_TZ3000_jl7qyupf'},
            {modelID: 'TS0012', manufacturerName: '_TZ3000_nPGIPl5D'},
            {modelID: 'TS0012', manufacturerName: '_TZ3000_kpatq5pq'},
            {modelID: 'TS0012', manufacturerName: '_TZ3000_ljhbw1c9'},
            {modelID: 'TS0012', manufacturerName: '_TZ3000_4zf0crgo'}],
        model: 'TS0012_switch_module',
        vendor: 'TuYa',
        description: '2 gang switch module - (without neutral)',
        whiteLabel: [
            {vendor: 'AVATTO', model: '2gang N-ZLWSM01'},
            tuya.whitelabel('AVATTO', 'LZWSM16-2', '2 gang switch module - (without neutral)', ['_TZ3000_kpatq5pq', '_TZ3000_ljhbw1c9']),
        ],
        extend: tuya.extend.switch({switchType: true, endpoints: ['left', 'right']}),
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0013'],
        model: 'TS0013',
        vendor: 'TuYa',
        description: 'Smart light switch - 3 gang without neutral wire',
        extend: tuya.extend.switch({backlightModeLowMediumHigh: true, endpoints: ['left', 'center', 'right']}),
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        whiteLabel: [{vendor: 'TUYATEC', model: 'GDKES-03TZXD'}],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
        vendor: 'TuYa',
        description: '3 gang switch module - (without neutral)',
        whiteLabel: [
            {vendor: 'AVATTO', model: '3gang N-ZLWSM01'},
            tuya.whitelabel('AVATTO', 'LZWSM16-3', '3 gang switch module - (without neutral)', ['_TZ3000_sznawwyw']),
        ],
        extend: tuya.extend.switch({switchType: true, endpoints: ['left', 'center', 'right']}),
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
        vendor: 'TuYa',
        description: 'Smart light switch - 4 gang without neutral wire',
        extend: tuya.extend.switch({backlightModeLowMediumHigh: true, endpoints: ['l1', 'l2', 'l3', 'l4']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        whiteLabel: [{vendor: 'TUYATEC', model: 'GDKES-04TZXD'}, {vendor: 'Vizo', model: 'VZ-222S'},
            {vendor: 'MakeGood', model: 'MG-ZG04W/B/G'}, {vendor: 'Mercator Ikuü', model: 'SSW04'}],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
        vendor: 'TuYa',
        description: 'Zigbee smart dimmer',
        fromZigbee: [legacy.fromZigbee.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.tuya_dimmer_state, legacy.toZigbee.tuya_dimmer_level],
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: ['HY0017', '005f0c3b'],
        model: 'U86KCJ-ZP',
        vendor: 'TuYa',
        description: 'Smart 6 key scene wall switch',
        fromZigbee: [fzLocal.scenes_recall_scene_65029],
        exposes: [e.action(['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5', 'scene_6'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0026'],
        model: 'TS0026',
        vendor: 'TuYa',
        description: '6 button scene wall switch',
        fromZigbee: [fzLocal.scenes_recall_scene_65029],
        exposes: [e.action(['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5', 'scene_6'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['q9mpfhw'],
        model: 'SNTZ009',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        fromZigbee: [legacy.fromZigbee.tuya_water_leak, fz.ignore_basic_report],
        exposes: [e.water_leak()],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0004'],
        model: 'TS0004',
        vendor: 'TuYa',
        description: 'Smart light switch - 4 gang with neutral wire',
        extend: tuya.extend.switch({powerOnBehavior2: true, backlightModeOffOn: true, endpoints: ['l1', 'l2', 'l3', 'l4']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        whiteLabel: [
            tuya.whitelabel('TuYa', 'DS-111', 'Smart light switch - 4 gang with neutral wire', ['_TZ3000_mdj7kra9']),
            tuya.whitelabel('MHCOZY', 'TYWB 4ch-RF', '4 channel relay', ['_TZ3000_u3oupgdy', '_TZ3000_imaccztn']),
            tuya.whitelabel('Avatto', 'TS0004_1', 'Smart light switch - 4 gang with neutral wire', ['_TZ3000_nivavasg', '_TZ3000_gexniqbq']),
        ],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0726'],
        model: 'TS0726',
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            for (const ep of [1, 2, 3, 4]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genOnOff']);
            }
        },
    },
    {
        zigbeeModel: ['TS0006'],
        model: 'TS0006',
        vendor: 'TuYa',
        description: '6 gang switch module with neutral wire',
        extend: tuya.extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5'), e.switch().withEndpoint('l6')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5, 'l6': 6};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('AVATTO', 'TS0006_1', '4 gang switch module with neutral wire and socket', ['_TZ3000_cvis4qmw']),
        ],
    },
    {
        zigbeeModel: ['HY0080'],
        model: 'U86KWF-ZPSJ',
        vendor: 'TuYa',
        description: 'Environment controller',
        fromZigbee: [legacy.fromZigbee.thermostat_att_report, fz.fan],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint, tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log,
            tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration, tz.fan_mode],
        exposes: [e.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat'], ea.ALL)
            .withRunningState(['idle', 'heat', 'cool'], ea.STATE)
            .withLocalTemperatureCalibration(-30, 30, 0.1, ea.ALL).withPiHeatingDemand()],
        configure: async (device, coordinatorEndpoint, logger) => {
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
        vendor: 'TuYa',
        description: 'HVAC controller',
        exposes: [e.climate().withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)
            .withRunningState(['idle', 'heat', 'cool'], ea.STATE)],
        fromZigbee: [legacy.fromZigbee.tuya_thermostat, fz.ignore_basic_report, legacy.fromZigbee.tuya_dimmer],
        meta: {tuyaThermostatSystemMode: legacy.thermostatSystemModes2, tuyaThermostatPreset: legacy.thermostatPresets},
        toZigbee: [legacy.toZigbee.tuya_thermostat_current_heating_setpoint, legacy.toZigbee.tuya_thermostat_system_mode,
            legacy.toZigbee.tuya_thermostat_fan_mode, legacy.toZigbee.tuya_dimmer_state],
    },
    {
        zigbeeModel: ['E220-KR4N0Z0-HA', 'JZ-ZB-004'],
        model: 'E220-KR4N0Z0-HA',
        vendor: 'TuYa',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (16A)',
        extend: tuya.extend.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4')],
        whiteLabel: [{vendor: 'LEELKI', model: 'WP33-EU'}],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0216'],
        model: 'TS0216',
        vendor: 'TuYa',
        description: 'Sound and flash siren',
        fromZigbee: [fz.ts0216_siren, fz.battery],
        exposes: [e.battery(), e.binary('alarm', ea.STATE_SET, true, false),
            e.numeric('volume', ea.ALL).withValueMin(0).withValueMax(100).withDescription('Volume of siren')],
        toZigbee: [tz.ts0216_alarm, tz.ts0216_duration, tz.ts0216_volume],
        configure: async (device, coordinatorEndpoint, logger) => {
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
        vendor: 'TuYa',
        description: 'Wall-mount thermostat',
        fromZigbee: [legacy.fromZigbee.hy_thermostat, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.hy_thermostat],
        onEvent: tuya.onEventSetTime,
        exposes: [e.climate().withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_g9a3awaj'}],
        model: 'ZWT07',
        vendor: 'TuYa',
        description: 'Wall-mount thermostat',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEvent({timeStart: '1970'}),
        configure: tuya.configureMagicPacket,
        exposes: [
            e.climate().withSetpoint('current_heating_setpoint', 5, 60, 0.5, ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)
                .withPreset(['manual', 'program'])
                .withLocalTemperature(),
            e.binary('frost', ea.STATE_SET, 'ON', 'OFF').withDescription('Antifreeze function')],
        meta: {
            tuyaDatapoints: [
                [1, 'system_mode', tuya.valueConverterBasic.lookup({'heat': true, 'off': false})],
                [2, 'preset', tuya.valueConverterBasic.lookup({'manual': tuya.enum(1), 'program': tuya.enum(0)})],
                [36, 'running_state', tuya.valueConverterBasic.lookup({'heat': 1, 'idle': 0})],
                [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [24, 'local_temperature', tuya.valueConverter.divideBy10],
                [10, 'frost', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_2ekuz3dz'}],
        model: 'X5H-GB-B',
        vendor: 'TuYa',
        description: 'Wall-mount thermostat',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_set_time, legacy.fromZigbee.x5h_thermostat],
        toZigbee: [legacy.toZigbee.x5h_thermostat],
        whiteLabel: [{vendor: 'Beok', model: 'TGR85-ZB'}, {vendor: 'AVATTO', model: 'ZWT-100-16A'}],
        exposes: [
            e.climate().withSetpoint('current_heating_setpoint', 5, 60, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withLocalTemperatureCalibration(-9.9, 9.9, 0.1, ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)
                .withPreset(['manual', 'program']),
            e.temperature_sensor_select(['internal', 'external', 'both']),
            e.text('schedule', ea.STATE_SET).withDescription('There are 8 periods in the schedule in total. ' +
                '6 for workdays and 2 for holidays. It should be set in the following format for each of the periods: ' +
                '`hours:minutes/temperature`. All periods should be set at once and delimited by the space symbol. ' +
                'For example: `06:00/20.5 08:00/15 11:30/15 13:30/15 17:00/22 22:00/15 06:00/20 22:00/15`. ' +
                'The thermostat doesn\'t report the schedule by itself even if you change it manually from device'),
            e.child_lock(), e.week(),
            e.enum('brightness_state', ea.STATE_SET, ['off', 'low', 'medium', 'high'])
                .withDescription('Screen brightness'),
            e.binary('sound', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Switches beep sound when interacting with thermostat'),
            e.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Antifreeze function'),
            e.binary('factory_reset', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Resets all settings to default. Doesn\'t unpair device.'),
            e.numeric('heating_temp_limit', ea.STATE_SET).withUnit('°C').withValueMax(60)
                .withValueMin(5).withValueStep(1).withPreset('default', 35, 'Default value')
                .withDescription('Heating temperature limit'),
            e.numeric('deadzone_temperature', ea.STATE_SET).withUnit('°C').withValueMax(9.5)
                .withValueMin(0.5).withValueStep(0.5).withPreset('default', 1, 'Default value')
                .withDescription('The delta between local_temperature and current_heating_setpoint to trigger Heat'),
            e.numeric('upper_temp', ea.STATE_SET).withUnit('°C').withValueMax(95)
                .withValueMin(35).withValueStep(1).withPreset('default', 60, 'Default value'),
        ],
        onEvent: tuya.onEventSetTime,
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_viy9ihs7', '_TZE204_lzriup1j']),
        model: 'ZWT198/ZWT100-BH',
        vendor: 'TuYa',
        description: 'Avatto wall thermostat',
        onEvent: tuya.onEvent({timeStart: '1970'}),
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('factory_reset', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Full factory reset, use with caution!'),
            e.child_lock(),
            e.temperature_sensor_select(['internal', 'external', 'both']),
            e.climate()
                .withSystemMode(['off', 'heat'], ea.STATE_SET)
                .withPreset(['manual', 'auto', 'temporary_manual'])
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9.9, 9.9, 0.1, ea.STATE_SET),
            e.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Antifreeze function'),
            e.max_temperature_limit()
                .withUnit('°C')
                .withValueMin(15)
                .withValueMax(90)
                .withValueStep(0.5)
                .withPreset('default', 60, 'Default value')
                .withDescription('Maximum upper temperature'),
            e.numeric('deadzone_temperature', ea.STATE_SET)
                .withUnit('°C')
                .withValueMax(10)
                .withValueMin(0.5)
                .withValueStep(0.5)
                .withPreset('default', 1, 'Default value')
                .withDescription('The delta between local_temperature (5<t<35)and current_heating_setpoint to trigger Heat'),
            e.enum('backlight_mode', ea.STATE_SET, ['off', 'low', 'medium', 'high'])
                .withDescription('Intensity of the backlight'),
            e.enum('working_day', ea.STATE_SET, ['disabled', '6-1', '5-2', '7'])
                .withDescription('Workday setting'),
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
                [1, 'system_mode', tuya.valueConverterBasic.lookup({'heat': true, 'off': false})],
                [2, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [3, 'local_temperature', tuya.valueConverter.divideBy10],
                [4, 'preset', tuya.valueConverterBasic.lookup((_, device) => {
                    // https://github.com/Koenkk/zigbee2mqtt/issues/21353#issuecomment-1938328429
                    if (device.manufacturerName === '_TZE200_viy9ihs7') {
                        return {'auto': tuya.enum(1), 'manual': tuya.enum(0), 'temporary_manual': tuya.enum(2)};
                    } else {
                        return {'manual': tuya.enum(0), 'auto': tuya.enum(1), 'temporary_manual': tuya.enum(2)};
                    }
                })],
                [9, 'child_lock', tuya.valueConverter.lockUnlock],
                [11, 'faultalarm', tuya.valueConverter.raw],
                [15, 'max_temperature_limit', tuya.valueConverter.divideBy10],
                [19, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration3],
                [101, 'running_state', tuya.valueConverterBasic.lookup({'heat': tuya.enum(1), 'idle': tuya.enum(0)})],
                [102, 'frost_protection', tuya.valueConverter.onOff],
                [103, 'factory_reset', tuya.valueConverter.onOff],
                [104, 'working_day', tuya.valueConverter.workingDay],
                [106, 'sensor', tuya.valueConverterBasic.lookup({'internal': tuya.enum(0), 'external': tuya.enum(1), 'both': tuya.enum(2)})],
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
        fingerprint: tuya.fingerprint('TS0222', ['_TZ3000_kky16aay']),
        model: 'TS0222_temperature_humidity',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fzLocal.TS0222_humidity, fz.battery, fz.temperature, fz.illuminance],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        exposes: [e.battery(), e.temperature(), e.humidity(), e.illuminance()],
        whiteLabel: [
            tuya.whitelabel('TuYa', 'QT-07S', 'Soil sensor', ['_TZ3000_kky16aay']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0222', manufacturerName: '_TYZB01_4mdqxxnn'},
            {modelID: 'TS0222', manufacturerName: '_TYZB01_m6ec2pgj'}],
        model: 'TS0222',
        vendor: 'TuYa',
        description: 'Light intensity sensor',
        fromZigbee: [fz.battery, fz.illuminance, legacy.fromZigbee.TS0222],
        toZigbee: [],
        exposes: [e.battery(), e.illuminance(), e.illuminance_lux()],
        configure: tuya.configureMagicPacket,
    },
    {
        zigbeeModel: ['TS0210'],
        model: 'TS0210',
        vendor: 'TuYa',
        description: 'Vibration sensor',
        whiteLabel: [
            tuya.whitelabel('Niceboy', 'ORBIS Vibration Sensor', 'Vibration sensor', ['_TYZB01_821siati']),
        ],
        fromZigbee: [fz.battery, fz.ias_vibration_alarm_1_with_timeout],
        toZigbee: [tz.TS0210_sensitivity],
        exposes: [e.battery(), e.battery_voltage(), e.vibration(),
            e.numeric('sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(50)
                .withDescription('Sensitivty of the sensor, press button on the device right before changing this')],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_8bxrzyxz'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_ky0fq4ho'}],
        model: 'TS011F_din_smart_relay',
        description: 'Din smart relay (with power monitoring)',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, tuya.fz.power_outage_memory,
            fz.tuya_relay_din_led_indicator],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tz.tuya_relay_din_led_indicator],
        whiteLabel: [{vendor: 'MatSee Plus', model: 'ATMS1602Z'}],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
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
        exposes: [e.switch(), e.power(), e.current(), e.voltage(),
            e.energy(), e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage'),
            e.enum('indicator_mode', ea.STATE_SET, ['off', 'on_off', 'off_on'])
                .withDescription('Relay LED indicator mode')],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_qeuvnohg'}],
        model: 'TS011F_din_smart_relay_polling',
        description: 'Din smart relay (with power monitoring via polling)',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, tuya.fz.power_outage_memory,
            fz.tuya_relay_din_led_indicator],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tz.tuya_relay_din_led_indicator],
        whiteLabel: [tuya.whitelabel('Tongou', 'TO-Q-SY1-JZT', 'Din smart relay (with power monitoring via polling)', ['_TZ3000_qeuvnohg'])],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
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
        exposes: [e.switch(), e.power(), e.current(), e.voltage(),
            e.energy(), e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage'),
            e.enum('indicator_mode', ea.STATE_SET, ['off', 'on_off', 'off_on'])
                .withDescription('Relay LED indicator mode')],
        options: [exposes.options.measurement_poll_interval()],
        onEvent: (type, data, device, options) => tuya.onEventMeasurementPoll(type, data, device, options, true, false),
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_7issjl2q'}],
        model: 'ATMS1601Z',
        description: 'Din smart relay (without power monitoring)',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.ignore_basic_report, tuya.fz.power_outage_memory, fz.tuya_relay_din_led_indicator],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1, tz.tuya_relay_din_led_indicator],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            device.save();
        },
        exposes: [e.switch(),
            e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage'),
            e.enum('indicator_mode', ea.STATE_SET, ['off', 'on_off', 'off_on'])
                .withDescription('Relay LED indicator mode')],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_nklqjk62', '_TZE200_nklqjk62']),
        model: 'PJ-ZGD01',
        vendor: 'TuYa',
        description: 'Garage door opener',
        fromZigbee: [legacy.fromZigbee.matsee_garage_door_opener, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.matsee_garage_door_opener, legacy.toZigbee.tuya_data_point_test],
        whiteLabel: [{vendor: 'MatSee Plus', model: 'PJ-ZGD01'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.binary('trigger', ea.STATE_SET, true, false).withDescription('Trigger the door movement'),
            e.binary('garage_door_contact', ea.STATE, true, false)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_wfxuhoea'}],
        model: 'GDC311ZBQ1',
        vendor: 'TuYa',
        description: 'LoraTap garage door opener with wireless sensor',
        fromZigbee: [legacy.fromZigbee.matsee_garage_door_opener, fz.ignore_basic_report],
        toZigbee: [legacy.toZigbee.matsee_garage_door_opener, legacy.toZigbee.tuya_data_point_test],
        whiteLabel: [{vendor: 'LoraTap', model: 'GDC311ZBQ1'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.binary('trigger', ea.STATE_SET, true, false).withDescription('Trigger the door movement'),
            e.binary('garage_door_contact', ea.STATE, false, true)
                .withDescription('Indicates if the garage door contact is closed (= true) or open (= false)')],
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_qaaysllp'}],
        model: 'LCZ030',
        vendor: 'TuYa',
        description: 'Temperature & humidity & illuminance sensor with display',
        fromZigbee: [fz.battery, fz.illuminance, fz.temperature, fz.humidity, fz.ts0201_temperature_humidity_alarm],
        toZigbee: [tz.ts0201_temperature_humidity_alarm],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // Enables reporting of measurement state changes
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genPowerCfg',
                'msTemperatureMeasurement', 'msIlluminanceMeasurement', 'msRelativeHumidity', 'manuSpecificTuya_2']);
        },
        exposes: [e.temperature(), e.humidity(), e.battery(), e.illuminance(), e.illuminance_lux(),
            e.numeric('alarm_temperature_max', ea.STATE_SET).withUnit('°C').withDescription('Alarm temperature max')
                .withValueMin(-20).withValueMax(80),
            e.numeric('alarm_temperature_min', ea.STATE_SET).withUnit('°C').withDescription('Alarm temperature min')
                .withValueMin(-20).withValueMax(80),
            e.numeric('alarm_humidity_max', ea.STATE_SET).withUnit('%').withDescription('Alarm humidity max')
                .withValueMin(0).withValueMax(100),
            e.numeric('alarm_humidity_min', ea.STATE_SET).withUnit('%').withDescription('Alarm humidity min')
                .withValueMin(0).withValueMax(100),
            e.enum('alarm_humidity', ea.STATE, ['below_min_humdity', 'over_humidity', 'off'])
                .withDescription('Alarm humidity status'),
            e.enum('alarm_temperature', ea.STATE, ['below_min_temperature', 'over_temperature', 'off'])
                .withDescription('Alarm temperature status'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_auin8mzr'}],
        model: 'TS0601_motion_sensor',
        vendor: 'TuYa',
        description: 'Human presence sensor AIR',
        fromZigbee: [legacy.fromZigbee.tuya_motion_sensor],
        toZigbee: [legacy.toZigbee.tuya_motion_sensor],
        exposes: [
            e.occupancy(),
            e.enum('o_sensitivity', ea.STATE_SET, Object.values(legacy.msLookups.OSensitivity)).withDescription('O-Sensitivity mode'),
            e.enum('v_sensitivity', ea.STATE_SET, Object.values(legacy.msLookups.VSensitivity)).withDescription('V-Sensitivity mode'),
            e.enum('led_status', ea.STATE_SET, ['ON', 'OFF']).withDescription('Led status switch'),
            e.numeric('vacancy_delay', ea.STATE_SET).withUnit('sec').withDescription('Vacancy delay').withValueMin(0)
                .withValueMax(1000),
            e.numeric('light_on_luminance_prefer', ea.STATE_SET).withDescription('Light-On luminance prefer')
                .withValueMin(0).withValueMax(10000),
            e.numeric('light_off_luminance_prefer', ea.STATE_SET).withDescription('Light-Off luminance prefer')
                .withValueMin(0).withValueMax(10000),
            e.enum('mode', ea.STATE_SET, Object.values(legacy.msLookups.Mode)).withDescription('Working mode'),
            e.numeric('luminance_level', ea.STATE).withDescription('Luminance level'),
            e.numeric('reference_luminance', ea.STATE).withDescription('Reference luminance'),
            e.numeric('vacant_confirm_time', ea.STATE).withDescription('Vacant confirm time'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_lu01t0zl', '_TZE200_vrfecyku', '_TZE200_ypprdwsl', '_TZE200_jkbljri7']),
        model: 'MIR-HE200-TY',
        vendor: 'TuYa',
        description: 'Human presence sensor with fall function',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.sendDataPointEnum(endpoint, legacy.dataPoints.trsfTumbleSwitch, 0);
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
        },
        exposes: [
            e.illuminance_lux(), e.presence(), e.occupancy(),
            e.numeric('motion_speed', ea.STATE).withDescription('Speed of movement'),
            e.enum('motion_direction', ea.STATE, ['standing_still', 'moving_forward', 'moving_backward'])
                .withDescription('direction of movement from the point of view of the radar'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1)
                .withDescription('Sensitivity of the radar'),
            e.enum('radar_scene', ea.STATE_SET, ['default', 'area', 'toilet', 'bedroom', 'parlour', 'office', 'hotel'])
                .withDescription('Presets for sensitivity for presence and movement'),
            e.enum('tumble_switch', ea.STATE_SET, ['ON', 'OFF']).withDescription('Tumble status switch'),
            e.numeric('fall_sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(10).withValueStep(1)
                .withDescription('Fall sensitivity of the radar'),
            e.numeric('tumble_alarm_time', ea.STATE_SET).withValueMin(1).withValueMax(5).withValueStep(1)
                .withUnit('min').withDescription('Tumble alarm time'),
            e.enum('fall_down_status', ea.STATE, ['none', 'maybe_fall', 'fall'])
                .withDescription('Fall down status'),
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
                [112, 'radar_scene', tuya.valueConverterBasic.lookup(
                    {'default': 0, 'area': 1, 'toilet': 2, 'bedroom': 3, 'parlour': 4, 'office': 5, 'hotel': 6})],
                [114, 'motion_direction', tuya.valueConverterBasic.lookup(
                    {'standing_still': 0, 'moving_forward': 1, 'moving_backward': 2})],
                [115, 'motion_speed', tuya.valueConverter.raw],
                [116, 'fall_down_status', tuya.valueConverterBasic.lookup({'none': 0, 'maybe_fall': 1, 'fall': 2})],
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
        vendor: 'TuYa',
        description: 'Wireless switch with 6 buttons',
        whiteLabel: [{vendor: 'LoraTap', model: 'SS9600ZB'}],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
            '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold',
            '5_single', '5_double', '5_hold', '6_single', '6_double', '6_hold'])],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_pcqjmcud'}],
        model: 'YSR-MINI-Z',
        vendor: 'TuYa',
        description: '2 in 1 dimming remote control and scene control',
        exposes: [
            e.battery(),
            e.action(['on', 'off',
                'brightness_move_up', 'brightness_step_up', 'brightness_step_down', 'brightness_move_down', 'brightness_stop',
                'color_temperature_step_down', 'color_temperature_step_up',
                '1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
                '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold',
            ]),
            e.enum('operation_mode', ea.ALL, ['command', 'event']).withDescription(
                'Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop,
            fz.command_step_color_temperature, fz.tuya_on_off_action, fz.tuya_operation_mode],
        toZigbee: [tz.tuya_operation_mode],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_hkdl5fmv'}],
        model: 'TS0601_rcbo',
        vendor: 'TuYa',
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
            e.power(), e.voltage(), e.energy(), e.temperature(),
            e.numeric('power_l1', ea.STATE).withUnit('W').withDescription('Instantaneous measured power on phase 1'),
            e.numeric('power_l2', ea.STATE).withUnit('W').withDescription('Instantaneous measured power on phase 2'),
            e.numeric('power_l3', ea.STATE).withUnit('W').withDescription('Instantaneous measured power on phase 3'),
            e.numeric('energy_consumed', ea.STATE).withUnit('kWh').withDescription('Consumed energy'),
            e.enum('clear_device_data', ea.SET, ['']).withDescription('Clear device data'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_4fjiwweb'}, {modelID: 'TS004F', manufacturerName: '_TZ3000_uri7ongn'},
            {modelID: 'TS004F', manufacturerName: '_TZ3000_ixla93vd'}, {modelID: 'TS004F', manufacturerName: '_TZ3000_qja6nq5z'},
            {modelID: 'TS004F', manufacturerName: '_TZ3000_abrsvsou'}],
        model: 'ERS-10TZBVK-AA',
        vendor: 'TuYa',
        description: 'Smart knob',
        fromZigbee: [
            fz.command_step, fz.command_toggle, fz.command_move_hue, fz.command_step_color_temperature, fz.command_stop_move_raw,
            fz.tuya_multi_action, fz.tuya_operation_mode, fz.battery,
        ],
        toZigbee: [tz.tuya_operation_mode],
        exposes: [
            e.action([
                'toggle', 'brightness_step_up', 'brightness_step_down', 'color_temperature_step_up', 'color_temperature_step_down',
                'saturation_move', 'hue_move', 'hue_stop', 'single', 'double', 'hold', 'rotate_left', 'rotate_right',
            ]),
            e.numeric('action_step_size', ea.STATE).withValueMin(0).withValueMax(255),
            e.numeric('action_transition_time', ea.STATE).withUnit('s'),
            e.numeric('action_rate', ea.STATE).withValueMin(0).withValueMax(255),
            e.battery(),
            e.enum('operation_mode', ea.ALL, ['command', 'event']).withDescription(
                'Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_kzm5w4iz'}],
        model: 'TS0601_vibration_sensor',
        vendor: 'TuYa',
        description: 'Smart vibration sensor',
        fromZigbee: [legacy.fromZigbee.tuya_smart_vibration_sensor],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.vibration()],
    },
    {
        fingerprint: [{modelID: `TS0601`, manufacturerName: `_TZE200_yi4jtqq1`}, {modelID: `TS0601`, manufacturerName: `_TZE200_khx7nnka`}],
        model: `XFY-CGQ-ZIGB`,
        vendor: `TuYa`,
        description: `Illuminance sensor`,
        fromZigbee: [legacy.fromZigbee.tuya_illuminance_sensor],
        toZigbee: [],
        exposes: [e.illuminance_lux(), e.brightness_state()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_kltffuzl'}, {modelID: 'TS0601', manufacturerName: '_TZE200_fwoorn8y'}],
        model: 'TM001-ZA/TM081',
        vendor: 'TuYa',
        description: 'Door and window sensor',
        fromZigbee: [legacy.fromZigbee.tm081],
        toZigbee: [],
        exposes: [e.contact(), e.battery()],
    },
    {
        fingerprint: [{modelID: `TS0601`, manufacturerName: `_TZE200_2m38mh6k`}],
        model: 'SS9600ZB',
        vendor: 'TuYa',
        description: '6 gang remote',
        exposes: [e.battery(),
            e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold', '3_single', '3_double', '3_hold',
                '4_single', '4_double', '4_hold', '5_single', '5_double', '5_hold', '6_single', '6_double', '6_hold'])],
        fromZigbee: [legacy.fromZigbee.tuya_remote],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0052'],
        model: 'TS0052',
        vendor: 'TuYa',
        description: 'Zigbee dimmer module 1 channel',
        extend: [tuyaLight({powerOnBehavior: true, configureReporting: true, switchType: true, minBrightness: true})],
    },
    {
        fingerprint: tuya.fingerprint('TS0052', ['_TZ3000_zjtxnoft']),
        model: 'TS0052_2',
        vendor: 'TuYa',
        description: 'Zigbee dimmer module 2 channel',
        extend: [tuyaLight({powerOnBehavior: true, configureReporting: true, switchType: true, minBrightness: true, endpoints: {l1: 1, l2: 2}})],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_ikvncluo'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_lyetpprm'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_jva8ink8'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_holel4dk'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xpq2rzhq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wukb7rhc'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_xsm7l9xa'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_ztc6ggyl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ztc6ggyl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_sgpeacqp'}],
        model: 'TS0601_smart_human_presence_sensor_1',
        vendor: 'TuYa',
        description: 'Smart Human presence sensor',
        fromZigbee: [legacy.fz.tuya_smart_human_presense_sensor],
        toZigbee: [legacy.tz.tuya_smart_human_presense_sensor],
        whiteLabel: [
            tuya.whitelabel('TuYa', 'ZY-M100-L', 'Ceiling human breathe sensor', ['_TZE204_ztc6ggyl']),
        ],
        exposes: [
            e.illuminance_lux(), e.presence(),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1)
                .withDescription('sensitivity of the radar'),
            e.numeric('minimum_range', ea.STATE_SET).withValueMin(0).withValueMax(9.5).withValueStep(0.15)
                .withDescription('Minimum range').withUnit('m'),
            e.numeric('maximum_range', ea.STATE_SET).withValueMin(0).withValueMax(9.5).withValueStep(0.15)
                .withDescription('Maximum range').withUnit('m'),
            e.numeric('detection_delay', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.1)
                .withDescription('Detection delay').withUnit('s'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0).withValueMax(1500).withValueStep(1)
                .withDescription('Fading time').withUnit('s'),
            // e.text('cli', ea.STATE).withDescription('not recognize'),
            e.enum('self_test', ea.STATE, Object.values(legacy.tuyaHPSCheckingResult))
                .withDescription('Self_test, possible results: checking, check_success, check_failure, others, comm_fault, radar_fault.'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_sxm7l9xa', '_TZE204_e5m9c5hl']),
        model: 'ZY-M100-S_1',
        vendor: 'TuYa',
        description: 'Mini human breathe sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        whiteLabel: [
            tuya.whitelabel('Wenzhi', 'WZ-M100-W', 'Human presence sensor', ['_TZE204_e5m9c5hl']),
        ],
        exposes: [
            e.illuminance_lux(), e.presence(),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1)
                .withDescription('sensitivity of the radar'),
            e.numeric('minimum_range', ea.STATE_SET).withValueMin(0).withValueMax(9.5).withValueStep(0.15)
                .withDescription('Minimum range').withUnit('m'),
            e.numeric('maximum_range', ea.STATE_SET).withValueMin(0).withValueMax(9.5).withValueStep(0.15)
                .withDescription('Maximum range').withUnit('m'),
            e.numeric('detection_delay', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.1)
                .withDescription('Detection delay').withUnit('s'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0.5).withValueMax(1500).withValueStep(1)
                .withDescription('Fading time').withUnit('s'),
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
        vendor: 'TuYa',
        description: 'Mini human breathe sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.illuminance_lux(), e.presence(),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1)
                .withDescription('sensitivity of the radar'),
            e.numeric('minimum_range', ea.STATE_SET).withValueMin(0).withValueMax(9.5).withValueStep(0.15)
                .withDescription('Minimum range').withUnit('m'),
            e.numeric('maximum_range', ea.STATE_SET).withValueMin(0).withValueMax(9.5).withValueStep(0.15)
                .withDescription('Maximum range').withUnit('m'),
            e.numeric('detection_delay', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.1)
                .withDescription('Detection delay').withUnit('s'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0.5).withValueMax(1500).withValueStep(1)
                .withDescription('Fading time').withUnit('s'),
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
        whiteLabel: [
            tuya.whitelabel('iHenso', '_TZE204_ztqnh5cg', 'Human presence sensor', ['_TZE204_ztqnh5cg']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0225', ['_TZE200_hl0ss9oa']),
        model: 'ZG-205ZL',
        vendor: 'TuYa',
        description: '24Ghz human presence sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.presence(),
            e.enum('motion_state', ea.STATE, ['none', 'large', 'small', 'static']).withDescription('Motion state'),
            e.illuminance_lux(),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0).withValueMax(3600).withValueStep(1).withUnit('s')
                .withDescription('Presence keep time'),
            e.numeric('large_motion_detection_distance', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.01).withUnit('m')
                .withDescription('Large motion detection distance'),
            e.numeric('large_motion_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('x')
                .withDescription('Large motion detection sensitivity'),
            e.numeric('small_motion_detection_distance', ea.STATE_SET).withValueMin(0).withValueMax(6).withValueStep(0.01).withUnit('m')
                .withDescription('Small motion detection distance'),
            e.numeric('small_motion_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('x')
                .withDescription('Small motion detection sensitivity'),
            e.numeric('static_detection_distance', ea.STATE_SET).withValueMin(0).withValueMax(6).withValueStep(0.01).withUnit('m')
                .withDescription('Static detection distance'),
            e.numeric('static_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('x')
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
                [11, 'motion_state', tuya.valueConverterBasic.lookup({
                    'none': tuya.enum(0), 'large': tuya.enum(1), 'small': tuya.enum(2), 'static': tuya.enum(3),
                })],
                [12, 'fading_time', tuya.valueConverter.raw],
                [13, 'large_motion_detection_distance', tuya.valueConverter.divideBy100],
                [15, 'large_motion_detection_sensitivity', tuya.valueConverter.raw],
                [14, 'small_motion_detection_distance', tuya.valueConverter.divideBy100],
                [16, 'small_motion_detection_sensitivity', tuya.valueConverter.raw],
                [103, 'static_detection_distance', tuya.valueConverter.divideBy100],
                [104, 'static_detection_sensitivity', tuya.valueConverter.raw],
                [105, 'mode', tuya.valueConverterBasic.lookup(
                    {'arm': tuya.enum(0), 'off': tuya.enum(1), 'alarm': tuya.enum(2), 'doorbell': tuya.enum(3)})],
                [102, 'alarm_volume', tuya.valueConverterBasic.lookup({
                    'low': tuya.enum(0), 'medium': tuya.enum(1), 'high': tuya.enum(2), 'mute': tuya.enum(3),
                })],
                [101, 'alarm_time', tuya.valueConverter.raw],
                [24, 'light_mode', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_whkgqxse'}],
        model: 'JM-TRH-ZGB-V1',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with clock',
        fromZigbee: [legacy.fromZigbee.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [legacy.toZigbee.nous_lcd_temperature_humidity_sensor],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.temperature(), e.humidity(), e.battery(),
            e.numeric('temperature_report_interval', ea.STATE_SET).withUnit('min').withValueMin(5).withValueMax(60).withValueStep(5)
                .withDescription('Temperature Report interval'),
            e.enum('temperature_unit_convert', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Current display unit'),
            e.enum('temperature_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm'])
                .withDescription('Temperature alarm status'),
            e.numeric('max_temperature', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature max'),
            e.numeric('min_temperature', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature min'),
            e.enum('humidity_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm'])
                .withDescription('Humidity alarm status'),
            e.numeric('max_humidity', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Alarm humidity max'),
            e.numeric('min_humidity', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Alarm humidity min'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_zyrdrmno'}],
        model: 'ZB-Sm',
        vendor: 'TuYa',
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
            e.numeric('favorite_position', ea.STATE_SET).withValueMin(0).withValueMax(100)
                .withDescription('Favorite position of this cover'),
            e.binary(`reverse_direction`, ea.STATE_SET, true, false).withDescription(`Inverts the cover direction`),
            e.text('motor_type', ea.STATE),
            e.enum('report', ea.SET, ['']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS1201', manufacturerName: '_TZ3290_7v1k4vufotpowp9z'}],
        model: 'ZS06',
        vendor: 'TuYa',
        description: 'Universal smart IR remote control',
        fromZigbee: [
            fzZosung.zosung_send_ir_code_00, fzZosung.zosung_send_ir_code_01, fzZosung.zosung_send_ir_code_02,
            fzZosung.zosung_send_ir_code_03, fzZosung.zosung_send_ir_code_04, fzZosung.zosung_send_ir_code_05,
        ],
        toZigbee: [tzZosung.zosung_ir_code_to_send, tzZosung.zosung_learn_ir_code],
        exposes: [ez.learn_ir_code(), ez.learned_ir_code(), ez.ir_code_to_send()],
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_itnrsufe'}],
        model: 'KCTW1Z',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with LCD',
        fromZigbee: [fz.temperature, fzLocal.humidity10, fzLocal.temperature_unit, fz.battery, fz.ignore_tuya_set_time],
        toZigbee: [tzLocal.temperature_unit],
        onEvent: tuya.onEventSetLocalTime,
        exposes: [
            e.temperature(), e.humidity(), e.battery(), e.battery_voltage(),
            e.enum('temperature_unit', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Current display unit'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_0u3bj3rc'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_v6ossqfy'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_mx6u6l4y'}],
        model: 'TS0601_human_presence_sensor',
        vendor: 'TuYa',
        description: 'Human presence sensor Zigbee',
        fromZigbee: [legacy.fromZigbee.hpsz],
        toZigbee: [legacy.toZigbee.hpsz],
        onEvent: tuya.onEventSetLocalTime,
        exposes: [e.presence(),
            e.numeric('duration_of_attendance', ea.STATE).withUnit('min')
                .withDescription('Shows the presence duration in minutes'),
            e.numeric('duration_of_absence', ea.STATE).withUnit('min')
                .withDescription('Shows the duration of the absence in minutes'),
            e.binary('led_state', ea.STATE_SET, true, false)
                .withDescription('Turns the onboard LED on or off'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_qoy0ekbd', '_TZE200_znbl8dj5', '_TZE200_a8sdabtg', '_TZE200_dikkika5']),
        model: 'ZG-227ZL',
        vendor: 'TuYa',
        description: 'Temperature & humidity LCD sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.temperature(), e.humidity(), tuya.exposes.temperatureUnit(), tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(), e.battery()],
        whiteLabel: [
            tuya.whitelabel('TuYa', 'ZG-227Z', 'Temperature and humidity sensor', ['_TZE200_a8sdabtg']),
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
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ysm4dsb1']),
        model: 'RSH-HS06',
        vendor: 'TuYa',
        description: 'Temperature and humidity sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEvent({queryOnDeviceAnnounce: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await device.getEndpoint(1).command('manuSpecificTuya', 'dataQuery', {});
        },
        exposes: [e.battery(), e.temperature(), e.humidity()],
        meta: {
            tuyaDatapoints: [
                [1, 'temperature', tuya.valueConverter.divideBy10],
                [2, 'humidity', tuya.valueConverter.raw],
                [4, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_n8dljorx']),
        model: 'ZG-102Z',
        vendor: 'TuYa',
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
        vendor: 'TuYa',
        description: 'Luminance door sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.contact(), e.illuminance().withUnit('lx'), e.battery(),
            e.numeric('illuminance_interval', ea.STATE_SET).withValueMin(1).withValueMax(720).withValueStep(1).withUnit('minutes')
                .withDescription('Brightness acquisition interval (refresh and update only while active)')],
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
        vendor: 'TuYa',
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
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_8isdky6j']),
        model: 'ZG-225Z',
        vendor: 'TuYa',
        description: 'Gas sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.gas(), tuya.exposes.gasValue().withUnit('ppm')],
        meta: {
            tuyaDatapoints: [
                [1, 'gas', tuya.valueConverter.trueFalse0],
                [2, 'gas_value', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_3towulqd', '_TZE200_1ibpyhdc', '_TZE200_bh3n6gk8', '_TZE200_ttcovulf']),
        model: 'ZG-204ZL',
        vendor: 'TuYa',
        description: 'Luminance motion sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.occupancy(), e.illuminance().withUnit('lx'), e.battery(),
            e.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high'])
                .withDescription('PIR sensor sensitivity (refresh and update only while active)'),
            e.enum('keep_time', ea.STATE_SET, ['10', '30', '60', '120'])
                .withDescription('PIR keep time in seconds (refresh and update only while active)'),
            e.numeric('illuminance_interval', ea.STATE_SET).withValueMin(1).withValueMax(720).withValueStep(1).withUnit('minutes')
                .withDescription('Brightness acquisition interval (refresh and update only while active)'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'occupancy', tuya.valueConverter.trueFalse0],
                [4, 'battery', tuya.valueConverter.raw],
                [9, 'sensitivity', tuya.valueConverterBasic.lookup({'low': tuya.enum(0), 'medium': tuya.enum(1), 'high': tuya.enum(2)})],
                [10, 'keep_time', tuya.valueConverterBasic.lookup(
                    {'10': tuya.enum(0), '30': tuya.enum(1), '60': tuya.enum(2), '120': tuya.enum(3)})],
                [12, 'illuminance', tuya.valueConverter.raw],
                [102, 'illuminance_interval', tuya.valueConverter.raw],

            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0225', ['_TZE200_2aaelwxk']),
        model: 'ZG-205Z/A',
        vendor: 'TuYa',
        description: '5.8Ghz Human presence sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.presence(), e.illuminance().withUnit('lx'),
            e.numeric('large_motion_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('x')
                .withDescription('Motion detection sensitivity'),
            e.numeric('large_motion_detection_distance', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.01).withUnit('m')
                .withDescription('Motion detection distance'),
            e.enum('motion_state', ea.STATE, ['none', 'small', 'medium', 'large']).withDescription('State of the motion'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0).withValueMax(28800).withValueStep(1).withUnit('s')
                .withDescription('For how much time presence should stay true after detecting it'),
            e.numeric('medium_motion_detection_distance', ea.STATE_SET).withValueMin(0).withValueMax(6).withValueStep(0.01).withUnit('m')
                .withDescription('Medium motion detection distance'),
            e.numeric('medium_motion_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('x')
                .withDescription('Medium motion detection sensitivity'),
            e.binary('indicator', ea.STATE_SET, 'ON', 'OFF').withDescription('LED Indicator'),
            e.numeric('small_detection_distance', ea.STATE_SET).withValueMin(0).withValueMax(6).withValueStep(0.01).withUnit('m')
                .withDescription('Small detection distance'),
            e.numeric('small_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('x')
                .withDescription('Small detection sensitivity'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [2, 'large_motion_detection_sensitivity', tuya.valueConverter.raw],
                [4, 'large_motion_detection_distance', tuya.valueConverter.divideBy100],
                [101, 'motion_state', tuya.valueConverterBasic.lookup(
                    {'none': tuya.enum(0), 'large': tuya.enum(1), 'medium': tuya.enum(2), 'small': tuya.enum(3)})],
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
        fingerprint: tuya.fingerprint('TS110E', ['_TZ3210_zxbtub8r', '_TZ3210_k1msuvg6']),
        model: 'TS110E_1gang_1',
        vendor: 'TuYa',
        description: '1 channel dimmer',
        fromZigbee: extend.light_onoff_brightness({disablePowerOnBehavior: true, disableMoveStep: true, disableTransition: true})
            .fromZigbee.concat([tuya.fz.power_on_behavior_1, fzLocal.TS110E_switch_type, fzLocal.TS110E]),
        toZigbee: utils.replaceInArray(
            extend.light_onoff_brightness({disablePowerOnBehavior: true, disableMoveStep: true, disableTransition: true})
                .toZigbee.concat([tuya.tz.power_on_behavior_1, tzLocal.TS110E_options]),
            [tz.light_onoff_brightness],
            [tzLocal.TS110E_light_onoff_brightness],
        ),
        exposes: [e.light_brightness().withMinBrightness().withMaxBrightness(), e.power_on_behavior(), tuya.exposes.switchType()],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS110E', ['_TZ3210_ngqk6jia', '_TZ3210_weaqkhab', '_TZ3210_tkkb1ym8']),
        model: 'TS110E_1gang_2',
        vendor: 'TuYa',
        description: '1 channel dimmer',
        whiteLabel: [
            tuya.whitelabel('Lonsonho', 'QS-Zigbee-D02-TRIAC-L_1', '1 channel dimmer', ['_TZ3210_weaqkhab']),
            tuya.whitelabel('Lonsonho', 'QS-Zigbee-D02-TRIAC-LN_1', '1 channel dimmer', ['_TZ3210_ngqk6jia']),
        ],
        ota: ota.zigbeeOTA,
        fromZigbee: [fzLocal.TS110E, fzLocal.TS110E_light_type, tuya.fz.power_on_behavior_1, fz.on_off],
        toZigbee: [tzLocal.TS110E_onoff_brightness, tzLocal.TS110E_options, tuya.tz.power_on_behavior_1, tz.light_brightness_move],
        exposes: [
            e.light_brightness().withMinBrightness().withMaxBrightness(),
            tuya.exposes.lightType().withAccess(ea.ALL), e.power_on_behavior().withAccess(ea.ALL)],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS110E', manufacturerName: '_TZ3210_wdexaypg'}, {modelID: 'TS110E', manufacturerName: '_TZ3210_3mpwqzuu'}],
        model: 'TS110E_2gang_1',
        vendor: 'TuYa',
        description: '2 channel dimmer',
        fromZigbee: extend.light_onoff_brightness({disablePowerOnBehavior: true, disableMoveStep: true, disableTransition: true})
            .fromZigbee.concat([tuya.fz.power_on_behavior_1, fzLocal.TS110E_switch_type, fzLocal.TS110E]),
        toZigbee: utils.replaceInArray(
            extend.light_onoff_brightness({disablePowerOnBehavior: true, disableMoveStep: true, disableTransition: true})
                .toZigbee.concat([tuya.tz.power_on_behavior_1, tzLocal.TS110E_options]),
            [tz.light_onoff_brightness],
            [tzLocal.TS110E_light_onoff_brightness],
        ),
        meta: {multiEndpoint: true},
        exposes: [
            e.light_brightness().withMinBrightness().withMaxBrightness().withEndpoint('l1'),
            e.light_brightness().withMinBrightness().withMaxBrightness().withEndpoint('l2'),
            e.power_on_behavior(),
            tuya.exposes.switchType().withEndpoint('l1'),
            tuya.exposes.switchType().withEndpoint('l2'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS110E', ['_TZ3210_pagajpog', '_TZ3210_4ubylghk', '_TZ3210_vfwhhldz']),
        model: 'TS110E_2gang_2',
        vendor: 'TuYa',
        description: '2 channel dimmer',
        fromZigbee: [fzLocal.TS110E, fzLocal.TS110E_light_type, tuya.fz.power_on_behavior_1, fz.on_off],
        toZigbee: [tzLocal.TS110E_onoff_brightness, tzLocal.TS110E_options, tuya.tz.power_on_behavior_1, tz.light_brightness_move],
        meta: {multiEndpoint: true},
        exposes: [
            e.light_brightness().withMinBrightness().withMaxBrightness().withEndpoint('l1'),
            e.light_brightness().withMinBrightness().withMaxBrightness().withEndpoint('l2'),
            e.power_on_behavior().withAccess(ea.ALL)],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
        vendor: 'TuYa',
        description: '3-phase clamp power meter',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        whiteLabel: [
            {vendor: 'MatSee Plus', model: 'PC321-Z-TY'},
            {vendor: 'Owon', model: 'PC321-Z-TY'},
        ],
        exposes: [
            e.ac_frequency(), e.temperature(), e.current(), e.power(), e.energy(),
            tuya.exposes.energyWithPhase('a'), tuya.exposes.energyWithPhase('b'), tuya.exposes.energyWithPhase('c'),
            tuya.exposes.voltageWithPhase('a'), tuya.exposes.voltageWithPhase('b'), tuya.exposes.voltageWithPhase('c'),
            tuya.exposes.powerWithPhase('a'), tuya.exposes.powerWithPhase('b'), tuya.exposes.powerWithPhase('c'),
            tuya.exposes.currentWithPhase('a'), tuya.exposes.currentWithPhase('b'), tuya.exposes.currentWithPhase('c'),
            tuya.exposes.powerFactorWithPhase('a'), tuya.exposes.powerFactorWithPhase('b'), tuya.exposes.powerFactorWithPhase('c'),
        ],
        meta: {
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
        vendor: 'TuYa',
        description: '3-phase clamp power meter with relay',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        whiteLabel: [{vendor: 'Wenzhou Taiye Electric', model: 'TAC7361C BI'}],
        exposes: [
            e.switch().setAccess('state', ea.STATE_SET), e.power(), e.energy(), e.produced_energy(),
            tuya.exposes.voltageWithPhase('a'), tuya.exposes.voltageWithPhase('b'), tuya.exposes.voltageWithPhase('c'),
            tuya.exposes.powerWithPhase('a'), tuya.exposes.powerWithPhase('b'), tuya.exposes.powerWithPhase('c'),
            tuya.exposes.currentWithPhase('a'), tuya.exposes.currentWithPhase('b'), tuya.exposes.currentWithPhase('c'),
        ],
        meta: {
            tuyaDatapoints: [
                [16, 'state', tuya.valueConverter.onOff],
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                [9, 'power', tuya.valueConverter.raw],
                [6, null, tuya.valueConverter.phaseVariant2WithPhase('a')],
                [7, null, tuya.valueConverter.phaseVariant2WithPhase('b')],
                [8, null, tuya.valueConverter.phaseVariant2WithPhase('c')],
            ],
        },
    },
    {
        zigbeeModel: ['TS0049'],
        model: 'TS0049',
        vendor: 'TuYa',
        description: 'Water valve',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.errorStatus(), tuya.exposes.switch(), tuya.exposes.batteryState(),
            tuya.exposes.countdown().withValueMin(0).withValueMax(255).withUnit('minutes')
                .withDescription('Max on time in minutes'),
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
        vendor: 'TuYa',
        description: 'Fan switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch(), e.power_on_behavior(['off', 'on']).withAccess(ea.STATE_SET),
            tuya.exposes.countdown().withValueMin(0).withValueMax(43200).withUnit('s').withDescription('Max ON time in seconds'),
            e.numeric('fan_speed', ea.STATE_SET).withValueMin(1).withValueMax(5).withValueStep(1)
                .withDescription('Speed off the fan'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [2, 'countdown', tuya.valueConverter.countdown],
                [3, 'fan_speed', tuya.valueConverterBasic
                    .lookup({'1': tuya.enum(0), '2': tuya.enum(1), '3': tuya.enum(2), '4': tuya.enum(3), '5': tuya.enum(4)})],
                [11, 'power_on_behavior', tuya.valueConverterBasic.lookup({'off': tuya.enum(0), 'on': tuya.enum(1)})],
            ],
        },
        whiteLabel: [
            {vendor: 'Lerlink', model: 'T2-Z67/T2-W67'},
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_hmqzfqml']),
        model: 'TS0601_fan_and_light_switch',
        vendor: 'TuYa',
        description: 'Fan & light switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('status_indication', ea.STATE_SET, 'ON', 'OFF').withDescription('Light switch'),
            tuya.exposes.switch(),
            e.power_on_behavior(['OFF', 'ON']).withAccess(ea.STATE_SET),
            e.enum('fan_speed', ea.STATE_SET, ['minimum', 'medium', 'maximum']).withDescription('Speed off the fan'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [101, 'fan_speed', tuya.valueConverterBasic.lookup({'minimum': tuya.enum(0), 'medium': tuya.enum(1), 'maximum': tuya.enum(2)})],
                [11, 'power_on_behavior', tuya.valueConverterBasic.lookup({'OFF': tuya.enum(0), 'ON': tuya.enum(1)})],
                [5, 'status_indication', tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [
            {vendor: 'Liwokit', model: 'Fan+Light-01'},
        ],
    },
    {
        zigbeeModel: ['TS0224'],
        model: 'TS0224',
        vendor: 'TuYa',
        description: 'Smart light & sound siren',
        fromZigbee: [],
        toZigbee: [tz.warning, tzLocal.TS0224],
        exposes: [e.warning(),
            e.binary('light', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn the light of the alarm ON/OFF'),
            e.numeric('duration', ea.STATE_SET).withValueMin(60).withValueMax(3600).withValueStep(1).withUnit('s')
                .withDescription('Duration of the alarm'),
            e.enum('volume', ea.STATE_SET, ['mute', 'low', 'medium', 'high'])
                .withDescription('Volume of the alarm'),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0041', ['_TZ3000_fa9mlvja']),
        model: 'IH-K663',
        vendor: 'TuYa',
        description: 'Smart button',
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_cayepv1a', '_TZ3000_lepzuhto', '_TZ3000_qystbcjg']),
        model: 'TS011F_with_threshold',
        description: 'Din rail switch with power monitoring and threshold settings',
        vendor: 'TuYa',
        ota: ota.zigbeeOTA,
        extend: tuya.extend.switch({
            electricalMeasurements: true, electricalMeasurementsFzConverter: fzLocal.TS011F_electrical_measurement,
            powerOutageMemory: true, indicatorMode: true,
            fromZigbee: [fz.temperature, fzLocal.TS011F_threshold],
            toZigbee: [tzLocal.TS011F_threshold],
            exposes: [
                e.temperature(),
                e.numeric('temperature_threshold', ea.STATE_SET).withValueMin(40).withValueMax(100).withValueStep(1).withUnit('*C')
                    .withDescription('High temperature threshold'),
                e.binary('temperature_breaker', ea.STATE_SET, 'ON', 'OFF')
                    .withDescription('High temperature breaker'),
                e.numeric('power_threshold', ea.STATE_SET).withValueMin(1).withValueMax(26).withValueStep(1).withUnit('kW')
                    .withDescription('High power threshold'),
                e.binary('power_breaker', ea.STATE_SET, 'ON', 'OFF')
                    .withDescription('High power breaker'),
                e.numeric('over_current_threshold', ea.STATE_SET).withValueMin(1).withValueMax(64).withValueStep(1).withUnit('A')
                    .withDescription('Over-current threshold'),
                e.binary('over_current_breaker', ea.STATE_SET, 'ON', 'OFF')
                    .withDescription('Over-current breaker'),
                e.numeric('over_voltage_threshold', ea.STATE_SET).withValueMin(220).withValueMax(265).withValueStep(1).withUnit('V')
                    .withDescription('Over-voltage threshold'),
                e.binary('over_voltage_breaker', ea.STATE_SET, 'ON', 'OFF')
                    .withDescription('Over-voltage breaker'),
                e.numeric('under_voltage_threshold', ea.STATE_SET).withValueMin(76).withValueMax(240).withValueStep(1).withUnit('V')
                    .withDescription('Under-voltage threshold'),
                e.binary('under_voltage_breaker', ea.STATE_SET, 'ON', 'OFF')
                    .withDescription('Under-voltage breaker'),
            ],
        }),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            endpoint.command('genBasic', 'tuyaSetup', {});
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
            tuya.whitelabel('TONGOU', 'TO-Q-SY2-163JZT', 'Smart circuit breaker', ['_TZ3000_cayepv1a']),
            tuya.whitelabel('EARU', 'EAKCB-T-M-Z', 'Smart circuit breaker', ['_TZ3000_lepzuhto']),
            tuya.whitelabel('UNSH', 'SMKG-1KNL-EU-Z', 'Smart Circuit Breaker', ['_TZ3000_qystbcjg']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS000F', ['_TZ3000_hdc8bbha']),
        model: 'QS-Zigbee-SEC01-U',
        vendor: 'TuYa',
        description: 'Zigbee 3.0 smart light switch module 1 gang',
        extend: tuya.extend.switch({switchType: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint('TS000F', ['_TZ3000_m8f3z8ju']),
        model: 'QS-Zigbee-SEC02-U',
        vendor: 'TuYa',
        description: 'Zigbee 3.0 smart light switch module 2 gang',
        extend: tuya.extend.switch({switchType: true, endpoints: ['l1', 'l2']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0001', manufacturerName: '_TZ3000_bmqxalil'},
        ],
        model: 'TS0001_switch_1_gang',
        vendor: 'TuYa',
        description: '1-Gang switch with backlight',
        extend: tuya.extend.switch({powerOnBehavior2: true, backlightModeOffOn: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Homeetec', '37022454', '1 Gang switch with backlight', ['_TZ3000_bmqxalil']),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0002', manufacturerName: '_TZ3000_in5qxhtt'},
        ],
        model: 'TS0002_switch_2_gang',
        vendor: 'TuYa',
        description: '2-Gang switch with backlight',
        extend: tuya.extend.switch({powerOnBehavior2: true, backlightModeOffOn: true, endpoints: ['l1', 'l2']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Homeetec', '37022463', '2 Gang switch with backlight', ['_TZ3000_in5qxhtt']),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0003', manufacturerName: '_TZ3000_pv4puuxi'},
        ],
        model: 'TS0003_switch_3_gang',
        vendor: 'TuYa',
        description: '3-Gang switch with backlight',
        extend: tuya.extend.switch({powerOnBehavior2: true, backlightModeOffOn: true, endpoints: ['left', 'center', 'right']}),
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('Homeetec', '37022474', '3 Gang switch with backlight', ['_TZ3000_pv4puuxi']),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_hewlydpz'},
        ],
        model: 'TS0601_switch_4_gang_2',
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
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
        whiteLabel: [
            tuya.whitelabel('Homeetec', '37022714', '4 Gang switch with backlight', ['_TZE200_hewlydpz']),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_p6vz3wzt'},
        ],
        model: 'TS0601_cover_5',
        vendor: 'TuYa',
        description: 'Curtain/blind switch',
        options: [exposes.options.invert_cover()],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.cover_position(),
            e.enum('calibration', ea.STATE_SET, ['START', 'END']).withDescription('Calibration'),
            e.binary('backlight_mode', ea.STATE_SET, 'ON', 'OFF').withDescription('Backlight'),
            e.enum('motor_steering', ea.STATE_SET, ['FORWARD', 'BACKWARD']).withDescription('Motor Steering'),
            e.binary('child_lock', ea.STATE_SET, 'ON', 'OFF').withDescription('Child Lock'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({'OPEN': tuya.enum(0), 'STOP': tuya.enum(1), 'CLOSE': tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'calibration', tuya.valueConverterBasic.lookup({'START': tuya.enum(0), 'END': tuya.enum(1)})],
                [7, 'backlight_mode', tuya.valueConverter.onOff],
                [8, 'motor_steering', tuya.valueConverterBasic.lookup({'FORWARD': tuya.enum(0), 'BACKWARD': tuya.enum(1)})],
                [103, 'child_lock', tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [
            tuya.whitelabel('Homeetec', '37022483', 'Curtain/blind switch', ['_TZE200_p6vz3wzt']),
        ],
    },
    {
        zigbeeModel: ['TS030F'],
        model: 'TS030F',
        vendor: 'TuYa',
        description: 'Smart blind controller',
        fromZigbee: [fz.cover_position_tilt, fz.tuya_cover_options_2],
        toZigbee: [tz.cover_position_tilt, tz.cover_state, tzLocal.TS030F_border, tz.moes_cover_calibration, tz.tuya_cover_reversal],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        whiteLabel: [
            tuya.whitelabel('Lidl', 'HG09648', 'Livarno roller blinds', ['_TZB000_42ha4rsc']),
        ],
        exposes: [
            e.cover_position(),
            e.enum('border', ea.SET, ['up', 'down', 'up_delete', 'down_delete']),
            e.numeric('calibration_time', ea.ALL).withValueMin(0).withValueMax(100),
            e.binary('motor_reversal', ea.ALL, 'ON', 'OFF')
                .withDescription('Reverse the motor, resets all endpoints! Also the upper border after hardware initialisation. Be careful!' +
                    'After this you have to turn off and turn on the roller so that it can drive into the uppest position.'),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_jhkttplm'},
        ],
        model: 'TS0601_cover_with_1_switch',
        vendor: 'TuYa',
        description: 'Curtain/blind switch with 1 Gang switch',
        options: [exposes.options.invert_cover()],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.cover_position(),
            tuya.exposes.switch().withEndpoint('l1'),
            e.enum('calibration', ea.STATE_SET, ['START', 'END']).withDescription('Calibration'),
            e.binary('backlight_mode', ea.STATE_SET, 'ON', 'OFF').withDescription('Backlight'),
            e.enum('motor_steering', ea.STATE_SET, ['FORWARD', 'BACKWARD']).withDescription('Motor Steering'),
            e.binary('child_lock', ea.STATE_SET, 'ON', 'OFF').withDescription('Child Lock'),
        ],
        endpoint: (device) => {
            return {'l1': 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({'OPEN': tuya.enum(0), 'STOP': tuya.enum(1), 'CLOSE': tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'calibration', tuya.valueConverterBasic.lookup({'START': tuya.enum(0), 'END': tuya.enum(1)})],
                [7, 'backlight_mode', tuya.valueConverter.onOff],
                [8, 'motor_steering', tuya.valueConverterBasic.lookup({'FORWARD': tuya.enum(0), 'BACKWARD': tuya.enum(1)})],
                [101, 'state_l1', tuya.valueConverter.onOff],
                [103, 'child_lock', tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [
            tuya.whitelabel('Homeetec', '37022493', 'Curtain/blind switch with 1 Gang switch', ['_TZE200_jhkttplm']),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_5nldle7w'},
        ],
        model: 'TS0601_cover_with_2_switch',
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup({'OPEN': tuya.enum(0), 'STOP': tuya.enum(1), 'CLOSE': tuya.enum(2)})],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'calibration', tuya.valueConverterBasic.lookup({'START': tuya.enum(0), 'END': tuya.enum(1)})],
                [7, 'backlight_mode', tuya.valueConverter.onOff],
                [8, 'motor_steering', tuya.valueConverterBasic.lookup({'FORWARD': tuya.enum(0), 'BACKWARD': tuya.enum(1)})],
                [101, 'state_l2', tuya.valueConverter.onOff],
                [102, 'state_l1', tuya.valueConverter.onOff],
                [103, 'child_lock', tuya.valueConverter.onOff],
            ],
        },
        whiteLabel: [
            tuya.whitelabel('Homeetec', '37022173', 'Curtain/blind switch with 2 Gang switch', ['_TZE200_5nldle7w']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_bcusnqt8'}],
        model: 'SPM01',
        vendor: 'TuYa',
        description: 'Smart energy monitor for 1P+N system',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.voltage(), e.power(), e.current(),
            // Change the description according to the specifications of the device
            e.energy().withDescription('Total forward active energy'),
            e.produced_energy().withDescription('Total reverse active energy'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                [6, null, {
                    from: (v: Buffer) => {
                        return {
                            voltage: v.readUint16BE(0)/10,
                            current: ((v.readUint8(2)<<16)+(v.readUint8(3)<<8)+v.readUint8(4))/1000,
                            power: ((v.readUint8(5)<<16)+(v.readUint8(6)<<8)+v.readUint8(7)),
                        };
                    },
                }],
                [6, 'voltage', tuya.valueConverter.raw],
                [6, 'current', tuya.valueConverter.raw],
                [6, 'power', tuya.valueConverter.raw],
                // [9,'',tuya.valueConverter.raw] // Unknown / datatype=5 (bitmap)
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_ves1ycwx'}, {modelID: 'TS0601', manufacturerName: '_TZE200_ves1ycwx'}],
        model: 'SPM02',
        vendor: 'TuYa',
        description: 'Smart energy monitor for 3P+N system',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.voltageWithPhase('X'), tuya.exposes.voltageWithPhase('Y'), tuya.exposes.voltageWithPhase('Z'),
            tuya.exposes.powerWithPhase('X'), tuya.exposes.powerWithPhase('Y'), tuya.exposes.powerWithPhase('Z'),
            tuya.exposes.currentWithPhase('X'), tuya.exposes.currentWithPhase('Y'), tuya.exposes.currentWithPhase('Z'),
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
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_qhlxve78'}, {modelID: 'TS0601', manufacturerName: '_TZE204_qhlxve78'}],
        model: 'SPM01V2',
        vendor: 'TuYa',
        description: 'Smart energy monitor for 1P+N system',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.voltage(), e.power(), e.current(),
            e.energy().withDescription('Total forward active energy'),
            e.produced_energy().withDescription('Total reverse active energy'),
            e.power_factor().withUnit('%'), e.ac_frequency(),
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
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_v9hkz2yn'}, {modelID: 'TS0601', manufacturerName: '_TZE200_v9hkz2yn'}],
        model: 'SPM02V2',
        vendor: 'TuYa',
        description: 'Smart energy monitor for 3P+N system',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.voltageWithPhase('a'), tuya.exposes.voltageWithPhase('b'), tuya.exposes.voltageWithPhase('c'),
            tuya.exposes.powerWithPhase('a'), tuya.exposes.powerWithPhase('b'), tuya.exposes.powerWithPhase('c'),
            tuya.exposes.currentWithPhase('a'), tuya.exposes.currentWithPhase('b'), tuya.exposes.currentWithPhase('c'),
            e.energy().withDescription('Total forward active energy'),
            e.produced_energy().withDescription('Total reverse active energy'),
            e.power_factor().withUnit('%'), e.power(),
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
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_ac0fhfiq']),
        model: 'TS0601_bidirectional_energy meter',
        vendor: 'TuYa',
        description: 'Bidirectional energy meter with 150A Current Clamp',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.energy(), e.produced_energy(), e.power(), e.voltage(), e.current(),
            e.enum('energy_flow', ea.STATE, ['consuming', 'producing']).withDescription('Direction of energy'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [2, 'produced_energy', tuya.valueConverter.divideBy100],
                [6, null, tuya.valueConverter.phaseVariant3],
                [102, 'energy_flow', tuya.valueConverterBasic.lookup({'consuming': 0, 'producing': 1})],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_vmcgja59'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_dvosyycn'},
        ],
        model: 'TS0601_switch_8',
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1, 'l7': 1, 'l8': 1};
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
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE204_adlblwab'},
        ],
        model: 'TS0601_switch_8_2',
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1, 'l7': 1, 'l8': 1};
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
        vendor: 'TuYa',
        description: '10 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [...Array.from({length: 10}, (_, i) => tuya.exposes.switch().withEndpoint(`l${i + 1}`))],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1, 'l7': 1, 'l8': 1, 'l9': 1, 'l10': 1, 'l11': 1, 'l12': 1};
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
        vendor: 'TuYa',
        description: 'ZXYH 12 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [...Array.from({length: 12}, (_, i) => tuya.exposes.switch().withEndpoint(`l${i + 1}`))],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1, 'l7': 1, 'l8': 1, 'l9': 1, 'l10': 1, 'l11': 1, 'l12': 1};
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
                [0x6A, 'state_l12', tuya.valueConverter.onOff],
            ],
        },
    },

    // TS011F
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_8fdayfch', '_TZ3000_1hwjutgo', '_TZ3000_lnggrqqi', '_TZ3000_tvuarksa']),
        model: 'TS011F_1',
        vendor: 'TuYa',
        description: 'Switch',
        extend: tuya.extend.switch(),
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
        vendor: 'TuYa',
        ota: ota.zigbeeOTA,
        extend: tuya.extend.switch({
            electricalMeasurements: true, powerOutageMemory: true, indicatorMode: true, childLock: true, endpoints: ['l1', 'l2']}),
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['energy', 'current', 'voltage', 'power']},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        onEvent: (type, data, device, options) => tuya.onEventMeasurementPoll(type, data, device, options, true, false),
        whiteLabel: [
            tuya.whitelabel('Nous', 'A4Z', '2 gang outdoor plug', ['_TZ3000_rqbjepe8', '_TZ3000_uwkja6z1']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_cfnprab5', '_TZ3000_o005nuxx']),
        model: 'TS011F_5',
        description: '5 gang switch',
        vendor: 'TuYa',
        extend: tuya.extend.switch({powerOutageMemory: true, childLock: true, endpoints: ['l1', 'l2', 'l3', 'l4', 'l5']}),
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
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
        vendor: 'TuYa',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.linkquality(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        whiteLabel: [
            tuya.whitelabel('Cleverio', 'SS200', 'Motion sensor', ['_TYZB01_z2umiwvq']),
            tuya.whitelabel('Marmitek', 'SM0202_1', 'Motion sensor', ['_TYZB01_yr95mpib']),
            tuya.whitelabel('Sber', 'SBDV-00029', 'Motion sensor', ['_TYZB01_2jzbhomb']),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0001', ['_TZ3210_dse8ogfy', '_TZ3210_j4pdtz9v']),
        model: 'TS0001_fingerbot',
        vendor: 'TuYa',
        description: 'Zigbee fingerbot plus',
        whiteLabel: [
            tuya.whitelabel('Adaprox', 'TS0001_fingerbot_1', 'Zigbee fingerbot plus', ['_TZ3210_dse8ogfy']),
        ],
        fromZigbee: [fz.on_off, tuya.fz.datapoints],
        toZigbee: [tz.on_off, tuya.tz.datapoints],
        exposes: [
            e.switch(), e.battery(),
            e.enum('mode', ea.STATE_SET, ['click', 'switch', 'program']).withDescription('Working mode'),
            e.numeric('lower', ea.STATE_SET).withValueMin(50).withValueMax(100).withValueStep(1).withUnit('%')
                .withDescription('Down movement limit'),
            e.numeric('upper', ea.STATE_SET).withValueMin(0).withValueMax(50).withValueStep(1).withUnit('%')
                .withDescription('Up movement limit'),
            e.numeric('delay', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('s')
                .withDescription('Sustain time'),
            e.binary('reverse', ea.STATE_SET, 'ON', 'OFF').withDescription('Reverse'),
            e.binary('touch', ea.STATE_SET, 'ON', 'OFF').withDescription('Touch controll'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
        meta: {
            tuyaSendCommand: 'sendData',
            tuyaDatapoints: [
                [0x65, 'mode', tuya.valueConverterBasic.lookup({'click': tuya.enum(0), 'switch': tuya.enum(1), 'program': tuya.enum(2)})],
                [0x66, 'lower', tuya.valueConverter.raw],
                [0x67, 'delay', tuya.valueConverter.raw],
                [0x68, 'reverse', tuya.valueConverterBasic.lookup({'ON': tuya.enum(1), 'OFF': tuya.enum(0)})],
                [0x69, 'battery', tuya.valueConverter.raw],
                [0x6a, 'upper', tuya.valueConverter.raw],
                [0x6b, 'touch', tuya.valueConverterBasic.lookup({'ON': true, 'OFF': false})],
                // ? [0x6c, '', tuya.valueConverter.onOff],
                [0x6d, 'program', tuya.valueConverter.raw],
                // ? [0x70, '', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_8eazvzo6']),
        model: 'SWS6TZ-WHITE',
        vendor: 'TuYa',
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
            e.current(), e.power(), e.voltage(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1};
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
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1, 'state': 1, 'backlight': 1};
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
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'state': 1, 'backlight': 1};
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
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'l3': 1, 'state': 1, 'backlight': 1};
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
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'state': 1, 'backlight': 1};
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
        vendor: 'TuYa',
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
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1, 'state': 1, 'backlight': 1, 'l7': 1, 'l8': 1};
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
        vendor: 'TuYa',
        description: 'Smart human presence sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.illuminance_lux(), e.presence(),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1)
                .withDescription('Sensitivity of the radar'),
            e.numeric('minimum_range', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.1)
                .withDescription('Minimum range').withUnit('m'),
            e.numeric('maximum_range', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.1)
                .withDescription('Maximum range').withUnit('m'),
            e.numeric('detection_delay', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.1)
                .withDescription('Detection delay').withUnit('s'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0).withValueMax(1500).withValueStep(1)
                .withDescription('Fading time').withUnit('s'),
            e.enum('radar_scene', ea.STATE_SET, ['default', 'bathroom', 'bedroom', 'sleeping'])
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
                [0x68, 'radar_scene', tuya.valueConverterBasic.lookup({
                    'default': tuya.enum(0),
                    'bathroom': tuya.enum(1),
                    'bedroom': tuya.enum(2),
                    'sleeping': tuya.enum(3),
                })],
                [0x69, 'target_distance', tuya.valueConverter.divideBy100],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_86nbew0j', '_TZE200_io0zdqh1', '_TZE200_drs6j6m5', '_TZE200_ywe90lt0']),
        model: 'TS0601_light',
        vendor: 'TuYa',
        description: 'Light',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [tuya.exposes.lightBrightness()],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
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
        vendor: 'TuYa',
        description: 'Smart siren',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.binary('alarm', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn the light of the alarm ON/OFF'),
            e.enum('type', ea.STATE_SET, ['sound', 'light', 'sound+light', 'normal']).withDescription('Alarm type'),
            e.enum('volume', ea.STATE_SET, ['mute', 'low', 'middle', 'high']).withDescription('Volume of the alarm'),
            e.enum('ringtone', ea.STATE_SET, [
                'melody1', 'melody2', 'melody3', 'melody4', 'melody5', 'melody6', 'melody7', 'melody8',
                'door', 'water', 'temperature', 'entered', 'left',
            ]).withDescription('Ringtone of the alarm'),
            e.enum('power_type', ea.STATE, ['battery', 'cable']).withDescription('Power type'),
            e.numeric('duration', ea.STATE_SET).withValueMin(1).withValueMax(60).withValueStep(1)
                .withUnit('min').withDescription('Duration of the alarm'),
            e.enum('battery_level', ea.STATE, ['low', 'middle', 'high']).withDescription('Battery level state'),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'type', tuya.valueConverterBasic.lookup({
                    'sound': tuya.enum(0), 'light': tuya.enum(1), 'sound+light': tuya.enum(2), 'normal': tuya.enum(3)})],
                [5, 'volume', tuya.valueConverterBasic.lookup({
                    'low': tuya.enum(0), 'middle': tuya.enum(1), 'high': tuya.enum(2), 'mute': tuya.enum(3)})],
                [6, 'power_type', tuya.valueConverterBasic.lookup({'cable': false, 'battery': true})],
                [7, 'duration', tuya.valueConverter.raw],
                [13, 'alarm', tuya.valueConverter.onOff],
                [14, 'battery_level', tuya.valueConverterBasic.lookup({
                    'low': tuya.enum(0), 'middle': tuya.enum(1), 'high': tuya.enum(2)})],
                [15, 'battery', tuya.valueConverter.raw],
                [21, 'ringtone', tuya.valueConverterBasic.lookup({
                    'melody1': tuya.enum(0), 'melody2': tuya.enum(1), 'melody3': tuya.enum(2), 'melody4': tuya.enum(3),
                    'melody5': tuya.enum(4), 'melody6': tuya.enum(5), 'melody7': tuya.enum(6), 'melody8': tuya.enum(7),
                    'door': tuya.enum(8), 'water': tuya.enum(9), 'temperature': tuya.enum(10), 'entered': tuya.enum(11), 'left': tuya.enum(12),
                })],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_vmcgja59']),
        model: 'ZYXH',
        vendor: 'TuYa',
        description: '24 gang switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [...Array.from(Array(24).keys()).map((ep) => tuya.exposes.switch().withEndpoint(`l${ep + 1}`))],
        endpoint: (device) => {
            return {
                'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1, 'l7': 1, 'l8': 1, 'l9': 1, 'l10': 1, 'l11': 1, 'l12': 1,
                'l13': 1, 'l14': 1, 'l15': 1, 'l16': 1, 'l17': 1, 'l18': 1, 'l19': 1, 'l20': 1, 'l21': 1, 'l22': 1, 'l23': 1, 'l24': 1,
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
                [0x6A, 'state_l12', tuya.valueConverter.onOff],
                [0x6B, 'state_l13', tuya.valueConverter.onOff],
                [0x6C, 'state_l14', tuya.valueConverter.onOff],
                [0x6D, 'state_l15', tuya.valueConverter.onOff],
                [0x6E, 'state_l16', tuya.valueConverter.onOff],
                [0x6F, 'state_l17', tuya.valueConverter.onOff],
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
        vendor: 'TuYa',
        description: '24G MmWave radar human presence motion sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.enum('state', ea.STATE, ['none', 'presence', 'move'])
                .withDescription('Presence state sensor'),
            e.presence().withDescription('Occupancy'),
            e.numeric('distance', ea.STATE).withDescription('Target distance'),
            e.illuminance_lux().withDescription('Illuminance sensor'),
            e.numeric('move_sensitivity', ea.STATE_SET).withValueMin(1)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription('Motion sensitivity'),
            e.numeric('presence_sensitivity', ea.STATE_SET).withValueMin(1)
                .withValueMax(10)
                .withValueStep(1)
                .withDescription('Presence sensitivity'),
            e.numeric('radar_range', ea.STATE_SET).withValueMin(1.5)
                .withValueMax(5.5)
                .withValueStep(1)
                .withUnit('m').withDescription('Maximum range'),
            e.numeric('presence_timeout', ea.STATE_SET).withValueMin(1)
                .withValueMax(1500)
                .withValueStep(1)
                .withUnit('s').withDescription('Fade time'),
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
                [105, 'state', tuya.valueConverterBasic.lookup({'none': 0, 'presence': 1, 'move': 2})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_e9ajs4ft']),
        model: 'CTL-R1-TY-Zigbee',
        vendor: 'TuYa',
        description: '24G radar human presence motion sensor.',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.illuminance().withUnit('lx'), e.presence(),
            e.numeric('presence_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(1).withUnit('%')
                .withDescription('Presence sensitivity'),
            e.numeric('detection_range', ea.STATE_SET).withValueMin(1.5).withValueMax(4.5).withValueStep(0.1).withUnit('m')
                .withDescription('Detection range'),
            e.numeric('detection_delay', ea.STATE_SET).withValueMin(1).withValueMax(600).withValueStep(1).withUnit('s')
                .withDescription('Presence detection delay'),
            e.numeric('illuminance_treshold_max', ea.STATE_SET).withValueMin(0).withValueMax(2000).withValueStep(1).withUnit('lx')
                .withDescription('The max illumiance threshold to turn on the light'),
            e.numeric('illuminance_treshold_min', ea.STATE_SET).withValueMin(0).withValueMax(2000).withValueStep(1).withUnit('lx')
                .withDescription('The min illumiance threshold to turn on the light'),
            e.binary('presence_illuminance_switch', ea.STATE_SET, true, false).withDescription(
                `Whether to enable 'light_switch' illumination is between min/max threshold`),
            e.binary('light_switch', ea.STATE, 'ON', 'OFF').withDescription(
                'This state will determine the light on/off based on the lighting threshold and presence sensing'),
            e.binary('light_linkage', ea.STATE_SET, true, false).withDescription('Light linkage'),
            e.enum('detection_method', ea.STATE_SET, ['only_move', 'exist_move']).withDescription(
                `When 'only_move' is used, presence will only be triggered when there is movement`),
            e.enum('indicator_light', ea.STATE_SET, ['presence', 'off', 'on']).withDescription('Controls when the indicator light is turned on'),
            e.binary('identify', ea.STATE_SET, true, false)
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
                [107, 'indicator_light', tuya.valueConverterBasic.lookup({'presence': tuya.enum(0), 'off': tuya.enum(1), 'on': tuya.enum(2)})],
                [108, 'detection_method', tuya.valueConverterBasic.lookup({'only_move': tuya.enum(0), 'exist_move': tuya.enum(1)})],
                [113, 'find_switch', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_sbyx0lm6', '_TZE204_clrdrnya', '_TZE204_dtzziy1e', '_TZE204_iaeejhvf', '_TZE204_mtoaryre',
            '_TZE200_mp902om5']),
        model: 'MTG075-ZB-RL',
        vendor: 'TuYa',
        description: '2.4G/5.8G human presence sensor with relay',
        whiteLabel: [
            tuya.whitelabel('TuYa', 'MTG275-ZB-RL', '2.4G/5.8G MmWave radar human presence motion sensor', ['_TZE204_dtzziy1e']),
        ],
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.presence(), e.illuminance_lux(),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1)
                .withDescription('Detection threshold for the strength of object energy'),
            e.numeric('detection_range', ea.STATE_SET).withValueMin(0).withValueMax(8).withValueStep(0.1).withUnit('m')
                .withDescription('Maximum distance detected by the sensor'),
            e.numeric('shield_range', ea.STATE_SET).withValueMin(0).withValueMax(8).withValueStep(0.1).withUnit('m')
                .withDescription('Nearest distance detected by the sensor'),
            e.numeric('entry_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1)
                .withDescription('Sensitivity threshold triggered for the first time when the target enters the detection range'),
            e.numeric('entry_distance_indentation', ea.STATE_SET).withValueMin(0).withValueMax(8).withValueStep(0.1).withUnit('m')
                .withDescription('Indent the distance inward based on the dectection distance'),
            e.numeric('entry_filter_time', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.1).withUnit('s')
                .withDescription('Sensitivity threshold triggered for the first time when the target enters the detection range '),
            e.numeric('departure_delay', ea.STATE_SET).withValueMin(0).withValueMax(600).withValueStep(1).withUnit('s').
                withDescription('Confirmation time after the target disappears'),
            e.numeric('block_time', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.1).withUnit('s')
                .withDescription('Time for the target to be detected again after switching from manned(occupy) to unmanned(unoccupy) mode'),
            e.binary('breaker_status', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Remotely control the breaker in standard mode'),
            e.enum('breaker_mode', ea.STATE_SET, ['standard', 'local'])
                .withDescription('Breaker mode: standard is remotely controlled, local is automatic'),
            e.numeric('illuminance_threshold', ea.STATE_SET).withValueMin(0).withValueMax(420).withValueStep(0.1).withUnit('lx')
                .withDescription('Illumination threshold for local (automatic) switching mode operation'),
            e.enum('status_indication', ea.STATE_SET, ['OFF', 'ON'])
                .withDescription('Indicator light will flash when human presence is detected'),
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
                [107, 'breaker_mode', tuya.valueConverterBasic.lookup({'standard': tuya.enum(0), 'local': tuya.enum(1)})],
                [108, 'breaker_status', tuya.valueConverterBasic.lookup({'OFF': tuya.enum(0), 'ON': tuya.enum(1)})],
                [109, 'status_indication', tuya.valueConverterBasic.lookup({'OFF': tuya.enum(0), 'ON': tuya.enum(1)})],
                [110, 'illuminance_threshold', tuya.valueConverter.divideBy10],
                [111, 'breaker_polarity', tuya.valueConverterBasic.lookup({'NC': tuya.enum(0), 'NO': tuya.enum(1)})],
                [112, 'block_time', tuya.valueConverter.divideBy10],
                [113, 'parameter_setting_result', tuya.valueConverter.raw],
                [114, 'factory_parameters', tuya.valueConverter.raw],
                [115, 'sensor', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_81yrt3lo']),
        model: 'PJ-1203A',
        vendor: 'TuYa',
        description: 'Bidirectional energy meter with 80A current clamp',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.ac_frequency(), e.voltage(),
            tuya.exposes.powerWithPhase('a'), tuya.exposes.powerWithPhase('b'), tuya.exposes.powerWithPhase('ab'),
            tuya.exposes.currentWithPhase('a'), tuya.exposes.currentWithPhase('b'),
            tuya.exposes.powerFactorWithPhase('a'), tuya.exposes.powerFactorWithPhase('b'),
            tuya.exposes.energyFlowWithPhase('a'), tuya.exposes.energyFlowWithPhase('b'),
            tuya.exposes.energyWithPhase('a'), tuya.exposes.energyWithPhase('b'),
            tuya.exposes.energyProducedWithPhase('a'), tuya.exposes.energyProducedWithPhase('b'),
            e.numeric('update_frequency', ea.STATE).withUnit('s').withDescription('Update frequency'),
        ],
        meta: {
            tuyaDatapoints: [
                [111, 'ac_frequency', tuya.valueConverter.divideBy100],
                [101, 'power_a', tuya.valueConverter.divideBy10],
                [105, 'power_b', tuya.valueConverter.divideBy10],
                [115, 'power_ab', tuya.valueConverter.divideBy10],
                [112, 'voltage', tuya.valueConverter.divideBy10],
                [113, 'current_a', tuya.valueConverter.divideBy1000],
                [114, 'current_b', tuya.valueConverter.divideBy1000],
                [110, 'power_factor_a', tuya.valueConverter.raw],
                [121, 'power_factor_b', tuya.valueConverter.raw],
                [102, 'energy_flow_a', tuya.valueConverterBasic.lookup({'consuming': 0, 'producing': 1})],
                [104, 'energy_flow_b', tuya.valueConverterBasic.lookup({'consuming': 0, 'producing': 1})],
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
        vendor: 'TuYa',
        description: 'Bidirectional energy meter with 80A current clamp',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.ac_frequency(), e.voltage(), e.power(), e.current(), e.energy(), e.energy_produced(),
            tuya.exposes.powerWithPhase('a'), tuya.exposes.powerWithPhase('b'),
            tuya.exposes.currentWithPhase('a'), tuya.exposes.currentWithPhase('b'),
            tuya.exposes.powerFactorWithPhase('a'), tuya.exposes.powerFactorWithPhase('b'),
            tuya.exposes.energyWithPhase('a'), tuya.exposes.energyWithPhase('b'),
            tuya.exposes.energyProducedWithPhase('a'), tuya.exposes.energyProducedWithPhase('b'),
        ],
        meta: {
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
        vendor: 'TuYa',
        description: 'Wall-mount thermostat for 2-pipe fan-coil unit',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('state', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn the thermostat ON/OFF'),
            e.child_lock(),
            e.climate()
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
            tuyaDatapoints:
            [
                [1, 'state', tuya.valueConverter.onOff],
                [2, 'system_mode', tuya.valueConverterBasic.lookup({'cool': tuya.enum(0), 'heat': tuya.enum(1), 'fan_only': tuya.enum(2)})],
                [4, 'eco_mode', tuya.valueConverter.onOff],
                [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [19, 'max_temperature', tuya.valueConverter.divideBy10],
                [24, 'local_temperature', tuya.valueConverter.divideBy10],
                [26, 'min_temperature', tuya.valueConverter.divideBy10],
                [27, 'local_temperature_calibration', tuya.valueConverter.localTemperatureCalibration],
                [28, 'fan_mode', tuya.valueConverterBasic.lookup(
                    {'low': tuya.enum(0), 'medium': tuya.enum(1), 'high': tuya.enum(2), 'auto': tuya.enum(3)})],
                [36, 'valve', tuya.valueConverterBasic.lookup({'OPEN': 0, 'CLOSE': 1})],
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
        vendor: 'TuYa',
        description: '5.8G human presence sensor with relay',
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        exposes: [
            e.presence(), e.illuminance().withUnit('lx'),
            e.numeric('detection_delay', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.1)
                .withDescription('Detection delay').withUnit('s'),
            e.numeric('detection_distance', ea.STATE).withValueMin(0).withValueMax(1000).withValueStep(1)
                .withDescription('Distance of detected person').withUnit('cm'),
            e.numeric('sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1)
                .withDescription('Detection sensitivity'),
            e.numeric('keep_time', ea.STATE_SET).withValueMin(5).withValueMax(3600).withValueStep(1)
                .withDescription('Detection keep time').withUnit('s'),
            e.numeric('minimum_range', ea.STATE_SET).withValueMin(0).withValueMax(1000).withValueStep(50)
                .withDescription('Minimum detection range').withUnit('m'),
            e.numeric('maximum_range', ea.STATE_SET).withValueMin(50).withValueMax(1000).withValueStep(50)
                .withDescription('Maximum detection range').withUnit('m'),
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
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_v1jqz5cy']),
        model: 'BLE-YL01',
        vendor: 'TuYa',
        description: 'Smart WiFi Zigbee chlorine meter',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        // Query every 10 minutes, otherwise values don't update https://github.com/Koenkk/zigbee2mqtt/issues/18704
        onEvent: tuya.onEvent({queryOnDeviceAnnounce: true, queryIntervalSeconds: 10 * 60}),
        configure: tuya.configureMagicPacket,
        exposes: [
            e.numeric('tds', ea.STATE).withUnit('ppm').withDescription('Total Dissolved Solids'),
            e.temperature(), e.battery(),
            e.numeric('ph', ea.STATE).withUnit('pH').withDescription('pH value, if the pH value is lower than 6.5, it means that the water quality ' +
                'is too acidic and has impurities, and it is necessary to add disinfectant water for disinfection'),
            e.numeric('ec', ea.STATE).withUnit('µS/cm').withDescription('Electrical conductivity'),
            e.numeric('orp', ea.STATE).withUnit('mV').withDescription('Oxidation Reduction Potential value. If the ORP value is above 850mv, it ' +
                'means that the disinfectant has been added too much, and it is necessary to add water or change the water for neutralization. ' +
                'If the ORP value is below 487mv, it means that too little disinfectant has been added and the pool needs to be disinfected again'),
            e.numeric('free_chlorine', ea.STATE).withUnit('mg/L').withDescription('Free chlorine value. The water in the swimming pool should ' +
                'be between 6.5-8ph and ORP should be between 487-840mv, and the chlorine value will be displayed normally. Chlorine will not ' +
                'be displayed if either value is out of range'),
            e.numeric('ph_max', ea.STATE_SET).withUnit('pH').withDescription('pH maximal value').withValueMin(0).withValueMax(20),
            e.numeric('ph_min', ea.STATE_SET).withUnit('pH').withDescription('pH minimal value').withValueMin(0).withValueMax(20),
            e.numeric('ec_max', ea.STATE_SET).withUnit('µS/cm').withDescription('Electrical Conductivity maximal value')
                .withValueMin(0).withValueMax(100),
            e.numeric('ec_min', ea.STATE_SET).withUnit('µS/cm').withDescription('Electrical Conductivity minimal value')
                .withValueMin(0).withValueMax(100),
            e.numeric('orp_max', ea.STATE_SET).withUnit('mV').withDescription('Oxidation Reduction Potential maximal value')
                .withValueMin(0).withValueMax(1000),
            e.numeric('orp_min', ea.STATE_SET).withUnit('mV').withDescription('Oxidation Reduction Potential minimal value')
                .withValueMin(0).withValueMax(1000),
            e.numeric('free_chlorine_max', ea.STATE_SET).withUnit('mg/L').withDescription('Free Chlorine maximal value')
                .withValueMin(0).withValueMax(15),
            e.numeric('free_chlorine_min', ea.STATE_SET).withUnit('mg/L').withDescription('Free Chlorine minimal value')
                .withValueMin(0).withValueMax(15),
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
                [102, 'free_chlorine', tuya.valueConverter.raw],
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
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_iuk8kupi']),
        model: 'DCR-RQJ',
        vendor: 'TuYa',
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
        fromZigbee: [tuya.fz.datapoints, fz.battery],
        toZigbee: [],
        exposes: [e.action(['emergency', 'sos']), e.battery_low()],
        meta: {
            tuyaDatapoints: [
                [26, 'action', tuya.valueConverter.static('sos')],
                [29, 'action', tuya.valueConverter.static('emergency')],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_muvkrjr5']),
        model: 'SZR07U',
        vendor: 'TuYa',
        description: '24GHz millimeter wave radar',
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        exposes: [
            e.presence(),
            e.numeric('detection_range', ea.STATE_SET).withValueMin(1.5).withValueMax(6).withValueStep(0.75).withUnit('m')
                .withDescription('Maximum range'),
            e.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(68).withValueMax(90).withValueStep(1)
                .withDescription('Sensitivity of the radar'),
            e.numeric('target_distance', ea.STATE).withValueMin(0).withValueMax(1000).withValueStep(1)
                .withDescription('Distance of detected target').withUnit('cm'),
            e.binary('indicator', ea.STATE_SET, 'ON', 'OFF').withDescription('LED indicator'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(3).withValueMax(1799).withValueStep(1)
                .withDescription('Fading time').withUnit('s'),
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
        vendor: 'TuYa',
        description: '4 gang switch module',
        extend: tuya.extend.switch({switchType: true, indicatorMode: true, endpoints: ['l1', 'l2', 'l3', 'l4']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        whiteLabel: [
            tuya.whitelabel('AVATTO', 'ZWSM16-4-Zigbee', '4 gang switch module', ['_TZ3000_5ajpkyq6']),
        ],
    },
];

export default definitions;
module.exports = definitions;
