import {Zcl} from "zigbee-herdsman";
import type {ClusterOrRawAttributeKeys, ClusterOrRawAttributes, TCustomCluster} from "zigbee-herdsman/dist/controller/tstype";
import type {Light, Numeric} from "./exposes";
import {logger} from "./logger";
import * as globalStore from "./store";
import type {
    BatteryLinearVoltage,
    BatteryNonLinearVoltage,
    Configure,
    Definition,
    DummyDevice,
    Expose,
    Fz,
    KeyValue,
    KeyValueAny,
    Publish,
    Tz,
    Zh,
} from "./types";

const NS = "zhc:utils";

export function flatten<Type>(arr: Type[][]): Type[] {
    return [].concat(...arr);
}

export function precisionRound(number: number, precision: number): number {
    if (typeof precision === "number") {
        const factor = 10 ** precision;
        return Math.round(number * factor) / factor;
    }
    if (typeof precision === "object") {
        const thresholds = Object.keys(precision)
            .map(Number)
            .sort((a, b) => b - a);
        for (const t of thresholds) {
            if (!Number.isNaN(t) && number >= t) {
                return precisionRound(number, precision[t]);
            }
        }
    }
    return number;
}

export function toLocalISOString(dDate: Date) {
    const tzOffset = -dDate.getTimezoneOffset();
    const plusOrMinus = tzOffset >= 0 ? "+" : "-";
    const pad = (num: number) => {
        const norm = Math.floor(Math.abs(num));
        return (norm < 10 ? "0" : "") + norm;
    };

    return `${dDate.getFullYear()}-${pad(dDate.getMonth() + 1)}-${pad(dDate.getDate())}T${pad(dDate.getHours())}:${pad(dDate.getMinutes())}:${pad(dDate.getSeconds())}${plusOrMinus}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`;
}

