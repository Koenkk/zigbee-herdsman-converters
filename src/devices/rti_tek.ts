import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionExposesFunction, DefinitionWithExtend, DummyDevice, Expose, Fz, KeyValue, ModernExtend, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const NS = "zhc:rti-tek";
const e = exposes.presets;
const ea = exposes.access;
const rtiTekFd22 = "rtiTekFd22";
const rtiTekFd22Id = 0xfd22;
const fastPollTimeout = 120; // Poll Control uses quarter-seconds, so this is 30 seconds.
const temperatureUnitMetaKey = "rtiTekTemperatureUnit";
const productNameMetaKey = "rtiTekProductName";

const faultBits: Record<number, string> = {
    0: "internal_sensor_fault",
    1: "external_sensor_fault",
    2: "low_battery",
    3: "poor_battery_status",
    4: "battery_too_low_for_ota",
};

const humidityComfortDefaults: Record<"humidityLower" | "humidityUpper" | "temperatureLower" | "temperatureUpper", number> = {
    humidityLower: 30,
    humidityUpper: 60,
    temperatureLower: 20,
    temperatureUpper: 26,
};

type TemperatureKind = "absolute" | "delta";

const temperatureKinds = {
    temperature: "absolute",
    dew_point: "absolute",
    internal_temperature_calibration: "delta",
    temperature_alarm_upper: "absolute",
    temperature_alarm_lower: "absolute",
    comfort_temperature_lower_limit: "absolute",
    comfort_temperature_upper_limit: "absolute",
} as const satisfies Record<string, TemperatureKind>;

const fahrenheitCapabilities: Partial<Record<keyof typeof temperatureKinds, {valueMin: number; valueMax: number; valueStep: number}>> = {
    internal_temperature_calibration: {valueMin: -18, valueMax: 18, valueStep: 0.2},
    temperature_alarm_upper: {valueMin: -22, valueMax: 140, valueStep: 0.1},
    temperature_alarm_lower: {valueMin: -22, valueMax: 140, valueStep: 0.1},
    comfort_temperature_lower_limit: {valueMin: -4, valueMax: 140, valueStep: 0.1},
    comfort_temperature_upper_limit: {valueMin: -4, valueMax: 140, valueStep: 0.1},
};

interface RtiTekFd22Cluster {
    attributes: {
        temperatureUnit: number;
        faultCode: number;
        productName: string;
        internalTemperatureCalibration: number;
        internalHumidityCalibration: number;
        sampleInterval: number;
        temperatureAlarmUpper: number;
        temperatureAlarmLower: number;
        humidityAlarmUpper: number;
        humidityAlarmLower: number;
        temperatureAlarmStatus: number;
        humidityAlarmStatus: number;
        sth2zHumidityComfortLower: number;
        sth2zHumidityComfortUpper: number;
        sth2zHumidityComfortTemperatureLower: number;
        sth2zHumidityComfortTemperatureUpper: number;
    };
    commands: never;
    commandResponses: never;
}

export function toDisplayTemperature(value: number, kind: "absolute" | "delta", fahrenheit: boolean): number {
    if (!fahrenheit) return value;
    return kind === "delta" ? (value * 9) / 5 : (value * 9) / 5 + 32;
}

export function toCelsiusTemperature(value: number, kind: "absolute" | "delta", fahrenheit: boolean): number {
    if (!fahrenheit) return value;
    return kind === "delta" ? (value * 5) / 9 : ((value - 32) * 5) / 9;
}

function round(value: number, precision: number): number {
    return Number(value.toFixed(precision));
}

function roundToStep(value: number, step: number): number {
    return Math.round(value / step) * step;
}

function isFahrenheit(device: Zh.Device | DummyDevice | undefined): boolean {
    return Boolean(device && "meta" in device && device.meta?.[temperatureUnitMetaKey] === "fahrenheit");
}

function getTemperatureCapability(
    key: keyof typeof temperatureKinds,
    celsiusCapability: {valueMin: number; valueMax: number; valueStep: number},
    fahrenheit: boolean,
) {
    return fahrenheit ? (fahrenheitCapabilities[key] ?? celsiusCapability) : celsiusCapability;
}

function convertTemperatureState(state: KeyValue, fromFahrenheit: boolean, toFahrenheit: boolean): KeyValue {
    const converted: KeyValue = {};

    for (const [key, kind] of Object.entries(temperatureKinds)) {
        const value = state[key];
        if (value === undefined || value === null || !Number.isFinite(Number(value))) continue;
        converted[key] = round(toDisplayTemperature(toCelsiusTemperature(Number(value), kind, fromFahrenheit), kind, toFahrenheit), 1);
    }

    return converted;
}

function normalizeTemperatureState(state: KeyValue, fahrenheit: boolean): KeyValue {
    return {...state, ...convertTemperatureState(state, fahrenheit, false)};
}

