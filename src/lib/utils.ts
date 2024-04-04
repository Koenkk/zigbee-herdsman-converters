import * as globalStore from './store';
import {Zcl} from 'zigbee-herdsman';
import {Definition, Expose, Fz, KeyValue, KeyValueAny, Publish, Tz, Zh} from './types';
import {Feature, Light, Numeric} from './exposes';
import {logger} from './logger';

const NS = 'zhc:utils';

export function isLegacyEnabled(options: KeyValue) {
    return !options.hasOwnProperty('legacy') || options.legacy;
}

export function precisionRound(number: number, precision: number): number {
    if (typeof precision === 'number') {
        const factor = Math.pow(10, precision);
        return Math.round(number * factor) / factor;
    } else if (typeof precision === 'object') {
        const thresholds = Object.keys(precision).map(Number).sort((a, b) => b - a);
        for (const t of thresholds) {
            if (! isNaN(t) && number >= t) {
                return precisionRound(number, precision[t]);
            }
        }
    }
    return number;
}

export function toLocalISOString(dDate: Date) {
    const tzOffset = -dDate.getTimezoneOffset();
    const plusOrMinus = tzOffset >= 0 ? '+' : '-';
    const pad = function(num: number) {
        const norm = Math.floor(Math.abs(num));
        return (norm < 10 ? '0' : '') + norm;
    };

    return dDate.getFullYear() +
        '-' + pad(dDate.getMonth() + 1) +
        '-' + pad(dDate.getDate()) +
        'T' + pad(dDate.getHours()) +
        ':' + pad(dDate.getMinutes()) +
        ':' + pad(dDate.getSeconds()) +
        plusOrMinus + pad(tzOffset / 60) +
        ':' + pad(tzOffset % 60);
}

export function numberWithinRange(number: number, min: number, max: number) {
    if (number > max) {
        return max;
    } else if (number < min) {
        return min;
    } else {
        return number;
    }
}

/**
 * Maps number from one range to another. In other words it performs a linear interpolation.
 * Note that this function can interpolate values outside source range (linear extrapolation).
 * @param value - value to map
 * @param fromLow - source range lower value
 * @param fromHigh - source range upper value
 * @param toLow - target range lower value
 * @param toHigh - target range upper value
 * @param number - of decimal places to which result should be rounded
 * @returns value mapped to new range
 */
export function mapNumberRange(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number, precision=0): number {
    const mappedValue = toLow + (value - fromLow) * (toHigh - toLow) / (fromHigh - fromLow);
    return precisionRound(mappedValue, precision);
}

const transactionStore: {[s: string]: number[]} = {};
export function hasAlreadyProcessedMessage(msg: Fz.Message, model: Definition, ID: number=null, key: string=null) {
    if (model.meta && model.meta.publishDuplicateTransaction) return false;
    const currentID = ID !== null ? ID : msg.meta.zclTransactionSequenceNumber;
    key = key || msg.device.ieeeAddr;
    if (transactionStore[key]?.includes(currentID)) return true;
    // Keep last 5, as they might come in different order: https://github.com/Koenkk/zigbee2mqtt/issues/20024
    transactionStore[key] = [currentID, ...(transactionStore[key] ?? [])].slice(0, 5);
    return false;
}

export const calibrateAndPrecisionRoundOptionsDefaultPrecision: KeyValue = {
    temperature: 2, humidity: 2, pressure: 1, pm25: 0, power: 2, current: 2, current_phase_b: 2, current_phase_c: 2,
    voltage: 2, voltage_phase_b: 2, voltage_phase_c: 2, power_phase_b: 2, power_phase_c: 2, energy: 2, device_temperature: 0,
    soil_moisture: 2, co2: 0, illuminance: 0, illuminance_lux: 0, voc: 0, formaldehyd: 0, co: 0,
};
export function calibrateAndPrecisionRoundOptionsIsPercentual(type: string) {
    return type.startsWith('current') || type.startsWith('energy') || type.startsWith('voltage') || type.startsWith('power') ||
        type.startsWith('illuminance');
}
export function calibrateAndPrecisionRoundOptions(number: number, options: KeyValue, type: string) {
    // Calibrate
    const calibrateKey = `${type}_calibration`;
    let calibrationOffset = toNumber(
        options && options.hasOwnProperty(calibrateKey) ? options[calibrateKey] : 0, calibrateKey);
    if (calibrateAndPrecisionRoundOptionsIsPercentual(type)) {
        // linear calibration because measured value is zero based
        // +/- percent
        calibrationOffset = number * calibrationOffset / 100;
    }
    number = number + calibrationOffset;

    // Precision round
    const precisionKey = `${type}_precision`;
    const defaultValue = calibrateAndPrecisionRoundOptionsDefaultPrecision[type] || 0;
    const precision = toNumber(
        options && options.hasOwnProperty(precisionKey) ? options[precisionKey] : defaultValue, precisionKey);
    return precisionRound(number, precision);
}

