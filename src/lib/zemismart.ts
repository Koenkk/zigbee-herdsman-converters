import * as exposes from "./exposes";
import {logger} from "./logger";
import * as tuya from "./tuya";
import type {DefinitionExposesFunction, Expose, KeyValue, ModernExtend, Tuya, Tz, Zh} from "./types";
import * as utils from "./utils";

const e = exposes.presets;
const ea = exposes.access;

type Waiter = {
    dp: number;
    matches: (data: Buffer) => boolean;
    finish: (error?: unknown, data?: Buffer) => void;
    timer?: NodeJS.Timeout;
};
type Runtime = {
    queue: Promise<void>;
    waiters: Set<Waiter>;
    generation: number;
    energyPending: Promise<void>;
    queryQueue: Promise<void>;
    delays: Set<() => void>;
    stopped: boolean;
    lastQuery: number;
    energyTimer?: NodeJS.Timeout;
    energyDeadline?: NodeJS.Timeout;
    energyRequest?: number;
    energyMayBeOn: boolean;
    streamEndpoint?: Zh.Endpoint;
    cleanup?: Promise<void>;
};

const TUYA_CLUSTER = "manuSpecificTuya";
const NS = "zhc:zemismart-zps-z1";
const DP = {
    PRESENCE_STATE: 1,
    DETECTION_RANGE: 2,
    ILLUMINANCE: 101,
    ENERGY_VALUE: 102,
    AI_SELF_LEARNING: 103,
    HEARTBEAT_ENABLE: 104,
    HEART: 105,
    SENSITIVITY_PRESET: 112,
    ZONE_MAP: 117,
    NO_PERSON_TIME: 119,
    INDICATOR: 123,
    ENERGY_THRESHOLD: 124,
};
const DT = {RAW: 0, BOOL: 1, VALUE: 2, ENUM: 4};
const ZONE_COUNT = 10;
const REPORT_TIMEOUT_MS = 10000;
const QUERY_INTERVAL_MS = 3000;
const STREAM_INTERVAL_MS = 5000;
const STREAM_MAX_MS = 5 * 60 * 1000;
const pendingCleanup = new Map<string, Promise<void>>();
const runtime = new Map<string, Runtime>();

function getRuntime(device: Zh.Device): Runtime {
    if (!runtime.has(device.ieeeAddr)) {
        const barrier = pendingCleanup.get(device.ieeeAddr) || Promise.resolve();
        runtime.set(device.ieeeAddr, {
            queue: barrier,
            waiters: new Set(),
            generation: 0,
            energyPending: barrier,
            queryQueue: barrier,
            delays: new Set(),
            stopped: false,
            lastQuery: Number.NEGATIVE_INFINITY,
            energyMayBeOn: false,
        });
    }
    return runtime.get(device.ieeeAddr);
}

function stopKeepAlive(state: Runtime) {
    state.generation++;
    clearTimeout(state.energyTimer);
    clearTimeout(state.energyDeadline);
    state.energyTimer = state.energyDeadline = undefined;
}

async function sendFrame(endpoint: Zh.Endpoint, dp: number, datatype: number, data: Buffer | number[]) {
    const buffer = Buffer.from(data);
    switch (datatype) {
        case DT.BOOL:
            await tuya.sendDataPointBool(endpoint, dp, buffer[0] === 1);
            break;
        case DT.ENUM:
            await tuya.sendDataPointEnum(endpoint, dp, buffer[0]);
            break;
        case DT.VALUE:
            await tuya.sendDataPointValue(endpoint, dp, buffer.readUInt32BE(0));
            break;
        case DT.RAW:
            await tuya.sendDataPointRaw(endpoint, dp, buffer);
            break;
        default:
            throw new Error(`[ZPS-Z1] Unsupported datatype: ${datatype}`);
    }
}

async function sendDP(endpoint: Zh.Endpoint, dp: number, datatype: number, data: Buffer | number[], state: Runtime) {
    if (state.stopped) throw new Error("[ZPS-Z1] Device stopped");
    if (dp === DP.HEARTBEAT_ENABLE) {
        state.streamEndpoint = endpoint;
        // A failed ACK does not prove that an attempted ON did not reach the MCU.
        if (data[0] === 1) state.energyMayBeOn = true;
    }
    await sendFrame(endpoint, dp, datatype, data);
    if (dp === DP.HEARTBEAT_ENABLE && data[0] === 0) state.energyMayBeOn = false;
}