function setTemperatureUnit(device: Zh.Device | undefined, fahrenheit: boolean) {
    if (!device) return;
    device.meta ??= {};
    device.meta[temperatureUnitMetaKey] = fahrenheit ? "fahrenheit" : "celsius";
    device.save();
}

function normalizeProductName(value: unknown): string {
    return Buffer.isBuffer(value)
        ? value.toString("utf8").trim().toUpperCase()
        : String(value ?? "")
              .trim()
              .toUpperCase();
}

function isSth2z(device: Zh.Device | DummyDevice | undefined): boolean {
    return Boolean(device && "meta" in device && device.meta?.[productNameMetaKey] === "STH2Z");
}

function setProductName(device: Zh.Device | undefined, productName: string) {
    if (!device) return;
    device.meta ??= {};
    device.meta[productNameMetaKey] = productName;
    device.save();
}

export function validateAlarmLimits(state: Record<string, number>): void {
    if (
        state.temperature_alarm_lower !== undefined &&
        state.temperature_alarm_upper !== undefined &&
        state.temperature_alarm_upper - state.temperature_alarm_lower < 0.2 - 1e-9
    ) {
        throw new Error("temperature alarm upper must be at least 0.2 C above lower");
    }
    if (
        state.humidity_alarm_lower !== undefined &&
        state.humidity_alarm_upper !== undefined &&
        state.humidity_alarm_upper - state.humidity_alarm_lower < 2
    ) {
        throw new Error("humidity alarm upper must be at least 2 %RH above lower");
    }
}

export function formatFaultCode(value: number): string {
    const raw = value >>> 0;
    if (raw === 0) return "none";
    const knownMask = Object.keys(faultBits).reduce((mask, bit) => mask | (1 << Number(bit)), 0);
    const faults: string[] = Object.entries(faultBits)
        .filter(([bit]) => (raw & (1 << Number(bit))) !== 0)
        .map(([, text]) => text);
    const unknown = (raw & ~knownMask) >>> 0;
    if (unknown !== 0) faults.push(`unknown_0x${unknown.toString(16).padStart(8, "0")}`);
    return faults.join(",");
}

export function computeDewPoint(temperature: number, humidity: number): number | undefined {
    if (humidity <= 0) return undefined;
    const rh = Math.min(Math.max(humidity, 0.1), 100);
    const gamma = Math.log(rh / 100) + (17.62 * temperature) / (243.12 + temperature);
    return Number(((243.12 * gamma) / (17.62 - gamma)).toFixed(1));
}

export function computeVpd(temperature: number, humidity: number): number {
    const rh = Math.min(Math.max(humidity, 0), 100);
    const svp = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
    return Number(Math.max(0, svp * (1 - rh / 100)).toFixed(2));
}

export function computeHumidityComfort(
    temperature: number,
    humidity: number,
    defaults = humidityComfortDefaults,
): "dry" | "comfort" | "wet" | "normal" {
    if (humidity < defaults.humidityLower) return "dry";
    if (humidity > defaults.humidityUpper) return "wet";
    return temperature >= defaults.temperatureLower && temperature <= defaults.temperatureUpper ? "comfort" : "normal";
}

const rtiTekFd22Attributes = {
    temperatureUnit: {ID: 0x0000, type: Zcl.DataType.ENUM8},
    faultCode: {ID: 0x0002, type: Zcl.DataType.UINT32},
    productName: {ID: 0x0003, type: Zcl.DataType.CHAR_STR},
    internalTemperatureCalibration: {ID: 0xe005, type: Zcl.DataType.INT8},
    internalHumidityCalibration: {ID: 0xe006, type: Zcl.DataType.INT8},
    sampleInterval: {ID: 0xe009, type: Zcl.DataType.UINT16},
    temperatureAlarmUpper: {ID: 0xe00a, type: Zcl.DataType.INT16},
    temperatureAlarmLower: {ID: 0xe00b, type: Zcl.DataType.INT16},
    humidityAlarmUpper: {ID: 0xe00c, type: Zcl.DataType.UINT16},
    humidityAlarmLower: {ID: 0xe00d, type: Zcl.DataType.UINT16},
    temperatureAlarmStatus: {ID: 0xe00e, type: Zcl.DataType.ENUM8},
    humidityAlarmStatus: {ID: 0xe00f, type: Zcl.DataType.ENUM8},
    sth2zHumidityComfortLower: {ID: 0xe014, type: Zcl.DataType.UINT16},
    sth2zHumidityComfortUpper: {ID: 0xe015, type: Zcl.DataType.UINT16},
    sth2zHumidityComfortTemperatureLower: {ID: 0xe016, type: Zcl.DataType.INT16},
    sth2zHumidityComfortTemperatureUpper: {ID: 0xe017, type: Zcl.DataType.INT16},
} as const;