export function toPercentage(value: number, min: number, max: number, log=false) {
    if (value > max) {
        value = max;
    } else if (value < min) {
        value = min;
    }

    const normalised = (value - min) / (max - min);
    return Math.round(normalised * 100);
}

export function addActionGroup(payload: KeyValue, msg: Fz.Message, definition: Definition) {
    const disableActionGroup = definition.meta && definition.meta.disableActionGroup;
    if (!disableActionGroup && msg.groupID) {
        payload.action_group = msg.groupID;
    }
}

export function getEndpointName(msg: Fz.Message, definition: Definition, meta: Fz.Meta) {
    if (!definition.endpoint) {
        throw new Error(`Definition '${definition.model}' has not endpoint defined`);
    }
    return getKey(definition.endpoint(meta.device), msg.endpoint.ID);
}

export function postfixWithEndpointName(value: string, msg: Fz.Message, definition: Definition, meta: Fz.Meta) {
    // Prevent breaking change https://github.com/Koenkk/zigbee2mqtt/issues/13451
    if (!meta) {
        logger.warning(`No meta passed to postfixWithEndpointName, update your external converter!`, NS);
        // @ts-expect-error
        meta = {device: null};
    }

    if (definition.meta && definition.meta.multiEndpoint &&
            (!definition.meta.multiEndpointSkip || !definition.meta.multiEndpointSkip.includes(value))) {
        const endpointName = definition.hasOwnProperty('endpoint') ?
            getKey(definition.endpoint(meta.device), msg.endpoint.ID) : msg.endpoint.ID;

        // NOTE: endpointName can be undefined if we have a definition.endpoint and the endpoint is
        //       not listed.
        if (endpointName) return `${value}_${endpointName}`;
    }
    return value;
}

export function enforceEndpoint(entity: Zh.Endpoint, key: string, meta: Tz.Meta) {
    const multiEndpointEnforce = getMetaValue(entity, meta.mapped, 'multiEndpointEnforce', 'allEqual', []);
    if (multiEndpointEnforce && multiEndpointEnforce.hasOwnProperty(key)) {
        // @ts-expect-error
        const endpoint = entity.getDevice().getEndpoint(multiEndpointEnforce[key]);
        if (endpoint) return endpoint;
    }
    return entity;
}

export function getKey<T>(object: {[s: string]: T} | {[s: number]: T}, value: T, fallback?: T, convertTo?: (v: unknown) => T) {
    for (const key in object) {
        // @ts-expect-error
        if (object[key]===value) {
            return convertTo ? convertTo(key) : key;
        }
    }

    return fallback;
}

