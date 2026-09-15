import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const HALO_MANUFACTURER_CODE = 0x1201;
const CLUSTER_HALO_STATUS = 0xfd00;
const CLUSTER_HALO_CONTROL = 0xfd01;
const CLUSTER_HALO_SENSORS = 0xfd02;
const CLUSTER_HALO_WEATHER = 0xfd03;
const HALO_COMMAND_TEST = 0x00;
const HALO_COMMAND_HUSH = 0x01;
const HALO_TEST_START = 0x01;
const HALO_TEST_CANCEL = 0x00;
const HALO_HUSH_START = 0x00;
const HALO_HUSH_STOP = 0x01;
const WEATHER_ALERT_CODES = [
    "NONE",
    "AVA",
    "AVW",
    "BZW",
    "CFA",
    "CFW",
    "DSW",
    "EQW",
    "FFA",
    "FFS",
    "FFW",
    "FLA",
    "FLS",
    "FLW",
    "FRW",
    "FSW",
    "FZW",
    "HLS",
    "HUA",
    "HUW",
    "HWA",
    "HWW",
    "SPS",
    "SVA",
    "SVR",
    "SVS",
    "TOA",
    "TOR",
    "TRA",
    "TRW",
    "TSA",
    "TSW",
    "VOW",
    "WSA",
    "WSW",
    "ADR",
    "NIC",
    "NMN",
    "CAE",
    "LAE",
    "TOE",
    "DMO",
    "NAT",
    "NPT",
    "NST",
    "RMT",
    "RWT",
    "CDW",
    "CEM",
    "EAN",
    "EAT",
    "EVI",
    "HMW",
    "NUW",
    "RHW",
    "SPW",
    "LEW",
    "SMW",
    "??S",
    "??M",
    "??E",
    "??A",
    "??W",
    "BHW",
    "BWW",
    "CHW",
    "CWW",
    "DBA",
    "DBW",
    "DEW",
    "EVA",
    "FCW",
    "IBW",
    "IFW",
    "LSW",
    "POS",
    "WFA",
    "WFW",
    "EWW",
    "SSA",
    "SSW",
] as const;
const WEATHER_ALERT_STATE_CODES = [...WEATHER_ALERT_CODES, "UNKNOWN"] as const;
type WeatherAlertCode = (typeof WEATHER_ALERT_CODES)[number];
type WeatherAlertStateCode = (typeof WEATHER_ALERT_STATE_CODES)[number];
const WEATHER_ALERT_CODE_SET = new Set<string>(WEATHER_ALERT_CODES);
const WEATHER_ALERT_TO_ID: Record<WeatherAlertCode, number> = WEATHER_ALERT_CODES.reduce(
    (acc, code, index) => {
        acc[code] = index;
        return acc;
    },
    {} as Record<WeatherAlertCode, number>,
);
const WEATHER_ID_TO_ALERT: Record<number, WeatherAlertCode> = WEATHER_ALERT_CODES.reduce(
    (acc, code, index) => {
        acc[index] = code;
        return acc;
    },
    {} as Record<number, WeatherAlertCode>,
);
const WEATHER_PLAYING_STATE_VALUES = ["quiet", "playing"] as const;
const WEATHER_PLAYBACK_ACTIONS = ["play", "stop"] as const;
type WeatherPlaybackAction = (typeof WEATHER_PLAYBACK_ACTIONS)[number];
const HALO_WEATHER_COMMAND_SCAN = 0x00;
const HALO_WEATHER_COMMAND_PLAY = 0x03;
const WEATHER_STATION_MIN = 1;
const WEATHER_STATION_MAX = 7;
const WEATHER_STATION_FREQUENCIES: Record<number, string> = {
    1: "162.400 MHz",
    2: "162.425 MHz",
    3: "162.450 MHz",
    4: "162.475 MHz",
    5: "162.500 MHz",
    6: "162.525 MHz",
    7: "162.550 MHz",
};

