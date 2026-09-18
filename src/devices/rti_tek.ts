import {Zcl} from "zigbee-herdsman";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, DummyDevice, Fz, ModernExtend, Tz, Zh} from "../lib/types";

const NS = "zhc:rti-tek";
const fastPollTimeout = 120;
const rtiTekFd22 = "rtiTekFd22";
const rtiTekFd22Id = 0xfd22;
const temperatureUnitMetaKey = "rtiTekTemperatureUnit";
const productNameMetaKey = "rtiTekProductName";
const confirmedTemperatureValuesMetaKey = "rtiTekConfirmedTemperatureValues";
const temperatureWriteThresholdCelsius = 0.1;

type HumidityComfortLimits = {
    humidityLower: number;
    humidityUpper: number;
    temperatureLower: number;
    temperatureUpper: number;
};

const humidityComfortDefaults: HumidityComfortLimits = {
    humidityLower: 30,
    humidityUpper: 60,
    temperatureLower: 20,
    temperatureUpper: 26,
} as const;

const comfortStateKeys = {
    humidityLower: "comfort_humidity_lower_limit",
    humidityUpper: "comfort_humidity_upper_limit",
    temperatureLower: "comfort_temperature_lower_limit",
    temperatureUpper: "comfort_temperature_upper_limit",
} as const;

const sth2zComfortAttributes = {
    [comfortStateKeys.humidityLower]: "sth2zHumidityComfortLower",
    [comfortStateKeys.humidityUpper]: "sth2zHumidityComfortUpper",
    [comfortStateKeys.temperatureLower]: "sth2zHumidityComfortTemperatureLower",
    [comfortStateKeys.temperatureUpper]: "sth2zHumidityComfortTemperatureUpper",
} as const;

const temperatureStateKinds = {
    temperature: "absolute",
    dew_point: "absolute",
    internal_temperature_calibration: "delta",
    temperature_alarm_upper: "absolute",
    temperature_alarm_lower: "absolute",
    comfort_temperature_lower_limit: "absolute",
    comfort_temperature_upper_limit: "absolute",
} as const;

type TemperatureKind = "absolute" | "delta";

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

const requiredFd22AttributeIds = [0x0000, 0x0002, 0xe005, 0xe006, 0xe009, 0xe00a, 0xe00b, 0xe00c, 0xe00d, 0xe00e, 0xe00f];
const sth2zComfortAttributeIds = [0xe014, 0xe015, 0xe016, 0xe017];

type RtiTekFd22Attribute = keyof typeof rtiTekFd22Attributes;
type FzReportTypes = readonly ["attributeReport", "readResponse"];
type RtiTekFd22Cluster = {
    attributes: Record<RtiTekFd22Attribute, unknown>;
    commands: never;
    commandResponses: never;
};
type RawFd22Attributes = Record<number, {value: unknown; type: Zcl.DataType}>;
type RtiTekFzConverter = Fz.Converter<typeof rtiTekFd22, RtiTekFd22Cluster, FzReportTypes>;
type TemperatureFzConverter = Fz.Converter<"msTemperatureMeasurement", undefined, FzReportTypes>;
type HumidityFzConverter = Fz.Converter<"msRelativeHumidity", undefined, FzReportTypes>;
type ExposeDevice = Zh.Device | DummyDevice;

const faultBits: Record<number, string> = {
    0: "internal_sensor_fault",
    1: "external_sensor_fault",
    2: "low_battery",
    3: "poor_battery_status",
    4: "battery_too_low_for_ota",
};

const alarmStatusLookup = {normal: 0, low: 1, high: 2} as const;
const e = exposes.presets;
const ea = exposes.access;

function round(value: number, precision: number): number {
    return Number(value.toFixed(precision));
}

function isFahrenheit(device: ExposeDevice | undefined): boolean {
    return device !== undefined && !("isDummyDevice" in device) && device.meta?.[temperatureUnitMetaKey] === "fahrenheit";
}

function setTemperatureUnit(device: Zh.Device | undefined, fahrenheit: boolean) {
    if (!device) return;
    device.meta ??= {};
    device.meta[temperatureUnitMetaKey] = fahrenheit ? "fahrenheit" : "celsius";
    device.save();
}

function normalizeProductName(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toUpperCase();
}

function isSth2z(device: Zh.Device | undefined): boolean {
    return device?.meta?.[productNameMetaKey] === "STH2Z";
}

function setProductName(device: Zh.Device | undefined, productName: string) {
    if (!device) return;
    device.meta ??= {};
    device.meta[productNameMetaKey] = productName;
    device.save();
}

export function toDisplayTemperature(value: number, fahrenheit: boolean): number;
export function toDisplayTemperature(value: number, kind: TemperatureKind, fahrenheit: boolean): number;
export function toDisplayTemperature(value: number, kindOrFahrenheit: TemperatureKind | boolean, fahrenheit?: boolean): number {
    const kind = typeof kindOrFahrenheit === "boolean" ? "absolute" : kindOrFahrenheit;
    const useFahrenheit = typeof kindOrFahrenheit === "boolean" ? kindOrFahrenheit : Boolean(fahrenheit);
    return kind === "delta" ? toDisplayTemperatureDelta(value, useFahrenheit) : useFahrenheit ? (value * 9) / 5 + 32 : value;
}

export function toCelsiusTemperature(value: number, fahrenheit: boolean): number;
export function toCelsiusTemperature(value: number, kind: TemperatureKind, fahrenheit: boolean): number;
export function toCelsiusTemperature(value: number, kindOrFahrenheit: TemperatureKind | boolean, fahrenheit?: boolean): number {
    const kind = typeof kindOrFahrenheit === "boolean" ? "absolute" : kindOrFahrenheit;
    const useFahrenheit = typeof kindOrFahrenheit === "boolean" ? kindOrFahrenheit : Boolean(fahrenheit);
    return kind === "delta" ? toCelsiusTemperatureDelta(value, useFahrenheit) : useFahrenheit ? ((value - 32) * 5) / 9 : value;
}

function toDisplayTemperatureDelta(value: number, fahrenheit: boolean): number {
    return fahrenheit ? (value * 9) / 5 : value;
}

function toCelsiusTemperatureDelta(value: number, fahrenheit: boolean): number {
    return fahrenheit ? (value * 5) / 9 : value;
}

function getConfirmedTemperatureValue(device: Zh.Device | undefined, key: string): number | undefined {
    const values = device?.meta?.[confirmedTemperatureValuesMetaKey];
    if (values === null || typeof values !== "object") return undefined;

    const value = (values as Record<string, unknown>)[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function setConfirmedTemperatureValue(device: Zh.Device | undefined, key: string, value: number) {
    if (!device || !Number.isFinite(value)) return;

    const previous = getConfirmedTemperatureValue(device, key);
    if (previous === value) return;

    device.meta ??= {};
    const current = device.meta[confirmedTemperatureValuesMetaKey];
    const values = current !== null && typeof current === "object" ? (current as Record<string, unknown>) : {};
    device.meta[confirmedTemperatureValuesMetaKey] = {...values, [key]: value};
    device.save();
}

export function resolveTemperatureWrite(
    displayValue: number,
    fahrenheit: boolean,
    confirmedDeviceValue: number | undefined,
    kind: "absolute" | "delta" = "absolute",
) {
    const deviceValue = kind === "delta" ? toCelsiusTemperatureDelta(displayValue, fahrenheit) : toCelsiusTemperature(displayValue, fahrenheit);
    const shouldWrite =
        !fahrenheit || confirmedDeviceValue === undefined || Math.abs(deviceValue - confirmedDeviceValue) >= temperatureWriteThresholdCelsius - 1e-9;

    return {shouldWrite, deviceValue, stateValue: round(displayValue, 1)};
}

function delay(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function isUnsupportedPollControlError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("UNSUPPORTED_ATTRIBUTE") || message.includes("UNSUPPORTED_COMMAND");
}

async function readFd22AttributeBatch(endpoint: Zh.Endpoint, attributeIds: number[]): Promise<number[]> {
    try {
        await endpoint.read(rtiTekFd22Id, attributeIds);
        return [];
    } catch (error) {
        if (attributeIds.length === 1) {
            logger.debug(`STHZB '${endpoint.deviceIeeeAddress}' FD22 read failed: ${error}`, NS);
            return attributeIds;
        }

        const failed: number[] = [];
        for (const attributeId of attributeIds) {
            failed.push(...(await readFd22AttributeBatch(endpoint, [attributeId])));
        }
        return failed;
    }
}

async function readFd22Attributes(endpoint: Zh.Endpoint, ieeeAddress: string, attributeIds = requiredFd22AttributeIds) {
    let remaining: number[] = [...attributeIds];

    for (let attempt = 0; attempt < 3 && remaining.length > 0; attempt++) {
        const failed: number[] = [];

        for (let index = 0; index < remaining.length; index += 4) {
            const batch = remaining.slice(index, index + 4);
            failed.push(...(await readFd22AttributeBatch(endpoint, batch)));
        }

        remaining = failed;
        if (remaining.length > 0 && attempt < 2) await delay(1000);
    }

    if (remaining.length > 0) {
        const attributes = remaining.map((id) => `0x${id.toString(16)}`).join(", ");
        throw new Error(`STHZB '${ieeeAddress}' did not return required FD22 attributes: ${attributes}`);
    }
}

async function readProductName(endpoint: Zh.Endpoint, ieeeAddress: string): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await endpoint.read<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, ["productName"]);
            const productName = normalizeProductName(response.productName);
            if (productName) return productName;
            lastError = new Error("empty productName response");
        } catch (error) {
            lastError = error;
        }

        if (attempt < 2) await delay(1000);
    }

    throw new Error(`STHZB '${ieeeAddress}' did not return required FD22 productName after 3 attempts: ${lastError}`);
}

async function readReportingConfiguration(endpoint: Zh.Endpoint, cluster: string, attribute: string) {
    try {
        // These diagnostics span several standard clusters and are intentionally dynamic.
        const configuration = await endpoint.readReportingConfig(cluster as never, [{attribute}] as never);
        logger.debug(`STHZB '${endpoint.deviceIeeeAddress}' ${cluster}.${attribute} reporting configuration: ${JSON.stringify(configuration)}`, NS);
    } catch (error) {
        logger.warning(`STHZB '${endpoint.deviceIeeeAddress}' failed to read ${cluster}.${attribute} reporting configuration: ${error}`, NS);
    }
}

async function writeFd22Attribute(entity: Zh.Endpoint | Zh.Group, attribute: RtiTekFd22Attribute, value: number) {
    // Runtime registration supplies the FD22 custom-cluster schema to Z2M.
    const attributes = {[attribute]: value} as unknown as Partial<RtiTekFd22Cluster["attributes"]> & RawFd22Attributes;
    await entity.write<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, attributes);
}