export function batteryVoltageToPercentage(voltage: number, option: string | {min: number, max: number}) {
    let percentage = null;
    if (option === '3V_2100') {
        if (voltage < 2100) {
            percentage = 0;
        } else if (voltage < 2440) {
            percentage = 6 - ((2440 - voltage) * 6) / 340;
        } else if (voltage < 2740) {
            percentage = 18 - ((2740 - voltage) * 12) / 300;
        } else if (voltage < 2900) {
            percentage = 42 - ((2900 - voltage) * 24) / 160;
        } else if (voltage < 3000) {
            percentage = 100 - ((3000 - voltage) * 58) / 100;
        } else if (voltage >= 3000) {
            percentage = 100;
        }
        percentage = Math.round(percentage);
    } else if (option === '3V_2500') {
        percentage = toPercentage(voltage, 2500, 3000);
    } else if (option === '3V_2500_3200') {
        percentage = toPercentage(voltage, 2500, 3200);
    } else if (option === '3V_1500_2800') {
        percentage = 235 - 370000 / (voltage + 1);
        if (percentage > 100) {
            percentage = 100;
        } else if (percentage < 0) {
            percentage = 0;
        }
        percentage = Math.round(percentage);
    } else if (option === '3V_2850_3000') {
        percentage = toPercentage(voltage, 2850, 3000);
    } else if (option === '4LR6AA1_5v') {
        percentage = toPercentage(voltage, 3000, 4200);
    } else if (option === '3V_add 1V') {
        voltage = voltage + 1000;
        percentage = toPercentage(voltage, 3200, 4200);
    } else if (option === 'Add_1V_42V_CSM300z2v2') {
        voltage = voltage + 1000;
        percentage = toPercentage(voltage, 2900, 4100);
    // Generic converter that expects an option object with min and max values
    // I.E. meta: {battery: {voltageToPercentage: {min: 1900, max: 3000}}}
    } else if (typeof option === 'object') {
        percentage = toPercentage(voltage, option.min, option.max);
    } else {
        throw new Error(`Not batteryVoltageToPercentage type supported: ${option}`);
    }

    return percentage;
}

// groupStrategy: allEqual: return only if all members in the groups have the same meta property value.
//                first: return the first property
export function getMetaValue<T>(entity: Zh.Group | Zh.Endpoint, definition: Definition | Definition[], key: string,
    groupStrategy='first', defaultValue: T=undefined): T {
    if (isGroup(entity) && entity.members.length > 0) {
        const values = [];
        for (let i = 0; i < entity.members.length; i++) {
            // @ts-expect-error
            const memberMetaMeta = getMetaValues(definition[i], entity.members[i]);
            if (memberMetaMeta && memberMetaMeta.hasOwnProperty(key)) {
                if (groupStrategy === 'first') {
                    // @ts-expect-error
                    return memberMetaMeta[key];
                }

                values.push(memberMetaMeta[key]);
            } else {
                values.push(defaultValue);
            }
        }

        if (groupStrategy === 'allEqual' && (new Set(values)).size === 1) {
            // @ts-expect-error
            return values[0];
        }
    } else {
        const definitionMeta = getMetaValues(definition, entity);
        if (definitionMeta && definitionMeta.hasOwnProperty(key)) {
            // @ts-expect-error
            return definitionMeta[key];
        }
    }

    return defaultValue;
}

export function hasEndpoints(device: Zh.Device, endpoints: number[]) {
    const eps = device.endpoints.map((e) => e.ID);
    for (const endpoint of endpoints) {
        if (!eps.includes(endpoint)) {
            return false;
        }
    }
    return true;
}

export function isInRange(min: number, max: number, value: number) {
    return value >= min && value <= max;
}

export function replaceInArray<T>(arr: T[], oldElements: T[], newElements: T[], errorIfNotInArray=true) {
    const clone = [...arr];
    for (let i = 0; i < oldElements.length; i++) {
        const index = clone.indexOf(oldElements[i]);

        if (index !== -1) {
            clone[index] = newElements[i];
        } else {
            if (errorIfNotInArray) {
                throw new Error('Element not in array');
            }
        }
    }

    return clone;
}

export function filterObject(obj: KeyValue, keys: string[]) {
    const result: KeyValue = {};
    for (const [key, value] of Object.entries(obj)) {
        if (keys.includes(key)) {
            result[key] = value;
        }
    }
    return result;
}

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toSnakeCase(value: string | KeyValueAny) {
    if (typeof value === 'object') {
        for (const key of Object.keys(value)) {
            const keySnakeCase = toSnakeCase(key);
            if (key !== keySnakeCase) {
                // @ts-expect-error
                value[keySnakeCase] = value[key];
                delete value[key];
            }
        }
        return value;
    } else {
        return value.replace(/\.?([A-Z])/g, (x, y) => '_' + y.toLowerCase()).replace(/^_/, '').replace('_i_d', '_id');
    }
}

export function toCamelCase(value: KeyValueAny | string) {
    if (typeof value === 'object') {
        for (const key of Object.keys(value)) {
            const keyCamelCase = toCamelCase(key);
            if (key !== keyCamelCase) {
                // @ts-expect-error
                value[keyCamelCase] = value[key];
                delete value[key];
            }
        }
        return value;
    } else {
        return value.replace(/_([a-z])/g, (x, y) => y.toUpperCase());
    }
}