const HALO_ALERT_STATES = [
    "safe",
    "pre_smoke",
    "smoke",
    "carbon_monoxide",
    "weather",
    "interconnect_smoke",
    "interconnect_carbon_monoxide",
    "silenced",
    "low_battery",
    "very_low_battery",
    "failed_battery",
    "end_of_life",
    "other",
    "co_test",
    "smoke_test",
] as const;
const HALO_TEST_STATES = [
    "idle",
    "running",
    "success",
    "fail_ion",
    "fail_photo",
    "fail_co",
    "fail_temperature",
    "fail_weather",
    "fail_other",
] as const;
const HALO_HUSH_STATES = ["ready", "success", "timeout", "disabled"] as const;
const HALO_ROOMS = [
    "none",
    "basement",
    "bedroom",
    "den",
    "dining_room",
    "downstairs",
    "entryway",
    "family_room",
    "game_room",
    "guest_bedroom",
    "hallway",
    "kids_bedroom",
    "living_room",
    "master_bedroom",
    "office",
    "study",
    "upstairs",
    "workout_room",
] as const;
type HaloRoom = (typeof HALO_ROOMS)[number];
const HALO_ROOM_ID_BY_NAME: Record<HaloRoom, number> = {
    none: 0xff,
    basement: 0x00,
    bedroom: 0x01,
    den: 0x02,
    dining_room: 0x03,
    downstairs: 0x04,
    entryway: 0x05,
    family_room: 0x06,
    game_room: 0x07,
    guest_bedroom: 0x08,
    hallway: 0x09,
    kids_bedroom: 0x0a,
    living_room: 0x0b,
    master_bedroom: 0x0c,
    office: 0x0d,
    study: 0x0e,
    upstairs: 0x0f,
    workout_room: 0x10,
};
const HALO_ROOM_NAME_BY_ID = Object.entries(HALO_ROOM_ID_BY_NAME).reduce(
    (acc, [name, id]) => {
        acc[id] = name as HaloRoom;
        return acc;
    },
    {} as Record<number, HaloRoom>,
);

interface HaloDeviceStatusCluster {
    attributes: {
        deviceStatus?: number;
        room?: number;
    };
    commands: never;
    commandResponses: never;
}

type HaloControlCommandPayload = {value: number};
interface HaloControlCluster {
    attributes: {
        testStatus?: number;
        hushStatus?: number;
    };
    commands: {
        haloTest: HaloControlCommandPayload;
        haloHush: HaloControlCommandPayload;
    };
    commandResponses: never;
}

interface HaloSensorsCluster {
    attributes: {
        coPpm?: number;
    };
    commands: never;
    commandResponses: never;
}

type HaloWeatherCommandPayloads = {
    weatherScan: never;
    weatherRadioPlay: {value: number};
};
interface HaloWeatherCluster {
    attributes: {
        weatherAlertStatus?: number;
        weatherMute?: number;
        weatherLocation?: number;
        weatherEvent1?: number;
        weatherEvent2?: number;
        weatherEvent3?: number;
        weatherStation?: number;
        weatherStationRssi1?: number;
        weatherStationRssi2?: number;
        weatherStationRssi3?: number;
        weatherStationRssi4?: number;
        weatherStationRssi5?: number;
        weatherStationRssi6?: number;
        weatherStationRssi7?: number;
    };
    commands: HaloWeatherCommandPayloads;
    commandResponses: never;
}

type HaloWeatherMetaState = {
    event1?: number;
    event2?: number;
    event3?: number;
};

function ensureHaloWeatherMetaState(meta: Fz.Meta): HaloWeatherMetaState {
    if (!meta.state.haloWeather) {
        meta.state.haloWeather = {};
    }
    return meta.state.haloWeather as HaloWeatherMetaState;
}

function normalizeWeatherStation(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
        throw new Error("weather_station must be an integer between 1 and 7");
    }
    if (parsed < WEATHER_STATION_MIN || parsed > WEATHER_STATION_MAX) {
        throw new Error(`weather_station must be between ${WEATHER_STATION_MIN} and ${WEATHER_STATION_MAX}`);
    }
    return parsed;
}

function normalizeWeatherLocation(value: unknown): {numeric: number; padded: string} {
    const raw = typeof value === "number" ? value.toString() : String(value ?? "").trim();
    if (!/^\d{1,6}$/.test(raw)) {
        throw new Error("weather_location must be a numeric SAME code up to 6 digits");
    }
    const padded = raw.padStart(6, "0");
    return {numeric: Number(padded), padded};
}

function normalizeWeatherAlertCode(value: string): WeatherAlertCode {
    const upper = value.toUpperCase();
    if (!WEATHER_ALERT_CODE_SET.has(upper)) {
        throw new Error(`Unsupported weather alert code: ${value}`);
    }
    return upper as WeatherAlertCode;
}

function normalizeHaloRoom(value: unknown): HaloRoom {
    if (value === undefined || value === null) {
        throw new Error("room value is required");
    }
    const normalized = String(value).trim().toLowerCase().replace(/\s+/g, "_");
    if (!(normalized in HALO_ROOM_ID_BY_NAME)) {
        throw new Error(`Unsupported room value '${value}'`);
    }
    return normalized as HaloRoom;
}

