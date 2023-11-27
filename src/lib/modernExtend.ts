import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';
import {Fz, Tz, ModernExtend, Range} from './types';
import {Enum, Numeric, access, Light, Binary, presets as exposePresets} from './exposes';
import {KeyValue, Configure, Expose, DefinitionMeta} from './types';
import {configure as lightConfigure} from './light';
import {getFromLookupByValue, isString, getFromLookup, getEndpointName, assertNumber, postfixWithEndpointName, isObject} from './utils';

interface SwitchArgs {powerOnBehavior?: boolean}
function switch_(args?: SwitchArgs): ModernExtend {
    args = {powerOnBehavior: true, ...args};

    const exposes: Expose[] = [exposePresets.switch()];
    const fromZigbee: Fz.Converter[] = [fz.on_off, fz.ignore_basic_report];
    const toZigbee: Tz.Converter[] = [tz.on_off];

    if (args.powerOnBehavior) {
        exposes.push(exposePresets.power_on_behavior(['off', 'on', 'toggle', 'previous']));
        fromZigbee.push(fz.power_on_behavior);
        toZigbee.push(tz.power_on_behavior);
    }

    return {exposes, fromZigbee, toZigbee, isModernExtend: true};
}
export {switch_ as switch};

interface LightArgs {
    effect?: boolean, powerOnBehaviour?: boolean, colorTemp?: {startup?: boolean, range: Range},
    color?: boolean | {modes: ('xy' | 'hs')[]}
}
export function light(args?: LightArgs): ModernExtend {
    args = {effect: true, powerOnBehaviour: true, ...args};
    if (args.colorTemp) {
        args.colorTemp = {startup: true, ...args.colorTemp};
    }
    const argsColor = args.color ? false : {modes: ['xy'] satisfies ('xy' | 'hs')[], ...(isObject(args.color) ? args.color : {})};

    let lightExpose = new Light().withBrightness();

    const fromZigbee: Fz.Converter[] = [fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config];
    const toZigbee: Tz.Converter[] = [
        tz.light_onoff_brightness, tz.ignore_transition, tz.level_config, tz.ignore_rate, tz.light_brightness_move, tz.light_brightness_step,
    ];
    const meta: DefinitionMeta = {};

    if (args.colorTemp || argsColor) {
        fromZigbee.push(fz.color_colortemp);
        toZigbee.push(tz.light_color_colortemp, tz.light_color_mode, tz.light_color_options);
    }

    if (args.colorTemp) {
        lightExpose = lightExpose.withColorTemp(args.colorTemp.range);
        toZigbee.push(tz.light_colortemp_move, tz.light_colortemp_step);
        if (args.colorTemp.startup) {
            toZigbee.push(tz.light_colortemp_startup);
            lightExpose = lightExpose.withColorTempStartup(args.colorTemp.range);
        }
    }

    if (argsColor) {
        lightExpose = lightExpose.withColor(argsColor.modes);
        toZigbee.push(tz.light_hue_saturation_move, tz.light_hue_saturation_step);
        if (argsColor.modes.includes('hs')) {
            meta.supportsHueAndSaturation = true;
        }
    }

    const exposes: Expose[] = [lightExpose];

    if (args.effect) {
        exposes.push(exposePresets.effect());
        toZigbee.push(tz.effect);
    }

    if (args.powerOnBehaviour) {
        exposes.push(exposePresets.power_on_behavior(['off', 'on', 'toggle', 'previous']));
        fromZigbee.push(fz.power_on_behavior);
        toZigbee.push(tz.power_on_behavior);
    }

    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        await lightConfigure(device, coordinatorEndpoint, logger, true);
    };

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