function shutdownRuntime(ieeeAddr: string, state: Runtime) {
    if (state.cleanup !== undefined) return state.cleanup;
    state.stopped = true;
    stopKeepAlive(state);
    for (const cancel of state.delays || []) cancel();
    for (const waiter of [...state.waiters]) waiter.finish(new Error("[ZPS-Z1] Device stopped"));
    const previous = pendingCleanup.get(ieeeAddr) || Promise.resolve();
    const cleanup = (async () => {
        // Includes initial ON, not only periodic heartbeats. No new ordinary commands
        // can start after stopped=true; the sole exception is this final safety OFF.
        await Promise.allSettled([previous, state.queue, state.energyPending]);
        if (state.energyMayBeOn && state.streamEndpoint) {
            try {
                await sendFrame(state.streamEndpoint, DP.HEARTBEAT_ENABLE, DT.BOOL, [0]);
                state.energyMayBeOn = false;
            } catch (error) {
                logger.warning(`Energy reporting shutdown OFF failed: ${String(error)}`, NS);
            }
        }
    })().finally(() => {
        if (pendingCleanup.get(ieeeAddr) === cleanup) pendingCleanup.delete(ieeeAddr);
    });
    state.cleanup = cleanup;
    pendingCleanup.set(ieeeAddr, cleanup);
    return cleanup;
}

function queryDelay(state: Runtime, ms: number) {
    return new Promise<void>((resolve, reject) => {
        const cancel = () => {
            clearTimeout(timer);
            state.delays.delete(cancel);
            reject(new Error("[ZPS-Z1] Device stopped"));
        };
        const timer = setTimeout(() => {
            state.delays.delete(cancel);
            resolve();
        }, ms);
        state.delays.add(cancel);
    });
}

function queryState(endpoint: Zh.Endpoint, state: Runtime, force = false, beforeSend?: () => void) {
    const job = state.queryQueue.then(async () => {
        if (state.stopped) throw new Error("[ZPS-Z1] Device stopped");
        const remaining = QUERY_INTERVAL_MS - (Date.now() - state.lastQuery);
        if (remaining > 0) {
            if (!force) return;
            // Some battery firmware suppresses closely spaced dataQuery requests.
            // SET/read-modify-write queries wait their turn instead of being discarded.
            await queryDelay(state, remaining);
        }
        if (state.stopped) throw new Error("[ZPS-Z1] Device stopped");
        state.lastQuery = Date.now();
        beforeSend?.();
        try {
            await endpoint.command(TUYA_CLUSTER, "dataQuery", {}, {disableDefaultResponse: true});
        } catch (error) {
            state.lastQuery = Number.NEGATIVE_INFINITY;
            throw error;
        }
    });
    state.queryQueue = job.catch(() => {});
    return job;
}

function startKeepAlive(endpoint: Zh.Endpoint, state: Runtime) {
    stopKeepAlive(state);
    const generation = state.generation;
    const active = () => !state.stopped && state.generation === generation;
    const schedule = () => {
        state.energyTimer = setTimeout(async () => {
            if (!active()) return;
            // One heartbeat at a time, even when the device is slow to reply.
            state.energyPending = sendDP(endpoint, DP.HEARTBEAT_ENABLE, DT.BOOL, [1], state);
            try {
                await state.energyPending;
            } catch (error) {
                logger.warning(`Energy heartbeat failed: ${String(error)}`, NS);
            }
            if (active()) schedule();
        }, STREAM_INTERVAL_MS);
        state.energyTimer.unref?.();
    };
    schedule();
    state.energyDeadline = setTimeout(async () => {
        if (!active()) return;
        stopKeepAlive(state);
        const expiredGeneration = state.generation;
        // An in-flight ON must finish before the final OFF, never after it.
        await state.energyPending.catch(() => {});
        if (state.stopped || state.generation !== expiredGeneration) return;
        try {
            await enqueue(state, async () => {
                if (state.generation !== expiredGeneration) return;
                await sendDP(endpoint, DP.HEARTBEAT_ENABLE, DT.BOOL, [0], state);
            });
        } catch (error) {
            logger.warning(`Energy streaming auto-off failed: ${String(error)}`, NS);
        }
        // DP104 is write-only. No readable stream state is inferred from this request.
    }, STREAM_MAX_MS);
    state.energyDeadline.unref?.();
}

