import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

// Firmware compatibility:
//   <= 1.2.6 : physical key -> genOnOff / genLevelCtrl client commands
//   >= 1.2.7 : button cluster 0xFC01 + air config cluster 0xFC00
const MANUFACTURER_CODE = 0x4231; // LinknLink
const MFC = {manufacturerCode: MANUFACTURER_CODE};

const ACTIONS = ["single", "double", "triple", "hold", "release"] as const;
const ACTION_BY_ID: Record<number, (typeof ACTIONS)[number]> = {
    1: "single",
    2: "double",
    3: "triple",
    4: "hold",
};

type AirKey = "freq" | "trith" | "absence_timeout" | "radar_enable" | "lx_interval" | "sht_interval" | "lx_thread1" | "lx_thread2";

const AIR_MASK: Record<AirKey | "all", number> = {
    freq: 1 << 0,
    trith: 1 << 1,
    absence_timeout: 1 << 2,
    radar_enable: 1 << 3,
    lx_interval: 1 << 4,
    sht_interval: 1 << 5,
    lx_thread1: 1 << 6,
    lx_thread2: 1 << 7,
    all: 0x00ff,
};

const AIR_KEYS: AirKey[] = ["freq", "trith", "absence_timeout", "radar_enable", "lx_interval", "sht_interval", "lx_thread1", "lx_thread2"];

const AIR_DEFAULTS: Record<AirKey, number | boolean> = {
    freq: 0,
    trith: 1,
    absence_timeout: 30,
    radar_enable: true,
    lx_interval: 10,
    sht_interval: 30,
    lx_thread1: 0,
    lx_thread2: 1,
};

interface LinknlinkButtonAction {
    attributes: Record<string, never>;
    commands: {
        buttonAction: {
            // biome-ignore lint/style/useNamingConvention: ZCL payload field
            action_id: number;
            // biome-ignore lint/style/useNamingConvention: ZCL payload field
            action_str: string;
        };
    };
    commandResponses: never;
}

type LinknlinkAirConfigPayload = {
    // biome-ignore lint/style/useNamingConvention: ZCL payload field
    format_version: number;
    mask: number;
    freq: number;
    trith: number;
    // biome-ignore lint/style/useNamingConvention: ZCL payload field
    absence_timeout: number;
    // biome-ignore lint/style/useNamingConvention: ZCL payload field
    radar_enable: number;
    // biome-ignore lint/style/useNamingConvention: ZCL payload field
    lx_interval: number;
    // biome-ignore lint/style/useNamingConvention: ZCL payload field
    sht_interval: number;
    // biome-ignore lint/style/useNamingConvention: ZCL payload field
    lx_thread1: number;
    // biome-ignore lint/style/useNamingConvention: ZCL payload field
    lx_thread2: number;
    [key: string]: unknown;
};

type LinknlinkAirConfigStatusPayload = LinknlinkAirConfigPayload & {
    status: number;
};

interface LinknlinkAirConfig {
    attributes: {
        protocolVersion: number;
        freq: number;
        trith: number;
        absenceTimeout: number;
        radarEnable: boolean;
        lxInterval: number;
        shtInterval: number;
        lxThread1: number;
        lxThread2: number;
    };
    commands: {
        setConfig: LinknlinkAirConfigPayload;
        getConfig: Record<string, never>;
    };
    commandResponses: {
        configStatus: LinknlinkAirConfigStatusPayload;
        getConfigRsp: LinknlinkAirConfigStatusPayload;
    };
}

const toBuffer = (data: unknown): Buffer | null => {
    if (Buffer.isBuffer(data)) return data;
    if (data instanceof Uint8Array) return Buffer.from(data);
    if (
        data &&
        typeof data === "object" &&
        "type" in data &&
        (data as {type?: string}).type === "Buffer" &&
        Array.isArray((data as {data?: unknown}).data)
    ) {
        return Buffer.from((data as unknown as {data: number[]}).data);
    }
    if (Array.isArray(data)) return Buffer.from(data);
    if (data && typeof data === "object" && Buffer.isBuffer((data as {data?: unknown}).data)) {
        return (data as {data: Buffer}).data;
    }
    return null;
};