async function readFd22Attribute(entity: Zh.Endpoint | Zh.Group, attribute: RtiTekFd22Attribute) {
    // The public endpoint type cannot infer schemas registered at runtime.
    await entity.read<typeof rtiTekFd22, RtiTekFd22Cluster>(rtiTekFd22, [attribute]);
}

function notifyDeviceExposesChanged(meta: Tz.Meta) {
    (meta as Tz.Meta & {deviceExposesChanged?: () => void}).deviceExposesChanged?.();
}

function convertTemperatureState(state: Record<string, unknown>, fromFahrenheit: boolean, toFahrenheit: boolean) {
    const converted: Record<string, number> = {};

    for (const [key, kind] of Object.entries(temperatureStateKinds)) {
        const value = Number(state[key]);
        if (state[key] === undefined || state[key] === null || !Number.isFinite(value)) {
            continue;
        }

        const celsius = kind === "delta" ? toCelsiusTemperatureDelta(value, fromFahrenheit) : toCelsiusTemperature(value, fromFahrenheit);
        converted[key] = round(kind === "delta" ? toDisplayTemperatureDelta(celsius, toFahrenheit) : toDisplayTemperature(celsius, toFahrenheit), 1);
    }

    return converted;
}

export function computeDewPoint(temperature: number, humidity: number): number | undefined {
    if (humidity <= 0) return undefined;
    const relativeHumidity = Math.min(Math.max(humidity, 0.1), 100);
    const gamma = Math.log(relativeHumidity / 100) + (17.62 * temperature) / (243.12 + temperature);
    return round((243.12 * gamma) / (17.62 - gamma), 1);
}

export function computeVpd(temperature: number, humidity: number): number {
    const relativeHumidity = Math.min(Math.max(humidity, 0), 100);
    const saturationVaporPressure = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
    return round(Math.max(0, saturationVaporPressure * (1 - relativeHumidity / 100)), 2);
}

export function computeHumidityComfort(
    temperature: number,
    humidity: number,
    limits = humidityComfortDefaults,
): "dry" | "comfort" | "wet" | "normal" {
    if (humidity < limits.humidityLower) return "dry";
    if (humidity > limits.humidityUpper) return "wet";
    return temperature >= limits.temperatureLower && temperature <= limits.temperatureUpper ? "comfort" : "normal";
}

function getStateNumber(state: Record<string, unknown>, key: string, fallback: number) {
    const value = state[key];
    return value === undefined || value === null ? fallback : Number(value);
}

function defaultComfortState(state: Record<string, unknown>, fahrenheit: boolean) {
    const defaults: Record<string, number> = {};

    for (const [key, value] of Object.entries(humidityComfortDefaults)) {
        const stateKey = comfortStateKeys[key as keyof typeof comfortStateKeys];
        if (state[stateKey] !== undefined && state[stateKey] !== null) continue;
        defaults[stateKey] = key.startsWith("temperature") ? round(toDisplayTemperature(value, fahrenheit), 1) : value;
    }

    return defaults;
}

function deriveEnvironment(temperature: number | undefined, humidity: number | undefined, state: Record<string, unknown>, fahrenheit: boolean) {
    const defaults = defaultComfortState(state, fahrenheit);
    if (temperature === undefined || humidity === undefined || !Number.isFinite(temperature) || !Number.isFinite(humidity)) return defaults;

    const limits = {
        humidityLower: getStateNumber(state, comfortStateKeys.humidityLower, humidityComfortDefaults.humidityLower),
        humidityUpper: getStateNumber(state, comfortStateKeys.humidityUpper, humidityComfortDefaults.humidityUpper),
        temperatureLower: toCelsiusTemperature(
            getStateNumber(state, comfortStateKeys.temperatureLower, humidityComfortDefaults.temperatureLower),
            fahrenheit,
        ),
        temperatureUpper: toCelsiusTemperature(
            getStateNumber(state, comfortStateKeys.temperatureUpper, humidityComfortDefaults.temperatureUpper),
            fahrenheit,
        ),
    };
    const dewPoint = computeDewPoint(temperature, humidity);

    return {
        ...defaults,
        ...(dewPoint === undefined ? {} : {dew_point: round(toDisplayTemperature(dewPoint, fahrenheit), 1)}),
        vpd: computeVpd(temperature, humidity),
        humidity_comfort: computeHumidityComfort(temperature, humidity, limits),
    };
}

function sth2zComfortSettings(): ModernExtend {
    const fromZigbee: RtiTekFzConverter = {
        cluster: rtiTekFd22,
        type: ["attributeReport", "readResponse"],
        convert: (_model, msg, _publish, _options, meta) => {
            if (!isSth2z(meta.device)) return;
            const result: Record<string, number> = {};

            for (const [key, attribute] of Object.entries(sth2zComfortAttributes)) {
                const raw = msg.data[attribute];
                if (raw === undefined) continue;
                const value = Number(raw) / 100;
                const temperatureSetting = key === comfortStateKeys.temperatureLower || key === comfortStateKeys.temperatureUpper;
                if (temperatureSetting) setConfirmedTemperatureValue(meta.device, key, value);
                result[key] = temperatureSetting ? round(toDisplayTemperature(value, isFahrenheit(meta.device)), 1) : round(value, 0);
            }

            if (Object.keys(result).length === 0) return;

            const state = {...meta.state, ...result};
            return {
                ...result,
                ...deriveEnvironment(
                    toCelsiusTemperature(Number(state.temperature), isFahrenheit(meta.device)),
                    Number(state.humidity),
                    state,
                    isFahrenheit(meta.device),
                ),
            };
        },
    };

    return {fromZigbee: [fromZigbee], isModernExtend: true};
}

function sth1zTemperature(): ModernExtend {
    const fromZigbee: TemperatureFzConverter = {
        cluster: "msTemperatureMeasurement",
        type: ["attributeReport", "readResponse"],
        convert: (_model, msg, _publish, _options, meta) => {
            if (msg.data.measuredValue === undefined) return;
            const temperature = Number(msg.data.measuredValue) / 100;

            return {
                temperature: round(toDisplayTemperature(temperature, isFahrenheit(meta.device)), 1),
            };
        },
    };
    const expose = (device: ExposeDevice) => [
        e
            .numeric("temperature", ea.STATE)
            .withUnit(isFahrenheit(device) ? "°F" : "°C")
            .withValueStep(0.1),
    ];

    return {exposes: [expose], fromZigbee: [fromZigbee], isModernExtend: true};
}

function sth1zDerivedEnvironment(): ModernExtend {
    const fromZigbee: [TemperatureFzConverter, HumidityFzConverter] = [
        {
            cluster: "msTemperatureMeasurement",
            type: ["attributeReport", "readResponse"],
            convert: (_model, msg, _publish, _options, meta) => {
                if (msg.data.measuredValue === undefined) return;
                return deriveEnvironment(Number(msg.data.measuredValue) / 100, Number(meta.state.humidity), meta.state, isFahrenheit(meta.device));
            },
        },
        {
            cluster: "msRelativeHumidity",
            type: ["attributeReport", "readResponse"],
            convert: (_model, msg, _publish, _options, meta) => {
                if (msg.data.measuredValue === undefined) return;
                return deriveEnvironment(
                    toCelsiusTemperature(Number(meta.state.temperature), isFahrenheit(meta.device)),
                    Number(msg.data.measuredValue) / 100,
                    meta.state,
                    isFahrenheit(meta.device),
                );
            },
        },
    ];
    const toZigbee: Tz.Converter[] = [
        {
            key: Object.values(comfortStateKeys),
            convertSet: async (entity, key, value, meta) => {
                const fahrenheit = isFahrenheit(meta.device);
                const temperatureSetting = key === comfortStateKeys.temperatureLower || key === comfortStateKeys.temperatureUpper;
                const displayValue = Number(value);
                const decision = temperatureSetting
                    ? resolveTemperatureWrite(displayValue, fahrenheit, getConfirmedTemperatureValue(meta.device, key))
                    : {shouldWrite: true, deviceValue: displayValue, stateValue: displayValue};
                const normalized = temperatureSetting ? decision.deviceValue : displayValue;

                if (
                    !Number.isFinite(normalized) ||
                    (temperatureSetting && (normalized < -20 || normalized > 60)) ||
                    (!temperatureSetting && (normalized < 0 || normalized > 100))
                ) {
                    throw new Error(`${key} is outside its supported range`);
                }

                const attribute = isSth2z(meta.device) ? sth2zComfortAttributes[key as keyof typeof sth2zComfortAttributes] : undefined;
                const rawStep = temperatureSetting ? 10 : 100;
                const raw = attribute ? Math.round(Math.round(normalized * 100) / rawStep) * rawStep : undefined;
                const deviceValue = raw === undefined ? normalized : raw / 100;
                const stateValue = temperatureSetting ? decision.stateValue : deviceValue;
                const state = {...meta.state, [key]: stateValue};
                const humidityLower = getStateNumber(state, comfortStateKeys.humidityLower, humidityComfortDefaults.humidityLower);
                const humidityUpper = getStateNumber(state, comfortStateKeys.humidityUpper, humidityComfortDefaults.humidityUpper);
                const temperatureLower = toCelsiusTemperature(
                    getStateNumber(state, comfortStateKeys.temperatureLower, humidityComfortDefaults.temperatureLower),
                    fahrenheit,
                );
                const temperatureUpper = toCelsiusTemperature(
                    getStateNumber(state, comfortStateKeys.temperatureUpper, humidityComfortDefaults.temperatureUpper),
                    fahrenheit,
                );

                if (humidityLower >= humidityUpper) {
                    throw new Error("comfort humidity lower limit must be below upper limit");
                }
                if (temperatureLower >= temperatureUpper) {
                    throw new Error("comfort temperature lower limit must be below upper limit");
                }

                if (attribute && raw !== undefined && (!temperatureSetting || decision.shouldWrite)) {
                    await writeFd22Attribute(entity, attribute, raw);
                    setConfirmedTemperatureValue(meta.device, key, deviceValue);
                }

                const nextState = {...meta.state, [key]: stateValue};

                return {
                    state: {
                        [key]: stateValue,
                        ...deriveEnvironment(
                            toCelsiusTemperature(Number(nextState.temperature), fahrenheit),
                            Number(nextState.humidity),
                            nextState,
                            fahrenheit,
                        ),
                    },
                };
            },
            convertGet: async (entity, key, meta) => {
                const attribute = isSth2z(meta.device) ? sth2zComfortAttributes[key as keyof typeof sth2zComfortAttributes] : undefined;
                if (attribute) {
                    await readFd22Attribute(entity, attribute);
                    return;
                }
                const defaultKey = Object.entries(comfortStateKeys).find(
                    ([, stateKey]) => stateKey === key,
                )?.[0] as keyof typeof humidityComfortDefaults;
                const temperatureSetting = key === comfortStateKeys.temperatureLower || key === comfortStateKeys.temperatureUpper;
                const fallback = humidityComfortDefaults[defaultKey];
                const currentValue = meta.state[key];
                const value =
                    currentValue === undefined || currentValue === null
                        ? temperatureSetting
                            ? round(toDisplayTemperature(fallback, isFahrenheit(meta.device)), 1)
                            : fallback
                        : Number(currentValue);

                return {
                    state: {
                        [key]: value,
                    },
                };
            },
        },
    ];
    const expose = (device: ExposeDevice) => {
        const fahrenheit = isFahrenheit(device);

        return [
            e
                .numeric("dew_point", ea.STATE)
                .withUnit(fahrenheit ? "°F" : "°C")
                .withValueStep(0.1),
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
            e
                .numeric(comfortStateKeys.temperatureLower, ea.STATE_SET)
                .withCategory("config")
                .withUnit(fahrenheit ? "°F" : "°C")
                .withValueMin(fahrenheit ? -4 : -20)
                .withValueMax(fahrenheit ? 140 : 60)
                .withValueStep(fahrenheit ? 0.2 : 0.1),
            e
                .numeric(comfortStateKeys.temperatureUpper, ea.STATE_SET)
                .withCategory("config")
                .withUnit(fahrenheit ? "°F" : "°C")
                .withValueMin(fahrenheit ? -4 : -20)
                .withValueMax(fahrenheit ? 140 : 60)
                .withValueStep(fahrenheit ? 0.2 : 0.1),
        ];
    };

    return {exposes: [expose], fromZigbee, toZigbee, isModernExtend: true};
}

