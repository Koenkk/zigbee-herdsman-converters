import {Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import * as exposes from "./exposes";
import {logger} from "./logger";
import * as globalStore from "./store";
import type {Fz, Tz, Zh} from "./types";

const NS = "zhc:zosung";
const ea = exposes.access;
const e = exposes.presets;

interface ZosungIrTransmit {
    attributes: never;
    commands: {
        zosungSendIRCode00: {
            seq: number;
            length: number;
            unk1: number;
            unk2: number;
            unk3: number;
            cmd: number;
            unk4: number;
        };
        zosungSendIRCode01: {
            zero: number;
            seq: number;
            length: number;
            unk1: number;
            unk2: number;
            unk3: number;
            cmd: number;
            unk4: number;
        };
        zosungSendIRCode02: {
            seq: number;
            position: number;
            maxlen: number;
        };
        zosungSendIRCode03: {
            zero: number;
            seq: number;
            position: number;
            msgpart: Buffer;
            msgpartcrc: number;
        };
        zosungSendIRCode04: {
            zero0: number;
            seq: number;
            zero1: number;
        };
        zosungSendIRCode05: {
            seq: number;
            zero: number;
        };
    };
    commandResponses: {
        zosungSendIRCode03Resp: {
            zero: number;
            seq: number;
            position: number;
            msgpart: Buffer;
            msgpartcrc: number;
        };
        zosungSendIRCode05Resp: {
            seq: number;
            zero: number;
        };
    };
}

interface ZosungIrControl {
    attributes: never;
    commands: {
        zosungControlIRCommand00: {
            data: Buffer;
        };
    };
    commandResponses: never;
}

interface ZosungIRMessage {
    // biome-ignore lint/style/useNamingConvention: required by protocol schema
    key_num?: number;
    delay?: number;
    key1?: {
        num?: number;
        freq?: number;
        type?: number;
        // biome-ignore lint/style/useNamingConvention: required by protocol schema
        key_code?: string;
    };
    // biome-ignore lint/style/useNamingConvention: required by protocol schema
    key_code?: string;
    num?: number;
    freq?: number;
    type?: number;
}

type InfraredSignal = {
    timings?: number[];
    modulation?: number;
    // biome-ignore lint/style/useNamingConvention: required by protocol schema
    repeat_count?: number;
};

export const zosungExtend = {
    addZosungIRTransmitCluster: () =>
        m.deviceAddCustomCluster("zosungIRTransmit", {
            name: "zosungIRTransmit",
            ID: 0xed00,
            attributes: {},
            commands: {
                zosungSendIRCode00: {
                    name: "zosungSendIRCode00",
                    ID: 0x00,
                    parameters: [
                        {name: "seq", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "length", type: Zcl.DataType.UINT32, max: 0xffffffff},
                        {name: "unk1", type: Zcl.DataType.UINT32, max: 0xffffffff},
                        {name: "unk2", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "unk3", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "cmd", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "unk4", type: Zcl.DataType.UINT16, max: 0xffff},
                    ],
                },
                zosungSendIRCode01: {
                    name: "zosungSendIRCode01",
                    ID: 0x01,
                    parameters: [
                        {name: "zero", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "seq", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "length", type: Zcl.DataType.UINT32, max: 0xffffffff},
                        {name: "unk1", type: Zcl.DataType.UINT32, max: 0xffffffff},
                        {name: "unk2", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "unk3", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "cmd", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "unk4", type: Zcl.DataType.UINT16, max: 0xffff},
                    ],
                },
                zosungSendIRCode02: {
                    name: "zosungSendIRCode02",
                    ID: 0x02,
                    parameters: [
                        {name: "seq", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "position", type: Zcl.DataType.UINT32, max: 0xffffffff},
                        {name: "maxlen", type: Zcl.DataType.UINT8, max: 0xff},
                    ],
                },
                zosungSendIRCode03: {
                    name: "zosungSendIRCode03",
                    ID: 0x03,
                    parameters: [
                        {name: "zero", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "seq", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "position", type: Zcl.DataType.UINT32, max: 0xffffffff},
                        {name: "msgpart", type: Zcl.DataType.OCTET_STR},
                        {name: "msgpartcrc", type: Zcl.DataType.UINT8, max: 0xff},
                    ],
                },
                zosungSendIRCode04: {
                    name: "zosungSendIRCode04",
                    ID: 0x04,
                    parameters: [
                        {name: "zero0", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "seq", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "zero1", type: Zcl.DataType.UINT16, max: 0xffff},
                    ],
                },
                zosungSendIRCode05: {
                    name: "zosungSendIRCode05",
                    ID: 0x05,
                    parameters: [
                        {name: "seq", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "zero", type: Zcl.DataType.UINT16, max: 0xffff},
                    ],
                },
            },
            commandsResponse: {
                zosungSendIRCode03Resp: {
                    name: "zosungSendIRCode03Resp",
                    ID: 0x03,
                    parameters: [
                        {name: "zero", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "seq", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "position", type: Zcl.DataType.UINT32, max: 0xffffffff},
                        {name: "msgpart", type: Zcl.DataType.OCTET_STR},
                        {name: "msgpartcrc", type: Zcl.DataType.UINT8, max: 0xff},
                    ],
                },
                zosungSendIRCode05Resp: {
                    name: "zosungSendIRCode05Resp",
                    ID: 0x05,
                    parameters: [
                        {name: "seq", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "zero", type: Zcl.DataType.UINT16, max: 0xffff},
                    ],
                },
            },
        }),
    addZosungIRControlCluster: () =>
        m.deviceAddCustomCluster("zosungIRControl", {
            name: "zosungIRControl",
            ID: 0xe004,
            attributes: {},
            commands: {
                zosungControlIRCommand00: {
                    name: "zosungControlIRCommand00",
                    ID: 0x00,
                    parameters: [
                        // JSON string with a command.
                        {name: "data", type: Zcl.BuffaloZclDataType.BUFFER},
                    ],
                },
            },
            commandsResponse: {},
        }),
};

function nextSeq(entity: Zh.Endpoint | Zh.Group) {
    return (globalStore.getValue(entity, "seq", -1) + 1) % 0x10000;
}

function messagesGet(entity: Zh.Endpoint | Zh.Group, seq: number) {
    const info = globalStore.getValue(entity, "irMessageInfo");
    const expected = info?.seq || 0;
    if (expected !== seq) {
        throw new Error(`Unexpected sequence value (expected: ${expected} current: ${seq}).`);
    }
    if (info) {
        return info.data;
    }
    logger.debug("Ignoring, no message send yet", NS);
}

function messagesSet(entity: Zh.Endpoint | Zh.Group, seq: number, data: unknown) {
    globalStore.putValue(entity, "irMessageInfo", {seq: seq, data: data});
}

function messagesClear(entity: Zh.Endpoint | Zh.Group, seq: number) {
    const info = globalStore.getValue(entity, "irMessageInfo");
    const expected = info?.seq || 0;
    if (expected !== seq) {
        throw new Error(`Unexpected sequence value (expected: ${expected} current: ${seq}).`);
    }
    globalStore.clearValue(entity, "irMessageInfo");
}

function calcArrayCrc(values: Buffer) {
    return Array.from(values).reduce((a, b) => a + b, 0) % 0x100;
}

function calcStringCrc(str: string) {
    return (
        str
            .split("")
            .map((x) => x.charCodeAt(0))
            .reduce((a, b) => a + b, 0) % 0x100
    );
}

function encodeTuyaTimings(timings: number[]): string {
    const rawBytes = new Uint8Array(timings.length * 2);

    for (let i = 0; i < timings.length; i++) {
        const v = Math.abs(Math.trunc(Number(timings[i])));

        if (!Number.isFinite(v) || v > 0xffff) {
            throw new Error(`Invalid timing at index ${i}: ${timings[i]}`);
        }

        rawBytes[i * 2] = v & 0xff;
        rawBytes[i * 2 + 1] = (v >> 8) & 0xff;
    }

    const compressed = [];
    let pos = 0;

    while (pos < rawBytes.length) {
        const chunkLen = Math.min(32, rawBytes.length - pos);
        compressed.push((chunkLen - 1) & 0x1f);

        for (let i = 0; i < chunkLen; i++) {
            compressed.push(rawBytes[pos + i]);
        }

        pos += chunkLen;
    }

    return Buffer.from(Uint8Array.from(compressed)).toString("base64");
}

function buildIrMsgFromTimings(obj: InfraredSignal) {
    const timings = obj.timings ?? [];
    const modulation = obj.modulation ?? 38000;
    const repeatCount = obj.repeat_count ?? 0;

    if (!Array.isArray(timings) || timings.length === 0) {
        throw new Error("timings must be a non-empty array");
    }

    if (typeof modulation !== "number" || modulation <= 30000) {
        throw new Error("Invalid modulation frequency");
    }

    const encoded = encodeTuyaTimings(timings);

    return JSON.stringify({
        key_num: 1,
        delay: 300,
        key1: {
            num: 1 + repeatCount,
            freq: modulation,
            type: 1,
            key_code: encoded,
        },
    });
}

function normalizeIrMsg(value: InfraredSignal | ZosungIRMessage | string) {
    if (value === undefined || value === null || value === "") {
        throw new Error("IR code payload is empty");
    }

    // Object input.
    if (typeof value === "object" && "timings" in value) {
        if (Array.isArray(value.timings)) {
            return buildIrMsgFromTimings(value);
        }

        // Already full Zosung-style object.
        const zozung_value = <ZosungIRMessage>value;
        if (zozung_value.key_num !== undefined && zozung_value.key1 !== undefined) {
            return JSON.stringify(value);
        }

        // Direct key_code object.
        if (zozung_value.key_code !== undefined) {
            return JSON.stringify({
                key_num: 1,
                delay: zozung_value.delay ?? 300,
                key1: {
                    num: zozung_value.num ?? 1,
                    freq: zozung_value.freq ?? 38000,
                    type: zozung_value.type ?? 1,
                    key_code: zozung_value.key_code,
                },
            });
        }

        return JSON.stringify(value);
    }

    if (typeof value !== "string") {
        value = String(value);
    }

    const trimmed = value.trim();

    if (!trimmed) {
        throw new Error("IR code payload is empty");
    }

    // JSON string input.
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
            const parsed = JSON.parse(trimmed);

            if (parsed && typeof parsed === "object") {
                if (Array.isArray(parsed.timings)) {
                    return buildIrMsgFromTimings(parsed);
                }

                if (parsed.key_num !== undefined && parsed.key1 !== undefined) {
                    return JSON.stringify(parsed);
                }

                if (parsed.key_code !== undefined) {
                    return JSON.stringify({
                        key_num: 1,
                        delay: parsed.delay ?? 300,
                        key1: {
                            num: parsed.num ?? 1,
                            freq: parsed.freq ?? 38000,
                            type: parsed.type ?? 1,
                            key_code: parsed.key_code,
                        },
                    });
                }
            }
        } catch (err) {
            logger.debug(`JSON parse failed, treating as captured key_code: ${err}`, NS);
        }
    }

    // Fallback:
    // Captured base64 strings like H4IKjQP7... are key_code only,
    // not full Zosung messages. Wrap them.
    return JSON.stringify({
        key_num: 1,
        delay: 300,
        key1: {
            num: 1,
            freq: 38000,
            type: 1,
            key_code: trimmed,
        },
    });
}