function enqueue(state: Runtime, work: () => Promise<void>) {
    const job = state.queue.then(() => {
        if (state.stopped) throw new Error("[ZPS-Z1] Device stopped");
        return work();
    });
    state.queue = job.catch(() => {});
    return job;
}

function waitForReport(state: Runtime, dp: number, matches: (data: Buffer) => boolean = () => true) {
    let waiter: Waiter;
    const promise = new Promise<Buffer>((resolve, reject) => {
        const finish = (error?: unknown, data?: Buffer) => {
            clearTimeout(waiter.timer);
            state.waiters.delete(waiter);
            if (error) reject(error);
            else resolve(Buffer.from(data));
        };
        waiter = {dp, matches, finish};
        waiter.timer = setTimeout(
            () => finish(new Error(`[ZPS-Z1] No confirmed DP${dp} report; no default values will be written`)),
            REPORT_TIMEOUT_MS,
        );
        state.waiters.add(waiter);
    });
    // A failed Zigbee command may precede the await below; avoid an unhandled rejection.
    promise.catch(() => {});
    return {promise, cancel: (error: unknown) => waiter.finish(error)};
}

async function readRaw(endpoint: Zh.Endpoint, state: Runtime, dp: number) {
    let waiting: ReturnType<typeof waitForReport>;
    try {
        // Do not accept an older report while this query is still waiting its turn.
        await queryState(endpoint, state, true, () => {
            waiting = waitForReport(state, dp);
        });
        return await waiting.promise;
    } catch (error) {
        waiting?.cancel(error);
        throw error;
    }
}

async function writeConfirmed(
    endpoint: Zh.Endpoint,
    state: Runtime,
    dp: number,
    datatype: number,
    data: Buffer | number[],
    matches?: (data: Buffer) => boolean,
) {
    const expected = Buffer.from(data);
    const waiting = waitForReport(state, dp, matches || ((actual) => actual.equals(expected)));
    try {
        await sendDP(endpoint, dp, datatype, expected, state);
        await queryState(endpoint, state, true);
        await waiting.promise;
    } catch (error) {
        waiting.cancel(error);
        throw error;
    }
}

function numberValue(key: string, value: unknown, min: number, max: number, step = 1) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        !Number.isInteger(value) ||
        value < min ||
        value > max ||
        (value - min) % step !== 0
    ) {
        throw new Error(`[ZPS-Z1] ${key} requires an integer ${min}..${max}, step ${step}`);
    }
    return value;
}

function booleanValue(key: string, value: unknown) {
    if (value === true || value === "ON") return true;
    if (value === false || value === "OFF") return false;
    throw new Error(`[ZPS-Z1] ${key} requires true/false or ON/OFF`);
}

function enumValue(key: string, value: unknown, choices: Record<string, number>) {
    if (typeof value !== "string" || !Object.hasOwn(choices, value)) {
        throw new Error(`[ZPS-Z1] Invalid ${key}: ${String(value)}`);
    }
    return choices[value];
}

function uint32(value: number) {
    const data = Buffer.alloc(4);
    data.writeUInt32BE(value);
    return data;
}

const reportFormats = new Map<number, [number, number, number[]?]>([
    [DP.PRESENCE_STATE, [DT.ENUM, 1, [0, 1, 2]]],
    [DP.DETECTION_RANGE, [DT.VALUE, 4]],
    [DP.ILLUMINANCE, [DT.VALUE, 4]],
    [DP.ENERGY_VALUE, [DT.RAW, 20]],
    [DP.AI_SELF_LEARNING, [DT.ENUM, 1, [0, 1, 2, 3, 4, 5]]],
    [DP.HEARTBEAT_ENABLE, [DT.BOOL, 1, [0, 1]]],
    [DP.SENSITIVITY_PRESET, [DT.ENUM, 1, [0, 1, 2, 3]]],
    [DP.ZONE_MAP, [DT.RAW, 10]],
    [DP.NO_PERSON_TIME, [DT.VALUE, 4]],
    [DP.INDICATOR, [DT.BOOL, 1, [0, 1]]],
    [DP.ENERGY_THRESHOLD, [DT.RAW, 20]],
]);