function sth1zTemperatureUnit(): ModernExtend {
    const fromZigbee: RtiTekFzConverter = {
        cluster: rtiTekFd22,
        type: ["attributeReport", "readResponse"],
        convert: (_model, msg, _publish, _options, meta) => {
            if (msg.data.temperatureUnit === undefined) return;
            const fahrenheit = Number(msg.data.temperatureUnit) === 1;
            const previousFahrenheit = isFahrenheit(meta.device);

            setTemperatureUnit(meta.device, fahrenheit);
            if (previousFahrenheit !== fahrenheit) {
                meta.deviceExposesChanged?.();
            }

            return {
                temperature_unit: fahrenheit ? "fahrenheit" : "celsius",
                ...convertTemperatureState(meta.state ?? {}, previousFahrenheit, fahrenheit),
            };
        },
    };
    const toZigbee: Tz.Converter[] = [
        {
            key: ["temperature_unit"],
            convertSet: async (entity, _key, value, meta) => {
                if (value !== "celsius" && value !== "fahrenheit") {
                    throw new Error("temperature_unit must be celsius or fahrenheit");
                }

                const fahrenheit = value === "fahrenheit";
                const previousFahrenheit = isFahrenheit(meta.device);
                await writeFd22Attribute(entity, "temperatureUnit", fahrenheit ? 1 : 0);
                setTemperatureUnit(meta.device, fahrenheit);
                if (previousFahrenheit !== fahrenheit) {
                    notifyDeviceExposesChanged(meta);
                }

                return {
                    state: {
                        temperature_unit: value,
                        ...convertTemperatureState(meta.state ?? {}, previousFahrenheit, fahrenheit),
                    },
                };
            },
            convertGet: async (entity) => {
                await readFd22Attribute(entity, "temperatureUnit");
            },
        },
    ];
    const expose = [e.enum("temperature_unit", ea.STATE_SET, ["celsius", "fahrenheit"]).withCategory("config")];

    return {exposes: expose, fromZigbee: [fromZigbee], toZigbee, isModernExtend: true};
}

function sthzbProductName(): ModernExtend {
    const fromZigbee: RtiTekFzConverter = {
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
    };
    const toZigbee: Tz.Converter[] = [
        {
            key: ["product_name"],
            convertGet: async (entity) => readFd22Attribute(entity, "productName"),
        },
    ];

    return {
        exposes: [e.text("product_name", ea.STATE_GET).withCategory("diagnostic")],
        fromZigbee: [fromZigbee],
        toZigbee,
        isModernExtend: true,
    };
}

const calibrationSettings = {
    internal_temperature_calibration: {
        attribute: "internalTemperatureCalibration",
        scale: 10,
        unit: "°C",
        valueMin: -10,
        valueMax: 10,
        valueStep: 0.1,
    },
    internal_humidity_calibration: {
        attribute: "internalHumidityCalibration",
        scale: 10,
        unit: "%",
        valueMin: -10,
        valueMax: 10,
        valueStep: 0.1,
    },
    sample_interval: {
        attribute: "sampleInterval",
        scale: 1,
        unit: "s",
        valueMin: 1,
        valueMax: 3600,
        valueStep: 1,
    },
} as const;

function sth1zCalibrationSettings(): ModernExtend {
    const fromZigbee: RtiTekFzConverter = {
        cluster: rtiTekFd22,
        type: ["attributeReport", "readResponse"],
        convert: (_model, msg, _publish, _options, meta) => {
            const result: Record<string, number> = {};

            for (const [key, setting] of Object.entries(calibrationSettings)) {
                const raw = msg.data[setting.attribute];
                if (raw === undefined) continue;
                const value = Number(raw) / setting.scale;
                if (key === "internal_temperature_calibration") {
                    setConfirmedTemperatureValue(meta.device, key, value);
                }
                result[key] =
                    key === "internal_temperature_calibration" ? round(toDisplayTemperatureDelta(value, isFahrenheit(meta.device)), 1) : value;
            }

            return Object.keys(result).length === 0 ? undefined : result;
        },
    };
    const toZigbee: Tz.Converter[] = [
        {
            key: Object.keys(calibrationSettings),
            convertSet: async (entity, key, value, meta) => {
                const setting = calibrationSettings[key as keyof typeof calibrationSettings];
                const fahrenheit = isFahrenheit(meta.device);
                const displayValue = Number(value);
                const temperatureSetting = key === "internal_temperature_calibration";
                const decision = temperatureSetting
                    ? resolveTemperatureWrite(displayValue, fahrenheit, getConfirmedTemperatureValue(meta.device, key), "delta")
                    : {shouldWrite: true, deviceValue: displayValue, stateValue: displayValue};
                const normalized = temperatureSetting ? decision.deviceValue : displayValue;

                if (!Number.isFinite(normalized) || normalized < setting.valueMin || normalized > setting.valueMax) {
                    throw new Error(`${key} is outside its supported range`);
                }

                const raw = Math.round(normalized * setting.scale);
                if (!temperatureSetting || decision.shouldWrite) {
                    await writeFd22Attribute(entity, setting.attribute, raw);
                    if (temperatureSetting) setConfirmedTemperatureValue(meta.device, key, raw / setting.scale);
                }
                const stateValue = temperatureSetting ? decision.stateValue : raw / setting.scale;

                return {state: {[key]: stateValue}};
            },
            convertGet: async (entity, key) => {
                await readFd22Attribute(entity, calibrationSettings[key as keyof typeof calibrationSettings].attribute);
            },
        },
    ];
    const expose = (device: ExposeDevice) => {
        const fahrenheit = isFahrenheit(device);

        return [
            e
                .numeric("internal_temperature_calibration", ea.STATE_SET)
                .withCategory("config")
                .withUnit(fahrenheit ? "°F" : "°C")
                .withValueMin(fahrenheit ? -18 : -10)
                .withValueMax(fahrenheit ? 18 : 10)
                .withValueStep(0.1),
            e
                .numeric("internal_humidity_calibration", ea.STATE_SET)
                .withCategory("config")
                .withUnit("%")
                .withValueMin(-10)
                .withValueMax(10)
                .withValueStep(0.1),
            e.numeric("sample_interval", ea.STATE_SET).withCategory("config").withUnit("s").withValueMin(1).withValueMax(3600).withValueStep(1),
        ];
    };

    return {exposes: [expose], fromZigbee: [fromZigbee], toZigbee, isModernExtend: true};
}

const alarmSettings = {
    temperature_alarm_upper: {
        attribute: "temperatureAlarmUpper",
        scale: 100,
        valueMin: -30,
        valueMax: 60,
        valueStep: 0.1,
    },
    temperature_alarm_lower: {
        attribute: "temperatureAlarmLower",
        scale: 100,
        valueMin: -30,
        valueMax: 60,
        valueStep: 0.1,
    },
    humidity_alarm_upper: {
        attribute: "humidityAlarmUpper",
        scale: 100,
        valueMin: 0,
        valueMax: 100,
        valueStep: 1,
    },
    humidity_alarm_lower: {
        attribute: "humidityAlarmLower",
        scale: 100,
        valueMin: 0,
        valueMax: 100,
        valueStep: 1,
    },
} as const;

function isTemperatureAlarmKey(key: string): key is "temperature_alarm_upper" | "temperature_alarm_lower" {
    return key === "temperature_alarm_upper" || key === "temperature_alarm_lower";
}