function decodeTuyaTimings(compressed: number[]): number[] {
    const decompressed: number[] = [];
    let pos = 0;

    try {
        while (pos < compressed.length) {
            const header = compressed[pos++];
            const blockType = header >> 5;

            if (blockType === 0) {
                // Literal block
                const length = (header & 0x1f) + 1;
                for (let i = 0; i < length; i++) {
                    if (pos >= compressed.length) throw new Error("Truncated literal");
                    decompressed.push(compressed[pos++]);
                }
            } else {
                // Reference block
                let length = blockType + 2;
                if (length === 9) {
                    // extended length: accumulate 255 bytes per 0xFF then a remainder
                    while (pos < compressed.length && compressed[pos] === 0xff) {
                        length += 255;
                        pos++;
                    }
                    if (pos >= compressed.length) throw new Error("Truncated extended length");
                    length += compressed[pos++];
                }
                if (pos >= compressed.length) throw new Error("Truncated distance");
                const distance = (((header & 0x1f) << 8) | compressed[pos++]) >>> 0;
                const offset = distance + 1;
                for (let i = 0; i < length; i++) {
                    const idx = decompressed.length - offset;
                    if (idx < 0) throw new Error("Invalid reference offset");
                    decompressed.push(decompressed[idx]);
                }
            }
        }
    } catch {
        // truncated or malformed stream: stop decoding and continue with what we have
    }

    // Interpret decompressed bytes as little-endian 16-bit unsigned values
    const numTimings = Math.floor(decompressed.length / 2);
    if (numTimings === 0) return [];

    const timings = new Array(numTimings);
    for (let i = 0; i < numTimings; i++) {
        const lo = decompressed[i * 2];
        const hi = decompressed[i * 2 + 1];
        const val = (hi << 8) | lo;
        // alternate sign: even index positive, odd index negative
        timings[i] = i % 2 === 0 ? val : -val;
    }
    return timings;
}

