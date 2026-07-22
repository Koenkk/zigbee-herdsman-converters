import {Zcl, ZSpec} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import type {Feature} from "../lib/exposes";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {
    Configure,
    Definition,
    DefinitionExposesFunction,
    DefinitionWithExtend,
    DummyDevice,
    Expose,
    Fz,
    KeyValue,
    ModernExtend,
    Tz,
    Zh,
} from "../lib/types";
import * as utils from "../lib/utils";
import {assertObject, determineEndpoint, sleep} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const SHELLY_ENDPOINT_ID = 239;
const SHELLY_OPTIONS = {profileId: ZSpec.CUSTOM_SHELLY_PROFILE_ID};
const SHELLY_PRESENCE_MAX_ZONES = 10;
// The device reports occupancy per tracked person, one endpoint each - not per zone. Shelly's own
// definition exposes all ten unconditionally, and it has to stay that way: a second person only
// shows up on the second endpoint, so gating these on anything would hide people.
const SHELLY_PRESENCE_TARGET_ENDPOINTS = Array.from({length: 10}, (_, index) => String(index + 1));
const SHELLY_RPC_DATA_READ_TIMEOUT = 10000;
// The RPC cluster cannot deliver a response over Zigbee: the device acknowledges a read of the
// Data attribute but never sends the Read Attributes Response. Shelly confirmed this as a known
// firmware limitation and it is still present in firmware 2.0.0, so everything that would read
// through the RPC cluster is disabled - it would only produce empty values and a timeout per
// attempt. Flip this once a firmware answers again to restore zone discovery.
const SHELLY_RPC_CAN_READ = false;
// A device leaves the factory with one presence zone, and it carries this id.
const SHELLY_PRESENCE_FIRST_ZONE_ID = 200;
// Shelly.GetComponents answers in pages (7 components per page on a Presence Gen4); this bounds
// the paging loop so a device reporting an inconsistent total cannot spin it forever.
const SHELLY_COMPONENT_PAGE_LIMIT = 10;
// A PresenceZone reports its thresholds as presence_thr/absence_thr, while the API documents them
// as presence_delay/absence_delay. Keep the documented names - they say what the value means - for
// the exposes and translate at the RPC boundary. PresenceZone.SetConfig discards unknown keys
// without reporting an error, so a wrong name here fails silently: prefer whichever name the zone
// config actually carries and fall back to the name observed on the device.
const SHELLY_PRESENCE_ZONE_FIELDS: Record<string, string> = {
    presence_delay: "presence_thr",
    absence_delay: "absence_thr",
};
// The device reports this once the fine-tuning values no longer match one of the presets. It is
// never accepted on write, but listing it keeps the reported state a value the enum knows.
const SHELLY_PRESENCE_SENSITIVITY_CUSTOM = "custom";

// Presence.SetConfig takes a single nested config object, so every sensor setting is described by
// its path inside that object and handled by one shared converter. The ranges and value lists are
// the ones the device enforces itself - it rejects anything outside them.
interface ShellyPresenceSetting {
    key: string;
    path: readonly string[];
    expose: () => Feature;
}

// The settings are grouped so a consuming integration can show them as folders instead of two dozen
// values side by side - and because one group travels in a single Presence.SetConfig command.
interface ShellyPresenceSettingGroup {
    key: string;
    label: string;
    description: string;
    settings: readonly ShellyPresenceSetting[];
}

// Merges a value at its path into a config object, so a whole group can be written in one command.
const shellyMergeConfig = (config: KeyValue, path: readonly string[], value: unknown): void => {
    let cursor = config;
    for (const segment of path.slice(0, -1)) {
        if (typeof cursor[segment] !== "object" || cursor[segment] === null) cursor[segment] = {};
        cursor = cursor[segment] as KeyValue;
    }
    cursor[path[path.length - 1]] = value;
};

const num = (name: string, min: number, max: number, step: number, label: string, description: string, unit?: string) => {
    const expose = e
        .numeric(name, ea.STATE_SET)
        .withValueMin(min)
        .withValueMax(max)
        .withValueStep(step)
        .withLabel(label)
        .withDescription(description);
    return unit ? expose.withUnit(unit) : expose;
};

const SHELLY_PRESENCE_SETTING_GROUPS: readonly ShellyPresenceSettingGroup[] = [
    {
        key: "mounting",
        label: "Mounting",
        description:
            "How and where the sensor is mounted. Write-only: the device cannot report these back over Zigbee, so they show what was last set from here",
        settings: [
            {
                key: "installation_height",
                path: ["sensor", "height"],
                expose: () => num("installation_height", 0, 5, 0.1, "Installation height", "Height the sensor is mounted at", "m"),
            },
            {
                key: "sensor_position",
                path: ["sensor", "position"],
                expose: () =>
                    e
                        .enum("sensor_position", ea.STATE_SET, ["center", "left", "right"])
                        .withLabel("Sensor position")
                        .withDescription("Where the sensor is mounted on the wall"),
            },
            {
                key: "sensor_flipped",
                path: ["sensor", "flipped"],
                expose: () =>
                    e
                        .binary("sensor_flipped", ea.STATE_SET, true, false)
                        .withLabel("Sensor flipped")
                        .withDescription("Sensor is mounted rotated by 180 degrees"),
            },
        ],
    },
    {
        key: "detection",
        label: "Detection",
        description:
            "How the radar decides that someone is there. Write-only: the device cannot report these back over Zigbee, so they show what was last set from here",
        settings: [
            {
                key: "sensitivity",
                path: ["sensor", "sensitivity"],
                expose: () =>
                    e
                        .enum("sensitivity", ea.STATE_SET, ["low", "medium", "high", SHELLY_PRESENCE_SENSITIVITY_CUSTOM])
                        .withLabel("Sensitivity")
                        .withDescription("Detection responsiveness. Reported as 'custom' while the fine-tuning values differ from a preset"),
            },
            {
                key: "radar_power",
                path: ["sensor", "power"],
                expose: () =>
                    e
                        .enum("radar_power", ea.STATE_SET, ["low", "medium", "high"])
                        .withLabel("Radar power")
                        .withDescription("Transmit power of the radar sensor"),
            },
            {
                key: "minimum_range",
                path: ["zmin"],
                expose: () => num("minimum_range", 0, 5, 0.1, "Minimum range", "Lower detection limit", "m"),
            },
            {
                key: "maximum_range",
                path: ["zmax"],
                expose: () => num("maximum_range", 0, 5, 0.1, "Maximum range", "Upper detection limit", "m"),
            },
            {
                key: "tracked_objects",
                path: ["num_tracks"],
                expose: () => num("tracked_objects", 1, 10, 1, "Tracked objects", "How many objects the sensor tracks at once"),
            },
        ],
    },
    {
        key: "leds",
        label: "LEDs",
        description:
            "Brightness of the status LEDs and their night mode. Write-only: the device cannot report these back over Zigbee, so they show what was last set from here",
        settings: [
            {
                key: "brightness",
                path: ["leds", "brightness"],
                expose: () => num("brightness", 0, 100, 1, "Brightness", "Brightness of the status LEDs, 0 turns them off", "%"),
            },
            {
                key: "night_mode",
                path: ["leds", "night_mode", "enable"],
                expose: () =>
                    e
                        .binary("night_mode", ea.STATE_SET, true, false)
                        .withLabel("Night mode")
                        .withDescription("Limit the LED brightness during the configured night hours"),
            },
            {
                key: "night_mode_brightness",
                path: ["leds", "night_mode", "brightness"],
                expose: () => num("night_mode_brightness", 0, 100, 1, "Night mode brightness", "Brightness limit while night mode is active", "%"),
            },
        ],
    },
    {
        key: "tuning",
        label: "Fine-tuning",
        description:
            "Detection internals. Changing any of these makes the device report its sensitivity as 'custom'. Write-only: the device cannot report these back over Zigbee, so they show what was last set from here",
        settings: [
            {
                key: "detection_points",
                path: ["sensor", "points"],
                expose: () => num("detection_points", 10, 100, 1, "Detection points", "Object recognition threshold"),
            },
            {
                key: "velocity_threshold",
                path: ["sensor", "velocity"],
                expose: () => num("velocity_threshold", 0, 1, 0.01, "Velocity threshold", "Velocity threshold"),
            },
            {
                key: "snr_threshold",
                path: ["sensor", "snr"],
                expose: () => num("snr_threshold", 10, 100, 1, "SNR threshold", "Signal-to-noise threshold"),
            },
            {
                key: "maximum_velocity_difference",
                path: ["sensor", "max_velocity"],
                expose: () =>
                    num(
                        "maximum_velocity_difference",
                        1,
                        50,
                        1,
                        "Maximum velocity difference",
                        "Largest velocity difference still treated as one object",
                    ),
            },
            {
                key: "motion_activation_threshold",
                path: ["sensor", "state", "det_act_thr"],
                expose: () =>
                    num("motion_activation_threshold", 1, 100, 1, "Motion activation threshold", "How readily a detected object counts as active"),
            },
            {
                key: "motion_release_threshold",
                path: ["sensor", "state", "det_free_thr"],
                expose: () =>
                    num("motion_release_threshold", 1, 100, 1, "Motion release threshold", "How readily a detected object is released again"),
            },
            {
                key: "tracking_loss_threshold",
                path: ["sensor", "state", "act_free_thr"],
                expose: () =>
                    num(
                        "tracking_loss_threshold",
                        1,
                        1000,
                        1,
                        "Tracking loss threshold",
                        "How long an active object may be lost before it is released",
                    ),
            },
            {
                key: "stillness_tracking_threshold",
                path: ["sensor", "state", "stat_free_thr"],
                expose: () =>
                    num("stillness_tracking_threshold", 1, 1000, 1, "Stillness tracking threshold", "How long a motionless object stays tracked"),
            },
            {
                key: "stillness_timeout_threshold",
                path: ["sensor", "state", "sleep_free_thr"],
                expose: () =>
                    num(
                        "stillness_timeout_threshold",
                        1,
                        65535,
                        1,
                        "Stillness timeout threshold",
                        "How long a sleeping object stays tracked before it is released",
                    ),
            },
        ],
    },
];

const NS = "zhc:shelly";

const HA_ELECTRICAL_MEASUREMENT_CLUSTER_ID = 0x0b04;
const HA_ELECTRICAL_MEASUREMENT_POWER_FACTOR_ATTR_ID = 0x0510;

const checkOption = (device: Zh.Device | DummyDevice, options: KeyValue, key: string, defaultValue = false): boolean => {
    if (options?.[key] === "true") return true;
    if (options?.[key] === "false") return false;
    if (!utils.isDummyDevice(device) && device.meta[key] !== undefined) return !!device.meta[key];

    return defaultValue;
};

const shellySwitchInputEndpoints = (device: Zh.Device | DummyDevice, endpoints: Record<string, number>): Record<string, number> => {
    if (utils.isDummyDevice(device)) return endpoints;

    return Object.fromEntries(Object.entries(endpoints).filter(([, endpoint]) => device.getEndpoint(endpoint) !== undefined));
};

const shellySwitchInputExposes = (device: Zh.Device | DummyDevice, endpoints: Record<string, number>): Expose[] =>
    Object.keys(shellySwitchInputEndpoints(device, endpoints)).map((endpoint) =>
        e.enum("switch_type", ea.ALL, ["toggle", "momentary"]).withDescription("Switch input type").withCategory("config").withEndpoint(endpoint),
    );

const shellyDeviceEndpoints = (endpoints: Record<string, number>): ModernExtend => ({
    meta: {multiEndpoint: true},
    endpoint: (device) => shellySwitchInputEndpoints(device, endpoints),
    isModernExtend: true,
});

const shellyPresenceEndpointNames = (device: Zh.Device | DummyDevice): string[] => {
    // Without a device (documentation/expose generation) show what the hardware can do. On a real
    // device use the discovered zone count, and before discovery assume the single main zone that
    // every Presence Gen4 has: exposing all ten up front would create nine zones that never report
    // and leave them orphaned once the real count shrinks the list.
    let count = SHELLY_PRESENCE_MAX_ZONES;
    if (!utils.isDummyDevice(device)) {
        count =
            typeof device.meta.presence_zone_count === "number"
                ? Math.min(Math.max(Math.trunc(device.meta.presence_zone_count), 1), SHELLY_PRESENCE_MAX_ZONES)
                : 1;
    }

    return Array.from({length: count}, (_, index) => String(index + 1));
};

interface ShellyRPC {
    attributes: {
        data: string;
        txCtl: number;
        rxCtl: number;
    };
    commands: never;
    commandResponses: never;
}

interface ShellyWiFiSetup {
    attributes: {
        status: string;
        ip: string;
        actionCode: number;
        dhcp: boolean;
        enabled: boolean;
        ssid: string;
        password: string;
        staticIp: string;
        netMask: string;
        gateway: string;
        nameServer: string;
    };
    commands: never;
    commandResponses: never;
}

interface ShellyWS90Wind {
    attributes: {
        windSpeed: number;
        windDirection: number;
        gustSpeed: number;
    };
    commands: never;
    commandResponses: never;
}

interface ShellyWS90UV {
    attributes: {
        uvIndex: number;
    };
    commands: never;
    commandResponses: never;
}

interface ShellyWS90Rain {
    attributes: {
        rainStatus: number;
        precipitation: number;
    };
    commands: never;
    commandResponses: never;
}

interface ShellyTRVManualMode {
    attributes: {
        manualMode: number;
        position: number;
    };
    commands: {
        calibrate: Record<string, never>;
    };
    commandResponses: never;
}