export function numberWithinRange(number: number, min: number, max: number) {
    if (number > max) {
        return max;
    }
    if (number < min) {
        return min;
    }
    return number;
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
export function mapNumberRange(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number, precision = 0): number {
    const mappedValue = toLow + ((value - fromLow) * (toHigh - toLow)) / (fromHigh - fromLow);
    return precisionRound(mappedValue, precision);
}

const transactionStore: {[s: string]: number[]} = {};
// biome-ignore lint/suspicious/noExplicitAny: generic
export function hasAlreadyProcessedMessage(msg: Fz.Message<any, any, any>, model: Definition, id: number = null, key: string = null) {
    if (model.meta?.publishDuplicateTransaction) return false;
    const currentID = id !== null ? id : msg.meta.zclTransactionSequenceNumber;
    // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
    key = key || `${msg.device.ieeeAddr}-${msg.endpoint.ID}`;
    if (transactionStore[key]?.includes(currentID)) return true;
    // Keep last 5, as they might come in different order: https://github.com/Koenkk/zigbee2mqtt/issues/20024
    transactionStore[key] = [currentID, ...(transactionStore[key] ?? [])].slice(0, 5);
    return false;
}

export const calibrateAndPrecisionRoundOptionsDefaultPrecision: KeyValue = {
    ac_frequency: 2,
    temperature: 2,
    humidity: 2,
    pressure: 1,
    pm25: 0,
    power: 2,
    current: 2,
    current_phase_b: 2,
    current_phase_c: 2,
    current_neutral: 2,
    voltage: 2,
    voltage_phase_b: 2,
    voltage_phase_c: 2,
    power_phase_b: 2,
    power_phase_c: 2,
    energy: 2,
    device_temperature: 0,
    soil_moisture: 2,
    co2: 0,
    illuminance: 0,
    voc: 0,
    formaldehyd: 0,
    co: 0,
};
export function calibrateAndPrecisionRoundOptionsIsPercentual(type: string) {
    return (
        type.startsWith("current") ||
        type.startsWith("energy") ||
        type.startsWith("voltage") ||
        type.startsWith("power") ||
        type.startsWith("illuminance")
    );
}
export function calibrateAndPrecisionRoundOptions(number: number, options: KeyValue, type: string) {
    // Calibrate
    const calibrateKey = `${type}_calibration`;
    const calibrateValue = options?.[calibrateKey];
    let calibrationOffset = toNumber(calibrateValue != null && calibrateValue !== "" ? calibrateValue : 0, calibrateKey);
    if (calibrateAndPrecisionRoundOptionsIsPercentual(type)) {
        // linear calibration because measured value is zero based
        // +/- percent
        calibrationOffset = (number * calibrationOffset) / 100;
    }
    // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
    number = number + calibrationOffset;

    // Precision round
    const precisionKey = `${type}_precision`;
    const precisionValue = options?.[precisionKey];
    const defaultValue = calibrateAndPrecisionRoundOptionsDefaultPrecision[type] || 0;
    const precision = toNumber(precisionValue != null && precisionValue !== "" ? precisionValue : defaultValue, precisionKey);
    return precisionRound(number, precision);
}

export function toPercentage(value: number, min: number, max: number) {
    if (value > max) {
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = max;
    } else if (value < min) {
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = min;
    }

    const normalised = (value - min) / (max - min);
    return Math.round(normalised * 100);
}

// biome-ignore lint/suspicious/noExplicitAny: generic
export function addActionGroup(payload: KeyValue, msg: Fz.Message<any, any, any>, definition: Definition) {
    const disableActionGroup = definition.meta?.disableActionGroup;
    if (!disableActionGroup && msg.groupID) {
        payload.action_group = msg.groupID;
    }
}

// biome-ignore lint/suspicious/noExplicitAny: generic
export function getEndpointName(msg: Fz.Message<any, any, any>, definition: Definition, meta: Fz.Meta) {
    if (!definition.endpoint) {
        throw new Error(`Definition '${definition.model}' has not endpoint defined`);
    }
    return getKey(definition.endpoint(meta.device), msg.endpoint.ID);
}

// biome-ignore lint/suspicious/noExplicitAny: generic
export function postfixWithEndpointName(value: string, msg: Fz.Message<any, any, any>, definition: Definition, meta: Fz.Meta) {
    // Prevent breaking change https://github.com/Koenkk/zigbee2mqtt/issues/13451
    if (!meta) {
        logger.warning("No meta passed to postfixWithEndpointName, update your external converter!", NS);
        // @ts-expect-error ignore
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        meta = {device: null};
    }

    if (definition.meta?.multiEndpoint && (!definition.meta.multiEndpointSkip || !definition.meta.multiEndpointSkip.includes(value))) {
        const endpointName = definition.endpoint !== undefined ? getKey(definition.endpoint(meta.device), msg.endpoint.ID) : msg.endpoint.ID;

        // NOTE: endpointName can be undefined if we have a definition.endpoint and the endpoint is
        //       not listed.
        if (endpointName) return `${value}_${endpointName}`;
    }
    return value;
}

export function exposeEndpoints<T extends Expose>(expose: T, endpointNames?: string[]): T[] {
    return endpointNames ? (endpointNames.map((ep) => expose.clone().withEndpoint(ep)) as T[]) : [expose];
}

export function enforceEndpoint(entity: Zh.Endpoint, key: string, meta: Tz.Meta) {
    // @ts-expect-error ignore
    const multiEndpointEnforce: {[s: string]: number} = getMetaValue(entity, meta.mapped, "multiEndpointEnforce", "allEqual", []);
    if (multiEndpointEnforce && isObject(multiEndpointEnforce) && multiEndpointEnforce[key] !== undefined) {
        const endpoint = entity.getDevice().getEndpoint(multiEndpointEnforce[key]);
        if (endpoint) return endpoint;
    }
    return entity;
}

type RecordStringOrNumber<T> = Record<string, T> | Record<number, T>;

export function getKey<T>(object: RecordStringOrNumber<T>, value: T): string | undefined;
export function getKey<T, F>(object: RecordStringOrNumber<T>, value: T, fallback: F): string | F;
export function getKey<T, R>(object: RecordStringOrNumber<T>, value: T, fallback: undefined, convertTo: (v: string | number) => R): R | undefined;
export function getKey<T, R, F>(object: RecordStringOrNumber<T>, value: T, fallback: F, convertTo: (v: string | number) => R): R | F;
export function getKey<T, R, F>(
    object: RecordStringOrNumber<T>,
    value: T,
    fallback?: F,
    convertTo?: (v: string | number) => R,
): R | F | string | undefined {
    for (const key in object) {
        // @ts-expect-error too generic
        if (object[key] === value) {
            return convertTo ? convertTo(key) : key;
        }
    }
    return fallback;
}

export function batteryVoltageToPercentage(voltage: number, option: BatteryNonLinearVoltage | BatteryLinearVoltage): number {
    if (option === "3V_2100") {
        let percentage = 100; // >= 3000

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
        }

        return Math.round(percentage);
    }
    if (option === "3V_1500_2800") {
        const percentage = 235 - 370000 / (voltage + 1);

        return Math.round(Math.min(Math.max(percentage, 0), 100));
    }
    if (typeof option === "object") {
        // Generic converter that expects an option object with min and max values
        // I.E. meta: {battery: {voltageToPercentage: {min: 1900, max: 3000}}}
        return toPercentage(voltage + (option.vOffset ?? 0), option.min, option.max);
    }
    // only to cover case where a BatteryVoltage is missing in this switch
    throw new Error(`Unhandled battery voltage to percentage option: ${option}`);
}

