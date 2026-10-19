import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, KeyValue, KeyValueAny, OnEvent, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const NS = "zhc:salus_controls";
const e = exposes.presets;
const ea = exposes.access;

interface Salus {
    attributes: {
        frostSetpoint: number;
        minFrostSetpoint: number;
        maxFrostSetpoint: number;
        timeDisplayFormat: number;
        attr4: number;
        attr5: number;
        attr6: number;
        attr7: number;
        autoCoolingSetpoint: number;
        autoHeatingSetpoint: number;
        holdType: number;
        shortCycleProtection: number;
        coolingFanDelay: number;
        ruleCoolingSetpoint: number;
        ruleHeatingSetpoint: number;
        attr15: number;
    };
    commands: {
        resetDevice: Record<string, never>;
    };
    commandResponses: never;
}

const fzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    SP600_power: {
        cluster: "seMetering",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (meta.device.dateCode === "20160120") {
                // Cannot use metering, divisor/multiplier is not according to ZCL.
                // https://github.com/Koenkk/zigbee2mqtt/issues/2233
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/915

                const result: KeyValueAny = {};
                if (msg.data.instantaneousDemand !== undefined) {
                    result.power = msg.data.instantaneousDemand;
                }
                // Summation is reported in Watthours
                if (msg.data.currentSummDelivered !== undefined) {
                    const value = msg.data.currentSummDelivered;
                    result.energy = value / 1000.0;
                }
                return result;
            }
            return fz.metering.convert(model, msg, publish, options, meta);
        },
    } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
};

// SQ610RFNH and KL08RF protocol: https://github.com/mikkelke/salus-zigbee/blob/main/PROTOCOL.md

type It600Frame = {payload: Buffer};

interface SalusIt600 {
    attributes: never;
    commands: Record<keyof typeof toCoordinator | keyof typeof fromWiringCentre, It600Frame>;
    commandResponses: Record<keyof typeof it600Cluster.commandsResponse, It600Frame>;
}

const IT600_CLUSTER = "manuSpecificSalusIt600";
const IT600_STORE_KEY = "salusIt600";
const IT600_NETWORK = "salusIt600Network";
const THERMOSTAT_ENDPOINT = 9;
const WIRING_CENTRE_ENDPOINT = 8;
const THERMOSTAT_NUMBER = 0x20;
const WIRING_CENTRE_NUMBER = 1;

const TIME_ZONE_OFFSETS = [
    -46800, -43200, -39600, -36000, -32400, -28800, -25200, -21600, -18000, -14400, -10800, -7200, -3600, 0, 3600, 7200, 10800, 14400, 18000, 21600,
    25200, 28800, 32400, 36000, 39600, 43200, 46800, 50400, -34200, -16200, -12600, -11220, 12600, 16200, 19800, 20700, 23400, 31500, 34200, 37800,
    41400, 45900,
];
const SECONDS_1970_TO_2000 = 946684800;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

const RECORD_STATUS = 0x71;
const STATUS_MIN_LENGTH = 50;
const STATUS = {
    holdType: 3,
    temperature: 4,
    setpoint: 9,
    scheduleSetpoint: 11,
    systemMode: 15,
    runningState: 17,
    keypadLock: 23,
    humidity: 24,
    battery: 49,
};
// 12.34 is a placeholder temperature, not a reading; the rest of such a record is valid.
const STATUS_PLACEHOLDER_TEMPERATURE = 0x1234;
const HOLD_TYPES: Record<number, string> = {0: "schedule", 1: "temporary_hold", 2: "permanent_hold", 6: "away", 7: "standby"};
const HOLD_TYPE_STANDBY = 7;
const PRESETS: Record<number, string> = {0: "schedule", 1: "schedule", 2: "permanent_hold", 6: "away"};
const SYSTEM_MODES: Record<number, string> = {3: "cool", 4: "heat"};
const SYSTEM_MODE_SET: Record<string, number> = {cool: 3, heat: 4};
const RUNNING_STATES: Record<number, string> = {0: "idle", 1: "heat"};
const KEYPAD_LOCK_STATES: Record<number, string> = {0: "UNLOCK", 1: "LOCK"};
const BATTERY_PERCENT = [0, 10, 25, 50, 75, 100];

const SETPOINT_MIN = 5;
const SETPOINT_MAX = 40;
const SETPOINT_BYTE_OFFSET = 0x20;
const HOLD_TYPE_SET: Record<string, number> = {schedule: 0, permanent_hold: 2, away: 6};
const KEYPAD_LOCK: Record<string, number> = {LOCK: 0x41, UNLOCK: 0x42};

const RECORD_SETTINGS = 0x72;
const SETTINGS_LENGTH = 48;
const SETTINGS_WRITE = {user: 0x72, admin: 0x73};
const SETTINGS = {
    counter: 1,
    temperatureOffset: 3,
    frostSetpoint: 6,
    displayResolution: 11,
    heatControl: 12,
    maxHeatSetpoint: 22,
    minHeatSetpoint: 24,
    maxCoolSetpoint: 26,
    minCoolSetpoint: 28,
    pin: 40,
};
// The thermostat ignores B34 outside heat and B33 outside cool.
const SETPOINTS = {
    heat: {command: "B34", minByte: SETTINGS.minHeatSetpoint, maxByte: SETTINGS.maxHeatSetpoint, min: SETPOINT_MIN, max: 35},
    cool: {command: "B33", minByte: SETTINGS.minCoolSetpoint, maxByte: SETTINGS.maxCoolSetpoint, min: SETPOINT_MIN, max: SETPOINT_MAX},
};
const HEAT_CONTROL: Record<number, string> = {0: "itlc_ufh", 1: "itlc_rad", 2: "itlc_elect", 3: "span_0.25", 4: "span_0.5", 5: "thb_actuator"};
const HEAT_CONTROL_SET: Record<string, number> = Object.fromEntries(Object.entries(HEAT_CONTROL).map(([code, name]) => [name, Number(code)]));
const DISPLAY_RESOLUTIONS: Record<number, number> = {0: 0.5, 1: 0.1};
const DISPLAY_RESOLUTION_SET: Record<number, number> = Object.fromEntries(
    Object.entries(DISPLAY_RESOLUTIONS).map(([code, step]) => [step, Number(code)]),
);
// Bytes 40-41 hold the PIN scrambled with the counter in byte 1; 0xFFFF means no PIN.
const NO_PIN = 0xffff;
const NO_PIN_BYTES = {counter: 0x01, pinHigh: 0x01, pinLow: 0xff};
const FROST_MIN = 5;
const FROST_MAX = 35;
const OFFSET_MIN = -3.5;
const OFFSET_MAX = 3.5;
const HEAT_LIMIT_GAP = 0.5;