interface ShellyLightLevel {
    attributes: {
        lightLevel: number;
        darkThreshold: number;
        brightThreshold: number;
    };
    commands: never;
    commandResponses: never;
}

let shellyRpcSending = false;

const shellyRpcLock = async <T>(callback: () => Promise<T>): Promise<T> => {
    // Since RPC messages require multiple writes to complete, we have to make sure
    // we're not interleaving request/response transactions accidentally.
    while (shellyRpcSending) {
        await sleep(200);
    }
    try {
        shellyRpcSending = true;
        return await callback();
    } finally {
        shellyRpcSending = false;
    }
};

const shellyRpcSendRawUnlocked = async (endpoint: Zh.Endpoint | Zh.Group, message: string) => {
    const splitBytes = 40;

    logger.debug(">>> shellyRPC write TxCtl", NS);
    const txCtl = message.length;
    await endpoint.write<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", {txCtl: txCtl}, SHELLY_OPTIONS);
    logger.debug(`>>> TxCtl: ${txCtl}`, NS);

    logger.debug(">>> shellyRPC write Data", NS);
    let dataToSend = message;
    while (dataToSend.length > 0) {
        const data = dataToSend.substring(0, splitBytes);
        dataToSend = dataToSend.substring(splitBytes);
        await endpoint.write<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", {data: data}, SHELLY_OPTIONS);
        logger.debug(`>>> Data: ${data}`, NS);
    }
};

const shellyRpcSendRaw = async (endpoint: Zh.Endpoint | Zh.Group, message: string) =>
    shellyRpcLock(async () => await shellyRpcSendRawUnlocked(endpoint, message));

const shellyRpcSend = async (endpoint: Zh.Endpoint | Zh.Group, method: string, params: object = undefined) => {
    const command = {
        id: 1,
        method: method,
        params: params,
    };
    return await shellyRpcSendRaw(endpoint, JSON.stringify(command));
};

const shellyRpcRequest = async (endpoint: Zh.Endpoint | Zh.Group, method: string, params: object = undefined): Promise<KeyValue | undefined> => {
    return await shellyRpcLock(async () => {
        const command = {
            id: 1,
            method: method,
            params: params,
        };
        await shellyRpcSendRawUnlocked(endpoint, JSON.stringify(command));
        const rxCtlResult = await endpoint.read<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", ["rxCtl"], SHELLY_OPTIONS);
        const expectedLen = rxCtlResult.rxCtl;
        if (!expectedLen) return undefined;

        let accumulated = "";
        while (accumulated.length < expectedLen) {
            const dataResult = await endpoint.read<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", ["data"], {
                ...SHELLY_OPTIONS,
                timeout: SHELLY_RPC_DATA_READ_TIMEOUT,
            });
            if (!dataResult.data) break;
            accumulated += dataResult.data;
        }

        if (accumulated.length < expectedLen) return undefined;
        return JSON.parse(accumulated.substring(0, expectedLen));
    });
};

// =============================================================================
// WS90 Weather Station - Calculated Values (stored in device.meta for persistence)
// =============================================================================

interface WS90Meta {
    state?: {[key: string]: number | boolean};
    precipHistory?: {value: number; time: number};
    pressureHistory?: {value: number; time: number};
    lastSave?: number;
}

/**
 * Get or initialize WS90 meta storage on device
 */
function getWS90Meta(device: Zh.Device): WS90Meta {
    if (!device.meta.ws90) {
        device.meta.ws90 = {};
    }
    return device.meta.ws90 as WS90Meta;
}

/**
 * Calculate dew point using Magnus formula
 */
function calculateDewPoint(T: number | undefined, Rh: number | undefined): number | null {
    if (T === undefined || Rh === undefined || Rh <= 0) return null;
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * T) / (b + T) + Math.log(Rh / 100);
    return Math.round(((b * alpha) / (a - alpha)) * 10) / 10;
}

/**
 * Calculate humidex (Canadian heat index)
 */
function calculateHumidex(T: number | undefined, Rh: number | undefined): number | null {
    if (T === undefined || Rh === undefined) return null;
    const dewPoint = calculateDewPoint(T, Rh);
    if (dewPoint === null) return null;
    const ee = 6.11 * Math.exp(5417.753 * (1 / 273.15 - 1 / (273.15 + dewPoint)));
    return Math.round((T + 0.5555 * (ee - 10)) * 10) / 10;
}

/**
 * Calculate wind chill (formula valid for T <= 10°C and wind >= 4.8 km/h)
 */
function calculateWindChill(T: number | undefined, windMs: number | undefined): number | null {
    if (T === undefined || windMs === undefined) return null;
    const windKmh = windMs * 3.6;
    if (T > 10 || windKmh < 4.8) return Math.round(T * 10) / 10;
    const wc = 13.12 + 0.6215 * T - 11.37 * windKmh ** 0.16 + 0.3965 * T * windKmh ** 0.16;
    return Math.round(wc * 10) / 10;
}

/**
 * Calculate heat stress percentage using sigmoid curve
 */
function calculateHeatStress(
    T: number | undefined,
    Rh: number | undefined,
    lux: number | undefined,
    windMs: number | undefined,
    precipitation: number | undefined,
): number | null {
    if (T === undefined) return null;
    const solar = (lux || 0) / 100;
    const base = T + solar / 100 + (Rh || 0) / 10;
    const cooled = base - (windMs || 0) / 2;
    const adjusted = cooled - ((precipitation || 0) > 0 ? 3 : 0);
    const scaled = (adjusted - 18) / (42 - 18);
    const sigmoid = 1 / (1 + Math.E ** (-4 * (scaled - 0.5)));
    return Math.max(Math.round(sigmoid * 100), 0);
}

/**
 * Calculate apparent temperature (wind chill when cold, humidex when warm)
 */
function calculateApparentTemperature(T: number | undefined, Rh: number | undefined, windMs: number | undefined): number | null {
    if (T === undefined) return null;
    const windChill = calculateWindChill(T, windMs);
    const humidex = calculateHumidex(T, Rh);
    if (windChill !== null && windChill < T) return windChill;
    if (humidex !== null && humidex > T) return humidex;
    return Math.round(T * 10) / 10;
}

/**
 * Calculate rain rate from precipitation changes (mm/h)
 */
function calculateRainRate(meta: WS90Meta, precipitation: number | undefined): number | null {
    if (precipitation === undefined) return null;

    const now = Date.now();
    const history = meta.precipHistory;

    if (!history) {
        meta.precipHistory = {value: precipitation, time: now};
        return 0;
    }

    const timeDeltaMs = now - history.time;
    const precipDelta = precipitation - history.value;

    if (timeDeltaMs < 60000) return null;
    if (precipDelta < 0) {
        // The cumulative counter was reset (battery change, restart). Rebase the history on the
        // new counter - otherwise the delta stays negative and the rate reports 0 until the new
        // counter overtakes the old value, which for a cumulative rain counter can take months.
        meta.precipHistory = {value: precipitation, time: now};
        return 0;
    }

    meta.precipHistory = {value: precipitation, time: now};

    const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);
    const rate = precipDelta / timeDeltaHours;

    return Math.min(Math.round(rate * 10) / 10, 300);
}

/**
 * Calculate pressure trend (hPa/hour)
 */
function calculatePressureTrend(meta: WS90Meta, pressure: number | undefined): number | null {
    if (pressure === undefined) return null;

    const now = Date.now();
    const history = meta.pressureHistory;

    if (!history) {
        meta.pressureHistory = {value: pressure, time: now};
        return 0;
    }

    const timeDeltaMs = now - history.time;
    const pressureDelta = pressure - history.value;

    if (timeDeltaMs < 1800000) return null;

    meta.pressureHistory = {value: pressure, time: now};

    const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);
    const rate = pressureDelta / timeDeltaHours;

    return Math.round(rate * 10) / 10;
}

/**
 * Determine weather condition based on sensor data
 */
function calculateWeatherCondition(state: {[key: string]: number | boolean | undefined}): string | null {
    const {temperature, illuminance, rain_status, wind_speed, rain_rate, pressure, pressure_trend} = state;

    if (illuminance === undefined) return null;

    const isRaining = rain_status === true && rain_rate !== undefined && (rain_rate as number) > 0;
    const isPouring = isRaining && (rain_rate as number) > 10;
    const isWindy = wind_speed !== undefined && (wind_speed as number) > 10;
    const isNight = (illuminance as number) < 10;

    const isLowPressure = pressure !== undefined && (pressure as number) < 1000;
    const isPressureFalling = pressure_trend !== undefined && (pressure_trend as number) < -2;

    const isHail =
        isRaining &&
        (rain_rate as number) > 5 &&
        (illuminance as number) < 5000 &&
        wind_speed !== undefined &&
        (wind_speed as number) > 5 &&
        (isLowPressure || isPressureFalling);

    const isSnowing = isRaining && temperature !== undefined && (temperature as number) < 1 && !isHail;

    if (isHail) return "hail";
    if (isSnowing) return "snowy";
    if (isPouring) return "pouring";
    if (isRaining) return "rainy";

    if (isNight) {
        return isWindy ? "windy" : "clear-night";
    }

    if ((illuminance as number) > 40000) {
        return isWindy ? "windy" : "sunny";
    }
    if ((illuminance as number) > 10000) {
        return isWindy ? "windy-variant" : "partlycloudy";
    }
    return "cloudy";
}

/**
 * The station reports the ZCL non-value marker (all bits set for the attribute type) when a
 * reading is unavailable - a gustSpeed of 0xffff was published as 6553.5 m/s and fed into the
 * calculations (https://github.com/Koenkk/zigbee2mqtt/issues/31048). Scale a raw value only
 * when it is a real reading, otherwise contribute nothing.
 */
const ws90Scaled = (name: string, raw: unknown, invalid: number): {[key: string]: number} | undefined =>
    typeof raw === "number" && raw !== invalid ? {[name]: raw / 10} : undefined;

/**
 * Update calculated values whenever we get new sensor data (uses device.meta for persistence)
 */
function updateWS90CalculatedValues(device: Zh.Device, payload: {[key: string]: number | boolean}): {[key: string]: number | string | null} {
    const meta = getWS90Meta(device);
    if (!meta.state) meta.state = {};
    Object.assign(meta.state, payload);
    const state = meta.state;
    const result: {[key: string]: number | string | null} = {};

    const temp = state.temperature as number | undefined;
    const humidity = state.humidity as number | undefined;
    const windSpeed = state.wind_speed as number | undefined;
    const lux = state.illuminance as number | undefined;
    const precip = state.precipitation as number | undefined;
    const pressure = state.pressure as number | undefined;

    if (temp !== undefined && humidity !== undefined) {
        const dewPoint = calculateDewPoint(temp, humidity);
        if (dewPoint !== null) result.dew_point = dewPoint;

        const humidex = calculateHumidex(temp, humidity);
        if (humidex !== null) result.humidex = humidex;

        const heatStress = calculateHeatStress(temp, humidity, lux, windSpeed, precip);
        if (heatStress !== null) result.heat_stress = heatStress;
    }

    if (temp !== undefined && windSpeed !== undefined) {
        const windChill = calculateWindChill(temp, windSpeed);
        if (windChill !== null) result.wind_chill = windChill;
    }

    if (temp !== undefined) {
        const apparent = calculateApparentTemperature(temp, humidity, windSpeed);
        if (apparent !== null) result.apparent_temperature = apparent;
    }

    if (pressure !== undefined) {
        const trend = calculatePressureTrend(meta, pressure);
        if (trend !== null) {
            result.pressure_trend = trend;
            state.pressure_trend = trend;
        } else if (typeof state.pressure_trend === "number") {
            result.pressure_trend = state.pressure_trend;
        }
    }

    const condition = calculateWeatherCondition(state);
    if (condition !== null) result.weather_condition = condition;

    // Persist across restarts - but not on every report: the station reports as often as
    // every 10 seconds, and each save writes the whole device database to disk. The histories
    // only advance on the minute scale, so a crash loses at most a minute of history progress.
    const now = Date.now();
    if (meta.lastSave === undefined || now - meta.lastSave >= 60000) {
        meta.lastSave = now;
        device.save();
    }

    return result;
}

// =============================================================================
// Shelly Modern Extend
// =============================================================================

