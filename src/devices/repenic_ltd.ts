import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, KeyValue, OnEvent, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const NS = "zhc:repenic_ltd";
const e = exposes.presets;
const ea = exposes.access;

const ACTION_LOOKUP: Record<number, string> = {
    2: "hold",
    4: "release",
    8: "double",
    16: "triple",
};

function getPayloadBytes(data: unknown): number[] {
    if (Buffer.isBuffer(data)) return Array.from(data);
    if (Array.isArray(data)) return data as number[];
    if (data && typeof data === "object") {
        const obj = data as {data?: unknown};
        if (obj.data !== undefined) return getPayloadBytes(obj.data);
    }
    return [];
}

function parsePatternFrame(frame: Buffer): Map<number, number[]> {
    const result = new Map<number, number[]>();
    const manufacturerSpecific = (frame[0] & 0x04) !== 0;
    const commandOffset = manufacturerSpecific ? 4 : 2;
    const hasStatus = frame[commandOffset] === 0x01;
    let offset = commandOffset + 1;
    while (offset + 3 <= frame.length) {
        const attrId = frame.readUInt16LE(offset);
        offset += 2;
        if (hasStatus && frame[offset++] !== 0x00) break;
        const dataType = frame[offset++];
        if (dataType !== 0x42) break;
        const length = frame[offset++];
        if (offset + length > frame.length) break;
        result.set(attrId, Array.from(frame.subarray(offset, offset + length)));
        offset += length;
    }
    return result;
}

function patternPublishValue(key: string, value: number): unknown {
    if (key.endsWith("_on_off")) return value ? "ON" : "OFF";
    if (key.endsWith("_countdown")) return String(value);
    return value;
}

const fzLocal = {
    repenicAction: {
        cluster: 0xe004,
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const bytes = getPayloadBytes(msg.data);
            for (let i = bytes.length - 1; i >= 0; i--) {
                const action = ACTION_LOOKUP[bytes[i]];
                if (action !== undefined) {
                    return {action};
                }
            }
            return {};
        },
    } satisfies Fz.Converter<0xe004, undefined, ["raw"]>,
    repenicPatterns: {
        cluster: "repenicPrivateE003",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const frame: Buffer | undefined = msg.meta.rawData;
            if (!frame || frame.length < 5) return {};
            const entries = parsePatternFrame(frame);
            const payload: KeyValue = {};
            for (const group of PATTERN_GROUPS) {
                const bytes = entries.get(group.attribute);
                if (bytes === undefined) continue;
                const values = bytes.length >= group.minBytes ? group.fromBytes(bytes) : group.defaults;
                globalStore.putValue(msg.endpoint, group.command, {
                    ...globalStore.getValue(msg.endpoint, group.command, group.defaults),
                    ...values,
                });
                for (const key of Object.keys(values)) {
                    payload[key] = patternPublishValue(key, values[key]);
                }
            }
            return payload;
        },
    } satisfies Fz.Converter<"repenicPrivateE003", undefined, ["attributeReport", "readResponse"]>,
};

const PATTERN_COMMANDS = ["set_pattern", "set_wakeup_pattern", "set_night_pattern"] as const;
type PatternCommand = (typeof PATTERN_COMMANDS)[number];

type PatternGroup = {
    command: PatternCommand;
    attribute: number;
    defaults: Record<string, number>;
    parse: Record<string, (value: unknown) => number>;
    toBytes: (state: Record<string, number>) => number[];
    minBytes: number;
    fromBytes: (bytes: number[]) => Record<string, number>;
};

function parseOnOff(value: unknown): number {
    if (value === null || value === undefined) {
        return 0;
    }
    return value === "OFF" || value === 0 || value === false ? 0 : 1;
}

function parseNumber(property: string): (value: unknown) => number {
    return (value: unknown) => {
        if (value === null || value === undefined) {
            return 0;
        }
        return utils.toNumber(value, property);
    };
}