function haloRoomIdToName(id?: number): HaloRoom {
    if (id === undefined) return "none";
    return HALO_ROOM_NAME_BY_ID[id] ?? "none";
}

function parseWeatherAlertList(value: unknown): WeatherAlertCode[] {
    if (value === undefined || value === null) {
        return [];
    }
    let rawList: string[] | undefined;
    if (Array.isArray(value)) {
        rawList = value.map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")));
    } else if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    rawList = parsed.map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")));
                }
            } catch {
                // fall back to simple splitting
            }
        }
        if (!rawList) {
            rawList = trimmed
                .split(/[,\s]+/)
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0);
        }
    } else {
        rawList = [String(value)];
    }
    const unique: WeatherAlertCode[] = [];
    for (const entry of rawList) {
        const code = normalizeWeatherAlertCode(entry);
        if (!unique.includes(code)) {
            unique.push(code);
        }
    }
    return unique;
}

function encodeWeatherAlertBitmaps(alerts: WeatherAlertCode[]): {event1: number; event2: number; event3: number} {
    let event1 = 0;
    let event2 = 0;
    let event3 = 0;
    for (const alert of alerts) {
        const id = WEATHER_ALERT_TO_ID[alert];
        if (id <= 0) continue;
        if (id <= 32) {
            event1 = (event1 | (1 << (id - 1))) >>> 0;
        } else if (id <= 62) {
            event2 = (event2 | (1 << (id - 33))) >>> 0;
        } else if (id <= 80) {
            event3 = (event3 | (1 << (id - 63))) >>> 0;
        }
    }
    return {event1, event2, event3};
}

function decodeWeatherAlertBitmaps(state: HaloWeatherMetaState): WeatherAlertCode[] {
    const result = new Set<WeatherAlertCode>();
    const addFromBitmap = (bitmap: number | undefined, startId: number) => {
        if (bitmap === undefined) return;
        const unsigned = bitmap >>> 0;
        for (let bit = 0; bit < 32; bit += 1) {
            if ((unsigned & (1 << bit)) !== 0) {
                const id = startId + bit;
                const code = WEATHER_ID_TO_ALERT[id];
                if (code) {
                    result.add(code);
                }
            }
        }
    };
    addFromBitmap(state.event1, 1);
    addFromBitmap(state.event2, 33);
    addFromBitmap(state.event3, 63);
    return [...result].sort((a, b) => WEATHER_ALERT_TO_ID[a] - WEATHER_ALERT_TO_ID[b]);
}

const DEVICE_STATUS_LOOKUP: Record<number, (typeof HALO_ALERT_STATES)[number]> = {
    0: "safe",
    1: "low_battery",
    2: "end_of_life",
    4: "pre_smoke",
    5: "weather",
    6: "carbon_monoxide",
    7: "smoke",
    8: "other",
    9: "silenced",
    10: "very_low_battery",
    11: "failed_battery",
    14: "co_test",
    16: "smoke_test",
    18: "interconnect_carbon_monoxide",
    19: "interconnect_smoke",
};

const TEST_STATUS_LOOKUP: Record<number, (typeof HALO_TEST_STATES)[number]> = {
    0: "success",
    1: "fail_ion",
    2: "fail_photo",
    3: "fail_co",
    4: "fail_temperature",
    5: "fail_weather",
    6: "fail_other",
    7: "running",
};

const HUSH_STATUS_LOOKUP: Record<number, (typeof HALO_HUSH_STATES)[number]> = {
    0: "success",
    1: "timeout",
    2: "ready",
    3: "disabled",
};

