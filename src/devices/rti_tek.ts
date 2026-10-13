import {Zcl} from "zigbee-herdsman";
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
];