const ZONES = 8;
const ZONE_KEYS = Array.from({length: ZONES}, (_, index) => `zone_${index + 1}`);
const ZONE_TABLE = {code: "B70", firstSlot: 10, slotLength: 3};
const ZONE_TABLE_LENGTH = ZONE_TABLE.firstSlot + ZONE_TABLE.slotLength * ZONES;
const FREE_ZONE = 0xffff;
const ZONE_TABLE_REQUEST = [...Buffer.from(ZONE_TABLE.code, "latin1"), 0x7e, 0xaa, 0xaa, 0xa8, 0x80, 0x00, 0x00, 0x00, 0x78];
const REPLACED_THERMOSTAT = {length: 4, address: 2};
const ZONE_PAIRING = {code: "B47", length: 33, state: 0xfe, resetState: 0xfd, replaceByte: 7, firstZoneByte: 8};
const ZONE_PAIRING_MS = 20000;

const ECHO_TIMEOUT_MS = 30000;
const SETTINGS_TIMEOUT_MS = 30000;

interface EchoWaiter extends PromiseWithResolvers<void> {
    code: string;
}

interface It600State {
    lastHandle: number;
    pendingEchoes: Map<number, EchoWaiter>;
    settingsRecord?: Buffer;
    settingsWaiter?: PromiseWithResolvers<Buffer>;
    queue: Promise<unknown>;
    stopped?: boolean;
    lastSync?: {at: number; offset: number};
    systemModeByte?: number;
}

interface ZonePairing extends PromiseWithResolvers<void> {
    ieeeAddr: string;
    zones: number[];
    short: number;
}

interface It600Network {
    wiringCentres: Map<number, Zh.Endpoint>;
    zonePairings: Set<ZonePairing>;
    warned: Set<string>;
}

function it600State(ieeeAddr: string): It600State {
    let state: It600State = globalStore.getValue(ieeeAddr, IT600_STORE_KEY);
    if (state === undefined) {
        state = {lastHandle: 0, pendingEchoes: new Map(), queue: Promise.resolve()};
        globalStore.putValue(ieeeAddr, IT600_STORE_KEY, state);
    }
    return state;
}

function it600Network(): It600Network {
    let network: It600Network = globalStore.getValue(IT600_NETWORK, IT600_STORE_KEY);
    if (network === undefined) {
        network = {wiringCentres: new Map(), zonePairings: new Set(), warned: new Set()};
        globalStore.putValue(IT600_NETWORK, IT600_STORE_KEY, network);
    }
    return network;
}

// Handles are 1-127, the device uses 0 and 0x80 and up for its own reports.
function nextHandle(ieeeAddr: string) {
    const state = it600State(ieeeAddr);
    for (let tried = 0; tried < 0x7f; tried++) {
        state.lastHandle = (state.lastHandle % 0x7f) + 1;
        if (!state.pendingEchoes.has(state.lastHandle)) {
            return state.lastHandle;
        }
    }
    throw new Error(`All 127 handles of ${ieeeAddr} wait for an echo`);
}

// A stop can reject a waiter before anything awaits it.
function waiter<T = void>() {
    const resolvers = Promise.withResolvers<T>();
    resolvers.promise.catch(() => {});
    return resolvers;
}

const it600RawCommand = <Name extends string>(name: Name, id: number) => ({
    name,
    ID: id,
    parameters: [{name: "payload", type: Zcl.BuffaloZclDataType.BUFFER}],
});

// The thermostat and the wiring centre set different direction bits, so what they send is declared as both commands and command responses.
const toCoordinator = {
    syncRequest: it600RawCommand("syncRequest", 0x10),
    echo: it600RawCommand("echo", 0x33),
    syncAck: it600RawCommand("syncAck", 0x37),
    replacedThermostat: it600RawCommand("replacedThermostat", 0x1a),
    wiringCentreRequest: it600RawCommand("wiringCentreRequest", 0x16),
};

const fromWiringCentre = {
    pairButton: it600RawCommand("pairButton", 0xa9),
};

const it600Cluster = {
    name: IT600_CLUSTER,
    ID: 0xfc00,
    manufacturerCode: Zcl.ManufacturerCode.COMPUTIME,
    attributes: {},
    commands: {...toCoordinator, ...fromWiringCentre},
    commandsResponse: {
        ...toCoordinator,
        record: it600RawCommand("record", 0x31),
        write: it600RawCommand("write", 0x32),
        syncResponse: it600RawCommand("syncResponse", 0x81),
        wiringCentreResponse: it600RawCommand("wiringCentreResponse", 0x86),
    },
};

const it600GatewayBasic = {
    name: "genBasic",
    ID: 0x0000,
    attributes: {
        manufacturerName: {name: "manufacturerName", ID: 0x0004, type: Zcl.DataType.CHAR_STR, default: "Computime", maxLen: 32},
        modelId: {name: "modelId", ID: 0x0005, type: Zcl.DataType.CHAR_STR, default: "SAU2AG1", maxLen: 32},
    },
    commands: {},
    commandsResponse: {},
};

// The sync response and writes must never be replayed late, so they bypass the request queue.
const it600Send = (endpoint: Zh.Endpoint, commandName: keyof SalusIt600["commandResponses"], payload: Buffer) =>
    endpoint.commandResponse<typeof IT600_CLUSTER, typeof commandName, SalusIt600>(
        IT600_CLUSTER,
        commandName,
        {payload},
        {disableDefaultResponse: true, sendPolicy: "immediate"},
    );

const hostTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function warnOnce(key: string, message: string) {
    const {warned} = it600Network();
    if (!warned.has(key)) {
        warned.add(key);
        logger.warning(message, NS);
    }
}

const localOffset = (date: Date) => Math.round(-date.getTimezoneOffset() * 60);

function seasonalOffsets(now: Date) {
    const year = now.getFullYear();
    const offsets = [localOffset(new Date(year, 0, 1)), localOffset(new Date(year, 6, 1))];
    return {standard: Math.min(...offsets), summer: Math.max(...offsets)};
}

function timeZoneIndex(standardOffset: number) {
    const exact = TIME_ZONE_OFFSETS.indexOf(standardOffset);
    if (exact !== -1) {
        return exact;
    }
    const distance = (index: number) => Math.abs(TIME_ZONE_OFFSETS[index] - standardOffset);
    const nearest = TIME_ZONE_OFFSETS.reduce((best, _, index) => (distance(index) < distance(best) ? index : best), 0);
    warnOnce(
        `offset ${standardOffset}`,
        `Time zone ${hostTimeZone()} has the standard UTC offset ${standardOffset} s, which the gateway's time zone table lacks; ` +
            `using the nearest, index ${nearest} (${TIME_ZONE_OFFSETS[nearest]} s)`,
    );
    return nearest;
}