const actionFromIdOrStr = (actionId: unknown, actionStr: unknown): (typeof ACTIONS)[number] | undefined => {
    const id = Number(actionId);
    if (ACTION_BY_ID[id]) return ACTION_BY_ID[id];

    let str = actionStr;
    if (Buffer.isBuffer(str) || str instanceof Uint8Array) {
        str = Buffer.from(str).toString("utf8");
    }
    if (typeof str === "string" && (ACTIONS as readonly string[]).includes(str)) {
        return str as (typeof ACTIONS)[number];
    }
    return undefined;
};

const decodeButtonAction = (msg: {data: unknown}): (typeof ACTIONS)[number] | undefined => {
    if (msg.data && typeof msg.data === "object" && !Buffer.isBuffer(msg.data) && (msg.data as {type?: string}).type !== "Buffer") {
        const data = msg.data as KeyValueAny;
        const action = actionFromIdOrStr(data.action_id ?? data.actionId, data.action_str ?? data.actionStr);
        if (action) return action;
    }

    const buf = toBuffer(msg.data);
    if (!buf || buf.length < 2) return undefined;

    let action = actionFromIdOrStr(buf[0], buf.length >= 2 + buf[1] ? buf.subarray(2, 2 + buf[1]).toString("utf8") : undefined);
    if (action) return action;

    // Manufacturer-specific ZCL frame: [fc][mfgLo][mfgHi][seq][cmd][payload...]
    if (buf.length >= 7 && buf[0] & 0x04) {
        const cmd = buf[4];
        const actionId = buf[5];
        const strLen = buf[6];
        const str = buf.length >= 7 + strLen ? buf.subarray(7, 7 + strLen).toString("utf8") : undefined;
        if (cmd === 0x00) {
            action = actionFromIdOrStr(actionId, str);
            if (action) return action;
        }
    }

    // Non-mfg frame fallback: [fc][seq][cmd][payload...]
    if (buf.length >= 5 && !(buf[0] & 0x04)) {
        const cmd = buf[2];
        const actionId = buf[3];
        const strLen = buf[4];
        const str = buf.length >= 5 + strLen ? buf.subarray(5, 5 + strLen).toString("utf8") : undefined;
        if (cmd === 0x00) {
            action = actionFromIdOrStr(actionId, str);
            if (action) return action;
        }
    }

    return undefined;
};

const decodeAirPayloadFields = (buf: Buffer, offset: number): KeyValueAny | undefined => {
    // layout from offset:
    // ver u8, mask u16le, freq u8, trith u8, absence u16le, radar u8,
    // lxInterval u16le, shtInterval u16le, lxThread1 u16le, lxThread2 u16le
    if (buf.length < offset + 16) return undefined;
    return {
        protocol_version: buf.readUInt8(offset + 0),
        freq: buf.readUInt8(offset + 3),
        trith: buf.readUInt8(offset + 4),
        absence_timeout: buf.readUInt16LE(offset + 5),
        radar_enable: buf.readUInt8(offset + 7) === 1,
        lx_interval: buf.readUInt16LE(offset + 8),
        sht_interval: buf.readUInt16LE(offset + 10),
        lx_thread1: buf.readUInt16LE(offset + 12),
        lx_thread2: buf.readUInt16LE(offset + 14),
    };
};

const decodeAirConfigMessage = (msg: {data: unknown}): KeyValueAny | undefined => {
    if (msg.data && typeof msg.data === "object" && !Buffer.isBuffer(msg.data) && (msg.data as {type?: string}).type !== "Buffer") {
        const d = msg.data as KeyValueAny;
        if (
            d.freq !== undefined ||
            d.trith !== undefined ||
            d.format_version !== undefined ||
            d.protocol_version !== undefined ||
            d.status !== undefined
        ) {
            const out: KeyValueAny = {};
            if (d.status !== undefined) out.config_status = d.status;
            if (d.format_version !== undefined || d.protocol_version !== undefined) {
                out.protocol_version = d.format_version ?? d.protocol_version;
            }
            if (d.freq !== undefined) out.freq = d.freq;
            if (d.trith !== undefined) out.trith = d.trith;
            if (d.absence_timeout !== undefined) out.absence_timeout = d.absence_timeout;
            if (d.radar_enable !== undefined) out.radar_enable = d.radar_enable === true || d.radar_enable === 1;
            if (d.lx_interval !== undefined) out.lx_interval = d.lx_interval;
            if (d.sht_interval !== undefined) out.sht_interval = d.sht_interval;
            if (d.lx_thread1 !== undefined) out.lx_thread1 = d.lx_thread1;
            if (d.lx_thread2 !== undefined) out.lx_thread2 = d.lx_thread2;
            return out;
        }
    }

    const buf = toBuffer(msg.data);
    if (!buf) return undefined;

    // Response payload only: [status][16-byte config]
    if (buf.length === 17) {
        const fields = decodeAirPayloadFields(buf, 1);
        if (!fields) return undefined;
        return {config_status: buf[0], ...fields};
    }

    // Full ZCL mfg frame: [fc][mfgLo][mfgHi][seq][cmd][payload...]
    if (buf.length >= 5 + 17 && buf[0] & 0x04) {
        const cmd = buf[4];
        if (cmd === 0x81 || cmd === 0x82) {
            const payload = buf.subarray(5);
            if (payload.length >= 17) {
                const fields = decodeAirPayloadFields(payload, 1);
                if (!fields) return undefined;
                return {config_status: payload[0], ...fields};
            }
        }
    }

    return undefined;
};