export function getLabelFromName(name: string) {
    const label = name.replace(/_/g, ' ');
    return label[0].toUpperCase() + label.slice(1);
}

export function saveSceneState(entity: Zh.Endpoint, sceneID: number, groupID: number, state: KeyValue, name: string) {
    const attributes = ['state', 'brightness', 'color', 'color_temp', 'color_mode'];
    if (!entity.meta.hasOwnProperty('scenes')) entity.meta.scenes = {};
    const metaKey = `${sceneID}_${groupID}`;
    entity.meta.scenes[metaKey] = {name, state: filterObject(state, attributes)};
    entity.save();
}

export function deleteSceneState(entity: Zh.Endpoint, sceneID: number=null, groupID: number=null) {
    if (entity.meta.scenes) {
        if (sceneID == null && groupID == null) {
            entity.meta.scenes = {};
        } else {
            const metaKey = `${sceneID}_${groupID}`;
            if (entity.meta.scenes.hasOwnProperty(metaKey)) {
                delete entity.meta.scenes[metaKey];
            }
        }
        entity.save();
    }
}

export function getSceneState(entity: Zh.Group | Zh.Endpoint, sceneID: number, groupID: number) {
    const metaKey = `${sceneID}_${groupID}`;
    if (entity.meta.hasOwnProperty('scenes') && entity.meta.scenes.hasOwnProperty(metaKey)) {
        return entity.meta.scenes[metaKey].state;
    }

    return null;
}

export function getEntityOrFirstGroupMember(entity: Zh.Group | Zh.Endpoint) {
    if (isGroup(entity)) {
        return entity.members.length > 0 ? entity.members[0] : null;
    } else {
        return entity;
    }
}

export function getTransition(entity: Zh.Endpoint | Zh.Group, key: string, meta: Tz.Meta) {
    const {options, message} = meta;

    let manufacturerIDs: number[] = [];
    if (isGroup(entity)) {
        manufacturerIDs = entity.members.map((m) => m.getDevice().manufacturerID);
    } else if (isEndpoint(entity)) {
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
        const time = toNumber(message.transition, 'transition');
        return {time: time * 10, specified: true};
    } else if (options.hasOwnProperty('transition') && options.transition !== '') {
        const transition = toNumber(options.transition, 'transition');
        return {time: transition * 10, specified: true};
    } else {
        return {time: 0, specified: false};
    }
}

export function getOptions(definition: Definition | Definition[], entity: Zh.Endpoint | Zh.Group, options={}) {
    const allowed = ['disableDefaultResponse', 'timeout'];
    return getMetaValues(definition, entity, allowed, options);
}

export function getMetaValues(definitions: Definition | Definition[], entity: Zh.Endpoint | Zh.Group, allowed?: string[], options={}) {
    const result: KeyValue = {...options};
    for (const definition of Array.isArray(definitions) ? definitions : [definitions]) {
        if (definition && definition.meta) {
            for (const key of Object.keys(definition.meta)) {
                if (allowed == null || allowed.includes(key)) {
                    // @ts-expect-error
                    const value = definition.meta[key];
                    if (typeof value === 'function') {
                        if (isEndpoint(entity)) {
                            result[key] = value(entity);
                        }
                    } else {
                        result[key] = value;
                    }
                }
            }
        }
    }
    return result;
}

export function getObjectProperty(object: KeyValue, key: string, defaultValue: unknown) {
    return object && object.hasOwnProperty(key) ? object[key] : defaultValue;
}

export function validateValue(value: unknown, allowed: unknown[]) {
    if (!allowed.includes(value)) {
        throw new Error(`'${value}' not allowed, choose between: ${allowed}`);
    }
}

export async function getClusterAttributeValue<T>(endpoint: Zh.Endpoint, cluster: string, attribute: string, fallback: T = undefined): Promise<T> {
    try {
        if (endpoint.getClusterAttributeValue(cluster, attribute) == null) {
            await endpoint.read(cluster, [attribute]);
        }
        return endpoint.getClusterAttributeValue(cluster, attribute) as T;
    } catch (error) {
        if (fallback !== undefined) return fallback;
        throw error;
    }
}