function haloZoneStatus(): ModernExtend {
    return {
        exposes: [
            e.smoke(),
            e.carbon_monoxide(),
            e.tamper(),
            e.battery_low(),
            e.test(),
            e
                .binary("mains_power_connected", ea.STATE, true, false)
                .withDescription("Indicates whether mains power is currently available")
                .withCategory("diagnostic"),
        ],
        fromZigbee: [
            fz.ias_enroll,
            {
                cluster: "ssIasZone",
                type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
                    if (zoneStatus === undefined) return;

                    const payload: KeyValue = {};
                    if (msg.endpoint.ID === 1) {
                        payload.smoke = (zoneStatus & 1) > 0;
                        payload.tamper = (zoneStatus & (1 << 2)) > 0;
                        payload.battery_low = (zoneStatus & (1 << 3)) > 0;
                        payload.test = (zoneStatus & (1 << 8)) > 0;
                        const acFault = (zoneStatus & (1 << 7)) > 0;
                        payload.mains_power_connected = !acFault;
                    } else if (msg.endpoint.ID === 3) {
                        payload.carbon_monoxide = (zoneStatus & 1) > 0;
                    }

                    if (Object.keys(payload).length > 0) {
                        return payload;
                    }
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
        ],
        configure: [
            async (device, coordinatorEndpoint) => {
                const endpoint1 = device.getEndpoint(1);
                if (endpoint1) {
                    await reporting.bind(endpoint1, coordinatorEndpoint, ["ssIasZone"]);
                    await endpoint1.read("ssIasZone", ["zoneStatus"]);
                }
                const endpoint3 = device.getEndpoint(3);
                if (endpoint3) {
                    await reporting.bind(endpoint3, coordinatorEndpoint, ["ssIasZone"]);
                    await endpoint3.read("ssIasZone", ["zoneStatus"]);
                }
            },
        ],
        isModernExtend: true,
    };
}

function haloDeviceStatus(): ModernExtend {
    return {
        exposes: [
            e
                .enum("halo_alert_state", ea.STATE, [...HALO_ALERT_STATES])
                .withDescription("Device state reported by the manufacturer cluster")
                .withCategory("diagnostic"),
            e.enum("room", ea.STATE_SET, [...HALO_ROOMS]).withDescription("Spoken room name used in Halo announcements"),
        ],
        fromZigbee: [
            {
                cluster: "haloDeviceStatus",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const payload: KeyValue = {};
                    const status = msg.data.deviceStatus;
                    if (status !== undefined) {
                        const mapped = DEVICE_STATUS_LOOKUP[status] ?? "other";
                        payload.halo_alert_state = mapped;
                        payload.weather_alert = mapped === "weather";
                    }
                    if (msg.data.room !== undefined) {
                        payload.room = haloRoomIdToName(msg.data.room);
                    }
                    if (Object.keys(payload).length > 0) {
                        return payload;
                    }
                },
            } satisfies Fz.Converter<"haloDeviceStatus", HaloDeviceStatusCluster, ["attributeReport", "readResponse"]>,
        ],
        toZigbee: [
            {
                key: ["room"],
                convertSet: async (entity, key, value, meta) => {
                    const roomName = normalizeHaloRoom(value);
                    const roomId = HALO_ROOM_ID_BY_NAME[roomName];
                    const endpoint = meta.device.getEndpoint(4);
                    if (!endpoint) {
                        throw new Error(`Failed to find endpoint 4 on Halo device ${meta.device.ieeeAddr}`);
                    }
                    await endpoint.write<"haloDeviceStatus", HaloDeviceStatusCluster>(
                        "haloDeviceStatus",
                        {room: roomId},
                        {manufacturerCode: HALO_MANUFACTURER_CODE},
                    );
                    return {state: {room: roomName}};
                },
            } satisfies Tz.Converter,
        ],
        configure: [
            async (device, coordinatorEndpoint) => {
                const endpoint4 = device.getEndpoint(4);
                if (endpoint4) {
                    await reporting.bind(endpoint4, coordinatorEndpoint, [CLUSTER_HALO_STATUS]);
                    await endpoint4.read<"haloDeviceStatus", HaloDeviceStatusCluster>("haloDeviceStatus", ["deviceStatus", "room"], {
                        manufacturerCode: HALO_MANUFACTURER_CODE,
                    });
                }
            },
        ],
        isModernExtend: true,
    };
}