export const fzZosung = {
    zosung_send_ir_code_01: {
        cluster: "zosungIRTransmit",
        type: ["commandZosungSendIRCode01"],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code01" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            const irMsg = messagesGet(msg.endpoint, seq);
            if (irMsg) {
                logger.debug(`IRCode to send: ${JSON.stringify(irMsg)} (seq:${seq})`, NS);
            }
        },
    } satisfies Fz.Converter<"zosungIRTransmit", ZosungIrTransmit, ["commandZosungSendIRCode01"]>,
    zosung_send_ir_code_02: {
        cluster: "zosungIRTransmit",
        type: ["commandZosungSendIRCode02"],
        convert: async (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code02" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            const position = msg.data.position;
            const irMsg = messagesGet(msg.endpoint, seq);
            if (irMsg) {
                const part = irMsg.substring(position, position + 0x32);
                const sum = calcStringCrc(part);
                await msg.endpoint.command<"zosungIRTransmit", "zosungSendIRCode03", ZosungIrTransmit>(
                    "zosungIRTransmit",
                    "zosungSendIRCode03",
                    {
                        zero: 0,
                        seq: seq,
                        position: position,
                        msgpart: Buffer.from(part),
                        msgpartcrc: sum,
                    },
                    {disableDefaultResponse: true},
                );
                logger.debug(`Sent IRCode part: ${part} (sum: ${sum}, seq:${seq})`, NS);
            }
        },
    } satisfies Fz.Converter<"zosungIRTransmit", ZosungIrTransmit, ["commandZosungSendIRCode02"]>,
    zosung_send_ir_code_04: {
        cluster: "zosungIRTransmit",
        type: ["commandZosungSendIRCode04"],
        convert: async (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code04" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            await msg.endpoint.command<"zosungIRTransmit", "zosungSendIRCode05", ZosungIrTransmit>(
                "zosungIRTransmit",
                "zosungSendIRCode05",
                {
                    seq: seq,
                    zero: 0,
                },
                {disableDefaultResponse: true},
            );
            messagesClear(msg.endpoint, seq);
            logger.debug(`IRCode has been successfully sent. (seq:${seq})`, NS);
        },
    } satisfies Fz.Converter<"zosungIRTransmit", ZosungIrTransmit, ["commandZosungSendIRCode04"]>,
    zosung_send_ir_code_00: {
        cluster: "zosungIRTransmit",
        type: ["commandZosungSendIRCode00"],
        convert: async (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code00" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            const length = msg.data.length;
            messagesSet(msg.endpoint, seq, {position: 0, buf: Buffer.alloc(length)});
            await msg.endpoint.command<"zosungIRTransmit", "zosungSendIRCode01", ZosungIrTransmit>(
                "zosungIRTransmit",
                "zosungSendIRCode01",
                {
                    zero: 0,
                    seq: seq,
                    length: length,
                    unk1: msg.data.unk1,
                    unk2: msg.data.unk2,
                    unk3: msg.data.unk3,
                    cmd: msg.data.cmd,
                    unk4: msg.data.unk4,
                },
                {disableDefaultResponse: true},
            );
            logger.debug(`"IR-Message-Code00" response sent.`, NS);
            await msg.endpoint.command<"zosungIRTransmit", "zosungSendIRCode02", ZosungIrTransmit>(
                "zosungIRTransmit",
                "zosungSendIRCode02",
                {
                    seq: msg.data.seq,
                    position: 0,
                    maxlen: 0x38,
                },
                {disableDefaultResponse: true},
            );
            logger.debug(`"IR-Message-Code00" transfer started.`, NS);
        },
    } satisfies Fz.Converter<"zosungIRTransmit", ZosungIrTransmit, ["commandZosungSendIRCode00"]>,
    zosung_send_ir_code_03: {
        cluster: "zosungIRTransmit",
        type: ["commandZosungSendIRCode03Resp"],
        convert: async (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code03" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            const rcv = messagesGet(msg.endpoint, seq);
            if (rcv) {
                if (rcv.position === msg.data.position) {
                    const rcvMsgPart = msg.data.msgpart;
                    const sum = calcArrayCrc(rcvMsgPart);
                    const expectedPartCrc = msg.data.msgpartcrc;
                    if (sum === expectedPartCrc) {
                        const position = rcvMsgPart.copy(rcv.buf, rcv.position);
                        rcv.position += position;
                        if (rcv.position < rcv.buf.length) {
                            await msg.endpoint.command<"zosungIRTransmit", "zosungSendIRCode02", ZosungIrTransmit>(
                                "zosungIRTransmit",
                                "zosungSendIRCode02",
                                {
                                    seq: seq,
                                    position: rcv.position,
                                    maxlen: 0x38,
                                },
                                {disableDefaultResponse: true},
                            );
                        } else {
                            await msg.endpoint.command<"zosungIRTransmit", "zosungSendIRCode04", ZosungIrTransmit>(
                                "zosungIRTransmit",
                                "zosungSendIRCode04",
                                {
                                    zero0: 0,
                                    seq: seq,
                                    zero1: 0,
                                },
                                {disableDefaultResponse: true},
                            );
                        }
                        logger.debug(`${rcvMsgPart.length} bytes received.`, NS);
                    } else {
                        logger.error(`Invalid msg part CRC: ${sum} expecting: ${expectedPartCrc}.`, NS);
                    }
                } else {
                    logger.error(`Unexpected IR code position: ${JSON.stringify(msg.data)}, expecting: ${rcv.position}.`, NS);
                }
            }
        },
    } satisfies Fz.Converter<"zosungIRTransmit", ZosungIrTransmit, ["commandZosungSendIRCode03Resp"]>,
    zosung_send_ir_code_05: {
        cluster: "zosungIRTransmit",
        type: ["commandZosungSendIRCode05Resp"],
        convert: async (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code05" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            const rcv = messagesGet(msg.endpoint, seq);
            if (rcv) {
                const learnedIRCode = rcv.buf.toString("base64");
                const learnedTimings = decodeTuyaTimings(rcv.buf);
                logger.debug(`Received: ${learnedIRCode}`, NS);
                messagesClear(msg.endpoint, seq);
                await msg.endpoint.command<"zosungIRControl", "zosungControlIRCommand00", ZosungIrControl>(
                    "zosungIRControl",
                    "zosungControlIRCommand00",
                    {
                        data: Buffer.from(JSON.stringify({study: 1})),
                    },
                    {disableDefaultResponse: true},
                );
                return {
                    learned_ir_code: learnedIRCode,
                    learned_ir_timings: {
                        modulation: 38000,
                        timings: learnedTimings,
                        timestamp: Date.now(),
                    },
                };
            }
        },
    } satisfies Fz.Converter<"zosungIRTransmit", ZosungIrTransmit, ["commandZosungSendIRCode05Resp"]>,
};