const airFromAttrs = (msg: {data: KeyValueAny}): KeyValueAny | undefined => {
    const d = msg.data || {};
    const out: KeyValueAny = {};
    if (d.protocolVersion !== undefined || d["0"] !== undefined || d[0] !== undefined) {
        out.protocol_version = d.protocolVersion ?? d["0"] ?? d[0];
    }
    if (d.freq !== undefined || d["1"] !== undefined || d[1] !== undefined) out.freq = d.freq ?? d["1"] ?? d[1];
    if (d.trith !== undefined || d["2"] !== undefined || d[2] !== undefined) out.trith = d.trith ?? d["2"] ?? d[2];
    if (d.absenceTimeout !== undefined || d["3"] !== undefined || d[3] !== undefined) {
        out.absence_timeout = d.absenceTimeout ?? d["3"] ?? d[3];
    }
    if (d.radarEnable !== undefined || d["4"] !== undefined || d[4] !== undefined) {
        const v = d.radarEnable ?? d["4"] ?? d[4];
        out.radar_enable = v === true || v === 1;
    }
    if (d.lxInterval !== undefined || d["5"] !== undefined || d[5] !== undefined) {
        out.lx_interval = d.lxInterval ?? d["5"] ?? d[5];
    }
    if (d.shtInterval !== undefined || d["6"] !== undefined || d[6] !== undefined) {
        out.sht_interval = d.shtInterval ?? d["6"] ?? d[6];
    }
    if (d.lxThread1 !== undefined || d["7"] !== undefined || d[7] !== undefined) {
        out.lx_thread1 = d.lxThread1 ?? d["7"] ?? d[7];
    }
    if (d.lxThread2 !== undefined || d["8"] !== undefined || d[8] !== undefined) {
        out.lx_thread2 = d.lxThread2 ?? d["8"] ?? d[8];
    }
    return Object.keys(out).length ? out : undefined;
};

const currentAirState = (meta: {state?: KeyValueAny}): Record<AirKey, number | boolean> => {
    const s = meta.state || {};
    const out: Record<AirKey, number | boolean> = {...AIR_DEFAULTS};
    for (const k of AIR_KEYS) {
        if (s[k] !== undefined && s[k] !== null) out[k] = s[k] as number | boolean;
    }
    out.radar_enable = out.radar_enable === true || out.radar_enable === 1 || String(out.radar_enable).toUpperCase() === "ON";
    return out;
};

const buildSetPayload = (state: Record<AirKey, number | boolean>, mask: number) => ({
    format_version: 0x01,
    mask,
    freq: Number(state.freq),
    trith: Number(state.trith),
    absence_timeout: Number(state.absence_timeout),
    radar_enable: state.radar_enable ? 1 : 0,
    lx_interval: Number(state.lx_interval),
    sht_interval: Number(state.sht_interval),
    lx_thread1: Number(state.lx_thread1),
    lx_thread2: Number(state.lx_thread2),
});

const validateLocal = (key: AirKey, value: number | boolean, state: Record<AirKey, number | boolean>) => {
    switch (key) {
        case "freq":
            if (Number(value) < 0 || Number(value) > 4) throw new Error("freq must be 0..4");
            break;
        case "trith":
            if (Number(value) < 1 || Number(value) > 10) throw new Error("trith must be 1..10");
            break;
        case "absence_timeout":
            if (Number(value) < 0 || Number(value) > 510) throw new Error("absence_timeout must be 0..510");
            break;
        case "radar_enable":
            break;
        case "lx_interval":
            if (Number(value) < 2 || Number(value) > 60000) throw new Error("lx_interval must be 2..60000");
            break;
        case "sht_interval":
            if (Number(value) < 10 || Number(value) > 60000) throw new Error("sht_interval must be 10..60000");
            break;
        case "lx_thread1":
        case "lx_thread2": {
            const t1 = key === "lx_thread1" ? Number(value) : Number(state.lx_thread1);
            const t2 = key === "lx_thread2" ? Number(value) : Number(state.lx_thread2);
            if (t2 <= t1) throw new Error("lx_thread2 must be > lx_thread1");
            break;
        }
    }
};