function validatedData(dpv: Tuya.DpValue) {
    if (!dpv || !reportFormats.has(dpv.dp)) return;
    const [datatype, length, allowed] = reportFormats.get(dpv.dp);
    if (dpv.datatype !== datatype) return;
    const data = dpv.data;
    if (
        !Buffer.isBuffer(data) &&
        !(
            Array.isArray(data) &&
            Array.from(data).every((value) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255)
        )
    )
        return;
    if (data.length !== length) return;
    const buf = Buffer.from(data);
    if (allowed && !allowed.includes(buf[0])) return;
    if (dpv.dp === DP.ZONE_MAP && !buf.every((value) => value <= 2)) return;
    return buf;
}

// Standard Tuya dispatch decodes the value first. Inspect the corresponding raw
// frame as well so malformed lengths/types cannot publish state or confirm writes.
function report(dp: number, decode: (data: Buffer) => KeyValue): Tuya.ValueConverterSingle {
    return {
        from: (value, meta, options, publish, msg) => {
            const entry = msg.data.dpValues.find((candidate: Tuya.DpValue) => {
                if (candidate.dp !== dp) return false;
                const data = validatedData(candidate);
                if (!data) return false;
                switch (candidate.datatype) {
                    case DT.RAW:
                        return candidate.data === value;
                    case DT.BOOL:
                        return (data[0] === 1) === value;
                    case DT.ENUM:
                        return data[0] === value;
                    case DT.VALUE:
                        return tuya.convertBufferToNumber(data) === value;
                }
                return false;
            });
            if (!entry) return {};
            const data = Buffer.from(entry.data);
            const state = getRuntime(meta.device);
            for (const waiter of [...state.waiters]) {
                if (waiter.dp === dp && waiter.matches(data)) waiter.finish(undefined, data);
            }
            return decode(data);
        },
    };
}

function setting(dp: number, datatype: number, encode: (value: unknown) => Buffer | number[], confirmed = false): Tuya.ValueConverterSingle {
    return {
        to: async (value, meta) => {
            const data = encode(value);
            const state = getRuntime(meta.device);
            const endpoint = meta.device.getEndpoint(1);
            await enqueue(state, async () => {
                if (confirmed) {
                    await writeConfirmed(endpoint, state, dp, datatype, data);
                } else {
                    await sendDP(endpoint, dp, datatype, data, state);
                    await queryState(endpoint, state, true);
                }
            });
            // Returning undefined suppresses the standard dispatcher's extra write.
        },
    };
}

function arraySetting(dp: number, index: number, key: string, zone = false): Tuya.ValueConverterSingle {
    return {
        to: async (value, meta) => {
            const requested = zone ? booleanValue(key, value) : numberValue(key, value, 0, 255);
            const state = getRuntime(meta.device);
            const endpoint = meta.device.getEndpoint(1);
            await enqueue(state, async () => {
                // Read the complete array immediately before editing one byte. Preserve
                // all other bytes, including unmasked zone modes 1 and 2.
                const data = await readRaw(endpoint, state, dp);
                if (zone ? (data[index] !== 0) === requested : data[index] === requested) return;
                data[index] = zone ? (requested ? data[index] || 1 : 0) : (requested as number);
                const matches = zone ? (actual: Buffer) => actual.every((v, i) => (v !== 0) === (data[i] !== 0)) : undefined;
                await writeConfirmed(endpoint, state, dp, DT.RAW, data, matches);
            });
        },
    };
}

const energyCommand: Tuya.ValueConverterSingle = {
    to: async (value, meta) => {
        const enabled = booleanValue("energy_streaming", value);
        const state = getRuntime(meta.device);
        const endpoint = meta.device.getEndpoint(1);
        // A new request supersedes an older ON, including one awaiting its ACK.
        stopKeepAlive(state);
        state.energyRequest = (state.energyRequest || 0) + 1;
        const requestedEnergy = state.energyRequest;
        await enqueue(state, async () => {
            if (!enabled) stopKeepAlive(state);
            await state.energyPending.catch(() => {});
            try {
                await sendDP(endpoint, DP.HEARTBEAT_ENABLE, DT.BOOL, [enabled ? 1 : 0], state);
            } catch (error) {
                // Keep the failed-ON safety OFF inside this queue entry so it cannot
                // follow a later ON request. Stopped runtimes use lifecycle cleanup.
                if (enabled && !state.stopped) {
                    try {
                        await sendDP(endpoint, DP.HEARTBEAT_ENABLE, DT.BOOL, [0], state);
                    } catch (cleanupError) {
                        logger.warning(`Energy reporting failed-ON cleanup OFF failed: ${String(cleanupError)}`, NS);
                    }
                }
                throw error;
            }
            if (enabled && !state.stopped && state.energyRequest === requestedEnergy) startKeepAlive(endpoint, state);
        });
    },
};