function warnIfHostHasNoRegion() {
    const zone = hostTimeZone();
    if (!zone?.includes("/") || zone.startsWith("Etc/")) {
        warnOnce(
            `region ${zone}`,
            `The time zone of the host is ${zone}, so the Salus devices get a clock without summer time. ` +
                "Set TZ for zigbee2mqtt, for example TZ=Europe/Copenhagen",
        );
    }
}

function syncResponsePayload(now: Date, endpointId: number) {
    const offset = localOffset(now);
    const {standard, summer} = seasonalOffsets(now);
    const localSeconds = Math.floor(now.getTime() / 1000) + offset;
    const payload = Buffer.alloc(15);
    payload[0] = endpointId === WIRING_CENTRE_ENDPOINT ? WIRING_CENTRE_NUMBER : THERMOSTAT_NUMBER;
    payload.writeUInt32LE(localSeconds - SECONDS_1970_TO_2000, 2);
    payload[6] = 0x02 | (offset > standard ? 0x01 : 0);
    payload[7] = timeZoneIndex(standard);
    payload[8] = Math.round((summer - standard) / 3600);
    payload.fill(0xff, 9, 13);
    payload[13] = 0x31;
    return payload;
}

async function sendSyncResponse(endpoint: Zh.Endpoint) {
    const state = it600State(endpoint.deviceIeeeAddress);
    const now = new Date();
    state.lastSync = {at: now.getTime(), offset: localOffset(now)};
    if (endpoint.ID === WIRING_CENTRE_ENDPOINT) {
        it600Network().wiringCentres.set(WIRING_CENTRE_NUMBER, endpoint);
    }
    try {
        await it600Send(endpoint, "syncResponse", syncResponsePayload(now, endpoint.ID));
    } catch (error) {
        state.lastSync = undefined;
        logger.warning(`Sync response to ${endpoint.deviceIeeeAddress} failed (${(error as Error).message})`, NS);
    }
}

async function sendWiringCentre(endpoint: Zh.Endpoint, wiringCentreNumber: number) {
    const wiringCentre = it600Network().wiringCentres.get(wiringCentreNumber);
    const payload = Buffer.from([0x00, 0xff, 0xff]);
    if (wiringCentre) {
        payload[0] = 0x01;
        payload.writeUInt16LE(wiringCentre.deviceNetworkAddress, 1);
    }
    logger.info(`${endpoint.deviceIeeeAddress} asked for wiring centre ${wiringCentreNumber}, answering ${payload.toString("hex")}`, NS);
    try {
        await it600Send(endpoint, "wiringCentreResponse", payload);
    } catch (error) {
        logger.warning(`Wiring centre answer to ${endpoint.deviceIeeeAddress} failed (${(error as Error).message})`, NS);
    }
}

function resyncClock(endpoint: Zh.Endpoint) {
    const last = it600State(endpoint.deviceIeeeAddress).lastSync;
    const now = new Date();
    if (!last || now.getTime() - last.at > SYNC_INTERVAL_MS || localOffset(now) !== last.offset) {
        void sendSyncResponse(endpoint);
    }
}

const requestZoneTable = (endpoint: Zh.Endpoint) =>
    it600Send(endpoint, "write", Buffer.from([nextHandle(endpoint.deviceIeeeAddress), ...ZONE_TABLE_REQUEST]));

const requestZoneTableAfterJoin = (endpoint: Zh.Endpoint) =>
    requestZoneTable(endpoint).catch((error: Error) =>
        logger.warning(`Zone table request to ${endpoint.deviceIeeeAddress} failed (${error.message})`, NS),
    );

function stopDevice(ieeeAddr: string) {
    const stopped = new Error(`${ieeeAddr} stopped`);
    const state: It600State | undefined = globalStore.getValue(ieeeAddr, IT600_STORE_KEY);
    if (state) {
        state.stopped = true;
        for (const echo of state.pendingEchoes.values()) {
            echo.reject(stopped);
        }
        state.settingsWaiter?.reject(stopped);
        globalStore.clearValue(ieeeAddr, IT600_STORE_KEY);
    }
    const {wiringCentres, zonePairings} = it600Network();
    for (const pairing of zonePairings) {
        if (pairing.ieeeAddr === ieeeAddr) {
            pairing.reject(stopped);
        }
    }
    for (const [wiringCentreNumber, endpoint] of wiringCentres) {
        if (endpoint.deviceIeeeAddress === ieeeAddr) {
            wiringCentres.delete(wiringCentreNumber);
        }
    }
}

const it600OnEvent =
    (endpointId: number, afterSync?: (endpoint: Zh.Endpoint) => Promise<unknown>): OnEvent.Handler =>
    async (event) => {
        if (event.type === "stop") {
            stopDevice(event.data.ieeeAddr);
        } else if (event.type === "start") {
            warnIfHostHasNoRegion();
        } else if (event.type === "deviceAnnounce" || (event.type === "deviceInterview" && event.data.status === "successful")) {
            const endpoint = event.data.device.getEndpoint(endpointId);
            if (endpoint) {
                await sendSyncResponse(endpoint);
                await afterSync?.(endpoint);
            }
        }
    };

const thermostatOnEvent = it600OnEvent(THERMOSTAT_ENDPOINT);
const wiringCentreJoin = it600OnEvent(WIRING_CENTRE_ENDPOINT, requestZoneTableAfterJoin);

const wiringCentreOnEvent: OnEvent.Handler = async (event) => {
    if (event.type === "start") {
        const endpoint = event.data.device.getEndpoint(WIRING_CENTRE_ENDPOINT);
        if (endpoint) {
            it600Network().wiringCentres.set(WIRING_CENTRE_NUMBER, endpoint);
        }
    }
    await wiringCentreJoin(event);
};

const bcd = (byte: number) => (byte >> 4) * 10 + (byte & 0x0f);
const toBcd = (value: number) => (Math.floor(value / 10) << 4) | (value % 10);

function bcdCelsius(record: Buffer, offset: number) {
    const raw = bcd(record[offset]) * 100 + bcd(record[offset + 1]);
    return (raw >= 11000 ? 11000 - raw : raw) / 100;
}

function bcdBytes(celsius: number) {
    const hundredths = Math.round(celsius * 100);
    return [toBcd(Math.floor(hundredths / 100)), toBcd(hundredths % 100)];
}

function signedBcdCelsius(record: Buffer, offset: number) {
    const hundredths = bcd(record[offset] & 0x7f) * 100 + bcd(record[offset + 1]);
    return (record[offset] & 0x80) !== 0 && hundredths !== 0 ? -hundredths / 100 : hundredths / 100;
}