function patternConverter(options: PatternGroup): Tz.Converter {
    return {
        key: Object.keys(options.defaults),
        convertSet: async (entity, key, value, meta) => {
            const parse = options.parse[key];
            if (parse === undefined) {
                throw new Error(`Unknown pattern field '${key}'`);
            }
            const endpoint = utils.determineEndpoint(entity, meta, 0xe003);
            const state: Record<string, number> = {...globalStore.getValue(endpoint, options.command, options.defaults)};
            const empty = value === null || value === undefined || (typeof value === "string" && value.trim().length === 0);
            state[key] = empty ? options.defaults[key] : parse(value);
            globalStore.putValue(endpoint, options.command, state);
            await endpoint.command(0xe003, options.command, {pattern: Buffer.from(options.toBytes(state))});
            return {state: {[key]: patternPublishValue(key, state[key])}};
        },
        convertGet: async (entity, key, meta) => {
            const endpoint = utils.determineEndpoint(entity, meta, 0xe003);
            await readPatternAttributes(endpoint);
        },
    };
}

const PATTERN_GROUPS: PatternGroup[] = [
    {
        command: "set_pattern",
        attribute: 0x0000,
        minBytes: 5,
        defaults: {sleep_on_off: 0, sleep_hour: 10, sleep_minute: 0, sleep_countdown: 30},
        parse: {
            sleep_on_off: parseOnOff,
            sleep_hour: parseNumber("sleep_hour"),
            sleep_minute: parseNumber("sleep_minute"),
            sleep_countdown: parseNumber("sleep_countdown"),
        },
        toBytes: (state) => [state.sleep_on_off, state.sleep_hour, state.sleep_minute, 0, state.sleep_countdown, 0],
        fromBytes: (bytes) => ({
            sleep_on_off: bytes[0],
            sleep_hour: bytes[1],
            sleep_minute: bytes[2],
            sleep_countdown: bytes[4],
        }),
    },
    {
        command: "set_wakeup_pattern",
        attribute: 0x0001,
        minBytes: 5,
        defaults: {wakeup_on_off: 0, wakeup_hour: 10, wakeup_minute: 0, wakeup_brightness: 100, wakeup_countdown: 30},
        parse: {
            wakeup_on_off: parseOnOff,
            wakeup_hour: parseNumber("wakeup_hour"),
            wakeup_minute: parseNumber("wakeup_minute"),
            wakeup_brightness: parseNumber("wakeup_brightness"),
            wakeup_countdown: parseNumber("wakeup_countdown"),
        },
        toBytes: (state) => [
            state.wakeup_on_off,
            state.wakeup_hour,
            state.wakeup_minute,
            Math.trunc(state.wakeup_brightness * 2.54),
            state.wakeup_countdown,
            0,
        ],
        fromBytes: (bytes) => ({
            wakeup_on_off: bytes[0],
            wakeup_hour: bytes[1],
            wakeup_minute: bytes[2],
            wakeup_brightness: Math.round(bytes[3] / 2.54),
            wakeup_countdown: bytes[4],
        }),
    },
    {
        command: "set_night_pattern",
        attribute: 0x0002,
        minBytes: 6,
        defaults: {night_on_off: 0, night_hour: 0, night_minute: 0, night_end_hour: 6, night_end_minute: 0, night_brightness: 10},
        parse: {
            night_on_off: parseOnOff,
            night_hour: parseNumber("night_hour"),
            night_minute: parseNumber("night_minute"),
            night_end_hour: parseNumber("night_end_hour"),
            night_end_minute: parseNumber("night_end_minute"),
            night_brightness: parseNumber("night_brightness"),
        },
        toBytes: (state) => [
            state.night_on_off,
            state.night_hour,
            state.night_minute,
            Math.trunc(state.night_brightness * 2.54),
            state.night_end_hour,
            state.night_end_minute,
        ],
        fromBytes: (bytes) => ({
            night_on_off: bytes[0],
            night_hour: bytes[1],
            night_minute: bytes[2],
            night_brightness: Math.round(bytes[3] / 2.54),
            night_end_hour: bytes[4],
            night_end_minute: bytes[5],
        }),
    },
];