const shellyModernExtend = {
    shellyPowerFactorInt16Fix(): ModernExtend {
        // Shelly Gen4 devices report haElectricalMeasurement.powerFactor (0x0510) as INT16 (0x29)
        // while zigbee-herdsman defines it as INT8 (0x28). This breaks configureReporting (INVALID_DATA_TYPE).
        return m.deviceAddCustomCluster("haElectricalMeasurement", {
            name: "haElectricalMeasurement",
            ID: HA_ELECTRICAL_MEASUREMENT_CLUSTER_ID,
            attributes: {
                powerFactor: {name: "powerFactor", ID: HA_ELECTRICAL_MEASUREMENT_POWER_FACTOR_ATTR_ID, type: Zcl.DataType.INT16},
            },
            commands: {},
            commandsResponse: {},
        });
    },
    shellyCustomClusters(): ModernExtend[] {
        return [
            m.deviceAddCustomCluster("shellyRPCCluster", {
                name: "shellyRPCCluster",
                ID: 0xfc01,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    data: {name: "data", ID: 0x0000, type: Zcl.DataType.CHAR_STR, write: true},
                    txCtl: {name: "txCtl", ID: 0x0001, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                    rxCtl: {name: "rxCtl", ID: 0x0002, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("shellyWiFiSetupCluster", {
                name: "shellyWiFiSetupCluster",
                ID: 0xfc02,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    status: {name: "status", ID: 0x0000, type: Zcl.DataType.CHAR_STR, write: true},
                    ip: {name: "ip", ID: 0x0001, type: Zcl.DataType.CHAR_STR, write: true},
                    actionCode: {name: "actionCode", ID: 0x0002, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    dhcp: {name: "dhcp", ID: 0x0003, type: Zcl.DataType.BOOLEAN, write: true},
                    enabled: {name: "enabled", ID: 0x0004, type: Zcl.DataType.BOOLEAN, write: true},
                    ssid: {name: "ssid", ID: 0x0005, type: Zcl.DataType.CHAR_STR, write: true},
                    password: {name: "password", ID: 0x0006, type: Zcl.DataType.CHAR_STR, write: true},
                    staticIp: {name: "staticIp", ID: 0x0007, type: Zcl.DataType.CHAR_STR, write: true},
                    netMask: {name: "netMask", ID: 0x0008, type: Zcl.DataType.CHAR_STR, write: true},
                    gateway: {name: "gateway", ID: 0x0009, type: Zcl.DataType.CHAR_STR, write: true},
                    nameServer: {name: "nameServer", ID: 0x000a, type: Zcl.DataType.CHAR_STR, write: true},
                },
                commands: {},
                commandsResponse: {},
            }),
        ];
    },
    shellyWindowCovering(): ModernExtend {
        const result = m.windowCovering({controls: ["lift", "tilt"]});
        const tiltOption = e
            .enum("cover_tilt_enabled", ea.SET, ["auto", "true", "false"])
            .withDescription("Expose tilt/slat controls for covers with Shelly slat control enabled");
        const exposesFn: DefinitionExposesFunction = (device, options) => {
            const cover = e.cover().withPosition();
            if (checkOption(device, options, "cover_tilt_enabled", true)) {
                cover.withTilt();
            }

            return [cover];
        };

        result.exposes = [exposesFn];
        result.options = [...(result.options ?? []), tiltOption];

        return result;
    },
    shellyPresenceOccupancy(): ModernExtend {
        const exposesFn: DefinitionExposesFunction = () => {
            return SHELLY_PRESENCE_TARGET_ENDPOINTS.map((endpointName) => e.occupancy().withAccess(ea.STATE_GET).withEndpoint(endpointName));
        };

        const fromZigbee: Fz.Converter<"msOccupancySensing">[] = [
            {
                cluster: "msOccupancySensing",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!("occupancy" in msg.data)) return;

                    const endpointName = utils.getEndpointName(msg, model, meta).toString();
                    if (!SHELLY_PRESENCE_TARGET_ENDPOINTS.includes(endpointName)) return;

                    return {[utils.postfixWithEndpointName("occupancy", msg, model, meta)]: (msg.data.occupancy & 1) > 0};
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["occupancy"],
                convertGet: async (entity, key, meta) => {
                    await determineEndpoint(entity, meta, "msOccupancySensing").read("msOccupancySensing", ["occupancy"]);
                },
            },
        ];

        // The presence sensor only pushes occupancy autonomously once reporting is configured on
        // the msOccupancySensing cluster of each target endpoint; without this it just answers reads.
        // Every tracked person reports on its own endpoint, so all of them need reporting - a second
        // person would otherwise never arrive. A single endpoint failing must not abort the rest.
        const configure: Configure[] = [
            async (device, coordinatorEndpoint) => {
                for (const endpointName of SHELLY_PRESENCE_TARGET_ENDPOINTS) {
                    const endpoint = device.getEndpoint(Number(endpointName));
                    if (!endpoint) continue;
                    try {
                        await m.setupAttributes(
                            endpoint,
                            coordinatorEndpoint,
                            "msOccupancySensing",
                            [{attribute: "occupancy", min: "MIN", max: "1_HOUR", change: 0}],
                            true,
                            false,
                        );
                    } catch (e) {
                        logger.warning(`Failed to set up occupancy reporting on endpoint ${endpointName}: ${e}`, NS);
                    }
                }
            },
        ];

        return {exposes: [exposesFn], fromZigbee, toZigbee, configure, isModernExtend: true};
    },
    shellyRPCSetup(features: string[] = []): ModernExtend {
        // Set helper variables
        const shellyRPCBugFixed = false; // For firmware 20250819-150402/ga0def2d

        const featureDev = features.includes("Dev");
        const featurePowerstripUI = features.includes("PowerstripUI");
        const featurePowerstripPowerOnBehavior = features.includes("PowerstripPowerOnBehavior");
        // The two 2PM variants put their switch inputs on different endpoints: the cover on 2 and 3,
        // the switch-mode device on 3 and 4, because there 1 and 2 are its two relays. A single
        // shared mapping cannot serve both - it would read the second relay as the first input.
        const twoPMInputEndpoints = features.includes("2PMCoverInputMode")
            ? {sw1: 2, sw2: 3}
            : features.includes("2PMSwitchInputMode")
              ? {sw1: 3, sw2: 4}
              : undefined;
        const featureOnePMInputMode = features.includes("1PMInputMode");
        const featureCoverTiltAuto = features.includes("CoverTiltAuto");
        const featurePresenceZonesAuto = features.includes("PresenceZonesAuto");
        const featurePresenceZoneConfig = features.includes("PresenceZoneConfig");
        const featurePresenceSensorConfig = features.includes("PresenceSensorConfig");
        const featureEcoMode = features.includes("EcoMode");

        // Generic helper functions
        const validateTime = (value: string) => {
            const hhmmRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
            if (value === undefined || !value.match(hhmmRegex)) {
                throw new Error(`Invalid time "${value}"`);
            }
        };

        const rpcSendRaw = shellyRpcSendRaw;
        const rpcSend = shellyRpcSend;
        const rpcRequest = shellyRpcRequest;

        // Writes reach the device but a single delivery can still fail, and the presence sensor has
        // no fallback ZCL cluster to fall back on - so a write is retried a few times with a short
        // pause. Reads are a different matter: the firmware never answers one (see
        // SHELLY_RPC_CAN_READ), so retrying a read cannot help. The read variant below stays only
        // for the zone discovery it serves, which is dormant for the same reason.
        const RPC_MAX_ATTEMPTS = 3;
        const RPC_RETRY_PAUSE = 1500;
        const rpcRequestWithRetry = async (endpoint: Zh.Endpoint | Zh.Group, method: string, params?: object): Promise<KeyValue | undefined> => {
            for (let attempt = 0; attempt < RPC_MAX_ATTEMPTS; attempt++) {
                if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, RPC_RETRY_PAUSE));
                const response = await rpcRequest(endpoint, method, params);
                const result = response?.result ?? response?.params ?? response;
                if (result) {
                    assertObject<KeyValue>(result);
                    return result;
                }
            }
            return undefined;
        };
        const rpcSendWithRetry = async (endpoint: Zh.Endpoint | Zh.Group, method: string, params?: object): Promise<void> => {
            let lastError: unknown;
            for (let attempt = 0; attempt < RPC_MAX_ATTEMPTS; attempt++) {
                if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, RPC_RETRY_PAUSE));
                try {
                    await rpcSend(endpoint, method, params);
                    return;
                } catch (e) {
                    lastError = e;
                }
            }
            throw lastError;
        };

        const rpcReceive = async (endpoint: Zh.Endpoint | Zh.Group, key: string) => {
            logger.debug(`||| shellyRPC rpcReceive(${key})`, NS);
            if (key === "rpc_rxctl") {
                logger.debug(">>> shellyRPC read RxCtl", NS);
                const result = await endpoint.read<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", ["rxCtl"], SHELLY_OPTIONS);
                logger.debug(`<<< RxCtl: ${JSON.stringify(result)}`, NS);
            } else if (key === "rpc_data") {
                logger.debug(">>> shellyRPC read Data", NS);
                const result = await endpoint.read<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", ["data"], {...SHELLY_OPTIONS, timeout: 1000});
                logger.debug(`<<< Data: ${JSON.stringify(result)}`, NS);
            }
        };

        const getRPCEndpoint = (entity: Zh.Endpoint | Zh.Group): Zh.Endpoint | Zh.Group => {
            utils.assertEndpoint(entity);
            const endpoint = entity.getDevice().getEndpoint(SHELLY_ENDPOINT_ID);
            if (!endpoint) throw new Error(`Shelly RPC endpoint ${SHELLY_ENDPOINT_ID} not found`);
            return endpoint;
        };

        // Maps a per-zone endpoint name ("1".."N") to the device's RPC PresenceZone id. This
        // numbering counts zones and is unrelated to the occupancy endpoints, which count tracked
        // people - presence_delay_1 is the first zone, occupancy_1 is the first person.
        // Discovery caches the real ids in device.meta, but it needs an RPC read, which the
        // firmware cannot answer over Zigbee (see SHELLY_RPC_CAN_READ). A device leaves the factory
        // with a single zone, so fall back to the id the main zone carries - that keeps the one
        // zone every device has configurable.
        const presenceZoneIdForEndpoint = (device: Zh.Device, endpointName: string): number | undefined => {
            const index = Number(endpointName) - 1;
            if (!Number.isInteger(index) || index < 0) return undefined;
            const ids = device.meta.presence_zone_ids;
            if (Array.isArray(ids) && typeof ids[index] === "number") return ids[index] as number;
            return SHELLY_PRESENCE_FIRST_ZONE_ID + index;
        };

        // Features for exposes
        const featurePercentage = (name: string, label: string) => {
            return e.numeric(name, ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(1).withLabel(label).withUnit("%");
        };

        const featureButtonEnabled = (id: number) => {
            return e.binary(`switch_${id}`, ea.STATE_SET, "momentary", "detached").withLabel(`Endpoint: ${id + 1}`);
        };

        const exposes: (Expose | DefinitionExposesFunction)[] = [];
        const exposesDev: Expose[] = [
            e
                .text("rpc_tx", ea.STATE_SET)
                .withLabel("TX Data")
                .withDescription("See https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen4/ShellyPowerStripG4"),
            e.text("rpc_rxctl", ea.STATE_GET).withLabel("RxCtl").withDescription("RX bytes available").withCategory("diagnostic"),
            e.text("rpc_data", ea.STATE_GET).withLabel("Data").withDescription("RX Data").withCategory("diagnostic"),
        ];
        // The device applies these but cannot report any of them back over Zigbee, so what a value
        // shows is what was last written from here - never a reading off the device. Say so on every
        // one of them: a configuration field that quietly means something else than the user assumes
        // is worse than no field at all.
        const WRITE_ONLY = "The device cannot report this back over Zigbee, so it shows what was last set from here";
        const exposesPowerstripUI: Expose[] = [
            e
                .enum("led_mode", ea.STATE_SET, ["off", "switch", "power"])
                .withLabel("LED Mode")
                .withDescription(`Controls the behaviour of the LED rings around the sockets. ${WRITE_ONLY}`)
                .withCategory("config"),
            e
                .composite("led_colors", "led_colors", ea.STATE_SET)
                .withFeature(featurePercentage("on_r", "Red (on)"))
                .withFeature(featurePercentage("on_g", "Green (on)"))
                .withFeature(featurePercentage("on_b", "Blue (on)"))
                .withFeature(featurePercentage("on_brightness", "Brightness (on)"))
                .withFeature(featurePercentage("off_r", "Red (off)"))
                .withFeature(featurePercentage("off_g", "Green (off)"))
                .withFeature(featurePercentage("off_b", "Blue (off)"))
                .withFeature(featurePercentage("off_brightness", "Brightness (off)"))
                .withLabel("LED colors in 'switch' mode")
                .withDescription(`Colors of the LED rings while the LED mode is 'switch'. ${WRITE_ONLY}`)
                .withCategory("config"),
            featurePercentage("led_power_brightness", "LED brightness in 'power' mode")
                .withDescription(`Brightness of the LED rings while the LED mode is 'power'. ${WRITE_ONLY}`)
                .withCategory("config"),
            e
                .composite("led_night_mode", "led_night_mode", ea.STATE_SET)
                .withFeature(e.binary("enable", ea.STATE_SET, true, false))
                .withFeature(featurePercentage("brightness", "Brightness"))
                .withFeature(e.text("from", ea.STATE_SET).withLabel("Active from").withDescription("hh:mm"))
                .withFeature(e.text("until", ea.STATE_SET).withLabel("Active until").withDescription("hh:mm"))
                .withLabel("LED night mode")
                .withDescription(`Adjust LED brightness during night time. ${WRITE_ONLY}`)
                .withCategory("config"),
            e
                .composite("buttons_enabled", "buttons_enabled", ea.STATE_SET)
                .withFeature(featureButtonEnabled(0))
                .withFeature(featureButtonEnabled(1))
                .withFeature(featureButtonEnabled(2))
                .withFeature(featureButtonEnabled(3))
                .withLabel("Buttons enabled")
                .withDescription(`Whether each socket button switches its own socket or is detached. ${WRITE_ONLY}`)
                .withCategory("config"),
        ];

        const fromZigbee: Fz.Converter<"shellyRPCCluster", ShellyRPC, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "shellyRPCCluster",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const state: KeyValue = {};

                    // Diagnostic data
                    if (msg.data.rxCtl !== undefined) {
                        state.rpc_rxctl = msg.data.rxCtl;
                        state.rpc_data = "";
                    }
                    if (msg.data.data !== undefined) {
                        const accumulated = ((meta.state.rpc_data as string) ?? "") + msg.data.data;
                        state.rpc_data = accumulated;
                        const expectedLen = meta.state.rpc_rxctl as number;
                        if (expectedLen > 0 && accumulated.length >= expectedLen) {
                            try {
                                const response = JSON.parse(accumulated);
                                if (response.result?.in_mode !== undefined) {
                                    const epName = (response.result.id as number) === 0 ? "sw1" : "sw2";
                                    state[`switch_mode_${epName}`] = response.result.in_mode;
                                }
                            } catch {}
                        }
                    }

                    return state;
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [];
        const configure: Configure[] = [];
        const toZigbeeDev: Tz.Converter[] = [
            {
                key: ["rpc_rxctl", "rpc_data"],
                convertGet: async (entity, key, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcReceive(ep, key);
                },
            },
            {
                key: ["rpc_tx"],
                convertSet: async (entity, key, value, meta) => {
                    logger.debug(`>>> toZigbee.convertSet(${key}): ${value}`, NS);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSendRaw(ep, value as string);
                    await rpcReceive(ep, "rpc_rxctl");
                    if (shellyRPCBugFixed) {
                        await rpcReceive(ep, "rpc_data");
                    } else {
                        return {state: {rpc_data: "[Refresh for response]"}};
                    }
                },
            },
        ];
        const toZigbeePowerstripUI: Tz.Converter[] = [
            {
                key: ["led_mode"],
                convertSet: async (entity, key, value, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                mode: value,
                            },
                        },
                    });
                },
            },
            {
                key: ["led_colors"],
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                colors: {
                                    "switch:0": {
                                        on: {
                                            rgb: [value.on_r ?? 0, value.on_g ?? 0, value.on_b ?? 0],
                                            brightness: value.on_brightness ?? 0,
                                        },
                                        off: {
                                            rgb: [value.off_r ?? 0, value.off_g ?? 0, value.off_b ?? 0],
                                            brightness: value.off_brightness ?? 0,
                                        },
                                    },
                                },
                            },
                        },
                    });
                },
            },
            {
                key: ["led_power_brightness"],
                convertSet: async (entity, key, value, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                colors: {
                                    power: {
                                        brightness: (value as number) ?? 0,
                                    },
                                },
                            },
                        },
                    });
                },
            },
            {
                key: ["led_night_mode"],
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    validateTime(value.from as string);
                    validateTime(value.until as string);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                night_mode: {
                                    enable: value.enable,
                                    brightness: value.brightness,
                                    active_between: [value.from, value.until],
                                },
                            },
                        },
                    });
                },
            },
            {
                key: ["buttons_enabled"],
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            controls: {
                                "switch:0": {
                                    in_mode: value.switch_0,
                                },
                                "switch:1": {
                                    in_mode: value.switch_1,
                                },
                                "switch:2": {
                                    in_mode: value.switch_2,
                                },
                                "switch:3": {
                                    in_mode: value.switch_3,
                                },
                            },
                        },
                    });
                },
            },
        ];

        if (featureDev) {
            exposes.push(...exposesDev);
            toZigbee.push(...toZigbeeDev);
        }
        if (featurePowerstripUI) {
            exposes.push(...exposesPowerstripUI);
            toZigbee.push(...toZigbeePowerstripUI);
        }
        if (featurePowerstripPowerOnBehavior) {
            const powerOnBehaviorValues = ["off", "on", "previous", "match_input"];
            for (const channel of [1, 2, 3, 4]) {
                exposes.push(
                    e
                        .enum("power_on_behavior", ea.STATE_SET, powerOnBehaviorValues)
                        .withDescription("Behavior of the socket after a power outage. 'previous' restores the last known state.")
                        .withCategory("config")
                        .withEndpoint(String(channel)),
                );
            }
            toZigbee.push({
                key: ["power_on_behavior"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value, key);
                    utils.assertString(meta.endpoint_name, "endpoint_name");
                    utils.assertEndpoint(entity);
                    const switchId = Number(meta.endpoint_name) - 1;
                    // shellyRPCCluster lives on a dedicated endpoint (239), but this expose is per-channel.
                    // determineEndpoint() would return the per-channel endpoint when endpoint_name is set,
                    // so we explicitly resolve the RPC endpoint via the device.
                    const ep = entity.getDevice().getEndpoint(SHELLY_ENDPOINT_ID);
                    if (!ep) throw new Error(`Shelly RPC endpoint ${SHELLY_ENDPOINT_ID} not found`);
                    const shellyValue = value === "previous" ? "restore_last" : value;
                    await rpcSend(ep, "Switch.SetConfig", {id: switchId, config: {initial_state: shellyValue}});
                    return {state: {power_on_behavior: value}};
                },
            });
        }
        // switch_mode travels over the RPC cluster, which the firmware cannot answer over Zigbee
        // (see SHELLY_RPC_CAN_READ): no convertGet - a device query walks every converter that has
        // one regardless of the access flags - and the exposes say so instead of announcing GET.
        if (twoPMInputEndpoints) {
            const inModeValues = ["follow", "flip", "detached", "cycle", "activation"];
            exposes.push((device: Zh.Device | DummyDevice, _options: KeyValue) => {
                if (utils.isDummyDevice(device) || !device.getEndpoint(SHELLY_ENDPOINT_ID)) return [];
                return Object.keys(shellySwitchInputEndpoints(device, twoPMInputEndpoints)).map((endpoint) =>
                    e
                        .enum("switch_mode", ea.STATE_SET, inModeValues)
                        .withDescription(`Switch input mode. ${WRITE_ONLY}`)
                        .withCategory("config")
                        .withEndpoint(endpoint),
                );
            });
            toZigbee.push({
                key: ["switch_mode"],
                convertSet: async (entity, key, value, meta) => {
                    const switchId = meta.endpoint_name === "sw1" ? 0 : 1;
                    const ep = getRPCEndpoint(entity);
                    await rpcSend(ep, "Switch.SetConfig", {id: switchId, config: {in_mode: value}});
                    return {state: {switch_mode: value}};
                },
            });
        }
        if (featureOnePMInputMode) {
            const inModeValues = ["follow", "flip", "detached", "cycle", "activation"];
            exposes.push((device: Zh.Device | DummyDevice, _options: KeyValue) => {
                if (utils.isDummyDevice(device) || !device.getEndpoint(SHELLY_ENDPOINT_ID)) return [];
                return Object.keys(shellySwitchInputEndpoints(device, {sw1: 2})).map((endpoint) =>
                    e
                        .enum("switch_mode", ea.STATE_SET, inModeValues)
                        .withDescription(`Switch input mode. ${WRITE_ONLY}`)
                        .withCategory("config")
                        .withEndpoint(endpoint),
                );
            });
            toZigbee.push({
                key: ["switch_mode"],
                convertSet: async (entity, key, value, meta) => {
                    const ep = getRPCEndpoint(entity);
                    await rpcSend(ep, "Switch.SetConfig", {id: 0, config: {in_mode: value}});
                    return {state: {switch_mode: value}};
                },
            });
        }
        if (featureCoverTiltAuto && SHELLY_RPC_CAN_READ) {
            configure.push(async (device) => {
                const ep = device.getEndpoint(SHELLY_ENDPOINT_ID);
                if (!ep) return;
                try {
                    const response = await rpcRequest(ep, "Cover.GetConfig", {id: 0});
                    const result = response?.result ?? response?.params ?? response;
                    if (!result) return;
                    assertObject<KeyValue>(result);
                    if (!result.slat) return;
                    assertObject<KeyValue>(result.slat);
                    const enabled = result.slat.enable;
                    if (typeof enabled === "boolean" && device.meta.cover_tilt_enabled !== enabled) {
                        device.meta.cover_tilt_enabled = enabled;
                        device.save();
                    }
                } catch (e) {
                    logger.warning(`Failed to read cover_tilt_enabled during configure, use manual option to override: ${e}`, NS);
                }
            });
        }
        if (featurePresenceZonesAuto && SHELLY_RPC_CAN_READ) {
            configure.push(async (device) => {
                const ep = device.getEndpoint(SHELLY_ENDPOINT_ID);
                if (!ep) return;
                try {
                    // PresenceZones are dynamic components: Shelly.GetConfig never lists them, only
                    // Shelly.GetComponents does. `dynamic_only` keeps the answer short, but it also
                    // covers virtual components, so filter for the presencezone prefix. The answer
                    // is paginated, so keep asking until every announced component has been seen.
                    const zoneIds: number[] = [];
                    let offset = 0;
                    let total = Number.POSITIVE_INFINITY;
                    for (let page = 0; page < SHELLY_COMPONENT_PAGE_LIMIT && offset < total; page++) {
                        const result = await rpcRequestWithRetry(ep, "Shelly.GetComponents", {dynamic_only: true, offset});
                        if (!result) return;
                        const components = result.components;
                        if (!Array.isArray(components) || components.length === 0) break;

                        for (const component of components) {
                            const key = (component as KeyValue)?.key;
                            const match = typeof key === "string" ? /^presencezone:(\d+)$/.exec(key) : null;
                            if (match) zoneIds.push(Number(match[1]));
                        }
                        total = typeof result.total === "number" ? result.total : components.length;
                        offset += components.length;
                    }
                    if (offset < total) {
                        logger.warning(`Stopped reading presence components after ${offset} of ${total}; some zones may be missing`, NS);
                    }

                    zoneIds.sort((a, b) => a - b);
                    const zoneCount = zoneIds.length;
                    if (zoneCount < 1 || zoneCount > SHELLY_PRESENCE_MAX_ZONES) return;

                    let metaChanged = false;
                    if (device.meta.presence_zone_count !== zoneCount) {
                        device.meta.presence_zone_count = zoneCount;
                        metaChanged = true;
                    }
                    if (JSON.stringify(device.meta.presence_zone_ids) !== JSON.stringify(zoneIds)) {
                        device.meta.presence_zone_ids = zoneIds;
                        metaChanged = true;
                    }
                    if (metaChanged) device.save();
                } catch (e) {
                    logger.warning(`Failed to read presence zones during configure, using last known or default exposed zones: ${e}`, NS);
                }
            });
        }
        if (featurePresenceZoneConfig) {
            const presenceZoneKeys = ["presence_delay", "absence_delay"];
            exposes.push((device: Zh.Device | DummyDevice, _options: KeyValue) => {
                if (utils.isDummyDevice(device) || !device.getEndpoint(SHELLY_ENDPOINT_ID)) return [];
                return shellyPresenceEndpointNames(device).flatMap((endpointName) => [
                    e
                        .numeric("presence_delay", ea.STATE_SET)
                        .withValueMin(0)
                        .withValueMax(3600)
                        .withValueStep(1)
                        .withUnit("s")
                        .withLabel("Presence delay")
                        .withDescription(
                            "Time presence must be continuously detected before this zone is reported occupied. " +
                                "The device cannot report this value back over Zigbee, so it shows what was last set",
                        )
                        .withCategory("config")
                        .withEndpoint(endpointName),
                    e
                        .numeric("absence_delay", ea.STATE_SET)
                        .withValueMin(0)
                        .withValueMax(3600)
                        .withValueStep(1)
                        .withUnit("s")
                        .withLabel("Absence delay")
                        .withDescription(
                            "Time without presence before this zone is reported empty. " +
                                "The device cannot report this value back over Zigbee, so it shows what was last set",
                        )
                        .withCategory("config")
                        .withEndpoint(endpointName),
                ]);
            });
            toZigbee.push({
                key: presenceZoneKeys,
                convertSet: async (entity, key, value, meta) => {
                    utils.assertEndpoint(entity);
                    utils.assertString(meta.endpoint_name, "endpoint_name");
                    const zoneId = presenceZoneIdForEndpoint(entity.getDevice(), meta.endpoint_name);
                    if (zoneId === undefined) throw new Error(`No Shelly presence zone for endpoint ${meta.endpoint_name}`);
                    const seconds = Math.min(3600, Math.max(0, Math.round(value as number)));
                    const ep = getRPCEndpoint(entity);
                    await rpcSendWithRetry(ep, "PresenceZone.SetConfig", {id: zoneId, config: {[SHELLY_PRESENCE_ZONE_FIELDS[key]]: seconds}});
                    return {state: {[key]: seconds}};
                },
            });
        }
        if (featurePresenceSensorConfig) {
            exposes.push((device: Zh.Device | DummyDevice, _options: KeyValue) => {
                if (utils.isDummyDevice(device) || !device.getEndpoint(SHELLY_ENDPOINT_ID)) return [];
                return SHELLY_PRESENCE_SETTING_GROUPS.map((group) => {
                    const composite = e.composite(group.key, group.key, ea.STATE_SET).withLabel(group.label).withDescription(group.description);
                    for (const setting of group.settings) composite.withFeature(setting.expose());
                    return composite.withCategory("config");
                });
            });
            toZigbee.push({
                key: SHELLY_PRESENCE_SETTING_GROUPS.map((group) => group.key),
                convertSet: async (entity, key, value, meta) => {
                    const group = SHELLY_PRESENCE_SETTING_GROUPS.find((candidate) => candidate.key === key);
                    if (!group) return;
                    assertObject<KeyValue>(value);

                    // Only the values actually given travel; the rest of the group stays as it is.
                    const config: KeyValue = {};
                    const state: KeyValue = {};
                    for (const setting of group.settings) {
                        const given = value[setting.key];
                        if (given === undefined) continue;
                        if (setting.key === "sensitivity" && given === SHELLY_PRESENCE_SENSITIVITY_CUSTOM) {
                            throw new Error(
                                "Sensitivity 'custom' is reported by the device, not set: adjust the individual detection thresholds instead",
                            );
                        }
                        shellyMergeConfig(config, setting.path, given);
                        state[setting.key] = given as KeyValue[string];
                    }
                    if (Object.keys(state).length === 0) return;

                    utils.assertEndpoint(entity);
                    await rpcSendWithRetry(getRPCEndpoint(entity), "Presence.SetConfig", {config});
                    return {state: {[key]: state}};
                },
            });
        }
        if (featureEcoMode) {
            exposes.push((device: Zh.Device | DummyDevice, _options: KeyValue) => {
                if (utils.isDummyDevice(device) || !device.getEndpoint(SHELLY_ENDPOINT_ID)) return [];
                return [
                    e
                        .binary("eco_mode", ea.STATE_SET, true, false)
                        .withLabel("Eco mode")
                        .withDescription(
                            "Reduce CPU and radio activity to lower power consumption (may slightly increase response latency). Write-only: the device cannot report this back over Zigbee, so it shows what was last set from here",
                        )
                        .withCategory("config"),
                ];
            });
            toZigbee.push({
                key: ["eco_mode"],
                convertSet: async (entity, key, value, meta) => {
                    const ep = getRPCEndpoint(entity);
                    await rpcSendWithRetry(ep, "Sys.SetConfig", {config: {device: {eco_mode: value === true}}});
                    return {state: {eco_mode: value === true}};
                },
            });
        }
        return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
    },
    shellyWiFiSetup(): ModernExtend {
        const normalizeWifiString = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);
        const getKnownFullWifiSsid = (device: Zh.Device, options?: KeyValue): string | undefined => {
            if (typeof options?.shelly_wifi_ssid === "string" && options.shelly_wifi_ssid !== "") return options.shelly_wifi_ssid;
            if (typeof device.meta.shelly_wifi_ssid === "string" && device.meta.shelly_wifi_ssid !== "") return device.meta.shelly_wifi_ssid;
            return undefined;
        };
        const cacheFullWifiSsid = (device: Zh.Device, ssid: unknown) => {
            if (typeof ssid === "string" && ssid !== "" && device.meta.shelly_wifi_ssid !== ssid) {
                device.meta.shelly_wifi_ssid = ssid;
                device.save();
            }
        };
        const rpcResult = (response: KeyValue | undefined): KeyValue | undefined => {
            const result = response?.result ?? response?.params ?? response;
            if (!result) return undefined;
            assertObject<KeyValue>(result);
            return result;
        };
        const readWifiStateViaRpc = async (endpoint: Zh.Endpoint): Promise<KeyValue | undefined> => {
            // Reading through the RPC cluster only gains the untruncated SSID here, and the firmware
            // cannot answer an RPC read at all - it would just cost two timeouts before the setup
            // cluster, which does answer, gets its turn. The reported SSID is completed from the
            // cached one anyway.
            if (!SHELLY_RPC_CAN_READ) return undefined;
            const config = rpcResult(await shellyRpcRequest(endpoint, "Wifi.GetConfig"));
            const status = rpcResult(await shellyRpcRequest(endpoint, "Wifi.GetStatus"));
            const state: KeyValue = {};
            const wifiConfig: KeyValue = {};

            const sta = config?.sta;
            if (sta) {
                assertObject<KeyValue>(sta);
                if (typeof sta.enable === "boolean") wifiConfig.enabled = sta.enable;
                if (typeof sta.ssid === "string") wifiConfig.ssid = sta.ssid;
                if (typeof sta.ipv4mode === "string") state.dhcp_enabled = sta.ipv4mode === "dhcp";
                if (typeof sta.ip === "string") wifiConfig.static_ip = normalizeWifiString(sta.ip);
                if (typeof sta.netmask === "string") wifiConfig.net_mask = normalizeWifiString(sta.netmask);
                if (typeof sta.gw === "string") wifiConfig.gateway = normalizeWifiString(sta.gw);
                if (typeof sta.nameserver === "string") wifiConfig.name_server = normalizeWifiString(sta.nameserver);
            }

            if (status) {
                if (typeof status.status === "string") state.wifi_status = status.status;
                if (typeof status.sta_ip === "string") state.ip_address = normalizeWifiString(status.sta_ip);
                if (wifiConfig.ssid === undefined && typeof status.ssid === "string") wifiConfig.ssid = status.ssid;
            }

            if (Object.keys(wifiConfig).length > 0) {
                state.wifi_config = wifiConfig;
            }

            return Object.keys(state).length > 0 ? state : undefined;
        };
        const refresh = async (endpoint: Zh.Endpoint, meta?: Tz.Meta) => {
            let published = false;
            if (meta) {
                try {
                    const rpcState = await readWifiStateViaRpc(endpoint);
                    const ssid = rpcState?.wifi_config;
                    if (ssid && utils.isObject(ssid)) {
                        cacheFullWifiSsid(endpoint.getDevice(), ssid.ssid);
                    }
                    if (rpcState) {
                        meta.publish(rpcState);
                        published = true;
                    }
                } catch (e) {
                    logger.debug(`Failed to read Wi-Fi state through Shelly RPC, falling back to setup cluster: ${e}`, NS);
                    const ssid = getKnownFullWifiSsid(endpoint.getDevice(), meta.options);
                    if (ssid) {
                        meta.publish({wifi_config: {ssid}});
                        published = true;
                    }
                }
            }

            if (published) {
                return;
            }

            try {
                await endpoint.write<"shellyWiFiSetupCluster", ShellyWiFiSetup>("shellyWiFiSetupCluster", {actionCode: 0}, SHELLY_OPTIONS);
                await endpoint.read<"shellyWiFiSetupCluster", ShellyWiFiSetup>(
                    "shellyWiFiSetupCluster",
                    ["status", "ip", "enabled", "dhcp", "ssid"],
                    SHELLY_OPTIONS,
                );
                await endpoint.read<"shellyWiFiSetupCluster", ShellyWiFiSetup>("shellyWiFiSetupCluster", ["staticIp", "netMask"], SHELLY_OPTIONS);
                await endpoint.read<"shellyWiFiSetupCluster", ShellyWiFiSetup>("shellyWiFiSetupCluster", ["gateway", "nameServer"], SHELLY_OPTIONS);
                if (meta) {
                    published = true;
                }
            } catch (e) {
                logger.warning(`Failed to read Wi-Fi state through Shelly setup cluster; leaving previous state unchanged: ${e}`, NS);
            }
        };

        const exposes: Expose[] = [
            e.text("wifi_status", ea.STATE_GET).withLabel("Wi-Fi status").withDescription("Current connection status").withCategory("diagnostic"),
            e
                .text("ip_address", ea.STATE_GET)
                .withLabel("IP address")
                .withDescription("IP address currently assigned to the device")
                .withCategory("diagnostic"),
            e
                .binary("dhcp_enabled", ea.STATE_GET, true, false)
                .withLabel("DHCP enabled")
                .withDescription("Indicates whether DHCP is used to automatically assign network settings")
                .withCategory("diagnostic"),
            e
                .composite("wifi_config", "wifi_config", ea.ALL)
                .withFeature(
                    e.binary("enabled", ea.STATE_SET, true, false).withLabel("Wi-Fi enabled").withDescription("Enable/disable Wi-Fi connectivity"),
                )
                .withFeature(e.text("ssid", ea.STATE_SET).withLabel("Network").withDescription("Name (SSID) of the Wi-Fi network to connect to"))
                .withFeature(e.text("password", ea.SET).withLabel("Password").withDescription("Password for the selected Wi-Fi network"))
                .withFeature(
                    e
                        .text("static_ip", ea.STATE_SET)
                        .withLabel("IPv4 address")
                        .withDescription("Manually assigned IP address (used when DHCP is disabled)"),
                )
                .withFeature(
                    e.text("net_mask", ea.STATE_SET).withLabel("Network mask").withDescription("Subnet mask for the static IP configuration"),
                )
                .withFeature(
                    e.text("gateway", ea.STATE_SET).withLabel("Gateway").withDescription("Default gateway address for static IP configuration"),
                )
                .withFeature(e.text("name_server", ea.STATE_SET).withLabel("DNS").withDescription("Name server address for static IP configuration"))
                .withLabel("Wi-Fi Configuration")
                .withCategory("config"),
        ];

        // biome-ignore lint/suspicious/noExplicitAny: generic
        const fromZigbee: Fz.Converter<any, any, any>[] = [
            {
                cluster: "shellyWiFiSetupCluster",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const wifi_config: KeyValue = {};
                    const state: KeyValue = {wifi_config};

                    // Diagnostic data
                    if (msg.data.status !== undefined) state.wifi_status = msg.data.status;
                    if (msg.data.ip !== undefined) state.ip_address = msg.data.ip;
                    if (msg.data.dhcp !== undefined) state.dhcp_enabled = msg.data.dhcp === 1;

                    // Wi-Fi config
                    if (msg.data.enabled !== undefined) wifi_config.enabled = msg.data.enabled === 1;
                    if (msg.data.ssid !== undefined) {
                        const reportedSsid = normalizeWifiString(msg.data.ssid);
                        const knownFullSsid = getKnownFullWifiSsid(meta.device, options);
                        wifi_config.ssid = knownFullSsid && reportedSsid && knownFullSsid.startsWith(reportedSsid) ? knownFullSsid : reportedSsid;
                        if (reportedSsid && (!knownFullSsid || reportedSsid.length > knownFullSsid.length)) {
                            cacheFullWifiSsid(meta.device, reportedSsid);
                        }
                    }
                    if (msg.data.staticIp !== undefined) wifi_config.static_ip = msg.data.staticIp;
                    if (msg.data.netMask !== undefined) wifi_config.net_mask = msg.data.netMask;
                    if (msg.data.gateway !== undefined) wifi_config.gateway = msg.data.gateway;
                    if (msg.data.nameServer !== undefined) wifi_config.name_server = msg.data.nameServer;

                    // Cleanup empty keys
                    for (const key in wifi_config) {
                        if (wifi_config[key] === "") {
                            wifi_config[key] = undefined;
                        }
                    }

                    return state;
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["wifi_status", "ip_address", "dhcp_enabled"],
                convertGet: async (entity, key, meta) => {
                    utils.assertEndpoint(entity);
                    const ep = entity.getDevice().getEndpoint(SHELLY_ENDPOINT_ID);
                    if (!ep) throw new Error(`Shelly endpoint ${SHELLY_ENDPOINT_ID} not found`);
                    await refresh(ep, meta);
                },
            },
            {
                key: ["wifi_config"],
                convertGet: async (entity, key, meta) => {
                    utils.assertEndpoint(entity);
                    const ep = entity.getDevice().getEndpoint(SHELLY_ENDPOINT_ID);
                    if (!ep) throw new Error(`Shelly endpoint ${SHELLY_ENDPOINT_ID} not found`);
                    await refresh(ep, meta);
                },
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    const ep = determineEndpoint(entity, meta, "shellyWiFiSetupCluster");

                    const attr1 = {
                        enabled: value.enabled === true,
                        ssid: value.ssid || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr1, SHELLY_OPTIONS);

                    const attr2 = {
                        password: value.password || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr2, SHELLY_OPTIONS);

                    const attr3 = {
                        staticIp: value.static_ip || "",
                        netMask: value.net_mask || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr3, SHELLY_OPTIONS);

                    const attr4 = {
                        gateway: value.gateway || "",
                        nameServer: value.name_server || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr4, SHELLY_OPTIONS);

                    const attr5 = {
                        actionCode: 1,
                    };
                    await ep.write("shellyWiFiSetupCluster", attr5, SHELLY_OPTIONS);

                    return {
                        state: {
                            wifi_config: {
                                enabled: attr1.enabled,
                                ssid: attr1.ssid === "" ? undefined : attr1.ssid,
                                static_ip: attr3.staticIp === "" ? undefined : attr3.staticIp,
                                net_mask: attr3.netMask === "" ? undefined : attr3.netMask,
                                gateway: attr4.gateway === "" ? undefined : attr4.gateway,
                                name_server: attr4.nameServer === "" ? undefined : attr4.nameServer,
                            },
                        },
                    };
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const ep = device.getEndpoint(SHELLY_ENDPOINT_ID);
                if (!ep) return;
                await refresh(ep);
            },
        ];

        const options = [
            e
                .text("shelly_wifi_ssid", ea.SET)
                .withDescription("Full Wi-Fi SSID to use when the Shelly Wi-Fi setup cluster reports a shortened network name"),
        ];

        return {exposes, fromZigbee, toZigbee, configure, options, isModernExtend: true};
    },
    ws90CalculatedValues(): ModernExtend {
        const exposes: Expose[] = [
            // Calculated values only
            e.numeric("dew_point", ea.STATE).withUnit("°C").withDescription("Calculated dew point temperature"),
            e.numeric("wind_chill", ea.STATE).withUnit("°C").withDescription("Calculated wind chill temperature"),
            e.numeric("humidex", ea.STATE).withUnit("°C").withDescription("Calculated humidex (feels-like for warm conditions)"),
            e.numeric("apparent_temperature", ea.STATE).withUnit("°C").withDescription("Calculated apparent temperature"),
            e.numeric("heat_stress", ea.STATE).withUnit("%").withDescription("Calculated heat stress percentage (0-100%)"),
            e.numeric("rain_rate", ea.STATE).withUnit("mm/h").withDescription("Calculated rainfall rate"),
            e.numeric("pressure_trend", ea.STATE).withUnit("hPa/h").withDescription("Pressure change rate (negative = falling)"),
            e.text("weather_condition", ea.STATE).withDescription("Weather condition (sunny, rainy, snowy, cloudy, etc.)"),
        ];

        // biome-ignore lint/suspicious/noExplicitAny: custom clusters not in type registry
        const fromZigbee: Fz.Converter<any, any, any>[] = [
            {
                cluster: "msTemperatureMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.measuredValue !== undefined) {
                        const temperature = msg.data.measuredValue / 100;
                        const calculated = updateWS90CalculatedValues(msg.device, {temperature});
                        return calculated; // Only calculated values; m.temperature() handles base temperature
                    }
                },
            },
            {
                cluster: "msRelativeHumidity",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.measuredValue !== undefined) {
                        const humidity = msg.data.measuredValue / 100;
                        const calculated = updateWS90CalculatedValues(msg.device, {humidity});
                        return calculated; // Only calculated values; m.humidity() handles base humidity
                    }
                },
            },
            {
                cluster: "msPressureMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.measuredValue !== undefined) {
                        const pressure = msg.data.measuredValue / 10;
                        const calculated = updateWS90CalculatedValues(msg.device, {pressure});
                        return calculated; // Only calculated values; m.pressure() handles base pressure
                    }
                },
            },
            {
                cluster: "msIlluminanceMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.measuredValue !== undefined) {
                        const measuredValue = msg.data.measuredValue;
                        const illuminance = measuredValue > 0 ? Math.round(10 ** ((measuredValue - 1) / 10000)) : 0;
                        const calculated = updateWS90CalculatedValues(msg.device, {illuminance});
                        return calculated; // Only calculated values; m.illuminance() handles base illuminance
                    }
                },
            },
            {
                cluster: "shellyWS90UV",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const data = msg.data as KeyValue;
                    const payload = ws90Scaled("uv_index", data.uvIndex, 0xff);
                    if (payload) {
                        return updateWS90CalculatedValues(msg.device, payload);
                    }
                },
            },
            {
                cluster: "shellyWS90Wind",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const data = msg.data as KeyValue;
                    const payload: {[key: string]: number} = {
                        ...(ws90Scaled("wind_speed", data.windSpeed, 0xffff) ?? {}),
                        ...(ws90Scaled("wind_direction", data.windDirection, 0xffff) ?? {}),
                        ...(ws90Scaled("gust_speed", data.gustSpeed, 0xffff) ?? {}),
                    };
                    const calculated = updateWS90CalculatedValues(msg.device, payload);
                    return calculated;
                },
            },
            {
                cluster: "shellyWS90Rain",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const data = msg.data as KeyValue;
                    const payload: {[key: string]: number | boolean} = {
                        ...(ws90Scaled("precipitation", data.precipitation, 0xffffff) ?? {}),
                    };
                    if (data.rainStatus !== undefined) payload.rain_status = Boolean(data.rainStatus);

                    // Calculate rain_rate (it's a calculated value, not a base sensor value)
                    const ws90Meta = getWS90Meta(msg.device);
                    const rainRate = calculateRainRate(ws90Meta, payload.precipitation as number | undefined);
                    const rain_rate = rainRate !== null ? rainRate : 0;

                    // Update state with precipitation and rain_rate
                    const stateUpdate = {...payload, rain_rate};
                    const calculated = updateWS90CalculatedValues(msg.device, stateUpdate);

                    // Include rain_rate in calculated values
                    calculated.rain_rate = rain_rate;

                    return calculated; // Only calculated values; m.binary()/m.numeric() handle base rain values
                },
            },
        ];

        return {exposes, fromZigbee, isModernExtend: true};
    },
    shellyLightLevel(args?: {reporting?: false | m.ReportingConfigWithoutAttribute}): ModernExtend[] {
        const reporting = args?.reporting ?? {min: "1_MINUTE", max: 900, change: 0};
        return [
            m.deviceAddCustomCluster("shellyLightLevel", {
                name: "shellyLightLevel",
                ID: 0xfc21,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    lightLevel: {name: "lightLevel", ID: 0x0000, type: Zcl.DataType.UINT8},
                    darkThreshold: {name: "darkThreshold", ID: 0x0001, type: Zcl.DataType.UINT24, write: true},
                    brightThreshold: {name: "brightThreshold", ID: 0x0002, type: Zcl.DataType.UINT24, write: true},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.enumLookup<"shellyLightLevel", ShellyLightLevel>({
                name: "light_level",
                cluster: "shellyLightLevel",
                attribute: "lightLevel",
                lookup: {dark: 0, twilight: 1, bright: 2},
                description: "Coarse light level",
                reporting,
                access: "STATE_GET",
            }),
            m.numeric<"shellyLightLevel", ShellyLightLevel>({
                name: "dark_threshold",
                cluster: "shellyLightLevel",
                attribute: "darkThreshold",
                valueMin: 0,
                valueMax: 65535,
                reporting: false,
                description: "Lux threshold below which light level is dark",
                unit: "lx",
                access: "ALL",
            }),
            m.numeric<"shellyLightLevel", ShellyLightLevel>({
                name: "bright_threshold",
                cluster: "shellyLightLevel",
                attribute: "brightThreshold",
                valueMin: 0,
                valueMax: 65535,
                reporting: false,
                description: "Lux threshold above which light level is bright",
                unit: "lx",
                access: "ALL",
            }),
        ];
    },
};

// =============================================================================
// Local From Zigbee Converters
// =============================================================================

const handlePosition = e
    .enum("handle_position", ea.STATE, ["closed", "tilted", "open"])
    .withDescription("Handle position: closed, tilted (partly open), or open");

// Resolves which switch input (1 or 2) sent a message, from the definition's own endpoint map:
// the cover-mode 2PM has its inputs on endpoints 2/3, the switch-mode 2PM on 3/4 and the
// single-channel devices on 2 - a fixed endpoint list cannot serve them all. Messages from any
// other endpoint return undefined and must be ignored, not mislabeled as input 1.
const shellyInputNumber = (model: Definition, msg: {device: Zh.Device; endpoint: Zh.Endpoint}): number | undefined => {
    const endpoints = model.endpoint?.(msg.device) ?? {};
    if (endpoints.sw1 === msg.endpoint.ID) return 1;
    if (endpoints.sw2 === msg.endpoint.ID) return 2;
    return undefined;
};

const fzLocal = {
    one_button_events: {
        cluster: "genOnOff",
        type: ["commandToggle"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const event = utils.getFromLookup(msg.endpoint.ID, {1: "single", 2: "double", 3: "triple"});
            return {action: event};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandToggle"]>,

    one_button_scene_events: {
        cluster: "genScenes",
        type: ["commandRecall"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const event = utils.getFromLookup(`${msg.endpoint.ID}`, {"1": "single_long", "2": "double_long", "3": "triple_long"});
            return {action: event};
        },
    } satisfies Fz.Converter<"genScenes", undefined, ["commandRecall"]>,

    four_buttons_single_events: {
        cluster: "genOnOff",
        type: ["commandOn", "commandOff", "commandToggle"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const event = utils.getFromLookup(`${msg.endpoint.ID}_${msg.type}`, {
                "1_commandOn": "1_single",
                "1_commandOff": "2_single",
                "2_commandOn": "3_single",
                "2_commandOff": "4_single",
                "1_commandToggle": "1_single",
                "2_commandToggle": "2_single",
                "3_commandToggle": "3_single",
                "4_commandToggle": "4_single",
            });
            return {action: event};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOn", "commandOff", "commandToggle"]>,

    four_buttons_hold_events: {
        cluster: "genLevelCtrl",
        type: ["commandStep"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const event = utils.getFromLookup(`${msg.endpoint.ID}_${msg.data.stepmode}`, {
                "1_0": "1_hold",
                "1_1": "2_hold",
                "2_0": "3_hold",
                "2_1": "4_hold",
            });
            return {action: event};
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["commandStep"]>,

    four_buttons_scene_events: {
        cluster: "genScenes",
        type: ["commandRecall"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const event = utils.getFromLookup(`${msg.endpoint.ID}_${msg.data.sceneid}`, {
                "1_1": "1_double",
                "2_1": "2_double",
                "3_1": "3_double",
                "4_1": "4_double",

                "1_2": "1_triple",
                "2_2": "2_triple",
                "3_2": "3_triple",
                "4_2": "4_triple",

                "1_11": "1_single_long",
                "2_11": "2_single_long",
                "3_11": "3_single_long",
                "4_11": "4_single_long",

                "1_12": "1_double_long",
                "2_12": "2_double_long",
                "3_12": "3_double_long",
                "4_12": "4_double_long",

                "1_13": "1_triple_long",
                "2_13": "2_triple_long",
                "3_13": "3_triple_long",
                "4_13": "4_triple_long",
            });
            return {action: event};
        },
    } satisfies Fz.Converter<"genScenes", undefined, ["commandRecall"]>,

    // The input numbering comes from the definition's endpoint map (see shellyInputNumber): a
    // fixed endpoint lookup broke the cover-mode 2PM, whose inputs live on endpoints 2/3 while
    // the switch-mode device has them on 3/4 - input 1 threw and input 2 was reported as input 1.
    two_switch_inputs_events: {
        cluster: "genOnOff",
        type: ["commandOn", "commandOff", "commandToggle"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const input = shellyInputNumber(model, msg);
            if (input === undefined) return;
            const event = utils.getFromLookup(msg.type, {commandOn: "on", commandOff: "off", commandToggle: "toggle"});
            return {action: `input_${input}_${event}`};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOn", "commandOff", "commandToggle"]>,

    two_switch_inputs_scene_events: {
        cluster: "genScenes",
        type: ["commandRecall"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const input = shellyInputNumber(model, msg);
            if (input === undefined) return;
            const event = utils.getFromLookup(`${msg.data.sceneid}`, {
                "1": "single",
                "2": "double",
                "3": "triple",
                "4": "hold",
                "5": "toggle",
                "11": "hold",
            });
            return {action: `input_${input}_${event}`};
        },
    } satisfies Fz.Converter<"genScenes", undefined, ["commandRecall"]>,

    one_switch_input_events: {
        cluster: "genOnOff",
        type: ["commandOn", "commandOff", "commandToggle"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            if (shellyInputNumber(model, msg) !== 1) return;
            const event = utils.getFromLookup(msg.type, {
                commandOn: "input_1_on",
                commandOff: "input_1_off",
                commandToggle: "input_1_toggle",
            });
            return {action: event};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOn", "commandOff", "commandToggle"]>,

    one_switch_input_scene_events: {
        cluster: "genScenes",
        type: ["commandRecall"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            if (shellyInputNumber(model, msg) !== 1) return;
            const event = utils.getFromLookup(`${msg.data.sceneid}`, {
                "1": "input_1_single",
                "2": "input_1_double",
                "3": "input_1_triple",
                "4": "input_1_hold",
                "5": "input_1_toggle",
                "11": "input_1_hold",
            });
            return {action: event};
        },
    } satisfies Fz.Converter<"genScenes", undefined, ["commandRecall"]>,

    switch_input_type: {
        cluster: "genOnOffSwitchCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (!Object.hasOwn(msg.data, "switchType")) return {};
            const property = utils.postfixWithEndpointName("switch_type", msg, model, meta);
            return {[property]: utils.getFromLookup(msg.data.switchType as number, {0: "toggle", 1: "momentary"})};
        },
    } satisfies Fz.Converter<"genOnOffSwitchCfg", undefined, ["attributeReport", "readResponse"]>,

    blu_door_window: {
        cluster: "ssIasZone",
        type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
            if (zoneStatus === undefined) return;
            const alarm1 = (zoneStatus & 1) > 0;
            const alarm2 = (zoneStatus & (1 << 1)) > 0;
            // Zone type 0x0016 (door/window handle) per ZigBee spec Table 8-7:
            //   alarm1=0, alarm2=0 -> closed
            //   alarm1=1, alarm2=0 -> tilted (partly open)
            //   alarm1=1, alarm2=1 -> open
            let position: string;
            if (!alarm1 && !alarm2) position = "closed";
            else if (alarm1 && !alarm2) position = "tilted";
            else position = "open";
            return {
                contact: position === "closed",
                handle_position: position,
                battery_low: (zoneStatus & (1 << 3)) > 0,
            };
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
};

const tzLocal = {
    switch_input_type: {
        key: ["switch_type"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {toggle: 0, momentary: 1} as const;
            const ep = determineEndpoint(entity, meta, "genOnOffSwitchCfg");
            await ep.write("genOnOffSwitchCfg", {switchType: utils.getFromLookup(value as string, lookup)});
            return {state: {switch_type: value}};
        },
        convertGet: async (entity, key, meta) => {
            const ep = determineEndpoint(entity, meta, "genOnOffSwitchCfg");
            await ep.read("genOnOffSwitchCfg", ["switchType"]);
        },
    } satisfies Tz.Converter,
};

// =============================================================================
// Device Definitions
// =============================================================================

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mini1", "1 Mini"],
        model: "S4SW-001X8EU",
        vendor: "Shelly",
        description: "1 Mini Gen 4",
        ota: true,
        // The genOnOff/genScenes bindings and the switchType read in configure were added after
        // this device was first released; bump the patch version so already paired devices get
        // re-configured and their input events start arriving (same rule as the BLU remotes).
        version: "0.0.1",
        fromZigbee: [fzLocal.one_switch_input_events, fzLocal.one_switch_input_scene_events, fzLocal.switch_input_type],
        toZigbee: [tzLocal.switch_input_type],
        // The switch input endpoint only exists when an input is actually wired. Without it the
        // setting has nothing to address, and a state that can never hold a value is worse than
        // none - so expose it the same way the 2PM already does, conditional on the endpoint.
        exposes: (device) => [
            e.action(["input_1_on", "input_1_off", "input_1_toggle", "input_1_single", "input_1_double", "input_1_triple", "input_1_hold"]),
            ...shellySwitchInputExposes(device, {sw1: 2}),
        ],
        extend: [
            // The endpoint map must only name endpoints the device actually has: the application
            // builds its property parser from these names and resolves them with a non-null
            // assertion, so naming sw1 on a device without a wired input crashes every
            // switch_type_sw1/switch_mode_sw1 set with "Cannot read properties of undefined
            // (reading 'ID')" (Koenkk/zigbee2mqtt#31951).
            shellyDeviceEndpoints({sw1: 2}),
            m.onOff({powerOnBehavior: false}),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyRPCSetup(["1PMInputMode"]),
            shellyModernExtend.shellyWiFiSetup(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(2);
            if (ep) {
                await ep.bind("genOnOff", coordinatorEndpoint);
                await ep.bind("genScenes", coordinatorEndpoint);
                await ep.read("genOnOffSwitchCfg", ["switchType"]);
            }
        },
    },
    {
        fingerprint: [{modelID: "1", manufacturerName: "Shelly"}],
        model: "S4SW-001X16EU",
        vendor: "Shelly",
        description: "1 Gen 4",
        ota: true,
        // The genOnOff/genScenes bindings and the switchType read in configure were added after
        // this device was first released; bump the patch version so already paired devices get
        // re-configured and their input events start arriving (same rule as the BLU remotes).
        version: "0.0.1",
        fromZigbee: [fzLocal.one_switch_input_events, fzLocal.one_switch_input_scene_events, fzLocal.switch_input_type],
        toZigbee: [tzLocal.switch_input_type],
        // The switch input endpoint only exists when an input is actually wired. Without it the
        // setting has nothing to address, and a state that can never hold a value is worse than
        // none - so expose it the same way the 2PM already does, conditional on the endpoint.
        exposes: (device) => [
            e.action(["input_1_on", "input_1_off", "input_1_toggle", "input_1_single", "input_1_double", "input_1_triple", "input_1_hold"]),
            ...shellySwitchInputExposes(device, {sw1: 2}),
        ],
        extend: [
            // The endpoint map must only name endpoints the device actually has: the application
            // builds its property parser from these names and resolves them with a non-null
            // assertion, so naming sw1 on a device without a wired input crashes every
            // switch_type_sw1/switch_mode_sw1 set with "Cannot read properties of undefined
            // (reading 'ID')" (Koenkk/zigbee2mqtt#31951).
            shellyDeviceEndpoints({sw1: 2}),
            m.onOff({powerOnBehavior: false}),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyRPCSetup(["1PMInputMode"]),
            shellyModernExtend.shellyWiFiSetup(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(2);
            if (ep) {
                await ep.bind("genOnOff", coordinatorEndpoint);
                await ep.bind("genScenes", coordinatorEndpoint);
                await ep.read("genOnOffSwitchCfg", ["switchType"]);
            }
        },
    },
    {
        zigbeeModel: ["Mini1PM", "1PM Mini"],
        model: "S4SW-001P8EU",
        vendor: "Shelly",
        description: "1PM Mini Gen 4",
        ota: true,
        // The genOnOff/genScenes bindings and the switchType read in configure were added after
        // this device was first released; bump the patch version so already paired devices get
        // re-configured and their input events start arriving (same rule as the BLU remotes).
        version: "0.0.1",
        fromZigbee: [fzLocal.one_switch_input_events, fzLocal.one_switch_input_scene_events, fzLocal.switch_input_type],
        toZigbee: [tzLocal.switch_input_type],
        // The switch input endpoint only exists when an input is actually wired. Without it the
        // setting has nothing to address, and a state that can never hold a value is worse than
        // none - so expose it the same way the 2PM already does, conditional on the endpoint.
        exposes: (device) => [
            e.action(["input_1_on", "input_1_off", "input_1_toggle", "input_1_single", "input_1_double", "input_1_triple", "input_1_hold"]),
            ...shellySwitchInputExposes(device, {sw1: 2}),
        ],
        extend: [
            // The endpoint map must only name endpoints the device actually has: the application
            // builds its property parser from these names and resolves them with a non-null
            // assertion, so naming sw1 on a device without a wired input crashes every
            // switch_type_sw1/switch_mode_sw1 set with "Cannot read properties of undefined
            // (reading 'ID')" (Koenkk/zigbee2mqtt#31951).
            shellyDeviceEndpoints({sw1: 2}),
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyRPCSetup(["1PMInputMode"]),
            shellyModernExtend.shellyWiFiSetup(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(2);
            if (ep) {
                await ep.bind("genOnOff", coordinatorEndpoint);
                await ep.bind("genScenes", coordinatorEndpoint);
                await ep.read("genOnOffSwitchCfg", ["switchType"]);
            }
        },
    },
    {
        zigbeeModel: ["1PM"],
        model: "S4SW-001P16EU",
        vendor: "Shelly",
        description: "1PM Gen 4",
        ota: true,
        // The genOnOff/genScenes bindings and the switchType read in configure were added after
        // this device was first released; bump the patch version so already paired devices get
        // re-configured and their input events start arriving (same rule as the BLU remotes).
        version: "0.0.1",
        fromZigbee: [fzLocal.one_switch_input_events, fzLocal.one_switch_input_scene_events, fzLocal.switch_input_type],
        toZigbee: [tzLocal.switch_input_type],
        // The switch input endpoint only exists when an input is actually wired. Without it the
        // setting has nothing to address, and a state that can never hold a value is worse than
        // none - so expose it the same way the 2PM already does, conditional on the endpoint.
        exposes: (device) => [
            e.action(["input_1_on", "input_1_off", "input_1_toggle", "input_1_single", "input_1_double", "input_1_triple", "input_1_hold"]),
            ...shellySwitchInputExposes(device, {sw1: 2}),
        ],
        extend: [
            // The endpoint map must only name endpoints the device actually has: the application
            // builds its property parser from these names and resolves them with a non-null
            // assertion, so naming sw1 on a device without a wired input crashes every
            // switch_type_sw1/switch_mode_sw1 set with "Cannot read properties of undefined
            // (reading 'ID')" (Koenkk/zigbee2mqtt#31951).
            shellyDeviceEndpoints({sw1: 2}),
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyRPCSetup(["1PMInputMode"]),
            shellyModernExtend.shellyWiFiSetup(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(2);
            if (ep) {
                await ep.bind("genOnOff", coordinatorEndpoint);
                await ep.bind("genScenes", coordinatorEndpoint);
                await ep.read("genOnOffSwitchCfg", ["switchType"]);
            }
        },
    },
    {
        zigbeeModel: ["EM Mini"],
        model: "S4EM-001PXCEU16",
        vendor: "Shelly",
        description: "EM Mini Gen4",
        extend: [
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "EM", manufacturerName: "Shelly"}],
        model: "S4EM-002CXCEU",
        vendor: "Shelly",
        description: "EM Gen4",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1"]}),
            m.electricityMeter({
                endpointNames: ["2", "3"],
                producedEnergy: true,
                acFrequency: true,
            }),
            m.forcePowerSource({powerSource: "Mains (single phase)"}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "Shelly",
                modelID: "2PM",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 514, inputClusters: [0, 3, 4, 5, 258], outputClusters: []},
                    {ID: 239, profileID: 49153, deviceID: 8193, inputClusters: [64513, 64514], outputClusters: []},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "Shelly",
                modelID: "2PM",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 514, inputClusters: [0, 3, 4, 5, 258], outputClusters: [25]},
                    {ID: 2, inputClusters: [7], outputClusters: [3, 4, 5, 6]},
                    {ID: 3, inputClusters: [7], outputClusters: [3, 4, 5, 6]},
                    {ID: 4, inputClusters: [], outputClusters: [3, 4, 6, 8, 258]},
                    {ID: 239, profileID: 49153, deviceID: 8193, inputClusters: [64513, 64514], outputClusters: []},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
        ],
        model: "S4SW-002P16EU-COVER",
        vendor: "Shelly",
        description: "2PM Gen4 (Cover mode)",
        ota: true,
        // The genOnOff/genScenes bindings and the switchType read in configure were added after
        // this device was first released; bump the patch version so already paired devices get
        // re-configured and their input events start arriving (same rule as the BLU remotes).
        version: "0.0.1",
        fromZigbee: [fzLocal.two_switch_inputs_events, fzLocal.two_switch_inputs_scene_events, fzLocal.switch_input_type],
        toZigbee: [tzLocal.switch_input_type],
        exposes: (device) => [
            e.action([
                "input_1_on",
                "input_1_off",
                "input_1_toggle",
                "input_1_single",
                "input_1_double",
                "input_1_triple",
                "input_1_hold",
                "input_2_on",
                "input_2_off",
                "input_2_toggle",
                "input_2_single",
                "input_2_double",
                "input_2_triple",
                "input_2_hold",
            ]),
            ...shellySwitchInputExposes(device, {sw1: 2, sw2: 3}),
        ],
        extend: [
            shellyDeviceEndpoints({sw1: 2, sw2: 3}),
            shellyModernExtend.shellyWindowCovering(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyRPCSetup(["2PMCoverInputMode", "CoverTiltAuto"]),
            shellyModernExtend.shellyWiFiSetup(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            for (const epID of [2, 3]) {
                const ep = device.getEndpoint(epID);
                if (ep) {
                    await ep.bind("genOnOff", coordinatorEndpoint);
                    await ep.bind("genScenes", coordinatorEndpoint);
                    await ep.read("genOnOffSwitchCfg", ["switchType"]);
                }
            }
        },
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "Shelly",
                modelID: "2PM",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 266, inputClusters: [0, 3, 4, 5, 6, 2820, 1794], outputClusters: []},
                    {ID: 2, profileID: 260, deviceID: 266, inputClusters: [4, 5, 6, 2820, 1794], outputClusters: []},
                    {ID: 239, profileID: 49153, deviceID: 8193, inputClusters: [64513, 64514], outputClusters: []},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "Shelly",
                modelID: "2PM",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 266, inputClusters: [0, 3, 4, 5, 6, 2820, 1794], outputClusters: [25]},
                    {ID: 2, profileID: 260, deviceID: 266, inputClusters: [4, 5, 6, 2820, 1794], outputClusters: []},
                    {ID: 3, inputClusters: [7], outputClusters: [3, 4, 5, 6]},
                    {ID: 4, inputClusters: [7], outputClusters: [3, 4, 5, 6]},
                    {ID: 5, inputClusters: [], outputClusters: [3, 4, 6, 8, 258]},
                    {ID: 239, profileID: 49153, deviceID: 8193, inputClusters: [64513, 64514], outputClusters: []},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
        ],
        model: "S4SW-002P16EU-SWITCH",
        vendor: "Shelly",
        description: "2PM Gen4 (Switch mode)",
        ota: true,
        // The genOnOff/genScenes bindings and the switchType read in configure were added after
        // this device was first released; bump the patch version so already paired devices get
        // re-configured and their input events start arriving (same rule as the BLU remotes).
        version: "0.0.1",
        fromZigbee: [fzLocal.two_switch_inputs_events, fzLocal.two_switch_inputs_scene_events, fzLocal.switch_input_type],
        toZigbee: [tzLocal.switch_input_type],
        exposes: (device) => [
            e.action([
                "input_1_on",
                "input_1_off",
                "input_1_toggle",
                "input_1_single",
                "input_1_double",
                "input_1_triple",
                "input_1_hold",
                "input_2_on",
                "input_2_off",
                "input_2_toggle",
                "input_2_single",
                "input_2_double",
                "input_2_triple",
                "input_2_hold",
            ]),
            ...shellySwitchInputExposes(device, {sw1: 3, sw2: 4}),
        ],
        extend: [
            shellyDeviceEndpoints({l1: 1, l2: 2, sw1: 3, sw2: 4}),
            m.onOff({powerOnBehavior: false, endpointNames: ["l1", "l2"]}),
            m.electricityMeter({producedEnergy: true, acFrequency: true, endpointNames: ["l1", "l2"]}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyRPCSetup(["2PMSwitchInputMode"]),
            shellyModernExtend.shellyWiFiSetup(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            for (const epID of [3, 4]) {
                const ep = device.getEndpoint(epID);
                if (ep) {
                    await ep.bind("genOnOff", coordinatorEndpoint);
                    await ep.bind("genScenes", coordinatorEndpoint);
                    await ep.read("genOnOffSwitchCfg", ["switchType"]);
                }
            }
        },
    },
    {
        fingerprint: [{modelID: "Plug US", manufacturerName: "Shelly"}],
        model: "S4PL-00116US",
        vendor: "Shelly",
        description: "Plug US Gen4",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter(),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "Power Strip", manufacturerName: "Shelly"}],
        model: "S4PL-00416EU",
        vendor: "Shelly",
        description: "Power strip 4 Gen4",
        version: "0.0.1",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2", "3", "4"]}),
            m.electricityMeter({
                endpointNames: ["1", "2", "3", "4"],
                // Reduce reporting to prevent crashes
                // https://github.com/Koenkk/zigbee2mqtt/issues/31183
                acFrequency: {change: 125},
                current: {change: 60},
                voltage: {change: 625},
                power: {change: 6},
                energy: {change: 125000},
            }),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyRPCSetup(["PowerstripUI", "PowerstripPowerOnBehavior"]),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "Flood", manufacturerName: "Shelly"}],
        model: "S4SN-0071A",
        vendor: "Shelly",
        description: "Flood Gen 4",
        extend: [
            m.battery({percentageReportingConfig: false}),
            m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "tamper", "battery_low", "trouble"]}),
            ...shellyModernExtend.shellyCustomClusters(),
        ],
    },
    {
        fingerprint: [{modelID: "Ecowitt WS90", manufacturerName: "Shelly"}],
        model: "WS90",
        vendor: "Shelly",
        description: "Weather station",
        extend: [
            m.battery({voltage: true}),
            m.numeric({
                name: "capacitor_voltage",
                cluster: "genPowerCfg",
                attribute: "battery2Voltage",
                description: "Capacitor Voltage",
                unit: "V",
                scale: 10,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                access: "STATE_GET",
                entityCategory: "diagnostic",
            }),
            m.illuminance(),
            m.temperature(),
            m.pressure(),
            m.humidity(),
            m.deviceAddCustomCluster("shellyWS90Wind", {
                name: "shellyWS90Wind",
                ID: 0xfc01,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    windSpeed: {name: "windSpeed", ID: 0x0000, type: Zcl.DataType.UINT16},
                    windDirection: {name: "windDirection", ID: 0x0004, type: Zcl.DataType.UINT16},
                    gustSpeed: {name: "gustSpeed", ID: 0x0007, type: Zcl.DataType.UINT16},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.numeric<"shellyWS90Wind", ShellyWS90Wind>({
                name: "wind_speed",
                cluster: "shellyWS90Wind",
                attribute: "windSpeed",
                fzConvert: (model, msg) => ws90Scaled("wind_speed", msg.data.windSpeed, 0xffff),
                valueMin: 0,
                valueMax: 140,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Wind speed in m/s",
                scale: 10,
                unit: "m/s",
                access: "STATE_GET",
            }),
            m.numeric<"shellyWS90Wind", ShellyWS90Wind>({
                name: "wind_direction",
                cluster: "shellyWS90Wind",
                attribute: "windDirection",
                fzConvert: (model, msg) => ws90Scaled("wind_direction", msg.data.windDirection, 0xffff),
                valueMin: 0,
                valueMax: 360,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Wind direction in degrees",
                scale: 10,
                unit: "°",
                access: "STATE_GET",
            }),
            m.numeric<"shellyWS90Wind", ShellyWS90Wind>({
                name: "gust_speed",
                cluster: "shellyWS90Wind",
                attribute: "gustSpeed",
                fzConvert: (model, msg) => ws90Scaled("gust_speed", msg.data.gustSpeed, 0xffff),
                valueMin: 0,
                valueMax: 140,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Gust speed in m/s",
                scale: 10,
                unit: "m/s",
                access: "STATE_GET",
            }),
            m.deviceAddCustomCluster("shellyWS90UV", {
                name: "shellyWS90UV",
                ID: 0xfc02,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    uvIndex: {name: "uvIndex", ID: 0x0000, type: Zcl.DataType.UINT8},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.numeric<"shellyWS90UV", ShellyWS90UV>({
                name: "uv_index",
                cluster: "shellyWS90UV",
                attribute: "uvIndex",
                fzConvert: (model, msg) => ws90Scaled("uv_index", msg.data.uvIndex, 0xff),
                valueMin: 0,
                valueMax: 11,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "UV index",
                scale: 10,
                access: "STATE_GET",
            }),
            m.deviceAddCustomCluster("shellyWS90Rain", {
                name: "shellyWS90Rain",
                ID: 0xfc03,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    rainStatus: {name: "rainStatus", ID: 0x0000, type: Zcl.DataType.BOOLEAN},
                    precipitation: {name: "precipitation", ID: 0x0001, type: Zcl.DataType.UINT24},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.binary<"shellyWS90Rain", ShellyWS90Rain>({
                name: "rain_status",
                cluster: "shellyWS90Rain",
                attribute: "rainStatus",
                valueOn: [true, 1],
                valueOff: [false, 0],
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Rain status",
                access: "STATE_GET",
            }),
            m.numeric<"shellyWS90Rain", ShellyWS90Rain>({
                name: "precipitation",
                cluster: "shellyWS90Rain",
                attribute: "precipitation",
                fzConvert: (model, msg) => ws90Scaled("precipitation", msg.data.precipitation, 0xffffff),
                valueMin: 0,
                valueMax: 100000,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Precipitation",
                unit: "mm",
                scale: 10,
                access: "STATE_GET",
            }),
            // Calculated values (added by PR #11437)
            shellyModernExtend.ws90CalculatedValues(),
        ],
    },
    {
        fingerprint: [
            {modelID: "Dimmer", manufacturerName: "Shelly"},
            {modelID: "Dimmer US", manufacturerName: "Shelly"},
        ],
        model: "S4DM-0A101WWL",
        vendor: "Shelly",
        description: "Dimmer Gen4",
        extend: [
            m.light({configureReporting: true}),
            m.electricityMeter(),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "Dimmer 0-1/10", manufacturerName: "Shelly"}],
        model: "S4DM-0010WW",
        vendor: "Shelly",
        description: "Dimmer 0/1-10V PM Gen4",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4, "239": 239}}),
            m.light(),
            m.electricityMeter(),
            m.commandsOnOff({endpointNames: ["2", "3", "4"]}),
            m.commandsWindowCovering({endpointNames: ["4"]}),
            m.commandsLevelCtrl({endpointNames: ["4"]}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "BLU H&T ZB", manufacturerName: "Shelly"}],
        model: "SBHT-203C",
        vendor: "Shelly",
        description: "Humidity & temperature sensor",
        extend: [m.battery(), m.temperature(), m.humidity()],
    },
    {
        fingerprint: [{modelID: "BLU H&T Display ZB", manufacturerName: "Shelly"}],
        model: "SBHT-103C",
        vendor: "Shelly",
        description: "BLU H&T display Zigbee",
        extend: [m.battery(), m.temperature(), m.humidity(), ...shellyModernExtend.shellyLightLevel()],
    },
    {
        fingerprint: [{modelID: "BLU Remote Control ZB", manufacturerName: "Shelly"}],
        model: "SBRC-005B-B",
        vendor: "Shelly",
        description: "BLU Remote Control ZB",
        exposes: [
            e.action(["on", "off", "brightness_step_up", "brightness_step_down"]),
            e.numeric("action_group", ea.STATE).withDescription("Group ID associated with the action command."),
            e.numeric("action_step_size", ea.STATE).withDescription("Step size value used for brightness step actions."),
            e.numeric("action_transition_time", ea.STATE).withDescription("Transition time in seconds for the action."),
        ],
        extend: [
            m.battery(),
            m.commandsOnOff({commands: ["on", "off"]}),
            m.commandsLevelCtrl({commands: ["brightness_step_up", "brightness_step_down"]}),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: "BLU Button Tough 1 ZB", manufacturerName: "Shelly"}],
        model: "SBBT-102C",
        vendor: "Shelly",
        description: "BLU Button Tough 1 ZB",
        fromZigbee: [fzLocal.one_button_events, fzLocal.one_button_scene_events],
        exposes: [e.action(["single", "double", "triple", "single_long", "double_long", "triple_long"])],
        extend: [m.battery(), m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3}}), m.identify()],
        version: "0.0.2",
        configure: async (device, coordinatorEndpoint, definition) => {
            for (const endpoint of device.endpoints) {
                await endpoint.bind("genOnOff", coordinatorEndpoint);
                await endpoint.bind("genScenes", coordinatorEndpoint);
            }
        },
    },
    {
        zigbeeModel: ["BLU RC Button 4 ZB", "BLU Wall Switch 4 ZB", "BLU Wall Switch 4 ZB DK"],
        model: "SBBT-104CUS",
        vendor: "Shelly",
        description: "BLU RC Button 4 ZB",
        whiteLabel: [
            {vendor: "Shelly", model: "SBBT-004CEU", fingerprint: [{modelID: "BLU Wall Switch 4 ZB"}], description: "BLU Wall Switch 4 ZB"},
            {vendor: "Shelly", model: "SBBT-104CEU", fingerprint: [{modelID: "BLU Wall Switch 4 ZB DK"}], description: "BLU Wall Switch 4 ZB DK"},
        ],
        fromZigbee: [fzLocal.four_buttons_single_events, fzLocal.four_buttons_hold_events, fzLocal.four_buttons_scene_events],
        exposes: [
            e.action([
                "1_single",
                "2_single",
                "3_single",
                "4_single",
                "1_double",
                "2_double",
                "3_double",
                "4_double",
                "1_triple",
                "2_triple",
                "3_triple",
                "4_triple",
                "1_single_long",
                "2_single_long",
                "3_single_long",
                "4_single_long",
                "1_double_long",
                "2_double_long",
                "3_double_long",
                "4_double_long",
                "1_triple_long",
                "2_triple_long",
                "3_triple_long",
                "4_triple_long",
                "1_hold",
                "2_hold",
                "3_hold",
                "4_hold",
            ]),
        ],
        extend: [m.battery(), m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}), m.identify()],
        version: "0.0.2",
        configure: async (device, coordinatorEndpoint, definition) => {
            for (const endpoint of device.endpoints) {
                await endpoint.bind("genOnOff", coordinatorEndpoint);
                await endpoint.bind("genLevelCtrl", coordinatorEndpoint);
                await endpoint.bind("genScenes", coordinatorEndpoint);
            }
        },
    },
    {
        zigbeeModel: ["BLU TRV"],
        model: "SBTR-001AEU",
        vendor: "Shelly",
        description: "Thermostatic radiator valve",
        fromZigbee: [
            fz.thermostat,
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.alarmMask !== undefined) {
                        const alarmMask = msg.data.alarmMask;
                        result.calibration_ok = !((alarmMask & (1 << 2)) > 0);
                    }
                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
        ],
        toZigbee: [
            {
                key: ["calibrate"],
                convertSet: async (entity, key, value, meta) => {
                    await entity.command<"shellyTRVManualMode", "calibrate", ShellyTRVManualMode>(
                        "shellyTRVManualMode",
                        "calibrate",
                        {},
                        {manufacturerCode: Zcl.ManufacturerCode.SHELLY},
                    );
                },
            },
        ],
        exposes: [
            e.binary("calibration_ok", ea.STATE, true, false).withDescription("Calibration OK").withCategory("diagnostic"),
            e.enum("calibrate", ea.SET, ["trigger"]).withDescription("Trigger valve calibration").withCategory("config"),
        ],
        extend: [
            m.battery(),
            m.thermostat({
                localTemperatureCalibration: {values: {min: -10, max: 10, step: 0.1}},
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 4, max: 30, step: 0.1},
                        unoccupiedHeatingSetpoint: {min: 4, max: 30, step: 0.1},
                    },
                },
                setpointsLimit: {
                    minHeatSetpointLimit: {min: 4, max: 30, step: 0.1},
                    maxHeatSetpointLimit: {min: 4, max: 30, step: 0.1},
                },
                systemMode: {values: ["off", "auto", "heat"]},
                piHeatingDemand: {values: true},
            }),
            m.deviceAddCustomCluster("shellyTRVManualMode", {
                name: "shellyTRVManualMode",
                ID: 0xfc24,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    manualMode: {name: "manualMode", ID: 0x0000, type: Zcl.DataType.UINT8},
                    position: {name: "position", ID: 0x0001, type: Zcl.DataType.UINT8},
                },
                commands: {
                    calibrate: {name: "calibrate", ID: 0x0000, parameters: []},
                },
                commandsResponse: {},
            }),
            m.binary({
                name: "manual_mode",
                cluster: "shellyTRVManualMode",
                attribute: {ID: 0x0000, type: Zcl.DataType.UINT8},
                valueOn: [true, 1],
                valueOff: [false, 0],
                description: "Manual mode (0 = auto, 1 = manual)",
                access: "ALL",
            }),
            m.numeric({
                name: "valve_position",
                cluster: "shellyTRVManualMode",
                attribute: {ID: 0x0001, type: Zcl.DataType.UINT8},
                valueMin: 0,
                valueMax: 100,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Valve position (0-100%)",
                unit: "%",
                access: "ALL",
            }),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: "Presence", manufacturerName: "Shelly"}],
        model: "S4SN-0U61X",
        vendor: "Shelly",
        description: "Presence Gen4 Zigbee",
        // The occupancy endpoints only report once reporting is configured on all ten of them, which
        // this definition sets up. Devices paired before this version have no such configuration, so
        // bump the patch version to have the application re-configure them.
        version: "0.0.1",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10}}),
            shellyModernExtend.shellyPresenceOccupancy(),
            ...shellyModernExtend.shellyLightLevel(),
            m.identify(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyRPCSetup(["PresenceZonesAuto", "PresenceZoneConfig", "PresenceSensorConfig", "EcoMode"]),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "BLU DoorWindow ZB", manufacturerName: "Shelly"}],
        model: "SBDW-103C",
        vendor: "Shelly",
        description: "BLU DoorWindow ZB",
        fromZigbee: [fzLocal.blu_door_window],
        toZigbee: [],
        exposes: [e.contact(), handlePosition, e.battery_low()],
        extend: [m.battery(), ...shellyModernExtend.shellyLightLevel(), m.identify()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            if (endpoint) {
                await endpoint.read("ssIasZone", ["zoneStatus"]);
            }
        },
    },
    {
        fingerprint: [{modelID: "BLU Motion ZB", manufacturerName: "Shelly"}],
        model: "SBMO-103Z",
        vendor: "Shelly",
        description: "BLU Motion ZB",
        extend: [
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "battery_low"]}),
            m.battery(),
            ...shellyModernExtend.shellyLightLevel(),
            m.enumLookup({
                name: "motion_sensitivity",
                cluster: "ssIasZone",
                attribute: "currentZoneSensitivityLevel",
                lookup: {low: 1, medium: 2, high: 3},
                description: "Motion sensor sensitivity",
                access: "ALL",
                reporting: false,
                entityCategory: "config",
            }),
            m.identify(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            if (endpoint) {
                await endpoint.read("ssIasZone", ["currentZoneSensitivityLevel"]);
            }
        },
    },
];