function haloControl(): ModernExtend {
    return {
        exposes: [
            e
                .enum("halo_test_result", ea.STATE, [...HALO_TEST_STATES])
                .withDescription("Result of the most recent self-test")
                .withCategory("diagnostic"),
            e.binary("test_in_progress", ea.STATE, true, false).withDescription("Indicates whether a test is running").withCategory("diagnostic"),
            e
                .enum("halo_hush_state", ea.STATE, [...HALO_HUSH_STATES])
                .withDescription("Current hush status")
                .withCategory("diagnostic"),
            e.binary("hush_active", ea.STATE, true, false).withDescription("Indicates whether the alarm is hushed").withCategory("diagnostic"),
            e.enum("hush", ea.SET, ["start", "stop"]).withDescription("Start or cancel hush mode"),
            e.enum("test_cycle", ea.SET, ["start", "cancel"]).withDescription("Start or cancel the built-in test"),
        ],
        fromZigbee: [
            {
                cluster: "haloControl",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const payload: KeyValue = {};
                    if (msg.data.testStatus !== undefined) {
                        const mapped = TEST_STATUS_LOOKUP[msg.data.testStatus] ?? "idle";
                        payload.halo_test_result = mapped;
                        payload.test_in_progress = mapped === "running";
                    }
                    if (msg.data.hushStatus !== undefined) {
                        const mapped = HUSH_STATUS_LOOKUP[msg.data.hushStatus] ?? "ready";
                        payload.halo_hush_state = mapped;
                        payload.hush_active = mapped === "success";
                    }
                    if (Object.keys(payload).length > 0) {
                        return payload;
                    }
                },
            } satisfies Fz.Converter<"haloControl", HaloControlCluster, ["attributeReport", "readResponse"]>,
        ],
        toZigbee: [
            {
                key: ["hush"],
                convertSet: async (entity, key, value, meta) => {
                    if (value === undefined) throw new Error("Value must be provided");
                    const normalized = String(value).toLowerCase();
                    if (!["start", "stop"].includes(normalized)) {
                        throw new Error("Value must be one of 'start' or 'stop'");
                    }
                    const payloadValue = normalized === "start" ? HALO_HUSH_START : HALO_HUSH_STOP;
                    const endpoint = meta.device.getEndpoint(4);
                    if (!endpoint) {
                        throw new Error(`Failed to find endpoint 4 on Halo device ${meta.device.ieeeAddr}`);
                    }
                    await endpoint.command<"haloControl", "haloHush", HaloControlCluster>(
                        "haloControl",
                        "haloHush",
                        {value: payloadValue},
                        {manufacturerCode: HALO_MANUFACTURER_CODE, disableDefaultResponse: true},
                    );
                    return {state: {hush: normalized}};
                },
            } satisfies Tz.Converter,
            {
                key: ["test_cycle"],
                convertSet: async (entity, key, value, meta) => {
                    if (value === undefined) throw new Error("Value must be provided");
                    const normalized = String(value).toLowerCase();
                    if (!["start", "cancel"].includes(normalized)) {
                        throw new Error("Value must be one of 'start' or 'cancel'");
                    }
                    const payloadValue = normalized === "start" ? HALO_TEST_START : HALO_TEST_CANCEL;
                    const endpoint = meta.device.getEndpoint(4);
                    if (!endpoint) {
                        throw new Error(`Failed to find endpoint 4 on Halo device ${meta.device.ieeeAddr}`);
                    }
                    await endpoint.command<"haloControl", "haloTest", HaloControlCluster>(
                        "haloControl",
                        "haloTest",
                        {value: payloadValue},
                        {manufacturerCode: HALO_MANUFACTURER_CODE, disableDefaultResponse: true},
                    );
                    return {state: {test_cycle: normalized}};
                },
            } satisfies Tz.Converter,
        ],
        configure: [
            async (device, coordinatorEndpoint) => {
                const endpoint4 = device.getEndpoint(4);
                if (endpoint4) {
                    await reporting.bind(endpoint4, coordinatorEndpoint, [CLUSTER_HALO_CONTROL]);
                    await endpoint4.read<"haloControl", HaloControlCluster>("haloControl", ["testStatus", "hushStatus"], {
                        manufacturerCode: HALO_MANUFACTURER_CODE,
                    });
                }
            },
        ],
        isModernExtend: true,
    };
}

function haloSensors(): ModernExtend {
    return {
        exposes: [
            e
                .numeric("co_ppm", ea.STATE)
                .withDescription("Current CO concentration reported by the detector")
                .withUnit("ppm")
                .withCategory("diagnostic"),
        ],
        fromZigbee: [
            {
                cluster: "haloSensors",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.coPpm !== undefined) {
                        return {co_ppm: msg.data.coPpm};
                    }
                },
            } satisfies Fz.Converter<"haloSensors", HaloSensorsCluster, ["attributeReport", "readResponse"]>,
        ],
        configure: [
            async (device, coordinatorEndpoint) => {
                const endpoint4 = device.getEndpoint(4);
                if (endpoint4) {
                    await reporting.bind(endpoint4, coordinatorEndpoint, [CLUSTER_HALO_SENSORS]);
                    await endpoint4.read<"haloSensors", HaloSensorsCluster>("haloSensors", ["coPpm"], {
                        manufacturerCode: HALO_MANUFACTURER_CODE,
                    });
                    await m.setupAttributes(endpoint4, coordinatorEndpoint, "haloSensors", [
                        {attribute: {ID: 0x0002, type: Zcl.DataType.INT16}, min: "10_SECONDS", max: "1_HOUR", change: 1},
                    ]);
                }
            },
        ],
        isModernExtend: true,
    };
}