function signedBcdBytes(celsius: number) {
    const [high, low] = bcdBytes(Math.abs(celsius));
    return [celsius < 0 ? high | 0x80 : high, low];
}

const published = (fields: KeyValue) => Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

function parseStatusRecord(record: Buffer, ieeeAddr: string) {
    if (record.length < STATUS_MIN_LENGTH) {
        logger.debug(`Ignoring short status record (${record.length} bytes) from ${ieeeAddr}`, NS);
        return;
    }
    it600State(ieeeAddr).systemModeByte = record[STATUS.systemMode];
    const holdType = record[STATUS.holdType];
    const placeholder = record.readUInt16BE(STATUS.temperature) === STATUS_PLACEHOLDER_TEMPERATURE;
    return published({
        local_temperature: placeholder ? undefined : bcdCelsius(record, STATUS.temperature),
        // Bytes 9-10 are the setpoint of the current system mode. It is named heating setpoint so Home Assistant discovery shows one temperature.
        current_heating_setpoint: bcdCelsius(record, STATUS.setpoint),
        schedule_setpoint: bcdCelsius(record, STATUS.scheduleSetpoint),
        system_mode: holdType === HOLD_TYPE_STANDBY ? "off" : SYSTEM_MODES[record[STATUS.systemMode]],
        hold_type: HOLD_TYPES[holdType],
        preset: PRESETS[holdType],
        running_state: RUNNING_STATES[record[STATUS.runningState]],
        child_lock: KEYPAD_LOCK_STATES[record[STATUS.keypadLock]],
        humidity: bcd(record[STATUS.humidity]),
        battery: BATTERY_PERCENT[record[STATUS.battery]],
    });
}

function parseSettingsRecord(record: Buffer, ieeeAddr: string) {
    if (record.length < SETTINGS_LENGTH) {
        logger.debug(`Ignoring short settings record (${record.length} bytes) from ${ieeeAddr}`, NS);
        return;
    }
    const state = it600State(ieeeAddr);
    const copy = Buffer.from(record);
    state.settingsRecord = copy;
    state.settingsWaiter?.resolve(copy);
    return published({
        frost_setpoint: bcdCelsius(record, SETTINGS.frostSetpoint),
        temperature_offset: signedBcdCelsius(record, SETTINGS.temperatureOffset),
        heat_control: HEAT_CONTROL[record[SETTINGS.heatControl]],
        min_heat_setpoint: bcdCelsius(record, SETTINGS.minHeatSetpoint),
        max_heat_setpoint: bcdCelsius(record, SETTINGS.maxHeatSetpoint),
        min_cool_setpoint: bcdCelsius(record, SETTINGS.minCoolSetpoint),
        max_cool_setpoint: bcdCelsius(record, SETTINGS.maxCoolSetpoint),
        display_resolution: DISPLAY_RESOLUTIONS[record[SETTINGS.displayResolution]],
    });
}

const RECORD_PARSERS: Record<number, (record: Buffer, ieeeAddr: string) => KeyValue | undefined> = {
    [RECORD_STATUS]: parseStatusRecord,
    [RECORD_SETTINGS]: parseSettingsRecord,
};

const shortAddress = (address: number) => `0x${address.toString(16).padStart(4, "0")}`;

function zoneAddress(record: Buffer, index: number) {
    const address = record.readUInt16BE(ZONE_TABLE.firstSlot + ZONE_TABLE.slotLength * index);
    return address === FREE_ZONE ? null : address;
}

// herdsman does not export Device, but its class has a lookup by network address.
const zoneName = (device: Zh.Device, address: number | null) =>
    address === null
        ? null
        : ((device.constructor as {byNetworkAddress?: (address: number) => Zh.Device | undefined}).byNetworkAddress?.(address)?.ieeeAddr ??
          shortAddress(address));

const fzIt600 = {
    sync_request: {
        cluster: IT600_CLUSTER,
        type: "commandSyncRequest",
        convert: async (model, msg, publish, options, meta) => {
            await sendSyncResponse(msg.endpoint);
        },
    } satisfies Fz.Converter<typeof IT600_CLUSTER, SalusIt600, "commandSyncRequest">,
    record: {
        cluster: IT600_CLUSTER,
        type: "commandRecord",
        convert: (model, msg, publish, options, meta) => {
            const record = msg.data.payload;
            const parse = RECORD_PARSERS[record[0]];
            if (!parse) {
                const type = record.subarray(0, 1).toString("hex");
                logger.debug(`Ignoring record 0x${type} (${record.length} bytes) from ${msg.device.ieeeAddr}`, NS);
                return;
            }
            return parse(record, msg.device.ieeeAddr);
        },
    } satisfies Fz.Converter<typeof IT600_CLUSTER, SalusIt600, "commandRecord">,
    clock_sync: {
        cluster: IT600_CLUSTER,
        type: "commandRecord",
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.payload[0] === RECORD_STATUS) {
                resyncClock(msg.endpoint);
            }
        },
    } satisfies Fz.Converter<typeof IT600_CLUSTER, SalusIt600, "commandRecord">,
    write_echo: {
        cluster: IT600_CLUSTER,
        type: "commandEcho",
        convert: (model, msg, publish, options, meta) => {
            const echo = msg.data.payload;
            const pending = it600State(msg.device.ieeeAddr).pendingEchoes.get(echo[0]);
            const awaited = pending?.code === echo.subarray(1, 4).toString("latin1") ? pending : undefined;
            logger.debug(`B-command echo ${echo.toString("hex")} from ${msg.device.ieeeAddr}${awaited ? "" : " (not awaited)"}`, NS);
            awaited?.resolve();
        },
    } satisfies Fz.Converter<typeof IT600_CLUSTER, SalusIt600, "commandEcho">,
    zone_table: {
        cluster: IT600_CLUSTER,
        type: "commandEcho",
        convert: (model, msg, publish, options, meta) => {
            const echo = msg.data.payload;
            if (echo.subarray(1, 4).toString("latin1") !== ZONE_TABLE.code) {
                return;
            }
            if (echo.length < ZONE_TABLE_LENGTH) {
                logger.debug(`Ignoring short zone table (${echo.length} bytes) from ${msg.device.ieeeAddr}`, NS);
                return;
            }
            const addresses = ZONE_KEYS.map((_, index) => zoneAddress(echo, index));
            for (const pairing of it600Network().zonePairings) {
                if (pairing.zones.every((zone) => addresses[zone - 1] === pairing.short)) {
                    pairing.resolve();
                }
            }
            return Object.fromEntries(ZONE_KEYS.map((key, index) => [key, zoneName(msg.device, addresses[index])]));
        },
    } satisfies Fz.Converter<typeof IT600_CLUSTER, SalusIt600, "commandEcho">,
    sync_ack: {
        cluster: IT600_CLUSTER,
        type: "commandSyncAck",
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`Sync acknowledgement ${msg.data.payload.toString("hex")} from ${msg.device.ieeeAddr}`, NS);
        },
    } satisfies Fz.Converter<typeof IT600_CLUSTER, SalusIt600, "commandSyncAck">,
    wiring_centre_request: {
        cluster: IT600_CLUSTER,
        type: "commandWiringCentreRequest",
        convert: async (model, msg, publish, options, meta) => {
            const request = msg.data.payload;
            if (request.length < 1) {
                logger.debug(`Ignoring wiring centre request without a number from ${msg.device.ieeeAddr}`, NS);
                return;
            }
            await sendWiringCentre(msg.endpoint, request[0]);
        },
    } satisfies Fz.Converter<typeof IT600_CLUSTER, SalusIt600, "commandWiringCentreRequest">,
    replaced_thermostat: {
        cluster: IT600_CLUSTER,
        type: "commandReplacedThermostat",
        convert: (model, msg, publish, options, meta) => {
            const report = msg.data.payload;
            if (report.length < REPLACED_THERMOSTAT.length) {
                logger.debug(`Ignoring short replaced thermostat report (${report.length} bytes) from ${msg.device.ieeeAddr}`, NS);
                return;
            }
            return {replaced_thermostat: zoneName(msg.device, report.readUInt16LE(REPLACED_THERMOSTAT.address))};
        },
    } satisfies Fz.Converter<typeof IT600_CLUSTER, SalusIt600, "commandReplacedThermostat">,
    pair_button: {
        cluster: IT600_CLUSTER,
        type: "commandPairButton",
        convert: (model, msg, publish, options, meta) => {
            const payload = msg.data.payload.toString("hex") || "empty";
            logger.info(`Command 0xa9 (probably the Pair button) from ${msg.device.ieeeAddr}, payload ${payload}`, NS);
        },
    } satisfies Fz.Converter<typeof IT600_CLUSTER, SalusIt600, "commandPairButton">,
    unknown_command: {
        cluster: IT600_CLUSTER,
        type: "raw",
        convert: (model, msg, publish, options, meta) => {
            const header = Zcl.Header.fromBuffer(msg.data);
            if (header?.isSpecific) {
                const id = header.commandIdentifier.toString(16).padStart(2, "0");
                logger.info(`Unknown command 0x${id} from ${msg.device.ieeeAddr}: ${msg.data.subarray(header.length).toString("hex")}`, NS);
            }
        },
    } satisfies Fz.Converter<typeof IT600_CLUSTER, SalusIt600, "raw">,
};

