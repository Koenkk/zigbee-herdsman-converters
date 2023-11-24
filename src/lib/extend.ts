import * as exposes from './exposes';
import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';
import * as light from './light';
import {Fz, Tz, Extend, ModernExtend} from './types';
import {Enum, Numeric, access} from './exposes';
import {KeyValue} from './types';
import {getFromLookupByValue, isString, getFromLookup} from './utils';
const e = exposes.presets;

const legacyExtend = {
    switch: (options: Extend.options_switch={}): Extend => {
        options = {disablePowerOnBehavior: false, toZigbee: [], fromZigbee: [], exposes: [], ...options};
        const exposes = [e.switch(), ...options.exposes];
        const fromZigbee = [fz.on_off, fz.ignore_basic_report, ...options.fromZigbee];
        const toZigbee = [tz.on_off, ...options.toZigbee];
        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }
        return {exposes, fromZigbee, toZigbee};
    },
    light_onoff_brightness: (options: Extend.options_light_onoff_brightness={}): Extend => {
        options = {
            disableEffect: false, disablePowerOnBehavior: false, disableMoveStep: false, disableTransition: false,
            toZigbee: [], fromZigbee: [], exposes: [], ...options,
        };
        const exposes = [e.light_brightness(), ...(!options.disableEffect ? [e.effect()] : []), ...options.exposes];
        const fromZigbee = [fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report, ...options.fromZigbee];
        const toZigbee = [tz.light_onoff_brightness, tz.ignore_rate, tz.level_config, ...options.toZigbee,
            ...(!options.disableTransition ? [tz.ignore_transition] : []),
            ...(!options.disableEffect ? [tz.effect] : []),
            ...(!options.disableMoveStep ? [tz.light_brightness_move, tz.light_brightness_step] : [])];

        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result: Extend = {exposes, fromZigbee, toZigbee};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            };
        }

        return result;
    },
    light_onoff_brightness_colortemp: (options: Extend.options_light_onoff_brightness_colortemp={}): Extend => {
        options = {
            disableEffect: false, disableColorTempStartup: false, disablePowerOnBehavior: false,
            toZigbee: [], fromZigbee: [], exposes: [], ...options,
        };
        const exposes = [e.light_brightness_colortemp(options.colorTempRange), ...(!options.disableEffect ? [e.effect()] : []),
            ...options.exposes];
        const toZigbee = [tz.light_onoff_brightness, tz.light_colortemp, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_colortemp_move, tz.light_brightness_step, tz.light_colortemp_step, tz.light_colortemp_startup, tz.level_config,
            ...options.toZigbee,
            tz.light_color_options, tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : [])];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report, ...options.fromZigbee];

        if (options.disableColorTempStartup) {
            exposes[0].removeFeature('color_temp_startup');
            toZigbee.splice(toZigbee.indexOf(tz.light_colortemp_startup), 1);
        }

        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result: Extend = {exposes, fromZigbee, toZigbee};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            };
        }

        return result;
    },
    light_onoff_brightness_color: (options: Extend.options_light_onoff_brightness_color={}): Extend => {
        options = {
            disableEffect: false, supportsHueAndSaturation: false, preferHueAndSaturation: false, disablePowerOnBehavior: false,
            toZigbee: [], fromZigbee: [], exposes: [], ...options,
        };
        const exposes = [(options.supportsHueAndSaturation ? e.light_brightness_color(options.preferHueAndSaturation) : e.light_brightness_colorxy()),
            ...(!options.disableEffect ? [e.effect()] : []), ...options.exposes];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report, ...options.fromZigbee];
        const toZigbee = [tz.light_onoff_brightness, tz.light_color, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_brightness_step, tz.level_config, tz.light_hue_saturation_move, ...options.toZigbee,
            tz.light_hue_saturation_step, tz.light_color_options, tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : [])];
        const meta = {supportsHueAndSaturation: options.supportsHueAndSaturation};

        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result: Extend = {exposes, fromZigbee, toZigbee, meta};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, false);
            };
        }

        return result;
    },
    light_onoff_brightness_colortemp_color: (options: Extend.options_light_onoff_brightness_colortemp_color={}): Extend => {
        options = {
            disableEffect: false, supportsHueAndSaturation: false, disableColorTempStartup: false, preferHueAndSaturation: false,
            disablePowerOnBehavior: false, toZigbee: [], fromZigbee: [], exposes: [], ...options,
        };
        const exposes = [
            (options.supportsHueAndSaturation ? e.light_brightness_colortemp_color(options.colorTempRange, options.preferHueAndSaturation) :
                e.light_brightness_colortemp_colorxy(options.colorTempRange)), ...(!options.disableEffect ? [e.effect()] : []),
            ...options.exposes,
        ];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report, ...options.fromZigbee];
        const toZigbee = [
            tz.light_onoff_brightness, tz.light_color_colortemp, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_colortemp_move, tz.light_brightness_step, tz.light_colortemp_step, tz.light_hue_saturation_move,
            tz.light_hue_saturation_step, tz.light_colortemp_startup, tz.level_config, tz.light_color_options,
            tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : []), ...options.toZigbee];
        const meta = {supportsHueAndSaturation: options.supportsHueAndSaturation};

        if (options.disableColorTempStartup) {
            exposes[0].removeFeature('color_temp_startup');
            toZigbee.splice(toZigbee.indexOf(tz.light_colortemp_startup), 1);
        }

        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result: Extend = {exposes, fromZigbee, toZigbee, meta};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            };
        }

        return result;
    },
};