function haloWeather(): ModernExtend {
    return {
        exposes: [
            e
                .binary("weather_alert", ea.STATE, true, false)
                .withDescription("Indicates an active NOAA/SAME weather alert")
                .withCategory("diagnostic"),
            e
                .enum("current_weather_alert", ea.STATE, [...WEATHER_ALERT_STATE_CODES])
                .withDescription("Current NOAA/SAME event code reported by the detector")
                .withCategory("diagnostic"),
            e
                .list("weather_alerts_interest", ea.STATE_SET, e.enum("alert", ea.STATE_SET, [...WEATHER_ALERT_CODES]).withDescription("Alert code"))
                .withDescription("NOAA/SAME event codes that should trigger the Halo+ speaker")
                .withCategory("config"),
            e
                .text("weather_location", ea.STATE_SET)
                .withDescription("SAME location code (000000-999999) announced by the weather radio")
                .withCategory("config"),
            e
                .numeric("weather_station", ea.STATE_SET)
                .withValueMin(WEATHER_STATION_MIN)
                .withValueMax(WEATHER_STATION_MAX)
                .withDescription("Weather radio preset (1-7)")
                .withCategory("config"),
            e.text("weather_frequency", ea.STATE).withDescription("Frequency of the selected weather radio preset").withCategory("diagnostic"),
            e
                .enum("weather_playing_state", ea.STATE, [...WEATHER_PLAYING_STATE_VALUES])
                .withDescription("Current playback state of the weather radio")
                .withCategory("diagnostic"),
            e.enum("weather_playback", ea.SET, [...WEATHER_PLAYBACK_ACTIONS]).withDescription("Start or stop the weather radio audio"),
        ],
        fromZigbee: [
            {
                cluster: "haloWeather",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const payload: KeyValue = {};
                    const weatherState = ensureHaloWeatherMetaState(meta);

                    if (msg.data.weatherAlertStatus !== undefined) {
                        const code = (WEATHER_ID_TO_ALERT[msg.data.weatherAlertStatus] ?? "UNKNOWN") as WeatherAlertStateCode;
                        payload.current_weather_alert = code;
                        payload.weather_alert = msg.data.weatherAlertStatus !== 0;
                    }

                    if (msg.data.weatherMute !== undefined) {
                        const playing = Number(msg.data.weatherMute) === 1;
                        payload.weather_playing_state = playing ? "playing" : "quiet";
                    }

                    if (msg.data.weatherLocation !== undefined) {
                        payload.weather_location = msg.data.weatherLocation.toString().padStart(6, "0");
                    }

                    if (msg.data.weatherStation !== undefined) {
                        const station = msg.data.weatherStation;
                        if (station >= WEATHER_STATION_MIN && station <= WEATHER_STATION_MAX) {
                            payload.weather_station = station;
                            payload.weather_frequency = WEATHER_STATION_FREQUENCIES[station];
                        }
                    }

                    let eventsChanged = false;
                    if (msg.data.weatherEvent1 !== undefined) {
                        weatherState.event1 = msg.data.weatherEvent1;
                        eventsChanged = true;
                    }
                    if (msg.data.weatherEvent2 !== undefined) {
                        weatherState.event2 = msg.data.weatherEvent2;
                        eventsChanged = true;
                    }
                    if (msg.data.weatherEvent3 !== undefined) {
                        weatherState.event3 = msg.data.weatherEvent3;
                        eventsChanged = true;
                    }
                    if (eventsChanged) {
                        payload.weather_alerts_interest = decodeWeatherAlertBitmaps(weatherState);
                    }

                    if (Object.keys(payload).length > 0) {
                        return payload;
                    }
                },
            } satisfies Fz.Converter<"haloWeather", HaloWeatherCluster, ["attributeReport", "readResponse"]>,
        ],
        toZigbee: [
            {
                key: ["weather_playback"],
                convertSet: async (entity, key, value, meta) => {
                    if (value === undefined) throw new Error("Value must be provided");
                    const normalized = typeof value === "boolean" ? (value ? "play" : "stop") : String(value).toLowerCase();
                    if (!WEATHER_PLAYBACK_ACTIONS.includes(normalized as WeatherPlaybackAction)) {
                        throw new Error("Value must be 'play' or 'stop'");
                    }
                    const commandValue = normalized === "play" ? 0x01 : 0x00;
                    const endpoint = meta.device.getEndpoint(5);
                    if (!endpoint) {
                        throw new Error(`Failed to find endpoint 5 on Halo device ${meta.device.ieeeAddr}`);
                    }
                    await endpoint.command<"haloWeather", "weatherRadioPlay", HaloWeatherCluster>(
                        "haloWeather",
                        "weatherRadioPlay",
                        {value: commandValue},
                        {manufacturerCode: HALO_MANUFACTURER_CODE, disableDefaultResponse: true},
                    );
                    return {state: {weather_playback: normalized, weather_playing_state: normalized === "play" ? "playing" : "quiet"}};
                },
            } satisfies Tz.Converter,
            {
                key: ["weather_station"],
                convertSet: async (entity, key, value, meta) => {
                    if (value === undefined) throw new Error("Value must be provided");
                    const station = normalizeWeatherStation(value);
                    const endpoint = meta.device.getEndpoint(5);
                    if (!endpoint) {
                        throw new Error(`Failed to find endpoint 5 on Halo device ${meta.device.ieeeAddr}`);
                    }
                    await endpoint.write<"haloWeather", HaloWeatherCluster>(
                        "haloWeather",
                        {weatherStation: station},
                        {manufacturerCode: HALO_MANUFACTURER_CODE},
                    );
                    return {state: {weather_station: station, weather_frequency: WEATHER_STATION_FREQUENCIES[station]}};
                },
            } satisfies Tz.Converter,
            {
                key: ["weather_location"],
                convertSet: async (entity, key, value, meta) => {
                    if (value === undefined) throw new Error("Value must be provided");
                    const location = normalizeWeatherLocation(value);
                    const endpoint = meta.device.getEndpoint(5);
                    if (!endpoint) {
                        throw new Error(`Failed to find endpoint 5 on Halo device ${meta.device.ieeeAddr}`);
                    }
                    await endpoint.write<"haloWeather", HaloWeatherCluster>(
                        "haloWeather",
                        {weatherLocation: location.numeric},
                        {manufacturerCode: HALO_MANUFACTURER_CODE},
                    );
                    return {state: {weather_location: location.padded}};
                },
            } satisfies Tz.Converter,
            {
                key: ["weather_alerts_interest"],
                convertSet: async (entity, key, value, meta) => {
                    if (value === undefined) throw new Error("Value must be provided");
                    const alerts = parseWeatherAlertList(value);
                    const {event1, event2, event3} = encodeWeatherAlertBitmaps(alerts);
                    const endpoint = meta.device.getEndpoint(5);
                    if (!endpoint) {
                        throw new Error(`Failed to find endpoint 5 on Halo device ${meta.device.ieeeAddr}`);
                    }
                    await endpoint.write<"haloWeather", HaloWeatherCluster>(
                        "haloWeather",
                        {weatherEvent1: event1, weatherEvent2: event2, weatherEvent3: event3},
                        {manufacturerCode: HALO_MANUFACTURER_CODE},
                    );
                    return {state: {weather_alerts_interest: alerts}};
                },
            } satisfies Tz.Converter,
        ],
        configure: [
            async (device, coordinatorEndpoint) => {
                const endpoint5 = device.getEndpoint(5);
                if (endpoint5) {
                    await reporting.bind(endpoint5, coordinatorEndpoint, [CLUSTER_HALO_WEATHER]);
                    await endpoint5.read<"haloWeather", HaloWeatherCluster>(
                        "haloWeather",
                        ["weatherAlertStatus", "weatherMute", "weatherLocation", "weatherEvent1", "weatherEvent2", "weatherEvent3", "weatherStation"],
                        {manufacturerCode: HALO_MANUFACTURER_CODE},
                    );
                }
            },
        ],
        isModernExtend: true,
    };
}