interface EnumLookupArgs {
    name: string, lookup: KeyValue, cluster: string | number, attribute: string | {id: number, type: number}, description: string,
    zigbeeCommandOptions?: {manufacturerCode: number}, readOnly?: boolean, endpoint?: string,
}
export function enumLookup(args: EnumLookupArgs): ModernExtend {
    const {name, lookup, cluster, attribute, description, zigbeeCommandOptions, endpoint, readOnly} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.id;

    let expose = new Enum(name, readOnly ? access.STATE_GET : access.ALL, Object.keys(lookup)).withDescription(description);
    if (endpoint) expose = expose.withEndpoint(endpoint);

    const fromZigbee: Fz.Converter[] = [{
        cluster: cluster.toString(),
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (attributeKey in msg.data && (!endpoint || getEndpointName(msg, model, meta) === endpoint)) {
                return {[expose.property]: getFromLookupByValue(msg.data[attributeKey], lookup)};
            }
        },
    }];

    const toZigbee: Tz.Converter[] = [{
        key: [name],
        convertSet: readOnly ? undefined : async (entity, key, value, meta) => {
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
}

interface NumericArgs {
    name: string, cluster: string | number, attribute: string | {id: number, type: number}, description: string,
    zigbeeCommandOptions?: {manufacturerCode: number}, readOnly?: boolean, unit?: string, endpoint?: string,
    valueMin?: number, valueMax?: number, valueStep?: number, scale?: number,
}
export function numeric(args: NumericArgs): ModernExtend {
    const {name, cluster, attribute, description, zigbeeCommandOptions, unit, readOnly, valueMax, valueMin, valueStep, endpoint, scale} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.id;

    let expose = new Numeric(name, readOnly ? access.STATE_GET : access.ALL).withDescription(description);
    if (endpoint) expose = expose.withEndpoint(endpoint);
    if (unit) expose = expose.withUnit(unit);
    if (valueMin !== undefined) expose = expose.withValueMin(valueMin);
    if (valueMax !== undefined) expose = expose.withValueMax(valueMax);
    if (valueStep !== undefined) expose = expose.withValueStep(valueStep);

    const fromZigbee: Fz.Converter[] = [{
        cluster: cluster.toString(),
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (attributeKey in msg.data && (!endpoint || getEndpointName(msg, model, meta) === endpoint)) {
                let value = msg.data[attributeKey];
                assertNumber(value);
                if (scale !== undefined) value = value / scale;
                return {[expose.property]: value};
            }
        },
    }];

    const toZigbee: Tz.Converter[] = [{
        key: [name],
        convertSet: readOnly ? undefined : async (entity, key, value, meta) => {
            assertNumber(value, key);
            const payloadValue = scale === undefined ? value : value * scale;
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
}

interface BinaryArgs {
    name: string, valueOn: [string | boolean, unknown], valueOff: [string | boolean, unknown], cluster: string | number,
    attribute: string | {id: number, type: number}, description: string, zigbeeCommandOptions?: {manufacturerCode: number},
    readOnly?: boolean, endpoint?: string,
}
export function binary(args: BinaryArgs): ModernExtend {
    const {name, valueOn, valueOff, cluster, attribute, description, zigbeeCommandOptions, readOnly, endpoint} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.id;

    let expose = new Binary(name, readOnly ? access.STATE_GET : access.ALL, valueOn[0], valueOff[0]).withDescription(description);
    if (endpoint) expose = expose.withEndpoint(endpoint);

    const fromZigbee: Fz.Converter[] = [{
        cluster: cluster.toString(),
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (attributeKey in msg.data && (!endpoint || getEndpointName(msg, model, meta) === endpoint)) {
                return {[expose.property]: msg.data[attributeKey] === valueOn[1] ? valueOn[0] : valueOff[0]};
            }
        },
    }];

    const toZigbee: Tz.Converter[] = [{
        key: [name],
        convertSet: readOnly ? undefined : async (entity, key, value, meta) => {
            const payloadValue = value === valueOn[0] ? valueOn[1] : valueOff[1];
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
}

interface ActionEnumLookupArgs {
    lookup: KeyValue, cluster: string | number, attribute: string | {id: number, type: number}, postfixWithEndpointName: boolean,
}
export function actionEnumLookup(args: ActionEnumLookupArgs): ModernExtend {
    const {lookup, attribute, cluster} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.id;

    const expose = new Enum('action', access.STATE, Object.keys(lookup)).withDescription('Triggered action (e.g. a button click)');

    const fromZigbee: Fz.Converter[] = [{
        cluster: cluster.toString(),
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (attributeKey in msg.data) {
                let value = getFromLookupByValue(msg.data[attributeKey], lookup);
                if (args.postfixWithEndpointName) value = postfixWithEndpointName(value, msg, model, meta);
                return {[expose.property]: value};
            }
        },
    }];

    return {exposes: [expose], fromZigbee, isModernExtend: true};
}
