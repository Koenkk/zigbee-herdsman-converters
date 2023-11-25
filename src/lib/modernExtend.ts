import * as exposes from './exposes';
import legacyExtend from './extend';
import {Fz, Tz, ModernExtend, Range} from './types';
import {Enum, Numeric, access} from './exposes';
import {KeyValue} from './types';
import {getFromLookupByValue, isString, getFromLookup, getEndpointName, assertNumber, postfixWithEndpointName} from './utils';

const extend = {
    lightBrightnessColortempColor: (args: {
        disableEffect?: boolean, supportsHueAndSaturation?: boolean, disableColorTempStartup?: boolean, preferHueAndSaturation?: boolean,
        disablePowerOnBehavior?: boolean, colorTempRange?: Range,
    }): ModernExtend => {
        args = {
            disableEffect: false, supportsHueAndSaturation: false, disableColorTempStartup: false, preferHueAndSaturation: false,
            disablePowerOnBehavior: false, ...args,
        };
        const result = legacyExtend.light_onoff_brightness_colortemp_color(args);
        return {...result, isModernExtend: true};
    },
    enumLookup: (args: {
        name: string, lookup: KeyValue, cluster: string | number, attribute: string | {id: number, type: number}, description: string,
        zigbeeCommandOptions?: {manufacturerCode: number}, readOnly?: boolean, endpoint?: string,
    }): ModernExtend => {
        const {name, lookup, cluster, attribute, description, zigbeeCommandOptions, endpoint, readOnly} = args;
        const attributeKey = isString(attribute) ? attribute : attribute.id;

        let expose = new Enum(name, readOnly ? access.STATE_GET : access.ALL, Object.keys(lookup)).withDescription(description);
        if (endpoint) expose = expose.withEndpoint(endpoint);

        const fromZigbee: Fz.Converter[] = [{
            cluster: cluster.toString(),
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data && (!endpoint || getEndpointName(msg, model, meta) === endpoint)) {
                    return {[expose.property]: getFromLookupByValue(lookup, msg.data[attributeKey])};
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
    },
    numeric: (args: {
        name: string, cluster: string | number, attribute: string | {id: number, type: number}, description: string,
        zigbeeCommandOptions?: {manufacturerCode: number}, readOnly?: boolean, unit?: string, endpoint?: string,
        valueMin?: number, valueMax?: number, valueStep?: number, scale?: number,
    }): ModernExtend => {
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
                    return {[expose.property]: msg.data[attributeKey]};
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
    },
    binary: (args: {
        name: string, valueOn: [string | boolean, unknown], valueOff: [string | boolean, unknown], cluster: string | number,
        attribute: string | {id: number, type: number}, description: string, zigbeeCommandOptions?: {manufacturerCode: number},
        readOnly?: boolean, endpoint?: string,
    }): ModernExtend => {
        const {name, valueOn, valueOff, cluster, attribute, description, zigbeeCommandOptions, readOnly, endpoint} = args;
        const attributeKey = isString(attribute) ? attribute : attribute.id;

        let expose = new exposes.Binary(name, readOnly ? access.STATE_GET : access.ALL, valueOn[0], valueOff[0]).withDescription(description);
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
    },
    actionEnumLookup: (args: {
        lookup: KeyValue, cluster: string | number, attribute: string | {id: number, type: number}, postfixWithEndpointName: boolean,
    }): ModernExtend => {
        const {lookup, attribute, cluster} = args;
        const attributeKey = isString(attribute) ? attribute : attribute.id;

        const expose = new Enum('action', access.STATE, Object.keys(lookup)).withDescription('Triggered action (e.g. a button click)');

        const fromZigbee: Fz.Converter[] = [{
            cluster: cluster.toString(),
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data) {
                    let value = getFromLookupByValue(lookup, msg.data[attributeKey]);
                    if (args.postfixWithEndpointName) value = postfixWithEndpointName(value, msg, model, meta);
                    return {[expose.property]: value};
                }
            },
        }];

        return {exposes: [expose], fromZigbee, isModernExtend: true};
    },
};

export default extend;