const delay = async (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function configureReporting(endpoint: Zh.Endpoint, cluster: "msTemperatureMeasurement" | "msRelativeHumidity") {
    const isTemperature = cluster === "msTemperatureMeasurement";

    await utils.ignoreUnsupportedAttribute(
        async () =>
            await endpoint.configureReporting(cluster, [
                {
                    attribute: "measuredValue",
                    minimumReportInterval: 5,
                    maximumReportInterval: 3600,
                    reportableChange: isTemperature ? 50 : 200,
                },
            ]),
        `STHZB '${endpoint.deviceIeeeAddress}' ${cluster} reporting configuration`,
    );
}

async function readFd22Attributes(endpoint: Zh.Endpoint, attributes: number[]) {
    let remaining = attributes;

    for (let attempt = 0; attempt < 3 && remaining.length > 0; attempt++) {
        const failed: number[] = [];

        for (let index = 0; index < remaining.length; index += 4) {
            const batch = remaining.slice(index, index + 4);
            try {
                await endpoint.read(rtiTekFd22Id, batch);
            } catch (error) {
                failed.push(...batch);
                logger.debug(`STHZB '${endpoint.deviceIeeeAddress}' FD22 read failed: ${error}`, NS);
            }
        }

        remaining = failed;
        if (remaining.length > 0 && attempt < 2) await delay(1000);
    }

    if (remaining.length > 0) {
        logger.warning(
            `STHZB '${endpoint.deviceIeeeAddress}' did not return FD22 attributes: ${remaining.map((id) => `0x${id.toString(16)}`).join(", ")}`,
            NS,
        );
    }
}

async function readProductName(endpoint: Zh.Endpoint, device: Zh.Device) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const {productName} = await endpoint.read<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, ["productName"]);
            const normalized = normalizeProductName(productName);
            if (normalized) {
                setProductName(device, normalized);
            } else {
                logger.warning(`STHZB '${device.ieeeAddr}' did not return product name; using STH1Z-compatible settings`, NS);
            }
            return;
        } catch (error) {
            logger.debug(`STHZB '${device.ieeeAddr}' product name read failed: ${error}`, NS);
        }
        if (attempt < 2) await delay(1000);
    }

    logger.warning(`STHZB '${device.ieeeAddr}' did not return product name; using STH1Z-compatible settings`, NS);
}

const comfortStateKeys = {
    humidityLower: "comfort_humidity_lower_limit",
    humidityUpper: "comfort_humidity_upper_limit",
    temperatureLower: "comfort_temperature_lower_limit",
    temperatureUpper: "comfort_temperature_upper_limit",
} as const;

type ComfortStateKey = (typeof comfortStateKeys)[keyof typeof comfortStateKeys];

const sth2zComfortAttributes = {
    [comfortStateKeys.humidityLower]: "sth2zHumidityComfortLower",
    [comfortStateKeys.humidityUpper]: "sth2zHumidityComfortUpper",
    [comfortStateKeys.temperatureLower]: "sth2zHumidityComfortTemperatureLower",
    [comfortStateKeys.temperatureUpper]: "sth2zHumidityComfortTemperatureUpper",
} as const satisfies Record<ComfortStateKey, keyof RtiTekFd22Cluster["attributes"]>;

const sth1zFd22AttributeIds = [0x0000, 0x0002, 0xe005, 0xe006, 0xe009, 0xe00a, 0xe00b, 0xe00c, 0xe00d, 0xe00e, 0xe00f];
const sth2zComfortAttributeIds = [0xe014, 0xe015, 0xe016, 0xe017];

const alarmStatusLookup = {normal: 0, low: 1, high: 2} as const;

const privateNumericSettings = {
    internal_temperature_calibration: {
        attribute: "internalTemperatureCalibration",
        scale: 10,
        precision: 1,
        unit: "°C",
        valueMin: -10,
        valueMax: 10,
        valueStep: 0.1,
    },
    internal_humidity_calibration: {
        attribute: "internalHumidityCalibration",
        scale: 10,
        precision: 1,
        unit: "%",
        valueMin: -10,
        valueMax: 10,
        valueStep: 0.1,
    },
    sample_interval: {attribute: "sampleInterval", scale: 1, precision: 0, unit: "s", valueMin: 1, valueMax: 3600, valueStep: 1},
    temperature_alarm_upper: {
        attribute: "temperatureAlarmUpper",
        scale: 100,
        precision: 1,
        unit: "°C",
        valueMin: -30,
        valueMax: 60,
        valueStep: 0.1,
    },
    temperature_alarm_lower: {
        attribute: "temperatureAlarmLower",
        scale: 100,
        precision: 1,
        unit: "°C",
        valueMin: -30,
        valueMax: 60,
        valueStep: 0.1,
    },
    humidity_alarm_upper: {attribute: "humidityAlarmUpper", scale: 100, precision: 0, unit: "%", valueMin: 0, valueMax: 100, valueStep: 1},
    humidity_alarm_lower: {attribute: "humidityAlarmLower", scale: 100, precision: 0, unit: "%", valueMin: 0, valueMax: 100, valueStep: 1},
} as const;

type PrivateNumericKey = keyof typeof privateNumericSettings;
type TemperatureKey = keyof typeof temperatureKinds;