const haloCommonExtend: ModernExtend[] = [
    m.deviceEndpoints({endpoints: {default: 1, light: 2}}),
    m.deviceAddCustomCluster("haloDeviceStatus", {
        name: "haloDeviceStatus",
        ID: CLUSTER_HALO_STATUS,
        manufacturerCode: HALO_MANUFACTURER_CODE,
        attributes: {
            deviceStatus: {name: "deviceStatus", ID: 0x0000, type: Zcl.DataType.ENUM8},
            room: {name: "room", ID: 0x0002, type: Zcl.DataType.ENUM8},
        },
        commands: {},
        commandsResponse: {},
    }),
    m.deviceAddCustomCluster("haloControl", {
        name: "haloControl",
        ID: CLUSTER_HALO_CONTROL,
        manufacturerCode: HALO_MANUFACTURER_CODE,
        attributes: {
            testStatus: {name: "testStatus", ID: 0x0000, type: Zcl.DataType.ENUM8},
            hushStatus: {name: "hushStatus", ID: 0x0001, type: Zcl.DataType.ENUM8},
        },
        commands: {
            haloTest: {name: "haloTest", ID: HALO_COMMAND_TEST, parameters: [{name: "value", type: Zcl.DataType.UINT8}]},
            haloHush: {name: "haloHush", ID: HALO_COMMAND_HUSH, parameters: [{name: "value", type: Zcl.DataType.UINT8}]},
        },
        commandsResponse: {},
    }),
    m.deviceAddCustomCluster("haloSensors", {
        name: "haloSensors",
        ID: CLUSTER_HALO_SENSORS,
        manufacturerCode: HALO_MANUFACTURER_CODE,
        attributes: {
            coPpm: {name: "coPpm", ID: 0x0002, type: Zcl.DataType.INT16},
        },
        commands: {},
        commandsResponse: {},
    }),
    haloZoneStatus(),
    haloDeviceStatus(),
    haloControl(),
    haloSensors(),
    m.light({
        color: {modes: ["hs"], enhancedHue: false},
        configureReporting: true,
        effect: false,
        powerOnBehavior: false,
        endpointNames: ["light"],
    }),
    m.battery({percentage: true, voltage: true, voltageReporting: true}),
    m.temperature(),
    m.humidity(),
    m.pressure(),
];

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["halo"],
        model: "HALO",
        vendor: "Halo Smart Labs",
        description: "Halo smart smoke & CO detector",
        extend: [...haloCommonExtend],
        meta: {disableDefaultResponse: true},
        configure: (device) => {
            const endpoint2 = device.getEndpoint(2);
            if (endpoint2) {
                endpoint2.saveClusterAttributeKeyValue("lightingColorCtrl", {
                    colorCapabilities: 0x09,
                    colorTempPhysicalMin: 153,
                    colorTempPhysicalMax: 500,
                });
            }
        },
    },
    {
        zigbeeModel: ["halo+", "haloWX", "SABDA1"],
        model: "HALO+",
        vendor: "Halo Smart Labs",
        description: "Halo+ smart smoke & CO detector with weather radio",
        extend: [
            ...haloCommonExtend,
            m.deviceAddCustomCluster("haloWeather", {
                name: "haloWeather",
                ID: CLUSTER_HALO_WEATHER,
                manufacturerCode: HALO_MANUFACTURER_CODE,
                attributes: {
                    weatherAlertStatus: {name: "weatherAlertStatus", ID: 0x0000, type: Zcl.DataType.ENUM8},
                    weatherMute: {name: "weatherMute", ID: 0x0001, type: Zcl.DataType.BOOLEAN},
                    weatherLocation: {name: "weatherLocation", ID: 0x0002, type: Zcl.DataType.UINT32},
                    weatherEvent1: {name: "weatherEvent1", ID: 0x0003, type: Zcl.DataType.BITMAP32},
                    weatherEvent2: {name: "weatherEvent2", ID: 0x0004, type: Zcl.DataType.BITMAP32},
                    weatherEvent3: {name: "weatherEvent3", ID: 0x0005, type: Zcl.DataType.BITMAP32},
                    weatherStation: {name: "weatherStation", ID: 0x0006, type: Zcl.DataType.UINT8},
                    weatherStationRssi1: {name: "weatherStationRssi1", ID: 0x0007, type: Zcl.DataType.UINT8},
                    weatherStationRssi2: {name: "weatherStationRssi2", ID: 0x0008, type: Zcl.DataType.UINT8},
                    weatherStationRssi3: {name: "weatherStationRssi3", ID: 0x0009, type: Zcl.DataType.UINT8},
                    weatherStationRssi4: {name: "weatherStationRssi4", ID: 0x000a, type: Zcl.DataType.UINT8},
                    weatherStationRssi5: {name: "weatherStationRssi5", ID: 0x000b, type: Zcl.DataType.UINT8},
                    weatherStationRssi6: {name: "weatherStationRssi6", ID: 0x000c, type: Zcl.DataType.UINT8},
                    weatherStationRssi7: {name: "weatherStationRssi7", ID: 0x000d, type: Zcl.DataType.UINT8},
                },
                commands: {
                    weatherScan: {name: "weatherScan", ID: HALO_WEATHER_COMMAND_SCAN, parameters: []},
                    weatherRadioPlay: {
                        name: "weatherRadioPlay",
                        ID: HALO_WEATHER_COMMAND_PLAY,
                        parameters: [{name: "value", type: Zcl.DataType.UINT8}],
                    },
                },
                commandsResponse: {},
            }),
            haloWeather(),
        ],
        meta: {disableDefaultResponse: true},
        configure: (device) => {
            const endpoint2 = device.getEndpoint(2);
            if (endpoint2) {
                endpoint2.saveClusterAttributeKeyValue("lightingColorCtrl", {
                    colorCapabilities: 0x09,
                    colorTempPhysicalMin: 153,
                    colorTempPhysicalMax: 500,
                });
            }
        },
    },
];