const modernExtend = {
    enumLookup: (args: {
        name: string, lookup: KeyValue, cluster: string | number, attribute: string | {id: number, type: number}, description: string,
        zigbeeCommandOptions?: {manufacturerCode: number}, readOnly?: boolean,
    }): ModernExtend => {
        const {name, lookup, cluster, attribute, description, zigbeeCommandOptions} = args;
        const attributeKey = isString(attribute) ? attribute : attribute.id;
        const expose = new Enum(name, args.readOnly ? access.STATE_GET : access.ALL, Object.keys(lookup)).withDescription(description);
        const fromZigbee: Fz.Converter[] = [{
            cluster: cluster.toString(),
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data) {
                    return {[expose.property]: getFromLookupByValue(lookup, msg.data[attributeKey])};
                }
            },
        }];
        const toZigbee: Tz.Converter[] = [{
            key: [name],
            convertSet: args.readOnly ? undefined : async (entity, key, value, meta) => {
                const payloadValue = getFromLookup(value, lookup);
                const payload = isString(attribute) ? {[attribute]: payloadValue} : {[attribute.id]: {value: payloadValue, type: attribute.type}};
                await entity.write(cluster, payload, zigbeeCommandOptions);
                return {state: {[key]: value}};
            },
            convertGet: async (entity, key, meta) => {
                // @ts-expect-error TODO fix zh type
                await entity.read(cluster, [attributeKey], zigbeeCommandOptions);
            },
        }];
        return {exposes: [expose], fromZigbee, toZigbee, isModernExtend: true};
    },
    numeric: (args: {
        name: string, cluster: string | number, attribute: string | {id: number, type: number}, description: string,
        zigbeeCommandOptions?: {manufacturerCode: number}, readOnly?: boolean, unit?: string,
    }): ModernExtend => {
        const {name, cluster, attribute, description, zigbeeCommandOptions} = args;
        const attributeKey = isString(attribute) ? attribute : attribute.id;

        let expose = new Numeric(name, args.readOnly ? access.STATE_GET : access.ALL).withDescription(description);
        if (args.unit) expose = expose.withUnit(args.unit);

        const fromZigbee: Fz.Converter[] = [{
            cluster: cluster.toString(),
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data) {
                    return {[expose.property]: msg.data[attributeKey]};
                }
            },
        }];

        const toZigbee: Tz.Converter[] = [{
            key: [name],
            convertSet: args.readOnly ? undefined : async (entity, key, value, meta) => {
                const payload = isString(attribute) ? {[attribute]: value} : {[attribute.id]: {value, type: attribute.type}};
                await entity.write(cluster, payload, zigbeeCommandOptions);
                return {state: {[key]: value}};
            },
            convertGet: async (entity, key, meta) => {
                // @ts-expect-error TODO fix zh type
                await entity.read(cluster, [attributeKey], zigbeeCommandOptions);
            },
        }];
        return {exposes: [expose], fromZigbee, toZigbee, isModernExtend: true};
    },
};

const extend = {...legacyExtend, ...modernExtend};

export default extend;
module.exports = extend;