export const tzZosung = {
    zosung_ir_code_to_send: {
        key: ["ir_code_to_send", "ir_emitter"],
        convertSet: async (entity, key, value, meta) => {
            const irMsg = normalizeIrMsg(value);

            logger.debug(`Sending IR code: ${irMsg}`, NS);

            const seq = nextSeq(entity);
            messagesSet(entity, seq, irMsg);
            await entity.command<"zosungIRTransmit", "zosungSendIRCode00", ZosungIrTransmit>(
                "zosungIRTransmit",
                "zosungSendIRCode00",
                {
                    seq: seq,
                    length: irMsg.length,
                    unk1: 0x00000000,
                    unk2: 0xe004,
                    unk3: 0x01,
                    cmd: 0x02,
                    unk4: 0x0000,
                },
                {disableDefaultResponse: true},
            );
            logger.debug("Sending IR code initiated.", NS);
        },
    } satisfies Tz.Converter,
    zosung_learn_ir_code: {
        key: ["learn_ir_code"],
        convertSet: async (entity, key, value, meta) => {
            logger.debug("Starting IR Code Learning...", NS);
            await entity.command<"zosungIRControl", "zosungControlIRCommand00", ZosungIrControl>(
                "zosungIRControl",
                "zosungControlIRCommand00",
                {
                    data: Buffer.from(JSON.stringify({study: 0})),
                },
                {disableDefaultResponse: true},
            );
            logger.debug("IR Code Learning started.", NS);
        },
    } satisfies Tz.Converter,
};

export const presetsZosung = {
    learn_ir_code: () => e.binary("learn_ir_code", ea.SET, "ON", "OFF").withDescription("Turn on to learn new IR code"),
    learned_ir_code: () => e.text("learned_ir_code", ea.STATE).withDescription("The IR code learned by device"),
    learned_ir_timings: () =>
        e
            .text("learned_ir_timings", ea.STATE)
            .withDescription("The IR timings learned by device")
            .withHomeAssistant({type: "infrared", schema: "receiver"}),
    ir_code_to_send: () => e.text("ir_code_to_send", ea.SET).withDescription("The IR code or timings to send by device"),
    ir_emitter: () =>
        e
            .text("ir_emitter", ea.SET)
            .withDescription("The IR code or timings to send by device")
            .withHomeAssistant({type: "infrared", schema: "emitter"}),
};