async function writeBCommand(endpoint: Zh.Endpoint, code: string, ...values: number[]) {
    const ieeeAddr = endpoint.deviceIeeeAddress;
    const state = it600State(ieeeAddr);
    const handle = nextHandle(ieeeAddr);
    const echoed: EchoWaiter = {code, ...waiter()};
    state.pendingEchoes.set(handle, echoed);
    let timer: NodeJS.Timeout;
    try {
        await it600Send(endpoint, "write", Buffer.from([handle, ...Buffer.from(code, "latin1"), ...values]));
        const noEcho = new Error(`No ${code} echo from ${ieeeAddr} within ${ECHO_TIMEOUT_MS} ms`);
        timer = setTimeout(() => echoed.reject(noEcho), ECHO_TIMEOUT_MS);
        await echoed.promise;
    } finally {
        clearTimeout(timer);
        state.pendingEchoes.delete(handle);
    }
}

const requestSettings = (endpoint: Zh.Endpoint) => writeBCommand(endpoint, "B74", 0, 0, 0, 0, 0);

// The waiter is set before the request, so a 0x72 that comes before the echo is not missed.
async function readSettings(endpoint: Zh.Endpoint) {
    const ieeeAddr = endpoint.deviceIeeeAddress;
    const state = it600State(ieeeAddr);
    const arrived = waiter<Buffer>();
    state.settingsWaiter = arrived;
    let timer: NodeJS.Timeout;
    try {
        await requestSettings(endpoint);
        const noRecord = new Error(`No settings record (0x72) from ${ieeeAddr} within ${SETTINGS_TIMEOUT_MS} ms after B74`);
        timer = setTimeout(() => arrived.reject(noRecord), SETTINGS_TIMEOUT_MS);
        return Buffer.from(await arrived.promise);
    } finally {
        clearTimeout(timer);
        state.settingsWaiter = undefined;
    }
}

function pinOf(record: Buffer) {
    const counter = record[SETTINGS.counter];
    const high = (record[SETTINGS.pin] - 2 * counter) & 0xff;
    const low = (record[SETTINGS.pin + 1] + (counter >> 2)) & 0xff;
    return (high << 8) | low;
}

// Messages for a device can overlap, so its settings and climate writes run one at a time.
function serialized<T>(ieeeAddr: string, task: () => Promise<T>) {
    const state = it600State(ieeeAddr);
    const result = state.queue.then(() => {
        if (state.stopped) {
            throw new Error(`${ieeeAddr} stopped`);
        }
        return task();
    });
    state.queue = result.catch(() => {});
    return result;
}

async function writeSettings(endpoint: Zh.Endpoint, kind: number, change: (record: Buffer) => void) {
    const ieeeAddr = endpoint.deviceIeeeAddress;
    await serialized(ieeeAddr, async () => {
        const record = await readSettings(endpoint);
        if (pinOf(record) !== NO_PIN) {
            throw new Error(`${ieeeAddr} has a PIN set, so its settings are not written: a wrong PIN would lock its keys`);
        }
        change(record);
        record[0] = kind;
        record[SETTINGS.counter] = NO_PIN_BYTES.counter;
        record[SETTINGS.pin] = NO_PIN_BYTES.pinHigh;
        record[SETTINGS.pin + 1] = NO_PIN_BYTES.pinLow;
        await writeBCommand(endpoint, "B11", ...record.subarray(0, SETTINGS_LENGTH));
        await requestSettings(endpoint).catch((error: Error) => logger.warning(`Settings request to ${ieeeAddr} failed (${error.message})`, NS));
    });
}

function halfDegrees(value: unknown, key: string, min: number, max: number) {
    const celsius = Math.round(utils.toNumber(value, key) * 2) / 2;
    if (celsius < min || celsius > max) {
        throw new Error(`${key} must be between ${min} and ${max}, got ${value}`);
    }
    return celsius;
}

const modeByteOf = (mode: unknown) => (Object.hasOwn(SYSTEM_MODE_SET, mode as string) ? SYSTEM_MODE_SET[mode as string] : undefined);