const fzLocal = {
    legacy_button_toggle: {
        cluster: "genOnOff",
        type: ["commandToggle"],
        convert: () => ({action: "single"}),
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandToggle"]>,
    legacy_button_on: {
        cluster: "genOnOff",
        type: ["commandOn"],
        convert: () => ({action: "double"}),
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOn"]>,
    legacy_button_off: {
        cluster: "genOnOff",
        type: ["commandOff"],
        convert: () => ({action: "triple"}),
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOff"]>,
    legacy_button_hold: {
        cluster: "genLevelCtrl",
        type: ["commandMove"],
        convert: (model, msg) => (msg.data.movemode === 0 ? {action: "hold"} : undefined),
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["commandMove"]>,
    legacy_button_release: {
        cluster: "genLevelCtrl",
        type: ["commandStop"],
        convert: () => ({action: "release"}),
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["commandStop"]>,
    button_action: {
        cluster: "linknlinkButtonAction",
        type: ["commandButtonAction", "raw"],
        convert: (model, msg) => {
            const action = decodeButtonAction(msg);
            return action ? {action} : undefined;
        },
    } satisfies Fz.Converter<"linknlinkButtonAction", LinknlinkButtonAction, ["commandButtonAction", "raw"]>,
    button_action_numeric: {
        cluster: 0xfc01,
        type: ["commandButtonAction", "raw"],
        convert: (model, msg) => {
            const action = decodeButtonAction(msg);
            return action ? {action} : undefined;
        },
    } satisfies Fz.Converter<0xfc01, LinknlinkButtonAction, ["commandButtonAction", "raw"]>,
    air_config: {
        cluster: "linknlinkAirConfig",
        type: ["commandConfigStatus", "commandGetConfigRsp", "attributeReport", "readResponse", "raw"],
        convert: (model, msg) => {
            if (msg.type === "attributeReport" || msg.type === "readResponse") {
                return airFromAttrs(msg as {data: KeyValueAny});
            }
            return decodeAirConfigMessage(msg);
        },
    } satisfies Fz.Converter<
        "linknlinkAirConfig",
        LinknlinkAirConfig,
        ["commandConfigStatus", "commandGetConfigRsp", "attributeReport", "readResponse", "raw"]
    >,
    air_config_numeric: {
        cluster: 0xfc00,
        type: ["commandConfigStatus", "commandGetConfigRsp", "attributeReport", "readResponse", "raw"],
        convert: (model, msg) => {
            if (msg.type === "attributeReport" || msg.type === "readResponse") {
                return airFromAttrs(msg as {data: KeyValueAny});
            }
            return decodeAirConfigMessage(msg);
        },
    } satisfies Fz.Converter<0xfc00, LinknlinkAirConfig, ["commandConfigStatus", "commandGetConfigRsp", "attributeReport", "readResponse", "raw"]>,
};

const tzLocal = {
    air_config: {
        key: AIR_KEYS,
        convertSet: async (entity, key, value, meta) => {
            const airKey = key as AirKey;
            const state = currentAirState(meta);
            let next: number | boolean = value as number | boolean;
            if (airKey === "radar_enable") {
                next = value === true || value === 1 || value === "ON" || value === "on";
            } else {
                next = Number(value);
            }
            validateLocal(airKey, next, {...state, [airKey]: next});
            state[airKey] = next;

            // If either lux threshold changes, include both bits so firmware can
            // validate t2 > t1 against the intended pair.
            let mask = AIR_MASK[airKey];
            if (airKey === "lx_thread1" || airKey === "lx_thread2") {
                mask = AIR_MASK.lx_thread1 | AIR_MASK.lx_thread2;
            }

            const payload = buildSetPayload(state, mask);
            // Sleepy ED: press the key first to open a short fast-poll window.
            try {
                await entity.command<"linknlinkAirConfig", "setConfig", LinknlinkAirConfig>("linknlinkAirConfig", "setConfig", payload, {
                    ...MFC,
                    disableDefaultResponse: true,
                    disableResponse: true,
                    timeout: 40000,
                });
            } catch {
                // Request may remain queued until the device polls again.
                // Keep optimistic state; CONFIG_STATUS / GET_CONFIG_RSP will correct it.
            }
            return {state: {[airKey]: next}};
        },
        convertGet: async (entity) => {
            await entity.command<"linknlinkAirConfig", "getConfig", LinknlinkAirConfig>("linknlinkAirConfig", "getConfig", {}, MFC);
        },
    } satisfies Tz.Converter,
};

const airExposes = [
    e.numeric("freq", ea.ALL).withValueMin(0).withValueMax(4).withValueStep(1).withDescription("Radar frequency band index (0..4)"),
    e.numeric("trith", ea.ALL).withValueMin(1).withValueMax(10).withValueStep(1).withDescription("Radar trigger threshold (1..10)"),
    e
        .numeric("absence_timeout", ea.ALL)
        .withValueMin(0)
        .withValueMax(510)
        .withValueStep(2)
        .withUnit("s")
        .withDescription("Absence timeout / HOLD time in seconds (0..510, 2s steps)"),
    e.binary("radar_enable", ea.ALL, true, false).withDescription("Enable mmWave radar sensing"),
    e
        .numeric("lx_interval", ea.ALL)
        .withValueMin(2)
        .withValueMax(60000)
        .withValueStep(1)
        .withUnit("s")
        .withDescription("Illuminance sample interval"),
    e
        .numeric("sht_interval", ea.ALL)
        .withValueMin(10)
        .withValueMax(60000)
        .withValueStep(1)
        .withUnit("s")
        .withDescription("Temperature/humidity sample interval"),
    e
        .numeric("lx_thread1", ea.ALL)
        .withValueMin(0)
        .withValueMax(65535)
        .withValueStep(1)
        .withDescription("Illuminance threshold 1 (must be < lx_thread2)"),
    e
        .numeric("lx_thread2", ea.ALL)
        .withValueMin(0)
        .withValueMax(65535)
        .withValueStep(1)
        .withDescription("Illuminance threshold 2 (must be > lx_thread1)"),
];

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "eMotion Air", manufacturerName: "LinknLink"}],
        model: "eMotion Air",
        vendor: "LinknLink",
        description: "Battery-powered mmWave presence multi-sensor",
        fromZigbee: [
            fzLocal.legacy_button_toggle,
            fzLocal.legacy_button_on,
            fzLocal.legacy_button_off,
            fzLocal.legacy_button_hold,
            fzLocal.legacy_button_release,
            fzLocal.button_action,
            fzLocal.button_action_numeric,
            fzLocal.air_config,
            fzLocal.air_config_numeric,
        ],
        toZigbee: [tzLocal.air_config],
        extend: [
            m.deviceAddCustomCluster("linknlinkButtonAction", {
                name: "linknlinkButtonAction",
                ID: 0xfc01,
                manufacturerCode: MANUFACTURER_CODE,
                attributes: {},
                commands: {
                    buttonAction: {
                        ID: 0x00,
                        name: "buttonAction",
                        parameters: [
                            {name: "action_id", type: Zcl.DataType.UINT8},
                            {name: "action_str", type: Zcl.DataType.CHAR_STR},
                        ],
                    },
                },
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("linknlinkAirConfig", {
                name: "linknlinkAirConfig",
                ID: 0xfc00,
                manufacturerCode: MANUFACTURER_CODE,
                attributes: {
                    protocolVersion: {ID: 0x0000, name: "protocolVersion", type: Zcl.DataType.UINT8},
                    freq: {ID: 0x0001, name: "freq", type: Zcl.DataType.UINT8},
                    trith: {ID: 0x0002, name: "trith", type: Zcl.DataType.UINT8},
                    absenceTimeout: {ID: 0x0003, name: "absenceTimeout", type: Zcl.DataType.UINT16},
                    radarEnable: {ID: 0x0004, name: "radarEnable", type: Zcl.DataType.BOOLEAN},
                    lxInterval: {ID: 0x0005, name: "lxInterval", type: Zcl.DataType.UINT16},
                    shtInterval: {ID: 0x0006, name: "shtInterval", type: Zcl.DataType.UINT16},
                    lxThread1: {ID: 0x0007, name: "lxThread1", type: Zcl.DataType.UINT16},
                    lxThread2: {ID: 0x0008, name: "lxThread2", type: Zcl.DataType.UINT16},
                },
                commands: {
                    setConfig: {
                        ID: 0x01,
                        name: "setConfig",
                        parameters: [
                            {name: "format_version", type: Zcl.DataType.UINT8},
                            {name: "mask", type: Zcl.DataType.UINT16},
                            {name: "freq", type: Zcl.DataType.UINT8},
                            {name: "trith", type: Zcl.DataType.UINT8},
                            {name: "absence_timeout", type: Zcl.DataType.UINT16},
                            {name: "radar_enable", type: Zcl.DataType.UINT8},
                            {name: "lx_interval", type: Zcl.DataType.UINT16},
                            {name: "sht_interval", type: Zcl.DataType.UINT16},
                            {name: "lx_thread1", type: Zcl.DataType.UINT16},
                            {name: "lx_thread2", type: Zcl.DataType.UINT16},
                        ],
                    },
                    getConfig: {
                        ID: 0x02,
                        name: "getConfig",
                        parameters: [],
                    },
                },
                commandsResponse: {
                    configStatus: {
                        ID: 0x81,
                        name: "configStatus",
                        parameters: [
                            {name: "status", type: Zcl.DataType.UINT8},
                            {name: "format_version", type: Zcl.DataType.UINT8},
                            {name: "mask", type: Zcl.DataType.UINT16},
                            {name: "freq", type: Zcl.DataType.UINT8},
                            {name: "trith", type: Zcl.DataType.UINT8},
                            {name: "absence_timeout", type: Zcl.DataType.UINT16},
                            {name: "radar_enable", type: Zcl.DataType.UINT8},
                            {name: "lx_interval", type: Zcl.DataType.UINT16},
                            {name: "sht_interval", type: Zcl.DataType.UINT16},
                            {name: "lx_thread1", type: Zcl.DataType.UINT16},
                            {name: "lx_thread2", type: Zcl.DataType.UINT16},
                        ],
                    },
                    getConfigRsp: {
                        ID: 0x82,
                        name: "getConfigRsp",
                        parameters: [
                            {name: "status", type: Zcl.DataType.UINT8},
                            {name: "format_version", type: Zcl.DataType.UINT8},
                            {name: "mask", type: Zcl.DataType.UINT16},
                            {name: "freq", type: Zcl.DataType.UINT8},
                            {name: "trith", type: Zcl.DataType.UINT8},
                            {name: "absence_timeout", type: Zcl.DataType.UINT16},
                            {name: "radar_enable", type: Zcl.DataType.UINT8},
                            {name: "lx_interval", type: Zcl.DataType.UINT16},
                            {name: "sht_interval", type: Zcl.DataType.UINT16},
                            {name: "lx_thread1", type: Zcl.DataType.UINT16},
                            {name: "lx_thread2", type: Zcl.DataType.UINT16},
                        ],
                    },
                },
            }),
            m.quirkAddEndpointCluster({
                endpointID: 1,
                inputClusters: ["linknlinkAirConfig", "linknlinkButtonAction"],
            }),
            m.temperature(),
            m.humidity(),
            m.illuminance(),
            m.occupancy(),
            m.battery(),
        ],
        configure: async (device) => {
            const ep = device.getEndpoint(1);
            if (!ep) return;
            // Sleepy end device may answer on next poll / after a key press.
            try {
                await ep.command<"linknlinkAirConfig", "getConfig", LinknlinkAirConfig>("linknlinkAirConfig", "getConfig", {}, MFC);
            } catch {
                try {
                    await ep.read<"linknlinkAirConfig", LinknlinkAirConfig>(
                        "linknlinkAirConfig",
                        ["freq", "trith", "absenceTimeout", "radarEnable", "lxInterval", "shtInterval", "lxThread1", "lxThread2"],
                        MFC,
                    );
                } catch {
                    // ignore
                }
            }
        },
        onEvent: async (event) => {
            if (event.type !== "deviceAnnounce" && event.type !== "start") return;
            const ep = event.data.device.getEndpoint(1);
            if (!ep) return;
            try {
                await ep.command<"linknlinkAirConfig", "getConfig", LinknlinkAirConfig>("linknlinkAirConfig", "getConfig", {}, MFC);
            } catch {
                // sleepy devices may NAK until next poll
            }
        },
        exposes: [e.action([...ACTIONS]), ...airExposes],
    },
];