const PATTERN_ATTRIBUTES = PATTERN_GROUPS.map((group) => group.attribute);

async function readPatternAttributes(endpoint: Zh.Endpoint | Zh.Group): Promise<void> {
    for (const attribute of PATTERN_ATTRIBUTES) {
        try {
            await endpoint.read(0xe003, [attribute]);
        } catch (error) {
            logger.warning(
                `Failed to read pattern attribute 0x${attribute.toString(16).padStart(4, "0")}: ${error instanceof Error ? error.message : String(error)}`,
                NS,
            );
        }
    }
}

async function syncDeviceTime(endpoint: Zh.Endpoint): Promise<void> {
    const utcOffset = -new Date().getTimezoneOffset() * 60;
    const time = Math.floor(Date.now() / 1000) + utcOffset;
    try {
        await endpoint.write("genTime", {time, timeZone: utcOffset});
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("UNSUPPORTED_ATTRIBUTE")) {
            try {
                await endpoint.write("genTime", {time});
                await endpoint.write("genTime", {timeZone: utcOffset});
            } catch (retryError) {
                logger.warning(
                    `Failed to sync time to '${endpoint.deviceIeeeAddress}': ${retryError instanceof Error ? retryError.message : String(retryError)}`,
                    NS,
                );
            }
        } else {
            logger.warning(`Failed to sync time to '${endpoint.deviceIeeeAddress}': ${message}`, NS);
        }
    }
}

let readPatternsInProgress = false;

async function readPatterns(device: Zh.Device): Promise<void> {
    if (readPatternsInProgress) {
        return;
    }
    const endpoint = device.getEndpoint(1);
    if (endpoint === undefined) {
        logger.warning(`Cannot read pattern attributes: no endpoint 1 on '${device.ieeeAddr}'`, NS);
        return;
    }
    readPatternsInProgress = true;
    try {
        await readPatternAttributes(endpoint);
    } finally {
        readPatternsInProgress = false;
    }
}