function checkHoldType(mode: unknown, preset: unknown) {
    if (mode !== undefined && mode !== "off" && modeByteOf(mode) === undefined) {
        throw new Error(`system_mode must be off, heat or cool, got ${mode}`);
    }
    if (preset !== undefined && !Object.hasOwn(HOLD_TYPE_SET, preset as string)) {
        throw new Error(`preset must be one of ${Object.keys(HOLD_TYPE_SET).join(", ")}, got ${preset}`);
    }
    if (mode === "off" && preset !== undefined) {
        throw new Error("preset cannot be set together with system_mode off, as both are hold types");
    }
}

// The mode byte that picks the setpoint command follows the echo, as the next 0x71 can be minutes away.
async function writeSystemMode(endpoint: Zh.Endpoint, mode: string) {
    if (mode === "off") {
        await writeBCommand(endpoint, "B20", HOLD_TYPE_STANDBY);
    } else {
        await writeBCommand(endpoint, "B20", HOLD_TYPE_SET.permanent_hold);
        await writeBCommand(endpoint, "B48", SYSTEM_MODE_SET[mode]);
        it600State(endpoint.deviceIeeeAddress).systemModeByte = SYSTEM_MODE_SET[mode];
    }
}

function setpointWrite(endpoint: Zh.Endpoint, writtenMode: unknown, value: unknown, publishedState: KeyValue) {
    const state = it600State(endpoint.deviceIeeeAddress);
    const modeByte = modeByteOf(writtenMode) ?? state.systemModeByte ?? modeByteOf(publishedState?.system_mode);
    const {command, minByte, maxByte, min, max} = SETPOINTS[modeByte === SYSTEM_MODE_SET.cool ? "cool" : "heat"];
    const record = state.settingsRecord;
    const [low, high] = record ? [bcdCelsius(record, minByte), bcdCelsius(record, maxByte)] : [min, max];
    return {command, setpoint: halfDegrees(value, "current_heating_setpoint", low, high)};
}

function parseZones(key: string, value: unknown) {
    const words = String(value)
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean);
    const replace = words[0] === "replace";
    const zones = words.slice(replace ? 1 : 0);
    if (zones.length === 0 || !zones.every((zone) => /^[1-8]$/.test(zone))) {
        throw new Error(
            `${key} must be zone numbers 1 to 8 separated by commas, e.g. 1,4, with replace in front to take over zones another thermostat holds, got ${value}`,
        );
    }
    return {replace, zones: [...new Set(zones.map(Number))].toSorted((a, b) => a - b)};
}

async function pairZones(endpoint: Zh.Endpoint, zones: number[], replace: boolean) {
    const network = it600Network();
    const wiringCentre = network.wiringCentres.get(WIRING_CENTRE_NUMBER);
    if (!wiringCentre) {
        throw new Error("No wiring centre is known to pair zones with: it has to join zigbee2mqtt first");
    }
    const args = Buffer.alloc(ZONE_PAIRING.length);
    args.set([0x00, 0x11]);
    args.writeUInt16LE(WIRING_CENTRE_NUMBER, 2);
    args.writeUInt16LE(wiringCentre.deviceNetworkAddress, 4);
    args[6] = ZONE_PAIRING.state;
    args[ZONE_PAIRING.replaceByte] = replace ? 1 : 0;
    for (const zone of zones) {
        args[ZONE_PAIRING.firstZoneByte + zone - 1] = 1;
    }
    if (replace) {
        const reset = Buffer.alloc(ZONE_PAIRING.length);
        reset.set([0x00, 0x11, 0xff, 0xff, 0xff, 0xff, ZONE_PAIRING.resetState]);
        await writeBCommand(endpoint, ZONE_PAIRING.code, ...reset);
    }
    const pairing: ZonePairing = {ieeeAddr: endpoint.deviceIeeeAddress, zones, short: endpoint.deviceNetworkAddress, ...waiter()};
    network.zonePairings.add(pairing);
    let timer: NodeJS.Timeout;
    try {
        await writeBCommand(endpoint, ZONE_PAIRING.code, ...args);
        const wait = ZONE_PAIRING_MS * zones.length;
        const notShown = new Error(
            `The zone table of the wiring centre does not show ${endpoint.deviceIeeeAddress} in zone ${zones.join(", ")} ` +
                `within ${wait / 1000} s of the B47; it refuses a zone that another thermostat holds unless the value starts with replace`,
        );
        timer = setTimeout(() => pairing.reject(notShown), wait);
        await pairing.promise;
    } finally {
        clearTimeout(timer);
        network.zonePairings.delete(pairing);
    }
}