export function validateAlarmLimits(state: Record<string, number>) {
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

function sth1zAlarmSettings(): ModernExtend {
    const fromZigbee: RtiTekFzConverter = {
        cluster: rtiTekFd22,
        type: ["attributeReport", "readResponse"],
        convert: (_model, msg, _publish, _options, meta) => {
            const result: Record<string, number> = {};

            for (const [key, setting] of Object.entries(alarmSettings)) {
                const raw = msg.data[setting.attribute];
                if (raw === undefined) continue;
                const value = Number(raw) / setting.scale;
                if (isTemperatureAlarmKey(key)) setConfirmedTemperatureValue(meta.device, key, value);
                result[key] = isTemperatureAlarmKey(key) ? round(toDisplayTemperature(value, isFahrenheit(meta.device)), 1) : value;
            }

            return Object.keys(result).length === 0 ? undefined : result;
        },
    };
    const toZigbee: Tz.Converter[] = [
        {
            key: Object.keys(alarmSettings),
            convertSet: async (entity, key, value, meta) => {
                const alarmKey = key as keyof typeof alarmSettings;
                const setting = alarmSettings[alarmKey];
                const fahrenheit = isFahrenheit(meta.device);
                const displayValue = Number(value);
                const temperatureSetting = isTemperatureAlarmKey(alarmKey);
                const decision = temperatureSetting
                    ? resolveTemperatureWrite(displayValue, fahrenheit, getConfirmedTemperatureValue(meta.device, key))
                    : {shouldWrite: true, deviceValue: displayValue, stateValue: displayValue};
                const normalized = temperatureSetting ? decision.deviceValue : displayValue;

                if (!Number.isFinite(normalized) || normalized < setting.valueMin || normalized > setting.valueMax) {
                    throw new Error(`${key} is outside its supported range`);
                }

                const normalizedState: Record<string, number> = {};
                for (const stateKey of Object.keys(alarmSettings)) {
                    const stateValue = meta.state[stateKey];
                    if (stateValue === undefined || stateValue === null) continue;
                    normalizedState[stateKey] = isTemperatureAlarmKey(stateKey)
                        ? toCelsiusTemperature(Number(stateValue), fahrenheit)
                        : Number(stateValue);
                }
                normalizedState[alarmKey] = normalized;
                validateAlarmLimits(normalizedState);

                const raw = Math.round(normalized * setting.scale);
                if (!temperatureSetting || decision.shouldWrite) {
                    await writeFd22Attribute(entity, setting.attribute, raw);
                    if (temperatureSetting) setConfirmedTemperatureValue(meta.device, key, raw / setting.scale);
                }
                const stateValue = temperatureSetting ? decision.stateValue : raw / setting.scale;

                return {state: {[key]: stateValue}};
            },
            convertGet: async (entity, key) => {
                await readFd22Attribute(entity, alarmSettings[key as keyof typeof alarmSettings].attribute);
            },
        },
    ];
    const expose = (device: ExposeDevice) => {
        const fahrenheit = isFahrenheit(device);

        return [
            e
                .numeric("temperature_alarm_upper", ea.STATE_SET)
                .withCategory("config")
                .withUnit(fahrenheit ? "°F" : "°C")
                .withValueMin(fahrenheit ? -22 : -30)
                .withValueMax(fahrenheit ? 140 : 60)
                .withValueStep(0.1),
            e
                .numeric("temperature_alarm_lower", ea.STATE_SET)
                .withCategory("config")
                .withUnit(fahrenheit ? "°F" : "°C")
                .withValueMin(fahrenheit ? -22 : -30)
                .withValueMax(fahrenheit ? 140 : 60)
                .withValueStep(0.1),
            e.numeric("humidity_alarm_upper", ea.STATE_SET).withCategory("config").withUnit("%").withValueMin(0).withValueMax(100).withValueStep(1),
            e.numeric("humidity_alarm_lower", ea.STATE_SET).withCategory("config").withUnit("%").withValueMin(0).withValueMax(100).withValueStep(1),
        ];
    };

    return {exposes: [expose], fromZigbee: [fromZigbee], toZigbee, isModernExtend: true};
}

export function formatFaultCode(value: number): string {
    const raw = value >>> 0;
    if (raw === 0) return "none";

    const knownMask = Object.keys(faultBits).reduce((mask, bit) => mask | (1 << Number(bit)), 0);
    const faults = Object.entries(faultBits)
        .filter(([bit]) => (raw & (1 << Number(bit))) !== 0)
        .map(([, text]) => text);
    const unknown = (raw & ~knownMask) >>> 0;
    if (unknown !== 0) {
        faults.push(`unknown_0x${unknown.toString(16).padStart(8, "0")}`);
    }

    return faults.join(",");
}

function sth1zDiagnostics(): ModernExtend {
    const fromZigbee: RtiTekFzConverter = {
        cluster: rtiTekFd22,
        type: ["attributeReport", "readResponse"],
        convert: (_model, msg) => {
            const result: Record<string, string> = {};

            if (msg.data.faultCode !== undefined) {
                result.fault_status = formatFaultCode(Number(msg.data.faultCode));
            }
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

            return Object.keys(result).length === 0 ? undefined : result;
        },
    };
    const toZigbee: Tz.Converter[] = [
        {
            key: ["fault_status"],
            convertGet: async (entity) => {
                await readFd22Attribute(entity, "faultCode");
            },
        },
        {
            key: ["temperature_alarm_status"],
            convertGet: async (entity) => {
                await readFd22Attribute(entity, "temperatureAlarmStatus");
            },
        },
        {
            key: ["humidity_alarm_status"],
            convertGet: async (entity) => {
                await readFd22Attribute(entity, "humidityAlarmStatus");
            },
        },
    ];
    const expose = [
        e.text("fault_status", ea.STATE_GET).withCategory("diagnostic"),
        e.enum("temperature_alarm_status", ea.STATE_GET, ["normal", "low", "high"]).withCategory("diagnostic"),
        e.enum("humidity_alarm_status", ea.STATE_GET, ["normal", "low", "high"]).withCategory("diagnostic"),
    ];

    return {exposes: expose, fromZigbee: [fromZigbee], toZigbee, isModernExtend: true};
}

type EtrvZb01Entity = Zh.Endpoint | Zh.Group;

const rtiTekAttributes = {
    childLock: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
    faultCode: {ID: 0x0002, type: Zcl.DataType.BITMAP32},
    productName: {ID: 0x0003, type: Zcl.DataType.CHAR_STR},
    screenDirection: {ID: 0x0008, type: Zcl.DataType.UINT8},
    screenDisplayDuration: {ID: 0x0009, type: Zcl.DataType.UINT16},
    screenBrightness: {ID: 0x000a, type: Zcl.DataType.UINT8},
    openWindowDetection: {ID: 0x1000, type: Zcl.DataType.BOOLEAN},
    windowState: {ID: 0x1001, type: Zcl.DataType.ENUM8},
    valveOpening: {ID: 0x1002, type: Zcl.DataType.UINT16},
    temperatureControlMode: {ID: 0x1004, type: Zcl.DataType.ENUM8},
    valveSwitchingDifference: {ID: 0x1005, type: Zcl.DataType.INT16},
    frostProtectionEnabled: {ID: 0x1007, type: Zcl.DataType.BOOLEAN},
    comfortTemperature: {ID: 0x1008, type: Zcl.DataType.INT16},
    ecoTemperature: {ID: 0x1009, type: Zcl.DataType.INT16},
    frostTemperature: {ID: 0x100a, type: Zcl.DataType.INT16},
    lowBatteryValveState: {ID: 0x1013, type: Zcl.DataType.UINT8},
    manualTemperatureInAutoSupported: {ID: 0x1014, type: Zcl.DataType.BOOLEAN},
    motorTravelCalibration: {ID: 0x1016, type: Zcl.DataType.BOOLEAN},
    motorTravelCalibrationError: {ID: 0x1017, type: Zcl.DataType.UINT8},
    holidayDuration: {ID: 0x1018, type: Zcl.DataType.UINT32},
    boostDuration: {ID: 0x1019, type: Zcl.DataType.UINT32},
} as const;

const readAttribute = async (entity: EtrvZb01Entity, cluster: string, attribute: string) => {
    const response = await entity.read(cluster as never, [attribute] as never);
    return response[attribute as never] as unknown;
};

const writeAttributes = async (entity: EtrvZb01Entity, cluster: string, payload: Record<string, unknown>) =>
    entity.write(cluster as never, payload as never);

const command = async (entity: Zh.Endpoint, cluster: string, commandName: string, payload: Record<string, unknown>) =>
    entity.command(cluster as never, commandName as never, payload as never);

const etrvZb01Binary = (
    name: string,
    attribute: string,
    description: string,
    valueOn: boolean | number = true,
    valueOff: boolean | number = false,
) => {
    const extension = m.binary({
        name,
        cluster: rtiTekFd22,
        attribute: rtiTekAttributes[attribute as keyof typeof rtiTekAttributes],
        valueOn: ["ON", valueOn],
        valueOff: ["OFF", valueOff],
        entityCategory: "config",
        description,
    });
    return {
        ...extension,
        fromZigbee: [
            {
                cluster: rtiTekFd22,
                type: ["attributeReport", "readResponse"],
                convert: (_model, msg) => {
                    const value = msg.data[attribute];
                    if (typeof value !== "boolean" && typeof value !== "number") return undefined;
                    return {[name]: value ? "ON" : "OFF"};
                },
            },
        ],
    } satisfies ModernExtend;
};

const calibrateValve: Tz.Converter = {
    key: ["calibrate_valve"],
    convertSet: async (entity, key, value, meta: Tz.Meta) => {
        if (value !== "start") {
            throw new Error("calibrate_valve only accepts start");
        }
        const update = meta.state.update;
        if (typeof update === "object" && update !== null && "state" in update && update.state === "updating") {
            throw new Error("Cannot calibrate valve while OTA update is in progress");
        }
        await writeAttributes(entity, rtiTekFd22, {motorTravelCalibration: true});
        return {state: {[key]: "start"}};
    },
};

const temperatureControlModeEco = 1;
const systemModeAuto = 1;
const systemModeLookup: Record<string, number> = {off: 0, auto: 1, heat: 4};
const boostDurationLookup: Record<string, number> = {"0": 0, "30": 1800, "60": 3600, "90": 5400, "120": 7200};

const readNumberAttribute = async (entity: EtrvZb01Entity, cluster: string, attribute: string) => {
    try {
        const value = await readAttribute(entity, cluster, attribute);
        if (typeof value !== "number") throw new Error(`Missing ${attribute}`);
        return value;
    } catch {
        throw new Error("cannot verify the current mode");
    }
};

const modeRestrictedSettings: Tz.Converter = {
    key: ["valve_switching_difference", "boost_duration"],
    convertSet: async (entity, key, value) => {
        if (key === "valve_switching_difference") {
            if (typeof value !== "number") throw new Error("valve_switching_difference must be a number");
            const temperatureControlMode = await readNumberAttribute(entity, rtiTekFd22, "temperatureControlMode");
            if (temperatureControlMode !== temperatureControlModeEco) {
                throw new Error("valve_switching_difference is only available in eco mode");
            }
            await writeAttributes(entity, rtiTekFd22, {valveSwitchingDifference: Math.round(value * 100)});
            return {state: {[key]: value}};
        }

        if (typeof value !== "string" || !(value in boostDurationLookup)) {
            throw new Error("boost_duration must be one of 0, 30, 60, 90, or 120");
        }
        if (value === "0") {
            await writeAttributes(entity, rtiTekFd22, {boostDuration: 0});
            return {state: {[key]: value}};
        }
        const systemMode = await readNumberAttribute(entity, "hvacThermostat", "systemMode");
        const holidayDuration = systemMode === systemModeAuto ? 0 : await readNumberAttribute(entity, rtiTekFd22, "holidayDuration");
        if (systemMode !== systemModeAuto && holidayDuration <= 0) {
            throw new Error("boost_duration is only available in auto or holiday mode");
        }
        await writeAttributes(entity, rtiTekFd22, {boostDuration: boostDurationLookup[value]});
        return {state: {[key]: value}};
    },
    convertGet: async (entity, key) => {
        if (key === "valve_switching_difference") {
            await readAttribute(entity, rtiTekFd22, "valveSwitchingDifference");
        } else {
            await readAttribute(entity, rtiTekFd22, "boostDuration");
        }
    },
};

const etrvZb01StateReadChunkSize = 4;

const readEtrvZb01Attributes = async (endpoint: Zh.Endpoint, cluster: string, attributes: string[]) => {
    for (let start = 0; start < attributes.length; start += etrvZb01StateReadChunkSize) {
        const chunk = attributes.slice(start, start + etrvZb01StateReadChunkSize);
        try {
            await endpoint.read(cluster as never, chunk as never);
        } catch {
            // Retry each attribute so one unsupported value does not block the rest.
            for (const attribute of chunk) {
                try {
                    await endpoint.read(cluster as never, [attribute] as never);
                } catch {
                    // The device may not implement every optional private attribute.
                }
            }
        }
    }
};

const readEnabledAttribute = async (entity: EtrvZb01Entity, cluster: string, attribute: string) => {
    try {
        const value = await readAttribute(entity, cluster, attribute);
        if (typeof value !== "boolean" && typeof value !== "number") throw new Error(`Missing ${attribute}`);
        return value !== false && value !== 0;
    } catch {
        throw new Error("cannot verify temporary manual mode support");
    }
};

const readStringAttribute = async (entity: EtrvZb01Entity, cluster: string, attribute: string) => {
    const value = await readAttribute(entity, cluster, attribute);
    if (typeof value !== "string") throw new Error(`Missing ${attribute}`);
    return value;
};

const readEtrvZb01State = async (device: Zh.Device) => {
    const endpoint = device.getEndpoint(1);
    if (!endpoint) return;

    const reads: [string, string[]][] = [
        ["genPowerCfg", ["batteryPercentageRemaining"]],
        ["hvacThermostat", ["localTemp", "localTemperatureCalibration", "occupiedHeatingSetpoint", "systemMode"]],
        [
            rtiTekFd22,
            [
                "childLock",
                "openWindowDetection",
                "frostProtectionEnabled",
                "windowState",
                "valveOpening",
                "temperatureControlMode",
                "valveSwitchingDifference",
                "productName",
                "screenDirection",
                "holidayDuration",
                "boostDuration",
                "screenBrightness",
                "screenDisplayDuration",
                "lowBatteryValveState",
                "faultCode",
                "motorTravelCalibrationError",
            ],
        ],
    ];

    for (const [cluster, attributes] of reads) {
        await readEtrvZb01Attributes(endpoint, cluster, attributes);
    }

    await syncWeeklySchedules(device);
};

export const etrvZb01StateSync: ModernExtend = {
    configure: [readEtrvZb01State],
    onEvent: [
        async (event) => {
            if (event.type === "deviceAnnounce") await readEtrvZb01State(event.data.device);
        },
    ],
    isModernExtend: true,
};

const weeklyScheduleDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const weeklyScheduleKeys = weeklyScheduleDays.map((day) => `weekly_schedule_${day}`);
const weeklyScheduleMaxTransitions = 6;
const weeklyScheduleDeviceTransitions = 6;
const weeklyScheduleHeatMode = 0x01;
const weeklyScheduleResponseTimeoutMs = 3000;
const weeklyScheduleRetryDelayMs = 10000;
const weeklyScheduleReadAttempts = 2;
const weeklyScheduleDescription =
    "Up to 6 transitions in the format HH:mm/temperature, separated by spaces. " +
    "Times must be whole minutes in ascending order; temperatures are 5-30 C in 0.5 C steps.";

type WeeklyScheduleTransition = {transitionTime: number; heatSetpoint: number};

const temporaryManualActive = new Set<string>();
const temporaryManualTimers = new Map<string, ReturnType<typeof setTimeout>>();
const temporaryManualSetpointReports = new Map<string, number>();
const weeklyScheduleCache = new Map<string, Map<number, WeeklyScheduleTransition[]>>();

const clearTemporaryManualTimer = (ieeeAddr: string) => {
    const timer = temporaryManualTimers.get(ieeeAddr);
    if (timer) clearTimeout(timer);
    temporaryManualTimers.delete(ieeeAddr);
};

const clearTemporaryManualMode = (ieeeAddr: string) => {
    clearTemporaryManualTimer(ieeeAddr);
    temporaryManualActive.delete(ieeeAddr);
    temporaryManualSetpointReports.delete(ieeeAddr);
    return "inactive";
};

const currentWeeklyScheduleSetpoint = (ieeeAddr: string, now = new Date()) => {
    const schedules = weeklyScheduleCache.get(ieeeAddr);
    if (!schedules) return undefined;

    const today = now.getDay();
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    const currentDayTransitions = schedules.get(1 << today);
    if (!currentDayTransitions) return undefined;
    const currentTransition = currentDayTransitions?.findLast(({transitionTime}) => transitionTime <= currentMinute);
    if (currentTransition) return currentTransition.heatSetpoint;

    // Before the first transition, the previous day's final value remains active.
    for (let offset = 1; offset <= weeklyScheduleDays.length; offset++) {
        const previousDay = (today - offset + weeklyScheduleDays.length) % weeklyScheduleDays.length;
        const previousTransition = schedules.get(1 << previousDay)?.at(-1);
        if (previousTransition) return previousTransition.heatSetpoint;
    }
    return undefined;
};

const nextTemporaryManualTransition = (ieeeAddr: string, now = new Date()) => {
    const schedules = weeklyScheduleCache.get(ieeeAddr);
    if (!schedules) return undefined;

    const today = now.getDay();
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    const todayTransition = schedules.get(1 << today)?.find(({transitionTime}) => transitionTime > currentMinute);
    if (todayTransition) {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, todayTransition.transitionTime);
    }

    const tomorrow = (today + 1) % weeklyScheduleDays.length;
    const tomorrowTransition = schedules.get(1 << tomorrow)?.at(0);
    if (!tomorrowTransition) return undefined;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, tomorrowTransition.transitionTime);
};