const definitionOnEvent: OnEvent.Handler = async (event) => {
    const status = (event.data as {status?: string}).status;
    const interviewDone = event.type === "deviceInterview" && status === "successful";
    if (interviewDone || event.type === "deviceAnnounce") {
        const endpoint = event.data.device.getEndpoint(1);
        if (endpoint !== undefined) {
            await syncDeviceTime(endpoint);
        }
    }
    if (interviewDone || event.type === "deviceAnnounce" || event.type === "start") {
        await readPatterns(event.data.device);
    }
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["RD-250ZG"],
        model: "RD-250ZG",
        vendor: "Repenic Ltd.",
        description: "Dimmer",
        version: "0.0.2",
        configure: async (device) => {
            await readPatterns(device);
        },
        onEvent: definitionOnEvent,
        fromZigbee: [fzLocal.repenicAction, fzLocal.repenicPatterns],
        toZigbee: PATTERN_GROUPS.map((group) => patternConverter(group)),
        exposes: [
            e.action(["hold", "release", "double", "triple"]),
            e.binary("sleep_on_off", ea.STATE_SET, "ON", "OFF").withDescription("Co-sleeping mode: enable/disable"),
            e.numeric("sleep_hour", ea.STATE_SET).withValueMin(0).withValueMax(23).withValueStep(1).withDescription("Co-sleeping mode: start hour"),
            e
                .numeric("sleep_minute", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(59)
                .withValueStep(1)
                .withDescription("Co-sleeping mode: start minute"),
            e.enum("sleep_countdown", ea.STATE_SET, ["10", "20", "30"]).withDescription("Co-sleeping mode: duration (minutes)"),
            e.binary("wakeup_on_off", ea.STATE_SET, "ON", "OFF").withDescription("Sunrise mode: enable/disable"),
            e.numeric("wakeup_hour", ea.STATE_SET).withValueMin(0).withValueMax(23).withValueStep(1).withDescription("Sunrise mode: start hour"),
            e.numeric("wakeup_minute", ea.STATE_SET).withValueMin(0).withValueMax(59).withValueStep(1).withDescription("Sunrise mode: start minute"),
            e
                .numeric("wakeup_brightness", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(100)
                .withValueStep(1)
                .withDescription("Sunrise mode: brightness (%)"),
            e.enum("wakeup_countdown", ea.STATE_SET, ["10", "20", "30"]).withDescription("Sunrise mode: duration (minutes)"),
            e.binary("night_on_off", ea.STATE_SET, "ON", "OFF").withDescription("Moonlight mode: enable/disable"),
            e
                .numeric("night_hour", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(23)
                .withValueStep(1)
                .withDescription("Moonlight mode: start hour (today)"),
            e
                .numeric("night_minute", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(59)
                .withValueStep(1)
                .withDescription("Moonlight mode: start minute (today)"),
            e
                .numeric("night_end_hour", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(23)
                .withValueStep(1)
                .withDescription("Moonlight mode: end hour (tomorrow)"),
            e
                .numeric("night_end_minute", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(59)
                .withValueStep(1)
                .withDescription("Moonlight mode: end minute (tomorrow)"),
            e
                .numeric("night_brightness", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(100)
                .withValueStep(1)
                .withDescription("Moonlight mode: brightness (%)"),
        ],
        extend: [
            m.light({configureReporting: true}),
            m.electricityMeter(),
            m.numeric({
                name: "min_brightness",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xa000, type: 0x20},
                description: "Minimum brightness (≈1–99%)",
                valueMin: 1,
                valueMax: 99,
            }),
            m.numeric({
                name: "max_brightness",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xa003, type: 0x20},
                description: "Maximum brightness (≈1–100%)",
                valueMin: 1,
                valueMax: 100,
            }),
            m.numeric({
                name: "start_brightness",
                cluster: "genLevelCtrl",
                attribute: {ID: 0x0011, type: 0x20},
                description: "Default brightness at power-on/startup (0-254)",
                valueMin: 0,
                valueMax: 254,
            }),
            m.binary({
                name: "boost",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xa004, type: 0x20},
                description: "Boost function",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
            }),
            m.enumLookup({
                name: "dimming_mode",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xb000, type: 0x30},
                description: "Dimming mode",
                lookup: {"Leading edge": 0, "Trailing edge": 1},
            }),
            m.numeric({
                name: "default_move_rate",
                cluster: "genLevelCtrl",
                attribute: {ID: 0x0014, type: 0x20},
                description: "Default Move Rate",
                valueMin: 1,
                valueMax: 10,
            }),
            m.deviceAddCustomCluster("repenicPrivateE003", {
                ID: 0xe003,
                name: "repenicPrivateE003",
                attributes: {
                    sleepPattern: {ID: 0x0000, name: "sleepPattern", type: 0x42},
                    wakeUpPattern: {ID: 0x0001, name: "wakeUpPattern", type: 0x42},
                    nightPattern: {ID: 0x0002, name: "nightPattern", type: 0x42},
                    sceneMode: {ID: 0x0003, name: "sceneMode", type: 0x30},
                },
                commands: {
                    set_pattern: {name: "set_pattern", ID: 0x00, parameters: [{name: "pattern", type: 0x42}]},
                    set_wakeup_pattern: {name: "set_wakeup_pattern", ID: 0x01, parameters: [{name: "pattern", type: 0x42}]},
                    set_night_pattern: {name: "set_night_pattern", ID: 0x02, parameters: [{name: "pattern", type: 0x42}]},
                },
                commandsResponse: {},
            }),
            m.binary({
                name: "scene_mode",
                cluster: "repenicPrivateE003",
                attribute: {ID: 0x0003, type: 0x30},
                description: "Scene mode",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
            }),
        ],
    },
];