function pairedValues(data: Buffer, field: string): KeyValue {
    const result: KeyValue = {};
    for (let i = 0; i < ZONE_COUNT; i++) {
        result[`zone_${i + 1}_motion_${field}`] = data[i];
        result[`zone_${i + 1}_presence_${field}`] = data[ZONE_COUNT + i];
    }
    return result;
}

// null-key entries handle reports first; named entries provide write mappings for
// the same DP. All writes publish only actual reports, never optimistic state.
export const zpsZ1Datapoints: Tuya.MetaTuyaDataPoints = [
    [
        DP.PRESENCE_STATE,
        null,
        report(DP.PRESENCE_STATE, (data) => {
            const result: KeyValue = {presence_state: ["absence", "presence", "sensor_close"][data[0]]};
            if (data[0] !== 2) result.occupancy = data[0] === 1;
            return result;
        }),
    ],
    [DP.DETECTION_RANGE, null, report(DP.DETECTION_RANGE, (data) => ({detection_range: data.readUInt32BE(0)}))],
    [DP.ILLUMINANCE, null, report(DP.ILLUMINANCE, (data) => ({illuminance: data.readUInt32BE(0)}))],
    [DP.ENERGY_VALUE, null, report(DP.ENERGY_VALUE, (data) => pairedValues(data, "energy"))],
    [
        DP.AI_SELF_LEARNING,
        null,
        report(DP.AI_SELF_LEARNING, (data) => ({
            auto_calibration_status: ["standby", "start", "learning", "success", "fail", "cancel"][data[0]],
        })),
    ],
    // Passive DP104 echoes do not change local timers or claim a readable state.
    [DP.HEARTBEAT_ENABLE, null, {from: () => ({})}],
    [DP.SENSITIVITY_PRESET, null, report(DP.SENSITIVITY_PRESET, (data) => ({sensitivity_preset: ["high", "medium", "low", "custom"][data[0]]}))],
    [
        DP.ZONE_MAP,
        null,
        report(DP.ZONE_MAP, (data) => Object.fromEntries(Array.from(data, (value, index) => [`zone_${index + 1}_active`, value !== 0]))),
    ],
    [DP.NO_PERSON_TIME, null, report(DP.NO_PERSON_TIME, (data) => ({presence_clear_cooldown: data.readUInt32BE(0)}))],
    [DP.INDICATOR, null, report(DP.INDICATOR, (data) => ({led_indicator: data[0] === 1}))],
    [DP.ENERGY_THRESHOLD, null, report(DP.ENERGY_THRESHOLD, (data) => pairedValues(data, "threshold"))],
    [
        DP.DETECTION_RANGE,
        "detection_range",
        setting(DP.DETECTION_RANGE, DT.VALUE, (value) => uint32(numberValue("detection_range", value, 0, 1500, 50)), true),
        {optimistic: false},
    ],
    [
        DP.NO_PERSON_TIME,
        "presence_clear_cooldown",
        setting(DP.NO_PERSON_TIME, DT.VALUE, (value) => uint32(numberValue("presence_clear_cooldown", value, 2, 60))),
        {optimistic: false},
    ],
    [
        DP.SENSITIVITY_PRESET,
        "sensitivity_preset",
        setting(DP.SENSITIVITY_PRESET, DT.ENUM, (value) => [enumValue("sensitivity_preset", value, {high: 0, medium: 1, low: 2, custom: 3})]),
        {optimistic: false},
    ],
    [
        DP.AI_SELF_LEARNING,
        "auto_calibration",
        setting(DP.AI_SELF_LEARNING, DT.ENUM, (value) => [enumValue("auto_calibration", value, {start: 1, cancel: 5})]),
        {optimistic: false},
    ],
    [DP.INDICATOR, "led_indicator", setting(DP.INDICATOR, DT.BOOL, (value) => [booleanValue("led_indicator", value) ? 1 : 0]), {optimistic: false}],
    [DP.HEARTBEAT_ENABLE, "energy_streaming", energyCommand, {optimistic: false}],
    ...Array.from(
        {length: ZONE_COUNT},
        (_, index): Tuya.MetaTuyaDataPointsSingle => [
            DP.ZONE_MAP,
            `zone_${index + 1}_active`,
            arraySetting(DP.ZONE_MAP, index, `zone_${index + 1}_active`, true),
            {optimistic: false},
        ],
    ),
    ...Array.from({length: ZONE_COUNT}, (_, index): Tuya.MetaTuyaDataPointsSingle[] => [
        [
            DP.ENERGY_THRESHOLD,
            `zone_${index + 1}_motion_threshold`,
            arraySetting(DP.ENERGY_THRESHOLD, index, `zone_${index + 1}_motion_threshold`),
            {optimistic: false},
        ],
        [
            DP.ENERGY_THRESHOLD,
            `zone_${index + 1}_presence_threshold`,
            arraySetting(DP.ENERGY_THRESHOLD, ZONE_COUNT + index, `zone_${index + 1}_presence_threshold`),
            {optimistic: false},
        ],
    ]).flat(),
];