export function normalizeCelsiusVersionOfFahrenheit(value: number) {
    const fahrenheit = (value * 1.8) + 32;
    const roundedFahrenheit = Number((Math.round(Number((fahrenheit * 2).toFixed(1))) / 2).toFixed(1));
    return Number(((roundedFahrenheit - 32)/1.8).toFixed(2));
}

export function noOccupancySince(endpoint: Zh.Endpoint, options: KeyValueAny, publish: Publish, action: 'start' | 'stop') {
    if (options && options.no_occupancy_since) {
        if (action == 'start') {
            globalStore.getValue(endpoint, 'no_occupancy_since_timers', []).forEach((t: ReturnType<typeof setInterval>) => clearTimeout(t));
            globalStore.putValue(endpoint, 'no_occupancy_since_timers', []);

            options.no_occupancy_since.forEach((since: number) => {
                const timer = setTimeout(() => {
                    publish({no_occupancy_since: since});
                }, since * 1000);
                globalStore.getValue(endpoint, 'no_occupancy_since_timers').push(timer);
            });
        } else if (action === 'stop') {
            globalStore.getValue(endpoint, 'no_occupancy_since_timers', []).forEach((t: ReturnType<typeof setInterval>) => clearTimeout(t));
            globalStore.putValue(endpoint, 'no_occupancy_since_timers', []);
        }
    }
}

export function attachOutputCluster(device: Zh.Device, clusterKey: string) {
    const clusterId = Zcl.Utils.getCluster(clusterKey).ID;
    const endpoint = device.getEndpoint(1);

    if (!endpoint.outputClusters.includes(clusterId)) {
        endpoint.outputClusters.push(clusterId);
        device.save();
    }
}

export function printNumberAsHex(value: number, hexLength: number): string {
    const hexValue = value.toString(16).padStart(hexLength, '0');
    return `0x${hexValue}`;
}

export function printNumbersAsHexSequence(numbers: number[], hexLength: number): string {
    return numbers.map((v) => v.toString(16).padStart(hexLength, '0')).join(':');
}

// eslint-disable-next-line
export function assertObject(value: unknown, property?: string): asserts value is {[s: string]: any} {
    const isObject = typeof value === 'object' && !Array.isArray(value) && value !== null;
    if (!isObject) {
        throw new Error(`${property} is not a object, got ${typeof value} (${JSON.stringify(value)})`);
    }
}

export function assertArray(value: unknown, property?: string): asserts value is Array<unknown> {
    property = property ? `'${property}'` : 'Value';
    if (!Array.isArray(value)) throw new Error(`${property} is not an array, got ${typeof value} (${value.toString()})`);
}

export function assertString(value: unknown, property?: string): asserts value is string {
    property = property ? `'${property}'` : 'Value';
    if (typeof value !== 'string') throw new Error(`${property} is not a string, got ${typeof value} (${value.toString()})`);
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number';
}

// eslint-disable-next-line
export function isObject(value: unknown): value is {[s: string]: any} {
    return typeof value === 'object' && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

export function assertNumber(value: unknown, property?: string): asserts value is number {
    property = property ? `'${property}'` : 'Value';
    if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`${property} is not a number, got ${typeof value} (${value?.toString()})`);
}

export function toNumber(value: unknown, property?: string): number {
    property = property ? `'${property}'` : 'Value';
    // @ts-ignore
    const result = parseFloat(value);
    if (Number.isNaN(result)) {
        throw new Error(`${property} is not a number, got ${typeof value} (${value.toString()})`);
    }
    return result;
}

export function getFromLookup<V>(value: unknown, lookup: {[s: number | string]: V}, defaultValue: V=undefined, keyIsBool: boolean=false): V {
    let result = undefined;
    if (!keyIsBool) {
        if (typeof value === 'string') {
            result = lookup[value] ?? lookup[value.toLowerCase()] ?? lookup[value.toUpperCase()];
        } else if (typeof value === 'number') {
            result = lookup[value];
        } else {
            throw new Error(`Expected string or number, got: ${typeof value}`);
        }
    } else {
        // Silly hack, but boolean is not supported as index
        if (typeof value === 'boolean') {
            const stringValue = value.toString();
            result = (lookup[stringValue] ?? lookup[stringValue.toLowerCase()] ?? lookup[stringValue.toUpperCase()]);
        } else {
            throw new Error(`Expected boolean, got: ${typeof value}`);
        }
    }
    if (result === undefined && defaultValue === undefined) {
        throw new Error(`Value: '${value}' not found in: [${Object.keys(lookup).join(', ')}]`);
    }
    return result ?? defaultValue;
}