const refreshTemporaryManualMode = (ieeeAddr: string, publish: (payload: Record<string, string>) => void) => {
    if (!temporaryManualActive.has(ieeeAddr)) return undefined;

    const transition = nextTemporaryManualTransition(ieeeAddr);
    clearTemporaryManualTimer(ieeeAddr);
    if (!transition) return "unknown";

    const timer = setTimeout(
        () => {
            temporaryManualTimers.delete(ieeeAddr);
            if (!temporaryManualActive.delete(ieeeAddr)) return;
            temporaryManualSetpointReports.delete(ieeeAddr);
            publish({temporary_manual_mode: "inactive"});
        },
        Math.max(0, transition.getTime() - Date.now()),
    );
    timer.unref?.();
    temporaryManualTimers.set(ieeeAddr, timer);
    return "active";
};

const setTemporaryManualMode = (ieeeAddr: string, publish: (payload: Record<string, string>) => void) => {
    temporaryManualActive.add(ieeeAddr);
    return refreshTemporaryManualMode(ieeeAddr, publish);
};

const temporaryManualModeFromReportedSetpoint = (ieeeAddr: string, publish: (payload: Record<string, string>) => void) => {
    const reportedSetpoint = temporaryManualSetpointReports.get(ieeeAddr);
    if (reportedSetpoint === undefined) return undefined;

    const scheduledSetpoint = currentWeeklyScheduleSetpoint(ieeeAddr);
    if (scheduledSetpoint === undefined) return "unknown";
    if (reportedSetpoint !== scheduledSetpoint) return setTemporaryManualMode(ieeeAddr, publish);

    // A matching temperature may still have been set manually, which the protocol cannot distinguish.
    return temporaryManualActive.has(ieeeAddr) ? refreshTemporaryManualMode(ieeeAddr, publish) : "unknown";
};

const errorCodeLabels: Record<number, string> = {
    0: "Internal sensor fault",
    1: "Motor operation fault",
    2: "Critical battery level",
    3: "Firmware upgrade disabled due to low battery",
    4: "Battery",
};

const formatErrorCode = (value: unknown) => {
    if (typeof value !== "number") return undefined;
    const raw = value >>> 0;
    if (raw === 0) return "No error";

    const labels = Object.entries(errorCodeLabels)
        .filter(([bit]) => (raw & (1 << Number(bit))) !== 0)
        .map(([, label]) => label);
    const knownMask = Object.keys(errorCodeLabels).reduce((mask, bit) => mask | (1 << Number(bit)), 0);
    const unknown = raw & ~knownMask;
    if (unknown !== 0) labels.push(`Unknown error (0x${(unknown >>> 0).toString(16).toUpperCase()})`);
    return labels.join(", ");
};

const etrvZb01ErrorStatus: ModernExtend = {
    exposes: [
        e.enum("calibrate_valve", ea.SET, ["start"]).withCategory("config").withDescription("Start valve travel calibration"),
        e.text("error_code", ea.STATE_GET).withCategory("diagnostic").withDescription("Device error status"),
        e.text("motor_calibration_error", ea.STATE_GET).withCategory("diagnostic").withDescription("Motor travel calibration status"),
    ],
    fromZigbee: [
        {
            cluster: rtiTekFd22,
            type: ["attributeReport", "readResponse"],
            convert: (_model, msg) => {
                const state: Record<string, string> = {};
                const errorCode = formatErrorCode(msg.data.faultCode);
                if (errorCode !== undefined) state.error_code = errorCode;
                if (typeof msg.data.motorTravelCalibrationError === "number") {
                    state.motor_calibration_error = msg.data.motorTravelCalibrationError === 0 ? "Success" : "Failed";
                }
                return Object.keys(state).length > 0 ? state : undefined;
            },
        },
    ],
    toZigbee: [
        {
            key: ["error_code", "motor_calibration_error"],
            convertGet: async (entity, key) => {
                const attribute = key === "error_code" ? "faultCode" : "motorTravelCalibrationError";
                await readAttribute(entity, rtiTekFd22, attribute);
            },
        },
    ],
    isModernExtend: true,
};

const padWeeklySchedule = (transitions: WeeklyScheduleTransition[]) => {
    const padded = [...transitions];
    const finalTransition = padded.at(-1);
    if (!finalTransition) return padded;
    while (padded.length < weeklyScheduleDeviceTransitions) {
        padded.push({...finalTransition});
    }
    return padded;
};

const exitBoost = async (entity: EtrvZb01Entity) => {
    await writeAttributes(entity, rtiTekFd22, {boostDuration: 0});
};