function isTemperatureKey(key: string): key is TemperatureKey {
    return key in temperatureKinds;
}

function temperatureExpose(
    name: TemperatureKey,
    access: number,
    celsiusCapability: {valueMin?: number; valueMax?: number; valueStep?: number},
    device: Zh.Device | DummyDevice,
    entityCategory?: "config" | "diagnostic",
) {
    const fahrenheit = isFahrenheit(device);
    const capability = getTemperatureCapability(
        name,
        {
            valueMin: celsiusCapability.valueMin ?? -20,
            valueMax: celsiusCapability.valueMax ?? 60,
            valueStep: celsiusCapability.valueStep ?? 0.1,
        },
        fahrenheit,
    );
    let expose = e
        .numeric(name, access)
        .withUnit(fahrenheit ? "°F" : "°C")
        .withValueStep(capability.valueStep);
    if (celsiusCapability.valueMin !== undefined) expose = expose.withValueMin(capability.valueMin);
    if (celsiusCapability.valueMax !== undefined) expose = expose.withValueMax(capability.valueMax);
    if (entityCategory) expose = expose.withCategory(entityCategory);
    return expose;
}

function getStateNumber(state: KeyValue, key: string, fallback: number): number {
    const value = state[key];
    return value === undefined || value === null ? fallback : Number(value);
}

function getCelsiusStateNumber(state: KeyValue, key: TemperatureKey, fallback: number, fahrenheit: boolean): number {
    return toCelsiusTemperature(getStateNumber(state, key, fallback), temperatureKinds[key], fahrenheit);
}

function defaultComfortState(state: KeyValue, fahrenheit: boolean): KeyValue {
    const defaults: KeyValue = {};
    for (const [key, defaultValue] of Object.entries(humidityComfortDefaults)) {
        const stateKey = comfortStateKeys[key as keyof typeof comfortStateKeys];
        if (state[stateKey] !== undefined && state[stateKey] !== null) continue;
        defaults[stateKey] = isTemperatureKey(stateKey)
            ? round(toDisplayTemperature(defaultValue, temperatureKinds[stateKey], fahrenheit), 1)
            : defaultValue;
    }
    return defaults;
}

function deriveEnvironment(temperature: number | undefined, humidity: number | undefined, state: KeyValue, fahrenheit: boolean): KeyValue {
    const defaults = defaultComfortState(state, fahrenheit);
    if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) return defaults;

    const comfortLimits = {
        humidityLower: getStateNumber(state, comfortStateKeys.humidityLower, humidityComfortDefaults.humidityLower),
        humidityUpper: getStateNumber(state, comfortStateKeys.humidityUpper, humidityComfortDefaults.humidityUpper),
        temperatureLower: getCelsiusStateNumber(state, comfortStateKeys.temperatureLower, humidityComfortDefaults.temperatureLower, fahrenheit),
        temperatureUpper: getCelsiusStateNumber(state, comfortStateKeys.temperatureUpper, humidityComfortDefaults.temperatureUpper, fahrenheit),
    };
    const dewPoint = computeDewPoint(temperature, humidity);
    return {
        ...defaults,
        ...(dewPoint === undefined ? {} : {dew_point: round(toDisplayTemperature(dewPoint, "absolute", fahrenheit), 1)}),
        vpd: computeVpd(temperature, humidity),
        humidity_comfort: computeHumidityComfort(temperature, humidity, comfortLimits),
    };
}

function validateRange(key: PrivateNumericKey, value: number) {
    const setting = privateNumericSettings[key];
    if (value < setting.valueMin || value > setting.valueMax) {
        throw new Error(`${key} must be between ${setting.valueMin} and ${setting.valueMax}`);
    }
}

function sth1zTemperatureDisplay(): ModernExtend {
    const converter = {
        cluster: "msTemperatureMeasurement",
        type: ["attributeReport", "readResponse"],
        convert: (_model, msg, _publish, _options, meta) => {
            if (msg.data.measuredValue === undefined) return;
            return {temperature: round(toDisplayTemperature(Number(msg.data.measuredValue) / 100, "absolute", isFahrenheit(meta.device)), 1)};
        },
    } satisfies Fz.Converter<"msTemperatureMeasurement", undefined, ["attributeReport", "readResponse"]>;

    const expose: DefinitionExposesFunction = (device) => [temperatureExpose("temperature", ea.STATE, {}, device)];
    return {exposes: [expose], fromZigbee: [converter], isModernExtend: true};
}