export function getFromLookupByValue(value: unknown, lookup: {[s: string]: unknown}, defaultValue: string=undefined): string {
    for (const entry of Object.entries(lookup)) {
        if (entry[1] === value) {
            return entry[0];
        }
    }
    if (defaultValue === undefined) {
        throw new Error(`Expected one of: ${Object.values(lookup).join(', ')}, got: '${value}'`);
    }
    return defaultValue;
}

export function assertEndpoint(obj: unknown): asserts obj is Zh.Endpoint {
    if (obj?.constructor?.name?.toLowerCase() !== 'endpoint') throw new Error('Not an endpoint');
}

export function assertGroup(obj: unknown): asserts obj is Zh.Group {
    if (obj?.constructor?.name?.toLowerCase() !== 'group') throw new Error('Not a group');
}

export function isEndpoint(obj: Zh.Endpoint | Zh.Group | Zh.Device): obj is Zh.Endpoint {
    return obj.constructor.name.toLowerCase() === 'endpoint';
}

export function isDevice(obj: Zh.Endpoint | Zh.Group | Zh.Device): obj is Zh.Device {
    return obj.constructor.name.toLowerCase() === 'device';
}

export function isGroup(obj: Zh.Endpoint | Zh.Group | Zh.Device): obj is Zh.Group {
    return obj.constructor.name.toLowerCase() === 'group';
}

export function isNumericExposeFeature(feature: Feature): feature is Numeric {
    return feature?.type === 'numeric';
}

export function isLightExpose(expose: Expose): expose is Light {
    return expose?.type === 'light';
}

exports.noOccupancySince = noOccupancySince;
exports.getOptions = getOptions;
exports.isLegacyEnabled = isLegacyEnabled;
exports.precisionRound = precisionRound;
exports.toLocalISOString = toLocalISOString;
exports.numberWithinRange = numberWithinRange;
exports.mapNumberRange = mapNumberRange;
exports.hasAlreadyProcessedMessage = hasAlreadyProcessedMessage;
exports.calibrateAndPrecisionRoundOptions = calibrateAndPrecisionRoundOptions;
exports.calibrateAndPrecisionRoundOptionsIsPercentual = calibrateAndPrecisionRoundOptionsIsPercentual;
exports.calibrateAndPrecisionRoundOptionsDefaultPrecision = calibrateAndPrecisionRoundOptionsDefaultPrecision;
exports.toPercentage = toPercentage;
exports.addActionGroup = addActionGroup;
exports.postfixWithEndpointName = postfixWithEndpointName;
exports.enforceEndpoint = enforceEndpoint;
exports.getKey = getKey;
exports.getObjectProperty = getObjectProperty;
exports.batteryVoltageToPercentage = batteryVoltageToPercentage;
exports.getEntityOrFirstGroupMember = getEntityOrFirstGroupMember;
exports.getTransition = getTransition;
exports.getMetaValue = getMetaValue;
exports.validateValue = validateValue;
exports.hasEndpoints = hasEndpoints;
exports.isInRange = isInRange;
exports.replaceInArray = replaceInArray;
exports.filterObject = filterObject;
exports.saveSceneState = saveSceneState;
exports.sleep = sleep;
exports.toSnakeCase = toSnakeCase;
exports.toCamelCase = toCamelCase;
exports.getLabelFromName = getLabelFromName;
exports.normalizeCelsiusVersionOfFahrenheit = normalizeCelsiusVersionOfFahrenheit;
exports.deleteSceneState = deleteSceneState;
exports.getSceneState = getSceneState;
exports.attachOutputCluster = attachOutputCluster;
exports.printNumberAsHex = printNumberAsHex;
exports.printNumbersAsHexSequence = printNumbersAsHexSequence;
exports.getFromLookup = getFromLookup;