const etrvZb01SystemMode: Tz.Converter = {
    key: ["system_mode"],
    convertSet: async (entity, key, value, meta) => {
        if (typeof value !== "string" || !(value in systemModeLookup)) {
            throw new Error("system_mode must be one of off, auto, or heat");
        }

        await exitBoost(entity);
        await writeAttributes(entity, "hvacThermostat", {systemMode: systemModeLookup[value]});
        await writeAttributes(entity, rtiTekFd22, {holidayDuration: 0});

        const state: Record<string, string | number> = {
            [key]: value,
            boost_duration: "0",
            holiday_duration: 0,
        };
        if (meta.device?.ieeeAddr) state.temporary_manual_mode = clearTemporaryManualMode(meta.device.ieeeAddr);
        return {state};
    },
    convertGet: async (entity) => {
        await readAttribute(entity, "hvacThermostat", "systemMode");
    },
};

const etrvZb01HolidayDuration: ModernExtend = {
    exposes: [
        e
            .numeric("holiday_duration", ea.ALL)
            .withValueMin(0)
            .withValueMax(60)
            .withValueStep(1)
            .withUnit("days")
            .withCategory("config")
            .withDescription("Holiday duration"),
    ],
    fromZigbee: [
        {
            cluster: rtiTekFd22,
            type: ["attributeReport", "readResponse"],
            convert: (_model, msg) => {
                const value = msg.data.holidayDuration;
                return typeof value === "number" ? {holiday_duration: value / 24} : undefined;
            },
        },
    ],
    toZigbee: [
        {
            key: ["holiday_duration"],
            convertSet: async (entity, key, value) => {
                if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 60) {
                    throw new Error("holiday_duration must be an integer between 0 and 60");
                }

                await exitBoost(entity);
                await writeAttributes(entity, rtiTekFd22, {holidayDuration: value * 24});
                return {state: {[key]: value, boost_duration: "0"}};
            },
            convertGet: async (entity) => {
                await readAttribute(entity, rtiTekFd22, "holidayDuration");
            },
        },
    ],
    isModernExtend: true,
};

const screenDirectionLookup: Record<string, number> = {"0": 0, "90": 3, "180": 1, "270": 2};
const screenDirectionValues: Record<number, string> = {0: "0", 1: "180", 2: "270", 3: "90"};

const screenDirectionOptions = (productName: unknown) => (productName === "eTRV-602" ? Object.keys(screenDirectionLookup) : ["0", "180"]);

const etrvZb01ProductName: ModernExtend = {
    exposes: [e.text("product_name", ea.STATE_GET).withCategory("diagnostic").withDescription("Device product name")],
    isModernExtend: true,
};

const etrvZb01ScreenDirection: ModernExtend = {
    exposes: [
        (device) => [
            e
                .enum(
                    "screen_direction",
                    ea.ALL,
                    screenDirectionOptions(
                        "isDummyDevice" in device
                            ? undefined
                            : device.getEndpoint(1)?.getClusterAttributeValue(rtiTekFd22 as never, "productName" as never),
                    ),
                )
                .withCategory("config")
                .withDescription("Screen orientation in degrees"),
        ],
    ],
    fromZigbee: [
        {
            cluster: rtiTekFd22,
            type: ["attributeReport", "readResponse"],
            convert: (_model, msg, _publish, _options, meta) => {
                const state: Record<string, string> = {};
                if (typeof msg.data.productName === "string") {
                    state.product_name = msg.data.productName;
                    meta.deviceExposesChanged();
                }
                const direction = msg.data.screenDirection;
                if (typeof direction === "number" && direction in screenDirectionValues) {
                    state.screen_direction = screenDirectionValues[direction];
                }
                return Object.keys(state).length > 0 ? state : undefined;
            },
        },
    ],
    toZigbee: [
        {
            key: ["screen_direction"],
            convertSet: async (entity, key, value) => {
                if (typeof value !== "string" || !(value in screenDirectionLookup)) {
                    throw new Error("screen_direction must be one of 0, 90, 180, or 270");
                }
                const productName = await readStringAttribute(entity, rtiTekFd22, "productName");
                if (!screenDirectionOptions(productName).includes(value)) {
                    throw new Error(`screen_direction ${value} is not supported by ${productName}`);
                }
                await writeAttributes(entity, rtiTekFd22, {screenDirection: screenDirectionLookup[value]});
                return {state: {[key]: value}};
            },
            convertGet: async (entity) => {
                await readAttribute(entity, rtiTekFd22, "screenDirection");
            },
        },
        {
            key: ["product_name"],
            convertGet: async (entity) => {
                await readAttribute(entity, rtiTekFd22, "productName");
            },
        },
    ],
    isModernExtend: true,
};

const trimWeeklySchedulePadding = (transitions: unknown) => {
    if (!Array.isArray(transitions)) return transitions;

    const trimmed = [...transitions];
    while (trimmed.length > 1) {
        const finalTransition = trimmed.at(-1);
        const previousTransition = trimmed.at(-2);
        if (
            typeof finalTransition !== "object" ||
            finalTransition === null ||
            typeof previousTransition !== "object" ||
            previousTransition === null ||
            !("transitionTime" in finalTransition) ||
            !("heatSetpoint" in finalTransition) ||
            !("transitionTime" in previousTransition) ||
            !("heatSetpoint" in previousTransition) ||
            finalTransition.transitionTime !== previousTransition.transitionTime ||
            finalTransition.heatSetpoint !== previousTransition.heatSetpoint
        ) {
            break;
        }
        trimmed.pop();
    }
    return trimmed;
};

type WeeklyScheduleResponseWaiter = {
    dayofweek: number;
    complete: (received: boolean) => void;
};

const weeklyScheduleResponseWaiters = new Map<string, WeeklyScheduleResponseWaiter>();
const weeklyScheduleSyncs = new Map<string, Promise<void>>();
const weeklySchedulePendingDays = new Map<string, number>();
const weeklyScheduleRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();

const waitForWeeklyScheduleResponse = (ieeeAddr: string, dayofweek: number) => {
    let complete: (received: boolean) => void;
    const response = new Promise<boolean>((resolve) => {
        complete = (received) => resolve(received);
    });
    const waiter: WeeklyScheduleResponseWaiter = {
        dayofweek,
        complete: (received) => {
            if (weeklyScheduleResponseWaiters.get(ieeeAddr) !== waiter) return;
            clearTimeout(timeout);
            weeklyScheduleResponseWaiters.delete(ieeeAddr);
            complete(received);
        },
    };
    const timeout = setTimeout(() => waiter.complete(false), weeklyScheduleResponseTimeoutMs);
    weeklyScheduleResponseWaiters.set(ieeeAddr, waiter);
    return {response, cancel: () => waiter.complete(false)};
};

const readWeeklyScheduleDays = async (endpoint: Zh.Endpoint, ieeeAddr: string, dayMask: number) => {
    for (const [index] of weeklyScheduleDays.entries()) {
        const dayofweek = 1 << index;
        if ((dayMask & dayofweek) === 0) continue;
        for (let attempt = 0; attempt < weeklyScheduleReadAttempts; attempt++) {
            const waiter = waitForWeeklyScheduleResponse(ieeeAddr, dayofweek);
            try {
                await command(endpoint, "hvacThermostat", "getWeeklySchedule", {
                    daystoreturn: dayofweek,
                    modetoreturn: weeklyScheduleHeatMode,
                });
            } catch {
                waiter.cancel();
            }
            if (await waiter.response) break;
        }
    }
};

const scheduleWeeklyScheduleRetry = (device: Zh.Device, ieeeAddr: string) => {
    const pendingDays = weeklySchedulePendingDays.get(ieeeAddr) ?? 0;
    if (pendingDays === 0) {
        weeklySchedulePendingDays.delete(ieeeAddr);
        return;
    }
    if (weeklyScheduleRetryTimers.has(ieeeAddr)) return;

    const retryTimer = setTimeout(async () => {
        weeklyScheduleRetryTimers.delete(ieeeAddr);
        const endpoint = device.getEndpoint(1);
        const missingDays = weeklySchedulePendingDays.get(ieeeAddr) ?? 0;
        if (!endpoint || missingDays === 0) {
            weeklySchedulePendingDays.delete(ieeeAddr);
            return;
        }

        try {
            await readWeeklyScheduleDays(endpoint, ieeeAddr, missingDays);
        } finally {
            weeklySchedulePendingDays.delete(ieeeAddr);
        }
    }, weeklyScheduleRetryDelayMs);
    weeklyScheduleRetryTimers.set(ieeeAddr, retryTimer);
};

const syncWeeklySchedules = async (device: Zh.Device) => {
    const ieeeAddr = device.ieeeAddr;
    const endpoint = device.getEndpoint(1);
    if (!ieeeAddr || !endpoint) return;

    const existingSync = weeklyScheduleSyncs.get(ieeeAddr);
    if (existingSync) return existingSync;
    if (weeklyScheduleRetryTimers.has(ieeeAddr)) return;

    const allDays = (1 << weeklyScheduleDays.length) - 1;
    weeklySchedulePendingDays.set(ieeeAddr, allDays);
    const sync = readWeeklyScheduleDays(endpoint, ieeeAddr, allDays);
    weeklyScheduleSyncs.set(ieeeAddr, sync);
    try {
        await sync;
    } finally {
        if (weeklyScheduleSyncs.get(ieeeAddr) === sync) weeklyScheduleSyncs.delete(ieeeAddr);
    }
    scheduleWeeklyScheduleRetry(device, ieeeAddr);
};

const resolveWeeklyScheduleResponse = (device: Zh.Device | undefined, dayofweek: number) => {
    const ieeeAddr = device?.ieeeAddr;
    if (!ieeeAddr) return;
    const pendingDays = weeklySchedulePendingDays.get(ieeeAddr);
    if (pendingDays !== undefined) weeklySchedulePendingDays.set(ieeeAddr, pendingDays & ~dayofweek);
    const waiter = weeklyScheduleResponseWaiters.get(ieeeAddr);
    if (waiter && (dayofweek & waiter.dayofweek) !== 0) waiter.complete(true);
};

export const parseWeeklySchedule = (value: unknown, day: string) => {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`Invalid schedule for ${day}: expected one or more HH:mm/temperature entries`);
    }

    const entries = value.trim().split(/\s+/);
    if (entries.length > weeklyScheduleMaxTransitions) {
        throw new Error(`Invalid schedule for ${day}: a day supports at most ${weeklyScheduleMaxTransitions} transitions`);
    }

    let previousTime = -1;
    return entries.map((entry) => {
        const match = entry.match(/^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])\/(\d+(?:\.\d+)?)$/);
        if (!match) {
            throw new Error(`Invalid schedule for ${day}: expected HH:mm/temperature, got ${entry}`);
        }

        const transitionTime = Number(match[1]) * 60 + Number(match[2]);
        const heatSetpoint = Number(match[3]) * 100;
        if (!Number.isInteger(heatSetpoint) || heatSetpoint < 500 || heatSetpoint > 3000 || heatSetpoint % 50 !== 0) {
            throw new Error(`Invalid schedule for ${day}: temperatures must be 5-30 C in 0.5 C steps`);
        }
        if (transitionTime <= previousTime) {
            throw new Error(`Invalid schedule for ${day}: transition times must be strictly increasing`);
        }
        previousTime = transitionTime;
        return {transitionTime, heatSetpoint};
    });
};