export const zpsZ1Get: Tz.Converter["convertGet"] = async (entity, key, meta) => {
    if (key === "energy_streaming") throw new Error("[ZPS-Z1] energy_streaming is a write-only heartbeat request, not a queryable state");
    await queryState(meta.device.getEndpoint(1), getRuntime(meta.device));
};

// ─── Expose builders ──────────────────────────────────────────────────────────

function buildZoneActiveExposes() {
    return Array.from({length: ZONE_COUNT}, (_, i) =>
        e
            .binary(`zone_${i + 1}_active`, ea.ALL, true, false)
            .withDescription(`Zone ${i + 1}: 0 is masked; 1/2 are unmasked presence/absence reports. Physical distance boundaries are not specified.`)
            .withCategory("config"),
    );
}

function buildEnergyExposes() {
    const items: Expose[] = [];
    for (let i = 1; i <= ZONE_COUNT; i++) {
        items.push(
            e
                .numeric(`zone_${i}_motion_energy`, ea.STATE)
                .withDescription(`Zone ${i} live motion energy (raw 0–255; no physical unit).`)
                .withValueMin(0)
                .withValueMax(255)
                .withCategory("diagnostic")
                .withHomeAssistant({enabledByDefault: false}),
            e
                .numeric(`zone_${i}_presence_energy`, ea.STATE)
                .withDescription(`Zone ${i} live presence energy (raw 0–255; no physical unit).`)
                .withValueMin(0)
                .withValueMax(255)
                .withCategory("diagnostic")
                .withHomeAssistant({enabledByDefault: false}),
        );
    }
    return items;
}

function buildThresholdExposes() {
    const items: Expose[] = [];
    for (let i = 1; i <= ZONE_COUNT; i++) {
        items.push(
            e
                .numeric(`zone_${i}_motion_threshold`, ea.ALL)
                .withLabel(`Zone ${i} threshold group 1`)
                .withDescription(
                    `Raw DP124 byte ${i} (0–255). Legacy motion_threshold key retained; the protocol does not identify the physical role of this group.`,
                )
                .withValueMin(0)
                .withValueMax(255)
                .withValueStep(1)
                .withCategory("config"),
            e
                .numeric(`zone_${i}_presence_threshold`, ea.ALL)
                .withLabel(`Zone ${i} threshold group 2`)
                .withDescription(
                    `Raw DP124 byte ${ZONE_COUNT + i} (0–255). Legacy presence_threshold key retained; the protocol does not identify the physical role of this group.`,
                )
                .withValueMin(0)
                .withValueMax(255)
                .withValueStep(1)
                .withCategory("config"),
        );
    }
    return items;
}