function sth1zDerivedEnvironment(): ModernExtend {
    const fromZigbee = [
        {
            cluster: "msTemperatureMeasurement",
            type: ["attributeReport", "readResponse"],
            convert: (_model, msg, _publish, _options, meta) => {
                if (msg.data.measuredValue === undefined) return;
                return deriveEnvironment(Number(msg.data.measuredValue) / 100, Number(meta.state.humidity), meta.state, isFahrenheit(meta.device));
            },
        } satisfies Fz.Converter<"msTemperatureMeasurement", undefined, ["attributeReport", "readResponse"]>,
        {
            cluster: "msRelativeHumidity",
            type: ["attributeReport", "readResponse"],
            convert: (_model, msg, _publish, _options, meta) => {
                if (msg.data.measuredValue === undefined) return;
                return deriveEnvironment(
                    getCelsiusStateNumber(meta.state, "temperature", Number.NaN, isFahrenheit(meta.device)),
                    Number(msg.data.measuredValue) / 100,
                    meta.state,
                    isFahrenheit(meta.device),
                );
            },
        } satisfies Fz.Converter<"msRelativeHumidity", undefined, ["attributeReport", "readResponse"]>,
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: Object.values(comfortStateKeys),
            convertSet: (entity, key, value, meta) => {
                const fahrenheit = isFahrenheit(meta.device);
                const displayValue = Number(value);
                const normalized = isTemperatureKey(key) ? toCelsiusTemperature(displayValue, temperatureKinds[key], fahrenheit) : displayValue;
                const state = {
                    ...normalizeTemperatureState(meta.state, fahrenheit),
                    [key]: normalized,
                };
                const humidityLower = getStateNumber(state, comfortStateKeys.humidityLower, humidityComfortDefaults.humidityLower);
                const humidityUpper = getStateNumber(state, comfortStateKeys.humidityUpper, humidityComfortDefaults.humidityUpper);
                const temperatureLower = getStateNumber(state, comfortStateKeys.temperatureLower, humidityComfortDefaults.temperatureLower);
                const temperatureUpper = getStateNumber(state, comfortStateKeys.temperatureUpper, humidityComfortDefaults.temperatureUpper);
                if (
                    (isTemperatureKey(key) && (normalized < -20 || normalized > 60)) ||
                    (!isTemperatureKey(key) && (normalized < 0 || normalized > 100))
                ) {
                    throw new Error(`${key} is outside its supported range`);
                }
                if (humidityLower >= humidityUpper) throw new Error("comfort humidity lower limit must be below upper limit");
                if (temperatureLower >= temperatureUpper) throw new Error("comfort temperature lower limit must be below upper limit");

                const attribute = sth2zComfortAttributes[key as ComfortStateKey];
                if (isSth2z(meta.device) && attribute) {
                    const raw = isTemperatureKey(key) ? Math.round(normalized * 10) * 10 : Math.round(normalized) * 100;
                    const deviceValue = raw / 100;
                    const nextValue = isTemperatureKey(key)
                        ? round(toDisplayTemperature(deviceValue, temperatureKinds[key], fahrenheit), 1)
                        : deviceValue;
                    const nextState = {...meta.state, [key]: nextValue};
                    return (async () => {
                        await entity.write<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, {[attribute]: raw} as never);
                        return {
                            state: {
                                [key]: nextValue,
                                ...deriveEnvironment(
                                    getCelsiusStateNumber(nextState, "temperature", Number.NaN, fahrenheit),
                                    Number(nextState.humidity),
                                    nextState,
                                    fahrenheit,
                                ),
                            },
                        };
                    })();
                }

                const nextValue = isTemperatureKey(key) ? round(toDisplayTemperature(normalized, temperatureKinds[key], fahrenheit), 1) : normalized;
                const nextState = {...meta.state, [key]: nextValue};
                return {
                    state: {
                        [key]: nextValue,
                        ...deriveEnvironment(
                            getCelsiusStateNumber(nextState, "temperature", Number.NaN, fahrenheit),
                            Number(nextState.humidity),
                            nextState,
                            fahrenheit,
                        ),
                    },
                };
            },
            convertGet: async (entity, key, meta) => {
                const attribute = sth2zComfortAttributes[key as ComfortStateKey];
                if (isSth2z(meta.device) && attribute) {
                    await entity.read<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, [attribute]);
                    return;
                }
                const fallbackKey = Object.entries(comfortStateKeys).find(
                    ([, stateKey]) => stateKey === key,
                )?.[0] as keyof typeof humidityComfortDefaults;
                const currentValue = meta.state[key];
                const fallbackValue = isTemperatureKey(key)
                    ? round(toDisplayTemperature(humidityComfortDefaults[fallbackKey], temperatureKinds[key], isFahrenheit(meta.device)), 1)
                    : humidityComfortDefaults[fallbackKey];
                const value = currentValue === undefined || currentValue === null ? fallbackValue : Number(currentValue);
                return {
                    state: {
                        [key]: value,
                    },
                };
            },
        },
    ];

    const expose: DefinitionExposesFunction = (device) => [
        temperatureExpose("dew_point", ea.STATE, {}, device),
        e.numeric("vpd", ea.STATE).withUnit("kPa").withValueStep(0.01),
        e.enum("humidity_comfort", ea.STATE, ["dry", "comfort", "wet", "normal"]),
        e
            .numeric(comfortStateKeys.humidityLower, ea.STATE_SET)
            .withCategory("config")
            .withUnit("%")
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1),
        e
            .numeric(comfortStateKeys.humidityUpper, ea.STATE_SET)
            .withCategory("config")
            .withUnit("%")
            .withValueMin(0)
            .withValueMax(100)
            .withValueStep(1),
        temperatureExpose("comfort_temperature_lower_limit", ea.STATE_SET, {valueMin: -20, valueMax: 60, valueStep: 0.1}, device, "config"),
        temperatureExpose("comfort_temperature_upper_limit", ea.STATE_SET, {valueMin: -20, valueMax: 60, valueStep: 0.1}, device, "config"),
    ];

    return {exposes: [expose], fromZigbee, toZigbee, isModernExtend: true};
}