export const formatWeeklySchedule = (transitions: unknown): string | undefined => {
    if (!Array.isArray(transitions) || transitions.length === 0 || transitions.length > weeklyScheduleMaxTransitions) {
        return undefined;
    }

    let previousTime = -1;
    const entries: string[] = [];
    for (const transition of transitions) {
        if (typeof transition !== "object" || transition === null) {
            return undefined;
        }
        const {transitionTime, heatSetpoint} = transition as {transitionTime?: unknown; heatSetpoint?: unknown};
        if (
            typeof transitionTime !== "number" ||
            typeof heatSetpoint !== "number" ||
            !Number.isInteger(transitionTime) ||
            !Number.isInteger(heatSetpoint)
        ) {
            return undefined;
        }
        if (
            transitionTime < 0 ||
            transitionTime >= 24 * 60 ||
            transitionTime <= previousTime ||
            heatSetpoint < 500 ||
            heatSetpoint > 3000 ||
            heatSetpoint % 50 !== 0
        ) {
            return undefined;
        }
        previousTime = transitionTime;
        entries.push(
            `${Math.floor(transitionTime / 60)
                .toString()
                .padStart(2, "0")}:${(transitionTime % 60).toString().padStart(2, "0")}/${heatSetpoint / 100}`,
        );
    }
    return entries.join(" ");
};

const weeklyScheduleFromZigbee: Fz.Converter<"hvacThermostat", undefined, ["commandGetWeeklyScheduleRsp"]> = {
    cluster: "hvacThermostat",
    type: ["commandGetWeeklyScheduleRsp"],
    convert: (_model, msg, publish) => {
        const dayofweek = Number(msg.data.dayofweek);
        if (!Number.isInteger(dayofweek)) {
            return undefined;
        }
        resolveWeeklyScheduleResponse(msg.device, dayofweek);

        const transitions = trimWeeklySchedulePadding(msg.data.transitions);
        const schedule = formatWeeklySchedule(transitions);
        if (!schedule) return undefined;

        const state: Record<string, string> = {};
        for (const [index, day] of weeklyScheduleDays.entries()) {
            if ((dayofweek & (1 << index)) !== 0) {
                state[`weekly_schedule_${day}`] = schedule;
            }
        }
        if (msg.device?.ieeeAddr && Array.isArray(transitions)) {
            const normalized = transitions as WeeklyScheduleTransition[];
            const cache = weeklyScheduleCache.get(msg.device.ieeeAddr) ?? new Map<number, WeeklyScheduleTransition[]>();
            for (const [index] of weeklyScheduleDays.entries()) {
                if ((dayofweek & (1 << index)) !== 0) cache.set(1 << index, normalized);
            }
            weeklyScheduleCache.set(msg.device.ieeeAddr, cache);
            const temporaryManualMode = refreshTemporaryManualMode(msg.device.ieeeAddr, publish);
            if (temporaryManualMode) state.temporary_manual_mode = temporaryManualMode;
            const reportedSetpointMode = temporaryManualModeFromReportedSetpoint(msg.device.ieeeAddr, publish);
            if (reportedSetpointMode) state.temporary_manual_mode = reportedSetpointMode;
        }
        return Object.keys(state).length > 0 ? state : undefined;
    },
};

const weeklyScheduleToZigbee: Tz.Converter = {
    key: weeklyScheduleKeys,
    convertSet: async (entity, key: string, value: unknown, meta) => {
        const message = meta.message ?? {};
        const requestedKeys = Object.keys(message).filter((candidate) => weeklyScheduleKeys.includes(candidate));
        const schedules = new Map<string, string[]>();

        if (requestedKeys.length <= 1) {
            const day = key.replace("weekly_schedule_", "");
            schedules.set(value as string, [day]);
        } else {
            for (const scheduleKey of requestedKeys) {
                const day = scheduleKey.replace("weekly_schedule_", "");
                const schedule = message[scheduleKey];
                if (typeof schedule !== "string") {
                    throw new Error(`Invalid ${scheduleKey}: expected a schedule string`);
                }
                schedules.set(schedule, [...(schedules.get(schedule) ?? []), day]);
            }
        }

        const state: Record<string, string> = {};
        for (const [schedule, days] of schedules) {
            const transitions = padWeeklySchedule(parseWeeklySchedule(schedule, days.join(", ")));
            let dayofweek = 0;
            for (const day of days) {
                const index = weeklyScheduleDays.indexOf(day);
                if (index < 0) {
                    throw new Error(`Invalid weekly schedule day: ${day}`);
                }
                dayofweek |= 1 << index;
                state[`weekly_schedule_${day}`] = schedule;
            }
            if (!(entity instanceof Object) || !("command" in entity)) {
                throw new Error("weekly_schedule requires a device endpoint");
            }
            await command(entity as Zh.Endpoint, "hvacThermostat", "setWeeklySchedule", {
                dayofweek,
                numoftrans: transitions.length,
                mode: weeklyScheduleHeatMode,
                transitions,
            });
        }
        return {state};
    },
    convertGet: async (entity, key: string) => {
        const day = key.replace("weekly_schedule_", "");
        const index = weeklyScheduleDays.indexOf(day);
        if (index < 0) {
            throw new Error(`Invalid weekly schedule day: ${day}`);
        }
        if (!(entity instanceof Object) || !("command" in entity)) {
            throw new Error("weekly_schedule requires a device endpoint");
        }
        await command(entity as Zh.Endpoint, "hvacThermostat", "getWeeklySchedule", {
            daystoreturn: 1 << index,
            modetoreturn: weeklyScheduleHeatMode,
        });
    },
};

const requestTemporaryManualSchedules = (device: Zh.Device) => {
    const ieeeAddr = device.ieeeAddr;
    const endpoint = device.getEndpoint(1);
    if (!ieeeAddr || !endpoint || weeklyScheduleSyncs.has(ieeeAddr)) return;

    const today = new Date().getDay();
    const dayMask =
        (1 << ((today - 1 + weeklyScheduleDays.length) % weeklyScheduleDays.length)) |
        (1 << today) |
        (1 << ((today + 1) % weeklyScheduleDays.length));
    void readWeeklyScheduleDays(endpoint, ieeeAddr, dayMask);
};

const etrvZb01OccupiedHeatingSetpoint: Tz.Converter = {
    key: ["occupied_heating_setpoint"],
    convertSet: async (entity, key, value, meta) => {
        const result = await tz.thermostat_occupied_heating_setpoint.convertSet?.(entity as never, key, value, meta as never);
        const state = result && "state" in result ? {...(result.state ?? {})} : {};
        const ieeeAddr = meta.device?.ieeeAddr;
        if (!ieeeAddr) return {state};

        try {
            const [systemMode, manualTemperatureInAutoSupported] = await Promise.all([
                readNumberAttribute(entity, "hvacThermostat", "systemMode"),
                readEnabledAttribute(entity, rtiTekFd22, "manualTemperatureInAutoSupported"),
            ]);
            if (systemMode === systemModeAuto && manualTemperatureInAutoSupported) {
                state.temporary_manual_mode = setTemporaryManualMode(ieeeAddr, meta.publish);
                requestTemporaryManualSchedules(meta.device);
            } else {
                state.temporary_manual_mode = clearTemporaryManualMode(ieeeAddr);
            }
        } catch {
            clearTemporaryManualMode(ieeeAddr);
            state.temporary_manual_mode = "unknown";
        }
        return {state};
    },
    convertGet: async (entity, key, meta) => tz.thermostat_occupied_heating_setpoint.convertGet?.(entity as never, key, meta as never),
};

const etrvZb01TemporaryManualStatus: ModernExtend = {
    exposes: [
        e
            .enum("temporary_manual_mode", ea.STATE, ["active", "inactive", "unknown"])
            .withCategory("diagnostic")
            .withDescription("Temporary manual temperature status"),
    ],
    fromZigbee: [
        {
            cluster: "hvacThermostat",
            type: ["attributeReport", "readResponse"],
            convert: async (_model, msg, publish) => {
                const ieeeAddr = msg.device?.ieeeAddr;
                if (!ieeeAddr) return;

                if (typeof msg.data.systemMode === "number" && msg.data.systemMode !== systemModeAuto) {
                    publish({temporary_manual_mode: clearTemporaryManualMode(ieeeAddr)});
                    return;
                }
                if (typeof msg.data.occupiedHeatingSetpoint !== "number") return;

                try {
                    const [systemMode, manualTemperatureInAutoSupported] = await Promise.all([
                        readNumberAttribute(msg.endpoint, "hvacThermostat", "systemMode"),
                        readEnabledAttribute(msg.endpoint, rtiTekFd22, "manualTemperatureInAutoSupported"),
                    ]);
                    if (systemMode !== systemModeAuto) {
                        publish({temporary_manual_mode: clearTemporaryManualMode(ieeeAddr)});
                        return;
                    }
                    if (!manualTemperatureInAutoSupported) {
                        publish({temporary_manual_mode: clearTemporaryManualMode(ieeeAddr)});
                        return;
                    }

                    temporaryManualSetpointReports.set(ieeeAddr, msg.data.occupiedHeatingSetpoint);
                    const temporaryManualMode = temporaryManualModeFromReportedSetpoint(ieeeAddr, publish);
                    requestTemporaryManualSchedules(msg.device);
                    if (temporaryManualMode) publish({temporary_manual_mode: temporaryManualMode});
                } catch {
                    clearTemporaryManualMode(ieeeAddr);
                    publish({temporary_manual_mode: "unknown"});
                }
            },
        },
    ],
    onEvent: [
        (event) => {
            if (event.type === "stop") {
                for (const ieeeAddr of temporaryManualTimers.keys()) clearTemporaryManualMode(ieeeAddr);
                return;
            }
            if ((event.type === "start" || event.type === "deviceAnnounce") && event.data.device?.ieeeAddr && event.data.state) {
                clearTemporaryManualMode(event.data.device.ieeeAddr);
                event.data.state.temporary_manual_mode = "unknown";
            }
        },
    ],
    isModernExtend: true,
};