const tzIt600 = {
    // zigbee2mqtt calls a converter once per message, for its first key, so the keys that decide the hold type are one converter.
    climate: {
        key: ["system_mode", "current_heating_setpoint", "preset"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const message: KeyValue = {...meta.message, [key]: value};
            const mode = message.system_mode as string | undefined;
            const setpoint = message.current_heating_setpoint;
            const preset = message.preset as string | undefined;
            return await serialized(entity.deviceIeeeAddress, async () => {
                checkHoldType(mode, preset);
                const write = setpoint === undefined ? undefined : setpointWrite(entity, mode, setpoint, meta.state);
                const state: KeyValue = {};
                if (mode !== undefined) {
                    await writeSystemMode(entity, mode);
                    state.system_mode = mode;
                }
                if (preset !== undefined) {
                    await writeBCommand(entity, "B20", HOLD_TYPE_SET[preset]);
                    state.preset = preset;
                    state.hold_type = preset;
                }
                if (write) {
                    await writeBCommand(entity, write.command, write.setpoint / 0.5 + SETPOINT_BYTE_OFFSET);
                    state.current_heating_setpoint = write.setpoint;
                }
                return {state};
            });
        },
    } satisfies Tz.Converter,
    child_lock: {
        key: ["child_lock"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            if (!Object.hasOwn(KEYPAD_LOCK, value as string)) {
                throw new Error(`${key} must be LOCK or UNLOCK, got ${value}`);
            }
            await writeBCommand(entity, "B03", 0x00, 0x00, KEYPAD_LOCK[value as string], ...Array(10).fill(0x00));
            return {state: {child_lock: value}};
        },
    } satisfies Tz.Converter,
    frost_setpoint: {
        key: ["frost_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const setpoint = halfDegrees(value, key, FROST_MIN, FROST_MAX);
            await writeSettings(entity, SETTINGS_WRITE.user, (record) => record.set(bcdBytes(setpoint), SETTINGS.frostSetpoint));
        },
    } satisfies Tz.Converter,
    temperature_offset: {
        key: ["temperature_offset"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const offset = halfDegrees(value, key, OFFSET_MIN, OFFSET_MAX);
            await writeSettings(entity, SETTINGS_WRITE.user, (record) => record.set(signedBcdBytes(offset), SETTINGS.temperatureOffset));
        },
    } satisfies Tz.Converter,
    heat_control: {
        key: ["heat_control"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            if (!Object.hasOwn(HEAT_CONTROL_SET, value as string)) {
                throw new Error(`${key} must be one of ${Object.keys(HEAT_CONTROL_SET).join(", ")}, got ${value}`);
            }
            await writeSettings(entity, SETTINGS_WRITE.admin, (record) => {
                record[SETTINGS.heatControl] = HEAT_CONTROL_SET[value as string];
            });
        },
    } satisfies Tz.Converter,
    min_heat_setpoint: {
        key: ["min_heat_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const setpoint = halfDegrees(value, key, SETPOINT_MIN, SETPOINT_MAX - HEAT_LIMIT_GAP);
            await writeSettings(entity, SETTINGS_WRITE.admin, (record) => {
                const most = bcdCelsius(record, SETTINGS.maxHeatSetpoint) - HEAT_LIMIT_GAP;
                if (setpoint > most) {
                    throw new Error(`${key} must be at most ${most} (the maximum heating setpoint less ${HEAT_LIMIT_GAP}), got ${value}`);
                }
                record.set(bcdBytes(setpoint), SETTINGS.minHeatSetpoint);
            });
        },
    } satisfies Tz.Converter,
    max_heat_setpoint: {
        key: ["max_heat_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const setpoint = halfDegrees(value, key, SETPOINT_MIN + HEAT_LIMIT_GAP, SETPOINT_MAX);
            await writeSettings(entity, SETTINGS_WRITE.admin, (record) => {
                const least = bcdCelsius(record, SETTINGS.minHeatSetpoint) + HEAT_LIMIT_GAP;
                if (setpoint < least) {
                    throw new Error(`${key} must be at least ${least} (the minimum heating setpoint plus ${HEAT_LIMIT_GAP}), got ${value}`);
                }
                record.set(bcdBytes(setpoint), SETTINGS.maxHeatSetpoint);
            });
        },
    } satisfies Tz.Converter,
    display_resolution: {
        key: ["display_resolution"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const resolution = utils.toNumber(value, key);
            if (!Object.hasOwn(DISPLAY_RESOLUTION_SET, resolution)) {
                throw new Error(`${key} must be ${Object.keys(DISPLAY_RESOLUTION_SET).toSorted().join(" or ")}, got ${value}`);
            }
            await writeSettings(entity, SETTINGS_WRITE.admin, (record) => {
                record[SETTINGS.displayResolution] = DISPLAY_RESOLUTION_SET[resolution];
            });
        },
    } satisfies Tz.Converter,
    wiring_centre_zones: {
        key: ["wiring_centre_zones"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const {zones, replace} = parseZones(key, value);
            await pairZones(entity, zones, replace);
        },
    } satisfies Tz.Converter,
    zone_table: {
        key: ZONE_KEYS,
        convertGet: async (entity, key, meta) => {
            utils.assertEndpoint(entity);
            await requestZoneTable(entity);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SPE600"],
        model: "SPE600",
        vendor: "Salus Controls",
        description: "Smart plug (EU socket)",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SP600"],
        model: "SP600",
        vendor: "Salus Controls",
        description: "Smart plug (UK socket)",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering", fzMetering: fzLocal.SP600_power})],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SX885ZB"],
        model: "SX885ZB",
        vendor: "Salus Controls",
        description: "miniSmartPlug",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SR600"],
        model: "SR600",
        vendor: "Salus Controls",
        description: "Relay switch",
        extend: [m.onOff({ota: {manufacturerName: "SalusControls"}})],
    },
    {
        zigbeeModel: ["SW600"],
        model: "SW600",
        vendor: "Salus Controls",
        description: "Door or window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["WLS600"],
        model: "WLS600",
        vendor: "Salus Controls",
        description: "Water leakage sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["OS600"],
        model: "OS600",
        vendor: "Salus Controls",
        description: "Door or window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SS909ZB", "PS600"],
        model: "PS600",
        vendor: "Salus Controls",
        description: "Pipe temperature sensor",
        fromZigbee: [fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        exposes: [e.battery(), e.temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["RE600"],
        model: "RE600",
        vendor: "Salus Controls",
        description: "Router Zigbee",
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["FC600", "FC600NH"],
        model: "FC600",
        vendor: "Salus Controls",
        description: "Fan coil thermostat",
        whiteLabel: [{vendor: "Salus Controls", model: "FC600NH", description: "Fan coil thermostat", fingerprint: [{modelID: "FC600NH"}]}],
        extend: [
            m.deviceAddCustomCluster("manuSpecificSalus", {
                name: "manuSpecificSalus",
                ID: 0xfc04,
                manufacturerCode: Zcl.ManufacturerCode.COMPUTIME,
                attributes: {
                    frostSetpoint: {name: "frostSetpoint", ID: 0x0000, type: Zcl.DataType.INT16, write: true, min: -32768},
                    minFrostSetpoint: {name: "minFrostSetpoint", ID: 0x0001, type: Zcl.DataType.INT16, write: true, min: -32768},
                    maxFrostSetpoint: {name: "maxFrostSetpoint", ID: 0x0002, type: Zcl.DataType.INT16, write: true, min: -32768},
                    timeDisplayFormat: {name: "timeDisplayFormat", ID: 0x0003, type: Zcl.DataType.BOOLEAN, write: true},
                    attr4: {name: "attr4", ID: 0x0004, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    attr5: {name: "attr5", ID: 0x0005, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    attr6: {name: "attr6", ID: 0x0006, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    attr7: {name: "attr7", ID: 0x0007, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    autoCoolingSetpoint: {name: "autoCoolingSetpoint", ID: 0x0008, type: Zcl.DataType.INT16, write: true, min: -32768},
                    autoHeatingSetpoint: {name: "autoHeatingSetpoint", ID: 0x0009, type: Zcl.DataType.INT16, write: true, min: -32768},
                    holdType: {name: "holdType", ID: 0x000a, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    shortCycleProtection: {name: "shortCycleProtection", ID: 0x000b, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    coolingFanDelay: {name: "coolingFanDelay", ID: 0x000c, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    ruleCoolingSetpoint: {name: "ruleCoolingSetpoint", ID: 0x000d, type: Zcl.DataType.INT16, write: true, min: -32768},
                    ruleHeatingSetpoint: {name: "ruleHeatingSetpoint", ID: 0x000e, type: Zcl.DataType.INT16, write: true, min: -32768},
                    attr15: {name: "attr15", ID: 0x000f, type: Zcl.DataType.BOOLEAN, write: true},
                },
                commands: {
                    resetDevice: {
                        name: "resetDevice",
                        ID: 0x01,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
            m.enumLookup<"manuSpecificSalus", Salus>({
                name: "preset",
                lookup: {schedule: 0, temporary_override: 1, permanent_override: 2, standby: 7, eco: 10},
                cluster: "manuSpecificSalus",
                attribute: "holdType",
                description: "Operation mode",
                reporting: {min: 0, max: 3600, change: 0},
            }),
        ],
        fromZigbee: [fz.thermostat, fz.fan],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_setpoint_raise_lower,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_relay_status_log,
            tz.thermostat_running_state,
            tz.thermostat_keypad_lockout,
            tz.fan_mode,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 40, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat", "cool", "auto"])
                .withRunningMode(["off", "cool", "heat"])
                .withRunningState(["idle", "heat", "cool"])
                .withLocalTemperatureCalibration(-3, 3, 0.5)
                .withFanMode(["off", "low", "medium", "high", "auto"]),
            e.keypad_lockout(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            const binds = ["genBasic", "genTime", "hvacThermostat", "hvacFanCtrl", "hvacUserInterfaceCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.fanMode(endpoint);
            await reporting.thermostatRunningMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
        },
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SQ610RFNH"],
        model: "SQ610RFNH",
        vendor: "Salus Controls",
        description: "Quantum wireless thermostat (iT600)",
        extend: [m.deviceAddCustomCluster("genBasic", it600GatewayBasic), m.deviceAddCustomCluster(IT600_CLUSTER, it600Cluster)],
        fromZigbee: [fzIt600.sync_request, fzIt600.record, fzIt600.clock_sync, fzIt600.write_echo, fzIt600.wiring_centre_request],
        toZigbee: [
            tzIt600.climate,
            tzIt600.child_lock,
            tzIt600.frost_setpoint,
            tzIt600.temperature_offset,
            tzIt600.heat_control,
            tzIt600.min_heat_setpoint,
            tzIt600.max_heat_setpoint,
            tzIt600.display_resolution,
            tzIt600.wiring_centre_zones,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("current_heating_setpoint", SETPOINT_MIN, SETPOINT_MAX, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "heat", "cool"], ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withPreset(
                    Object.keys(HOLD_TYPE_SET),
                    "Settable hold type; a temporary hold (setpoint changed during the schedule) shows as schedule",
                ),
            e.humidity(),
            e.battery(),
            e
                .enum("hold_type", ea.STATE, Object.values(HOLD_TYPES))
                .withDescription("Hold type the thermostat reports, for diagnostics; standby means off. Change it with preset"),
            e.numeric("schedule_setpoint", ea.STATE).withUnit("°C").withDescription("Heating setpoint the thermostat's schedule asks for now"),
            e.child_lock(),
            e
                .numeric("frost_setpoint", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(FROST_MIN)
                .withValueMax(FROST_MAX)
                .withValueStep(0.5)
                .withDescription("Setpoint the thermostat holds while it is off (standby heating)"),
            e
                .numeric("temperature_offset", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(OFFSET_MIN)
                .withValueMax(OFFSET_MAX)
                .withValueStep(0.5)
                .withDescription("Room temperature calibration"),
            e
                .enum("heat_control", ea.STATE_SET, Object.values(HEAT_CONTROL))
                .withDescription(
                    "Heat control algorithm (admin setting): ITLC for underfloor, radiator or electric heating, a ±0.25 or ±0.5 °C span, or THB actuators. itlc_ufh is the factory value",
                ),
            e
                .numeric("min_heat_setpoint", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(SETPOINT_MIN)
                .withValueMax(SETPOINT_MAX - HEAT_LIMIT_GAP)
                .withValueStep(0.5)
                .withDescription("Lowest heating setpoint the thermostat accepts (admin setting), at least 0.5 below the highest"),
            e
                .numeric("max_heat_setpoint", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(SETPOINT_MIN + HEAT_LIMIT_GAP)
                .withValueMax(SETPOINT_MAX)
                .withValueStep(0.5)
                .withDescription("Highest heating setpoint the thermostat accepts (admin setting), at least 0.5 above the lowest"),
            e.numeric("min_cool_setpoint", ea.STATE).withUnit("°C").withDescription("Lowest cooling setpoint the thermostat accepts"),
            e.numeric("max_cool_setpoint", ea.STATE).withUnit("°C").withDescription("Highest cooling setpoint the thermostat accepts"),
            e
                .numeric("display_resolution", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0.1)
                .withValueMax(0.5)
                .withValueStep(0.4)
                .withDescription("Temperature step shown on the display (admin setting): 0.5 or 0.1"),
            e
                .text("wiring_centre_zones", ea.SET)
                .withDescription(
                    "Pairs the thermostat with zones of the wiring centre: zone numbers 1 to 8 separated by commas, e.g. 1,4. " +
                        "Put replace in front, e.g. replace 1,4, to take over zones that another thermostat holds. " +
                        "Done when the zone table of the wiring centre shows the thermostat in all of them",
                ),
        ],
        endpoint: () => ({default: THERMOSTAT_ENDPOINT}),
        onEvent: thermostatOnEvent,
        ota: {manufacturerName: "SalusControls"},
    },
    {
        // The wiring centre reports no modelId, so only the fingerprint finds it.
        fingerprint: [{manufacturerName: "Computime", type: "Router", endpoints: [{ID: WIRING_CENTRE_ENDPOINT, profileID: 260}]}],
        model: "KL08RF",
        vendor: "Salus Controls",
        description: "iT600 8-zone wiring centre",
        extend: [m.deviceAddCustomCluster("genBasic", it600GatewayBasic), m.deviceAddCustomCluster(IT600_CLUSTER, it600Cluster)],
        fromZigbee: [
            fzIt600.sync_request,
            fzIt600.zone_table,
            fzIt600.sync_ack,
            fzIt600.replaced_thermostat,
            fzIt600.wiring_centre_request,
            fzIt600.pair_button,
            fzIt600.unknown_command,
        ],
        toZigbee: [tzIt600.zone_table],
        exposes: [
            ...ZONE_KEYS.map((key, index) =>
                e
                    .text(key, ea.STATE_GET)
                    .withDescription(
                        `IEEE address of the thermostat in zone ${index + 1}, its short address while no device has it, null while the zone is free`,
                    ),
            ),
            e
                .text("replaced_thermostat", ea.STATE)
                .withDescription(
                    "IEEE address of the thermostat the wiring centre last reported as replaced in a zone, its short address while no device has it",
                ),
        ],
        endpoint: () => ({default: WIRING_CENTRE_ENDPOINT}),
        onEvent: wiringCentreOnEvent,
        ota: {manufacturerName: "SalusControls"},
    },
];