// groupStrategy: allEqual: return only if all members in the groups have the same meta property value
//                first: return the first property
//                {atLeastOnce}: returns `atLeastOnce` value when at least one of the group members has this value
export function getMetaValue<T>(
    entity: Zh.Group | Zh.Endpoint,
    definition: Definition | Definition[],
    key: string,
    groupStrategy: "allEqual" | "first" | {atLeastOnce: T} = "first",
    defaultValue: T = undefined,
): T {
    // In case meta is a function, the first argument should be a `Zh.Entity`.
    if (isGroup(entity) && entity.members.length > 0) {
        const values = [];
        for (let i = 0; i < entity.members.length; i++) {
            const memberMetaMeta = getMetaValues((definition as Definition[])[i], entity.members[i]);
            if (memberMetaMeta?.[key] !== undefined) {
                const value = typeof memberMetaMeta[key] === "function" ? memberMetaMeta[key](entity.members[i]) : memberMetaMeta[key];
                if (groupStrategy === "first") {
                    return value;
                }
                if (typeof groupStrategy === "object" && value === groupStrategy.atLeastOnce) {
                    return groupStrategy.atLeastOnce;
                }

                values.push(value);
            } else {
                values.push(defaultValue);
            }
        }

        if (groupStrategy === "allEqual" && new Set(values).size === 1) {
            return values[0];
        }
    } else {
        const definitionMeta = getMetaValues(definition, entity);
        if (definitionMeta?.[key] !== undefined) {
            return typeof definitionMeta[key] === "function" ? definitionMeta[key](entity) : (definitionMeta[key] as T);
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

export function replaceToZigbeeConvertersInArray(
    arr: Tz.Converter[],
    oldElements: Tz.Converter[],
    newElements: Tz.Converter[],
    errorIfNotInArray = true,
) {
    const clone = [...arr];
    for (let i = 0; i < oldElements.length; i++) {
        const index = clone.findIndex((t) => t.key === oldElements[i].key);

        if (index !== -1) {
            clone[index] = newElements[i];
        } else {
            if (errorIfNotInArray) {
                throw new Error("Element not in array");
            }
        }
    }

    return clone;
}

export function filterObject<T>(obj: T, keys: string[]): Partial<T> {
    const result: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (keys.includes(key)) {
            result[key as keyof T] = value;
        }
    }
    return result;
}

export async function sleep(ms: number) {
    return await new Promise((resolve) => setTimeout(resolve, ms));
}

export function toSnakeCase(value: string | KeyValueAny) {
    if (typeof value === "object") {
        for (const key of Object.keys(value)) {
            const keySnakeCase = toSnakeCase(key);
            if (key !== keySnakeCase) {
                // @ts-expect-error ignore
                value[keySnakeCase] = value[key];
                delete value[key];
            }
        }
        return value;
    }
    return value
        .replace(/\.?([A-Z])/g, (x, y) => `_${y.toLowerCase()}`)
        .replace(/^_/, "")
        .replace("_i_d", "_id");
}

export function toCamelCase(value: KeyValueAny | string) {
    if (typeof value === "object") {
        for (const key of Object.keys(value)) {
            const keyCamelCase = toCamelCase(key);
            if (key !== keyCamelCase) {
                // @ts-expect-error ignore
                value[keyCamelCase] = value[key];
                delete value[key];
            }
        }
        return value;
    }
    return value.replace(/_([a-z])/g, (x, y) => y.toUpperCase());
}

export function getLabelFromName(name: string) {
    const label = name.replace(/_/g, " ");
    return label.length === 0 ? label : label[0].toUpperCase() + label.slice(1);
}

export function saveSceneState(entity: Zh.Endpoint, sceneID: number, groupID: number, state: KeyValue, name: string) {
    const attributes = ["state", "brightness", "color", "color_temp", "color_mode"];
    if (entity.meta.scenes === undefined) entity.meta.scenes = {};
    const metaKey = `${sceneID}_${groupID}`;
    entity.meta.scenes[metaKey] = {name, state: filterObject(state, attributes)};
    entity.save();
}

export function deleteSceneState(entity: Zh.Endpoint, sceneID: number = null, groupID: number = null) {
    if (entity.meta.scenes) {
        if (sceneID == null && groupID == null) {
            entity.meta.scenes = {};
        } else {
            const metaKey = `${sceneID}_${groupID}`;
            if (entity.meta.scenes[metaKey] !== undefined) {
                delete entity.meta.scenes[metaKey];
            }
        }
        entity.save();
    }
}

export function getSceneState(entity: Zh.Group | Zh.Endpoint, sceneID: number, groupID: number) {
    const metaKey = `${sceneID}_${groupID}`;
    if (entity.meta.scenes !== undefined && entity.meta.scenes[metaKey] !== undefined) {
        return entity.meta.scenes[metaKey].state;
    }

    return null;
}

export function getEntityOrFirstGroupMember(entity: Zh.Group | Zh.Endpoint) {
    if (isGroup(entity)) {
        return entity.members.length > 0 ? entity.members[0] : null;
    }
    return entity;
}

export function getTransition(entity: Zh.Endpoint | Zh.Group, key: string, meta: Tz.Meta) {
    const {options, message} = meta;

    let manufacturerIDs: number[] = [];
    if (isGroup(entity)) {
        manufacturerIDs = entity.members.map((m) => m.getDevice().manufacturerID);
    } else if (isEndpoint(entity)) {
        manufacturerIDs = [entity.getDevice().manufacturerID];
    }

    if (manufacturerIDs.includes(Zcl.ManufacturerCode.IKEA_OF_SWEDEN)) {
        /**
         * When setting both brightness and color temperature with a transition, the brightness is skipped
         * for IKEA TRADFRI bulbs.
         * To workaround this we skip the transition for the brightness as it is applied first.
         * https://github.com/Koenkk/zigbee2mqtt/issues/1810
         */
        if (key === "brightness" && (message.color != null || message.color_temp != null)) {
            return {time: 0, specified: false};
        }
    }

    if (message.transition != null) {
        const time = toNumber(message.transition, "transition");
        return {time: time * 10, specified: true};
    }
    if (options.transition != null && options.transition !== "") {
        const transition = toNumber(options.transition, "transition");
        return {time: transition * 10, specified: true};
    }
    return {time: 0, specified: false};
}

export function getOptions(definition: Definition | Definition[], entity: Zh.Endpoint | Zh.Group, options = {}) {
    const allowed = ["disableDefaultResponse", "timeout"];
    return getMetaValues(definition, entity, allowed, options);
}

export function getMetaValues(definitions: Definition | Definition[], entity: Zh.Endpoint | Zh.Group, allowed?: string[], options = {}) {
    const result: KeyValue = {...options};
    for (const definition of Array.isArray(definitions) ? definitions : [definitions]) {
        if (definition?.meta) {
            for (const key of Object.keys(definition.meta)) {
                if (allowed == null || allowed.includes(key)) {
                    // @ts-expect-error ignore
                    const value = definition.meta[key];
                    if (typeof value === "function") {
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
    return object && object[key] !== undefined ? object[key] : defaultValue;
}

export function validateValue<T>(value: T, allowed: readonly T[]): asserts value is (typeof allowed)[number] {
    if (!allowed.includes(value)) {
        throw new Error(`'${value}' not allowed, choose between: ${allowed}`);
    }
}

export async function getClusterAttributeValue<
    Cl extends string,
    Attr extends ClusterOrRawAttributeKeys<Cl, Custom>[number],
    Custom extends TCustomCluster | undefined = undefined,
>(
    endpoint: Zh.Endpoint,
    cluster: Cl,
    attribute: Attr,
    fallback: ClusterOrRawAttributes<Cl, Custom>[Attr],
): Promise<ClusterOrRawAttributes<Cl, Custom>[Attr]> {
    try {
        const value = endpoint.getClusterAttributeValue(cluster, attribute);
        if (value == null) {
            const result = await endpoint.read<Cl, Custom>(cluster, [attribute] as ClusterOrRawAttributeKeys<Cl, Custom>, {
                sendPolicy: "immediate",
                disableRecovery: true,
            });
            return result[attribute];
        }
        return value as ClusterOrRawAttributes<Cl, Custom>[Attr];
    } catch {
        return fallback;
    }
}

export function normalizeCelsiusVersionOfFahrenheit(value: number) {
    const fahrenheit = value * 1.8 + 32;
    const roundedFahrenheit = Number((Math.round(Number((fahrenheit * 2).toFixed(1))) / 2).toFixed(1));
    return Number(((roundedFahrenheit - 32) / 1.8).toFixed(2));
}

export function noOccupancySince(endpoint: Zh.Endpoint, options: KeyValueAny, publish: Publish, action: "start" | "stop") {
    if (options?.no_occupancy_since) {
        if (action === "start") {
            globalStore.getValue(endpoint, "no_occupancy_since_timers", []).forEach((t: ReturnType<typeof setInterval>) => {
                clearTimeout(t);
            });
            globalStore.putValue(endpoint, "no_occupancy_since_timers", []);

            options.no_occupancy_since.forEach((since: number) => {
                const timer = setTimeout(() => {
                    publish({no_occupancy_since: since});
                }, since * 1000);
                globalStore.getValue(endpoint, "no_occupancy_since_timers").push(timer);
            });
        } else if (action === "stop") {
            globalStore.getValue(endpoint, "no_occupancy_since_timers", []).forEach((t: ReturnType<typeof setInterval>) => {
                clearTimeout(t);
            });
            globalStore.putValue(endpoint, "no_occupancy_since_timers", []);
        }
    }
}

export function attachOutputCluster(device: Zh.Device, clusterKey: string) {
    const clusterId = Zcl.Utils.getCluster(clusterKey, device.manufacturerID, device.customClusters).ID;
    const endpoint = device.getEndpoint(1);

    if (!endpoint.outputClusters.includes(clusterId)) {
        endpoint.outputClusters.push(clusterId);
        device.save();
    }
}

export function printNumberAsHex(value: number, hexLength: number): string {
    const hexValue = value.toString(16).padStart(hexLength, "0");
    return `0x${hexValue}`;
}

export function printNumbersAsHexSequence(numbers: number[], hexLength: number): string {
    return numbers.map((v) => v.toString(16).padStart(hexLength, "0")).join(":");
}

// biome-ignore lint/suspicious/noExplicitAny: generic object
export function assertObject<T extends Record<string, any>>(value: unknown, property?: string): asserts value is T {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`${property} is not a object, got ${typeof value} (${JSON.stringify(value)})`);
    }
}

export function assertArray(value: unknown, property?: string): asserts value is Array<unknown> {
    if (!Array.isArray(value)) {
        throw new Error(`${property ? `'${property}'` : "Value"} is not an array, got ${typeof value} (${value.toString()})`);
    }
}

export function assertString(value: unknown, property?: string): asserts value is string {
    if (typeof value !== "string") {
        throw new Error(`${property ? `'${property}'` : "Value"} is not a string, got ${typeof value} (${value.toString()})`);
    }
}

export function isNumber(value: unknown): value is number {
    return typeof value === "number";
}

// biome-ignore lint/suspicious/noExplicitAny: generic object
export function isObject(value: unknown): value is {[s: string]: any} {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
    return typeof value === "string";
}

export function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}

export function assertNumber(value: unknown, property?: string): asserts value is number {
    if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(`${property ? `'${property}'` : "Value"} is not a number, got ${typeof value} (${value?.toString()})`);
    }
}

export function toNumber(value: unknown, property?: string): number {
    // @ts-expect-error ignore
    const result = Number.parseFloat(value);
    if (Number.isNaN(result)) {
        throw new Error(`${property ? `'${property}'` : "Value"} is not a number, got ${typeof value} (${value.toString()})`);
    }
    return result;
}

export const ignoreUnsupportedAttribute = async (func: () => Promise<void>, failMessage: string) => {
    try {
        await func();
    } catch (e) {
        if ((e as Error).message.includes("UNSUPPORTED_ATTRIBUTE")) {
            logger.debug(`Ignoring unsupported attribute error: ${failMessage}`, NS);
        } else {
            throw e;
        }
    }
};

export function getFromLookup<V>(value: unknown, lookup: {[s: number | string]: V}, defaultValue: V = undefined, keyIsBool = false): V {
    if (!keyIsBool) {
        if (typeof value === "string") {
            for (const key of [value, value.toLowerCase(), value.toUpperCase()]) {
                if (lookup[key] !== undefined) {
                    return lookup[key];
                }
            }
        } else if (typeof value === "number") {
            if (lookup[value] !== undefined) {
                return lookup[value];
            }
        } else {
            throw new Error(`Expected string or number, got: ${typeof value}`);
        }
    } else {
        // Silly hack, but boolean is not supported as index
        if (typeof value === "boolean") {
            const stringValue = value.toString();
            for (const key of [stringValue, stringValue.toLowerCase(), stringValue.toUpperCase()]) {
                if (lookup[key] !== undefined) {
                    return lookup[key];
                }
            }
        } else {
            throw new Error(`Expected boolean, got: ${typeof value}`);
        }
    }
    if (defaultValue === undefined) {
        throw new Error(`Value: '${value}' not found in: [${Object.keys(lookup).join(", ")}]`);
    }
    return defaultValue;
}

export function getFromLookupByValue(value: unknown, lookup: {[s: string]: unknown}, defaultValue: string = undefined): string {
    for (const [key, val] of Object.entries(lookup)) {
        if (val === value) {
            return key;
        }
    }
    if (defaultValue === undefined) {
        throw new Error(`Expected one of: ${Object.values(lookup).join(", ")}, got: '${value}'`);
    }
    return defaultValue;
}

export function configureSetPowerSourceWhenUnknown(powerSource: "Battery" | "Mains (single phase)"): Configure {
    return (device: Zh.Device): void => {
        if (!device.powerSource || device.powerSource === "Unknown") {
            logger.debug(`Device has no power source, forcing to '${powerSource}'`, NS);
            device.powerSource = powerSource;
            device.save();
        }
    };
}

export function assertEndpoint(obj: unknown): asserts obj is Zh.Endpoint {
    if (obj?.constructor?.name?.toLowerCase() !== "endpoint") throw new Error("Not an endpoint");
}

export function assertGroup(obj: unknown): asserts obj is Zh.Group {
    if (obj?.constructor?.name?.toLowerCase() !== "group") throw new Error("Not a group");
}

export function isEndpoint(obj: Zh.Endpoint | Zh.Group | Zh.Device): obj is Zh.Endpoint {
    return obj.constructor.name.toLowerCase() === "endpoint";
}

export function isDevice(obj: Zh.Endpoint | Zh.Group | Zh.Device): obj is Zh.Device {
    return obj.constructor.name.toLowerCase() === "device";
}

export function isDummyDevice(obj: Zh.Device | DummyDevice): obj is DummyDevice {
    return "isDummyDevice" in obj;
}

export function isGroup(obj: Zh.Endpoint | Zh.Group | Zh.Device): obj is Zh.Group {
    return obj.constructor.name.toLowerCase() === "group";
}

export function isNumericExpose(expose: Expose): expose is Numeric {
    return expose?.type === "numeric";
}

export function isLightExpose(expose: Expose): expose is Light {
    return expose?.type === "light";
}

export function splitArrayIntoChunks<T>(arr: T[], chunkSize: number): T[][] {
    const result = [];

    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        result.push(chunk);
    }

    return result;
}

export function determineEndpoint(entity: Zh.Endpoint | Zh.Group, meta: Tz.Meta, cluster: string | number): Zh.Endpoint | Zh.Group {
    const {device, endpoint_name} = meta;
    if (endpoint_name !== undefined) {
        // In case an explicit endpoint is given, always send it to that endpoint
        return entity;
    }
    // In case no endpoint is given, match the first endpoint which support the cluster.
    return device.endpoints.find((e) => e.supportsInputCluster(cluster)) ?? device.endpoints[0];
}