const etrvZb01Definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "eTRV-ZB01", manufacturerName: "Rti-Tek"}],
        model: "eTRV-ZB01",
        vendor: "Rti-Tek",
        description: "Thermostatic radiator valve",
        ota: true,
        fromZigbee: [weeklyScheduleFromZigbee],
        toZigbee: [etrvZb01OccupiedHeatingSetpoint, calibrateValve, modeRestrictedSettings, etrvZb01SystemMode, weeklyScheduleToZigbee],
        extend: [
            m.battery({percentageReporting: false}),
            m.deviceAddCustomCluster(rtiTekFd22, {
                name: rtiTekFd22,
                ID: 0xfd22,
                attributes: {
                    childLock: {name: "childLock", ID: 0x0001, type: Zcl.DataType.BOOLEAN, write: true},
                    screenDirection: {name: "screenDirection", ID: 0x0008, type: Zcl.DataType.UINT8, write: true},
                    screenDisplayDuration: {name: "screenDisplayDuration", ID: 0x0009, type: Zcl.DataType.UINT16, write: true},
                    screenBrightness: {name: "screenBrightness", ID: 0x000a, type: Zcl.DataType.UINT8, write: true},
                    faultCode: {name: "faultCode", ID: 0x0002, type: Zcl.DataType.BITMAP32},
                    productName: {name: "productName", ID: 0x0003, type: Zcl.DataType.CHAR_STR},
                    openWindowDetection: {name: "openWindowDetection", ID: 0x1000, type: Zcl.DataType.BOOLEAN, write: true},
                    windowState: {name: "windowState", ID: 0x1001, type: Zcl.DataType.ENUM8},
                    valveOpening: {name: "valveOpening", ID: 0x1002, type: Zcl.DataType.UINT16},
                    temperatureControlMode: {name: "temperatureControlMode", ID: 0x1004, type: Zcl.DataType.ENUM8, write: true},
                    valveSwitchingDifference: {name: "valveSwitchingDifference", ID: 0x1005, type: Zcl.DataType.INT16, write: true},
                    frostProtectionEnabled: {name: "frostProtectionEnabled", ID: 0x1007, type: Zcl.DataType.BOOLEAN, write: true},
                    comfortTemperature: {name: "comfortTemperature", ID: 0x1008, type: Zcl.DataType.INT16, write: true},
                    ecoTemperature: {name: "ecoTemperature", ID: 0x1009, type: Zcl.DataType.INT16, write: true},
                    frostTemperature: {name: "frostTemperature", ID: 0x100a, type: Zcl.DataType.INT16, write: true},
                    lowBatteryValveState: {name: "lowBatteryValveState", ID: 0x1013, type: Zcl.DataType.UINT8, write: true},
                    manualTemperatureInAutoSupported: {
                        name: "manualTemperatureInAutoSupported",
                        ID: 0x1014,
                        type: Zcl.DataType.BOOLEAN,
                    },
                    motorTravelCalibration: {name: "motorTravelCalibration", ID: 0x1016, type: Zcl.DataType.BOOLEAN, write: true},
                    motorTravelCalibrationError: {name: "motorTravelCalibrationError", ID: 0x1017, type: Zcl.DataType.UINT8},
                    holidayDuration: {name: "holidayDuration", ID: 0x1018, type: Zcl.DataType.UINT32, write: true},
                    boostDuration: {name: "boostDuration", ID: 0x1019, type: Zcl.DataType.UINT32, write: true},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.thermostat({
                localTemperature: {configure: {skip: true}},
                localTemperatureCalibration: {
                    values: {min: -10, max: 10, step: 0.1},
                    configure: {reporting: false},
                },
                setpoints: {
                    values: {occupiedHeatingSetpoint: {min: 5, max: 30, step: 0.5}},
                    configure: {reporting: false},
                    toZigbee: {skip: true},
                },
                systemMode: {values: ["off", "auto", "heat"], configure: {reporting: false}, toZigbee: {skip: true}},
            }),
            etrvZb01ProductName,
            etrvZb01StateSync,
            etrvZb01TemporaryManualStatus,
            etrvZb01ErrorStatus,
            m.enumLookup({
                name: "open_window_status",
                cluster: rtiTekFd22,
                attribute: rtiTekAttributes.windowState,
                lookup: {not_detected: 0, detected: 1},
                access: "STATE",
                description: "Open window detection state",
            }),
            m.numeric({
                name: "valve_opening",
                cluster: rtiTekFd22,
                attribute: rtiTekAttributes.valveOpening,
                access: "STATE",
                unit: "%",
                scale: 10,
                precision: 1,
                description: "Current valve opening",
            }),
            etrvZb01Binary("child_lock", "childLock", "Child lock", 1, 0),
            etrvZb01Binary("open_window_detection", "openWindowDetection", "Open window detection"),
            etrvZb01Binary("frost_protection_enabled", "frostProtectionEnabled", "Frost protection"),
            m.enumLookup({
                name: "temperature_control_mode",
                cluster: rtiTekFd22,
                attribute: rtiTekAttributes.temperatureControlMode,
                lookup: {PID: 0, "ON-OFF": 1},
                entityCategory: "config",
                description: "Temperature control algorithm",
            }),
            m.numeric({
                name: "valve_switching_difference",
                cluster: rtiTekFd22,
                attribute: rtiTekAttributes.valveSwitchingDifference,
                valueMin: 0.5,
                valueMax: 5,
                valueStep: 0.1,
                unit: "°C",
                scale: (value, direction) => (direction === "from" ? value / 100 : Math.round(value * 100)),
                entityCategory: "config",
                description: "Valve switching temperature difference",
            }),
            etrvZb01ScreenDirection,
            etrvZb01HolidayDuration,
            m.enumLookup({
                name: "boost_duration",
                cluster: rtiTekFd22,
                attribute: rtiTekAttributes.boostDuration,
                lookup: {"0": 0, "30": 1800, "60": 3600, "90": 5400, "120": 7200},
                entityCategory: "config",
                description: "Boost duration in minutes",
            }),
            m.enumLookup({
                name: "screen_brightness",
                cluster: rtiTekFd22,
                attribute: rtiTekAttributes.screenBrightness,
                lookup: {high: 0, medium: 1, low: 2},
                entityCategory: "config",
                description: "Screen brightness",
            }),
            m.enumLookup({
                name: "screen_display_duration",
                cluster: rtiTekFd22,
                attribute: rtiTekAttributes.screenDisplayDuration,
                lookup: {"5": 5, "10": 10, "15": 15},
                entityCategory: "config",
                description: "Screen display duration in seconds",
            }),
            m.enumLookup({
                name: "low_battery_valve_state",
                cluster: rtiTekFd22,
                attribute: rtiTekAttributes.lowBatteryValveState,
                lookup: {"0%": 0, "30%": 30},
                description: "Low-battery valve state",
            }),
            {
                exposes: [
                    ...weeklyScheduleDays.map((day) =>
                        e.text(`weekly_schedule_${day}`, ea.ALL).withCategory("config").withDescription(weeklyScheduleDescription),
                    ),
                ],
                isModernExtend: true,
            },
        ],
    },
];

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["STHZB"],
        model: "STHZB",
        vendor: "Rti-Tek",
        description: "Temperature and humidity sensor",
        ota: true,
        // Zigbee2MQTT consumes this OTA policy even though the local converter type has not exposed it yet.
        meta: {
            ota_battery_minimum_percentage: 50,
        } as unknown as DefinitionWithExtend["meta"],
        extend: [
            m.deviceAddCustomCluster(rtiTekFd22, {
                name: rtiTekFd22,
                ID: rtiTekFd22Id,
                attributes: {
                    temperatureUnit: {
                        name: "temperatureUnit",
                        ...rtiTekFd22Attributes.temperatureUnit,
                        write: true,
                        max: 0xff,
                    },
                    faultCode: {
                        name: "faultCode",
                        ...rtiTekFd22Attributes.faultCode,
                        max: 0xffffffff,
                    },
                    productName: {
                        name: "productName",
                        ...rtiTekFd22Attributes.productName,
                    },
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
                    sampleInterval: {
                        name: "sampleInterval",
                        ...rtiTekFd22Attributes.sampleInterval,
                        write: true,
                        max: 0xffff,
                    },
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
                    humidityAlarmUpper: {
                        name: "humidityAlarmUpper",
                        ...rtiTekFd22Attributes.humidityAlarmUpper,
                        write: true,
                        max: 0xffff,
                    },
                    humidityAlarmLower: {
                        name: "humidityAlarmLower",
                        ...rtiTekFd22Attributes.humidityAlarmLower,
                        write: true,
                        max: 0xffff,
                    },
                    temperatureAlarmStatus: {
                        name: "temperatureAlarmStatus",
                        ...rtiTekFd22Attributes.temperatureAlarmStatus,
                        max: 0xff,
                    },
                    humidityAlarmStatus: {
                        name: "humidityAlarmStatus",
                        ...rtiTekFd22Attributes.humidityAlarmStatus,
                        max: 0xff,
                    },
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
            sth1zTemperature(),
            m.humidity({reporting: false}),
            m.battery({percentageReporting: false}),
            sth1zDerivedEnvironment(),
            sth2zComfortSettings(),
            sthzbProductName(),
            sth1zTemperatureUnit(),
            sth1zCalibrationSettings(),
            sth1zAlarmSettings(),
            sth1zDiagnostics(),
        ],
        configure: async (device) => {
            const endpoint = device.getEndpoint(1);
            if (!endpoint) throw new Error(`STHZB '${device.ieeeAddr}' has no endpoint 1`);

            if (endpoint.supportsInputCluster("genPollCtrl")) {
                try {
                    await endpoint.write("genPollCtrl", {fastPollTimeout});
                } catch (error) {
                    if (isUnsupportedPollControlError(error)) {
                        logger.debug(`STHZB '${device.ieeeAddr}' does not support Poll Control fastPollTimeout`, NS);
                    } else {
                        throw error;
                    }
                }
            }

            await endpoint.read("msTemperatureMeasurement", ["measuredValue"]);
            await endpoint.read("msRelativeHumidity", ["measuredValue"]);
            await endpoint.read("genPowerCfg", ["batteryVoltage", "batteryPercentageRemaining"]);
            await readReportingConfiguration(endpoint, "msTemperatureMeasurement", "measuredValue");
            await readReportingConfiguration(endpoint, "msRelativeHumidity", "measuredValue");
            await readReportingConfiguration(endpoint, "genPowerCfg", "batteryPercentageRemaining");
            await delay(3000);
            const productName = await readProductName(endpoint, device.ieeeAddr);
            setProductName(device, productName);
            await readFd22Attributes(endpoint, device.ieeeAddr);
            if (isSth2z(device)) {
                await readFd22Attributes(endpoint, device.ieeeAddr, sth2zComfortAttributeIds);
            }
        },
    },
    ...etrvZb01Definitions,
];