function sthzbProductName(): ModernExtend {
    const fromZigbee = {
        cluster: rtiTekFd22,
        type: ["attributeReport", "readResponse"],
        convert: (_model, msg, _publish, _options, meta) => {
            if (msg.data.productName === undefined) return;
            const productName = normalizeProductName(msg.data.productName);
            const previousProductName = meta.device.meta?.[productNameMetaKey];
            setProductName(meta.device, productName);
            if (previousProductName !== productName) meta.deviceExposesChanged();
            return {product_name: productName};
        },
    } satisfies Fz.Converter<typeof rtiTekFd22, RtiTekFd22Cluster, ["attributeReport", "readResponse"]>;

    const toZigbee: Tz.Converter[] = [
        {
            key: ["product_name"],
            convertGet: async (entity) => {
                await entity.read<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, ["productName"]);
            },
        },
    ];

    return {
        exposes: [e.text("product_name", ea.STATE_GET).withCategory("diagnostic")],
        fromZigbee: [fromZigbee],
        toZigbee,
        isModernExtend: true,
    };
}

function sth2zComfortSettings(): ModernExtend {
    const fromZigbee = {
        cluster: rtiTekFd22,
        type: ["attributeReport", "readResponse"],
        convert: (_model, msg, _publish, _options, meta) => {
            if (!isSth2z(meta.device)) return;

            const fahrenheit = isFahrenheit(meta.device);
            const result: KeyValue = {};
            for (const [key, attribute] of Object.entries(sth2zComfortAttributes) as [
                ComfortStateKey,
                (typeof sth2zComfortAttributes)[ComfortStateKey],
            ][]) {
                const raw = msg.data[attribute];
                if (raw === undefined) continue;
                const value = Number(raw) / 100;
                result[key] = isTemperatureKey(key) ? round(toDisplayTemperature(value, temperatureKinds[key], fahrenheit), 1) : Math.round(value);
            }

            if (Object.keys(result).length === 0) return;
            const state = {...meta.state, ...result};
            return {
                ...result,
                ...deriveEnvironment(getCelsiusStateNumber(state, "temperature", Number.NaN, fahrenheit), Number(state.humidity), state, fahrenheit),
            };
        },
    } satisfies Fz.Converter<typeof rtiTekFd22, RtiTekFd22Cluster, ["attributeReport", "readResponse"]>;

    return {fromZigbee: [fromZigbee], isModernExtend: true};
}