// Keep the customer-facing default small. Advanced visibility is a standard Z2M
// device option, so importing this one converter is sufficient on either frontend.
const BASIC_PROPERTIES = ["occupancy", "illuminance", "sensitivity_preset", "presence_clear_cooldown", "led_indicator"];
function buildAllExposes() {
    return [
        // ── Primary presence & light ──────────────────────────────────────────
        e.binary("occupancy", ea.STATE, true, false).withDescription("Binary presence detection. Person detected (true) or not detected (false)."),

        e
            .enum("presence_state", ea.STATE, ["absence", "presence", "sensor_close"])
            .withDescription(
                "absence — no one detected. " +
                    "presence — person detected. " +
                    "sensor_close — protocol state 2; its physical meaning is not specified. The last occupancy value is retained.",
            ),

        e.numeric("illuminance", ea.STATE).withUnit("lx").withDescription("Ambient light level (0–1300 lx).").withValueMin(0).withValueMax(1300),

        // ── Detection tuning ──────────────────────────────────────────────────
        e
            .numeric("detection_range", ea.ALL)
            .withCategory("config")
            .withLabel("Radar distance setting")
            .withUnit("cm")
            .withValueMin(0)
            .withValueMax(1500)
            .withValueStep(50)
            .withDescription(
                "Protocol DP2: 0–1500 cm in steps of 50. The meaning of 0 and actual sensing coverage are not specified. Only the 0-to-50-to-0 setting round trip has been tested on the sample.",
            )
            .withHomeAssistant({enabledByDefault: false}),

        e
            .numeric("presence_clear_cooldown", ea.ALL)
            .withCategory("config")
            .withUnit("s")
            .withDescription('Presence clear time before the sensor switches state to "absence". (2–60 s).')
            .withValueMin(2)
            .withValueMax(60)
            .withValueStep(1),

        e
            .enum("sensitivity_preset", ea.ALL, ["high", "medium", "low", "custom"])
            .withCategory("config")
            .withDescription(
                "Protocol presets: high=0, medium=1 (named min in the protocol), low=2, custom=3. " +
                    "Detailed detection behavior and its relationship to DP124 thresholds require device verification.",
            ),

        // ── Auto-calibration ──────────────────────────────────────────────────
        e
            .enum("auto_calibration", ea.SET, ["start", "cancel"])
            .withCategory("config")
            .withDescription(
                "Start or cancel automatic threshold learning. The protocol does not specify " +
                    "warm-up time, learning duration or required room conditions. This operation can change thresholds.",
            ),

        e
            .enum("auto_calibration_status", ea.STATE, ["standby", "start", "learning", "success", "fail", "cancel"])
            .withDescription(
                '"standby" — idle. "start" — initiated. "learning" — in progress. ' +
                    '"success" — thresholds updated. "fail" — failed. "cancel" — stopped by user.',
            ),

        // ── LED indicator ─────────────────────────────────────────────────────
        e.binary("led_indicator", ea.ALL, true, false).withCategory("config").withDescription("Physical LED indicator of the sensor."),

        // ── Real-time energy streaming ────────────────────────────────────────
        e
            .enum("energy_streaming", ea.SET, ["ON", "OFF"])
            .withCategory("config")
            .withLabel("Energy reporting command")
            .withDescription(
                "Write-only DP104 command: ON starts 5-second heartbeats; OFF stops them and sends an explicit stop. Legacy boolean commands are accepted. " +
                    "Firmware timeout is not relied on: the tested sample continued beyond the documented 10 seconds. " +
                    "A local 5-minute limit and lifecycle cleanup request OFF; this is a command, not a readable device state.",
            ),

        // ── Per-zone live energy (DP102, diagnostic) ──────────────────────────
        ...buildEnergyExposes(),

        // ── Zone active toggles (DP117) ───────────────────────────────────────
        ...buildZoneActiveExposes(),

        // ── Per-zone thresholds (DP124) ───────────────────────────────────────
        ...buildThresholdExposes(),
    ];
}

export function zpsZ1(): ModernExtend {
    const deviceExposes: DefinitionExposesFunction = (device, options = {}) => {
        const fields = buildAllExposes();
        if (utils.isDummyDevice(device) || options.show_advanced === true) return fields;
        return BASIC_PROPERTIES.map((property) => fields.find((field) => field.property === property));
    };
    return {
        isModernExtend: true,
        onEvent: [
            async (event) => {
                if (event.type !== "stop") return;
                const state = runtime.get(event.data.ieeeAddr);
                if (!state) return;
                const cleanup = shutdownRuntime(event.data.ieeeAddr, state);
                runtime.delete(event.data.ieeeAddr);
                await cleanup;
            },
        ],
        configure: [
            async (device, coordinatorEndpoint) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.bind(TUYA_CLUSTER, coordinatorEndpoint);
                await queryState(endpoint, getRuntime(device), true);
            },
        ],
        options: [
            e
                .binary("show_advanced", ea.SET, true, false)
                .withLabel("Advanced controls")
                .withDescription(
                    "Show zone tuning, self-learning and diagnostic fields. Disabled by default. This also changes which advanced entities are discovered by Home Assistant; MQTT fields remain available.",
                ),
        ],
        exposes: [deviceExposes],
    };
}