function sth1zPrivateSettings(): ModernExtend {
    const fromZigbee = {
        cluster: rtiTekFd22,
        type: ["attributeReport", "readResponse"],
        convert: (_model, msg, _publish, _options, meta) => {
            const result: KeyValue = {};
            const fahrenheitBeforeUpdate = isFahrenheit(meta.device);

            if (msg.data.temperatureUnit !== undefined) {
                const fahrenheit = Number(msg.data.temperatureUnit) === 1;
                setTemperatureUnit(meta.device, fahrenheit);
                if (fahrenheitBeforeUpdate !== fahrenheit) meta.deviceExposesChanged();
                result.temperature_unit = fahrenheit ? "fahrenheit" : "celsius";
                Object.assign(result, convertTemperatureState(meta.state, fahrenheitBeforeUpdate, fahrenheit));
            }

            for (const [key, setting] of Object.entries(privateNumericSettings) as [
                PrivateNumericKey,
                (typeof privateNumericSettings)[PrivateNumericKey],
            ][]) {
                const raw = msg.data[setting.attribute];
                if (raw === undefined) continue;
                const value = Number(raw) / setting.scale;
                result[key] = round(
                    toDisplayTemperature(value, isTemperatureKey(key) ? temperatureKinds[key] : "absolute", isFahrenheit(meta.device)),
                    setting.precision,
                );
            }

            if (msg.data.faultCode !== undefined) result.fault_status = formatFaultCode(Number(msg.data.faultCode));
            if (msg.data.temperatureAlarmStatus !== undefined) {
                result.temperature_alarm_status =
                    Object.keys(alarmStatusLookup).find(
                        (status) => alarmStatusLookup[status as keyof typeof alarmStatusLookup] === Number(msg.data.temperatureAlarmStatus),
                    ) ?? `unknown_${Number(msg.data.temperatureAlarmStatus)}`;
            }
            if (msg.data.humidityAlarmStatus !== undefined) {
                result.humidity_alarm_status =
                    Object.keys(alarmStatusLookup).find(
                        (status) => alarmStatusLookup[status as keyof typeof alarmStatusLookup] === Number(msg.data.humidityAlarmStatus),
                    ) ?? `unknown_${Number(msg.data.humidityAlarmStatus)}`;
            }

            return Object.keys(result).length > 0 ? result : undefined;
        },
    } satisfies Fz.Converter<typeof rtiTekFd22, RtiTekFd22Cluster, ["attributeReport", "readResponse"]>;

    const toZigbee: Tz.Converter[] = [
        {
            key: ["temperature_unit"],
            convertSet: async (entity, _key, value, meta) => {
                if (value !== "celsius" && value !== "fahrenheit") throw new Error("temperature_unit must be celsius or fahrenheit");
                const fahrenheit = value === "fahrenheit";
                const previousFahrenheit = isFahrenheit(meta.device);
                await entity.write<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, {temperatureUnit: fahrenheit ? 1 : 0});
                setTemperatureUnit(meta.device, fahrenheit);
                if (previousFahrenheit !== fahrenheit) meta.deviceExposesChanged?.();
                return {
                    state: {
                        temperature_unit: fahrenheit ? "fahrenheit" : "celsius",
                        ...convertTemperatureState(meta.state, previousFahrenheit, fahrenheit),
                    },
                };
            },
            convertGet: async (entity) => {
                await entity.read<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, ["temperatureUnit"]);
            },
        },
        {
            key: Object.keys(privateNumericSettings),
            convertSet: async (entity, key, value, meta) => {
                const setting = privateNumericSettings[key as PrivateNumericKey];
                const fahrenheit = isFahrenheit(meta.device);
                const capability = isTemperatureKey(key) ? getTemperatureCapability(key, setting, fahrenheit) : setting;
                if (!Number.isFinite(Number(value))) throw new Error(`${key} must be a number`);
                const displayValue = round(roundToStep(Number(value), capability.valueStep), setting.precision);
                const normalized = isTemperatureKey(key) ? toCelsiusTemperature(displayValue, temperatureKinds[key], fahrenheit) : displayValue;
                validateRange(key as PrivateNumericKey, normalized);
                validateAlarmLimits({...normalizeTemperatureState(meta.state, fahrenheit), [key]: normalized} as Record<string, number>);
                const raw = Math.round(normalized * setting.scale);
                await entity.write<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, {[setting.attribute]: raw} as never);
                return {
                    state: {
                        [key]: round(
                            toDisplayTemperature(raw / setting.scale, isTemperatureKey(key) ? temperatureKinds[key] : "absolute", fahrenheit),
                            setting.precision,
                        ),
                    },
                };
            },
            convertGet: async (entity, key) => {
                await entity.read<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, [privateNumericSettings[key as PrivateNumericKey].attribute]);
            },
        },
        {
            key: ["fault_status"],
            convertGet: async (entity) => {
                await entity.read<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, ["faultCode"]);
            },
        },
        {
            key: ["temperature_alarm_status"],
            convertGet: async (entity) => {
                await entity.read<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, ["temperatureAlarmStatus"]);
            },
        },
        {
            key: ["humidity_alarm_status"],
            convertGet: async (entity) => {
                await entity.read<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, ["humidityAlarmStatus"]);
            },
        },
    ];

    const expose: DefinitionExposesFunction = (device) => {
        const results: Expose[] = [e.enum("temperature_unit", ea.STATE_SET, ["celsius", "fahrenheit"]).withCategory("config")];
        for (const [key, setting] of Object.entries(privateNumericSettings) as [
            PrivateNumericKey,
            (typeof privateNumericSettings)[PrivateNumericKey],
        ][]) {
            if (isTemperatureKey(key)) {
                results.push(temperatureExpose(key, ea.STATE_SET, setting, device, "config"));
            } else {
                results.push(
                    e
                        .numeric(key, ea.STATE_SET)
                        .withUnit(setting.unit)
                        .withValueMin(setting.valueMin)
                        .withValueMax(setting.valueMax)
                        .withValueStep(setting.valueStep)
                        .withCategory("config"),
                );
            }
        }
        results.push(e.enum("temperature_alarm_status", ea.STATE_GET, ["normal", "low", "high"]).withCategory("diagnostic"));
        results.push(e.enum("humidity_alarm_status", ea.STATE_GET, ["normal", "low", "high"]).withCategory("diagnostic"));
        results.push(e.text("fault_status", ea.STATE_GET).withCategory("diagnostic"));
        return results;
    };

    return {exposes: [expose], fromZigbee: [fromZigbee], toZigbee, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["STHZB"],
        model: "STHZB",
        vendor: "Rti-Tek",
        description: "Temperature and humidity sensor",
        ota: true,
        extend: [
            m.deviceAddCustomCluster(rtiTekFd22, {
                name: rtiTekFd22,
                ID: rtiTekFd22Id,
                attributes: {
                    temperatureUnit: {name: "temperatureUnit", ...rtiTekFd22Attributes.temperatureUnit, write: true, max: 0xff},
                    faultCode: {name: "faultCode", ...rtiTekFd22Attributes.faultCode, max: 0xffffffff},
                    productName: {name: "productName", ...rtiTekFd22Attributes.productName},
                    internalTemperatureCalibration: {
                        name: "internalTemperatureCalibration",
                        ...rtiTekFd22Attributes.internalTemperatureCalibration,
                        write: true,
                        min: -128,
                    },
                    internalHumidityCalibration: {
                        name: "internalHumidityCalibration",
                        ...rtiTekFd22Attributes.internalHumidityCalibration,
                        write: true,
                        min: -128,
                    },
                    sampleInterval: {name: "sampleInterval", ...rtiTekFd22Attributes.sampleInterval, write: true, max: 0xffff},
                    temperatureAlarmUpper: {
                        name: "temperatureAlarmUpper",
                        ...rtiTekFd22Attributes.temperatureAlarmUpper,
                        write: true,
                        min: -32768,
                    },
                    temperatureAlarmLower: {
                        name: "temperatureAlarmLower",
                        ...rtiTekFd22Attributes.temperatureAlarmLower,
                        write: true,
                        min: -32768,
                    },
                    humidityAlarmUpper: {name: "humidityAlarmUpper", ...rtiTekFd22Attributes.humidityAlarmUpper, write: true, max: 0xffff},
                    humidityAlarmLower: {name: "humidityAlarmLower", ...rtiTekFd22Attributes.humidityAlarmLower, write: true, max: 0xffff},
                    temperatureAlarmStatus: {name: "temperatureAlarmStatus", ...rtiTekFd22Attributes.temperatureAlarmStatus, max: 0xff},
                    humidityAlarmStatus: {name: "humidityAlarmStatus", ...rtiTekFd22Attributes.humidityAlarmStatus, max: 0xff},
                    sth2zHumidityComfortLower: {
                        name: "sth2zHumidityComfortLower",
                        ...rtiTekFd22Attributes.sth2zHumidityComfortLower,
                        write: true,
                        max: 0xffff,
                    },
                    sth2zHumidityComfortUpper: {
                        name: "sth2zHumidityComfortUpper",
                        ...rtiTekFd22Attributes.sth2zHumidityComfortUpper,
                        write: true,
                        max: 0xffff,
                    },
                    sth2zHumidityComfortTemperatureLower: {
                        name: "sth2zHumidityComfortTemperatureLower",
                        ...rtiTekFd22Attributes.sth2zHumidityComfortTemperatureLower,
                        write: true,
                        min: -32768,
                    },
                    sth2zHumidityComfortTemperatureUpper: {
                        name: "sth2zHumidityComfortTemperatureUpper",
                        ...rtiTekFd22Attributes.sth2zHumidityComfortTemperatureUpper,
                        write: true,
                        min: -32768,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            sth1zTemperatureDisplay(),
            m.humidity({reporting: false}),
            m.battery({percentageReporting: false}),
            sthzbProductName(),
            sth1zPrivateSettings(),
            sth2zComfortSettings(),
            sth1zDerivedEnvironment(),
        ],
        configure: async (device) => {
            const endpoint = device.getEndpoint(1);

            if (endpoint.supportsInputCluster("genPollCtrl")) {
                try {
                    await endpoint.write("genPollCtrl", {fastPollTimeout});
                } catch (error) {
                    logger.warning(`STHZB '${device.ieeeAddr}' fast-poll timeout configuration failed: ${error}`, NS);
                }
            }

            await configureReporting(endpoint, "msTemperatureMeasurement");
            await configureReporting(endpoint, "msRelativeHumidity");
            await utils.ignoreUnsupportedAttribute(
                async () => await reporting.batteryPercentageRemaining(endpoint),
                `STHZB '${device.ieeeAddr}' battery reporting configuration`,
            );

            await Promise.all([
                endpoint
                    .read("msTemperatureMeasurement", ["measuredValue"])
                    .catch((error) => logger.debug(`STHZB '${device.ieeeAddr}' temperature read failed: ${error}`, NS)),
                endpoint
                    .read("msRelativeHumidity", ["measuredValue"])
                    .catch((error) => logger.debug(`STHZB '${device.ieeeAddr}' humidity read failed: ${error}`, NS)),
                endpoint
                    .read("genPowerCfg", ["batteryVoltage", "batteryPercentageRemaining"])
                    .catch((error) => logger.debug(`STHZB '${device.ieeeAddr}' battery read failed: ${error}`, NS)),
            ]);

            await delay(3000);
            await readProductName(endpoint, device);
            await readFd22Attributes(endpoint, sth1zFd22AttributeIds);
            if (isSth2z(device)) await readFd22Attributes(endpoint, sth2zComfortAttributeIds);
        },
    },
];
