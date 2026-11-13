import {createCipheriv, createDecipheriv, randomBytes, randomInt} from "node:crypto";
import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValue, Tz, Zh} from "../lib/types";

const NS = "zhc:intelbras";
const e = exposes.presets;
const ea = exposes.access;

// Older encrypted Tuya lock protocol: base key -> session key handshake, then AES-128-ECB encrypted datapoints.
type Payload = {payload: Buffer};
interface IntelbrasLockCluster {
    attributes: never;
    commands: {
        dataRequest: Payload;
        baseKey: Payload;
        sessionKey: Payload;
        logReport: Payload;
        syncTime: Payload;
        gatewayStatus: Payload;
    };
    commandResponses: {
        dataResponse: Payload;
        report: Payload;
        baseKey: Payload;
        sessionKey: Payload;
        logReport: Payload;
    };
}

const commands = Object.fromEntries(
    Object.entries({
        dataRequest: 0x00,
        dataResponse: 0x01,
        report: 0x02,
        baseKey: 0x21,
        sessionKey: 0x22,
        logReport: 0x23,
        syncTime: 0x24,
        gatewayStatus: 0x25,
    }).map(([name, Id]) => [name, {name, ID: Id, parameters: [{name: "payload", type: Zcl.BuffaloZclDataType.BUFFER}]}]),
);

interface LockMeta {
    phase: "base" | "session" | "ready";
    baseKey: string;
    nonce: string;
    key?: string;
    sequence: number;
    replay: number;
    authKey: string;
}

const be16 = (value: number) => Buffer.from([value >> 8, value & 0xff]);
const be32 = (value: number) => {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(value);
    return b;
};
const point = (dp: number, type: number, value: Buffer) => Buffer.concat([Buffer.from([dp, type]), be16(value.length), value]);
const aes = (decipher: boolean, key: Buffer, data: Buffer) => {
    const c = decipher ? createDecipheriv("aes-128-ecb", key, null) : createCipheriv("aes-128-ecb", key, null);
    return Buffer.concat([c.update(data), c.final()]);
};
const uuidKey = (device: Zh.Device) => Buffer.from(device.ieeeAddr.replace("0x", ""), "ascii");
const state = (device: Zh.Device) => device.meta.intelbrasLock as LockMeta;
const nextSequence = (s: LockMeta) => {
    s.sequence = s.sequence >= 65000 ? 1 : s.sequence + 1;
    return be16(s.sequence);
};

async function send(device: Zh.Device, command: keyof IntelbrasLockCluster["commands"], plain: Buffer, key?: Buffer) {
    const s = state(device);
    s.replay = s.replay >= 65000 ? 1 : s.replay + 1;
    // Persist counters before transmitting so they are never reused after a restart.
    device.save();
    const tail = Buffer.concat([be32(Math.floor(Date.now() / 1000)), be16(s.replay)]);
    const payload = aes(false, key ?? Buffer.from(s.key, "hex"), Buffer.concat([plain, tail]));
    await device
        .getEndpoint(1)
        .command<"intelbrasLock", keyof IntelbrasLockCluster["commands"], IntelbrasLockCluster>(
            "intelbrasLock",
            command,
            {payload},
            {disableDefaultResponse: true, disableResponse: true, sendPolicy: "immediate"},
        );
}

async function startSession(device: Zh.Device) {
    const previous = device.meta.intelbrasLock as LockMeta | undefined;
    const s: LockMeta = {
        phase: "base",
        baseKey: randomBytes(16).toString("hex"),
        nonce: randomBytes(4).toString("hex"),
        sequence: previous?.sequence ?? 1,
        replay: previous?.replay ?? 1,
        authKey: previous?.authKey ?? randomInt(100_000_000).toString().padStart(8, "0"),
    };
    device.meta.intelbrasLock = s;
    await send(device, "baseKey", Buffer.concat([nextSequence(s), point(86, 0, Buffer.from(s.baseKey, "hex"))]), uuidKey(device));
}

const fzLock: Fz.Converter<
    "intelbrasLock",
    IntelbrasLockCluster,
    ["commandDataResponse", "commandReport", "commandBaseKey", "commandSessionKey", "commandLogReport"]
> = {
    cluster: "intelbrasLock",
    type: ["commandDataResponse", "commandReport", "commandBaseKey", "commandSessionKey", "commandLogReport"],
    convert: async (model, msg, publish, options, meta) => {
        const s = state(msg.device);
        if (!s) return;
        const payload = Buffer.from(msg.data.payload);
        if (msg.type === "commandBaseKey" || msg.type === "commandSessionKey") {
            if (msg.type === "commandBaseKey" && s.phase === "base") {
                if (aes(true, uuidKey(msg.device), payload)[2] !== 86) return;
                s.phase = "session";
                await send(
                    msg.device,
                    "sessionKey",
                    Buffer.concat([nextSequence(s), point(85, 0, Buffer.from(s.nonce, "hex"))]),
                    Buffer.from(s.baseKey, "hex"),
                );
            } else if (msg.type === "commandSessionKey" && s.phase === "session") {
                const plain = aes(true, Buffer.from(s.baseKey, "hex"), payload);
                if (plain.length !== 10 || plain[2] !== 85) return;
                s.key = Buffer.concat([Buffer.from(s.nonce, "hex"), plain.subarray(6, 10), Buffer.from("tuya22ff")]).toString("hex");
                s.phase = "ready";
                const utc = Math.floor(Date.now() / 1000);
                await send(msg.device, "syncTime", Buffer.concat([nextSequence(s), be32(utc), be32(utc - new Date().getTimezoneOffset() * 60)]));
                await send(msg.device, "gatewayStatus", Buffer.concat([nextSequence(s), Buffer.from([1])]));
                // Register remote authorization (DP48): flag, key ID 1, validity window, max uses, 8 digit key.
                const auth = Buffer.alloc(21);
                auth[0] = 1;
                auth.writeUInt16BE(1, 1);
                auth.writeUInt32BE(utc - 300, 3);
                auth.writeUInt32BE(Math.min(utc + 4 * 365 * 86400, 0x7fffffff), 7);
                auth.writeUInt16BE(0xffff, 11);
                Buffer.from(s.authKey, "ascii").copy(auth, 13);
                await send(msg.device, "dataRequest", Buffer.concat([nextSequence(s), point(48, 0, auth)]));
                logger.info("Encrypted session established", NS);
            }
            return;
        }
        if (s.phase !== "ready") return;
        let plain: Buffer;
        try {
            plain = aes(true, Buffer.from(s.key, "hex"), payload);
        } catch {
            logger.warning("Failed to decrypt frame, renegotiating session", NS);
            await startSession(msg.device);
            return;
        }
        const log = msg.type === "commandLogReport";
        if (log) await send(msg.device, "logReport", plain.subarray(0, 7));
        const result: KeyValue = {};
        for (let offset = log ? 7 : 2; offset + 4 <= plain.length; ) {
            const [dp, type] = [plain[offset], plain[offset + 1]];
            const value = plain.subarray(offset + 4, offset + 4 + plain.readUInt16BE(offset + 2));
            offset += 4 + value.length;
            if (log && type === 2 && [1, 2, 41].includes(dp)) {
                result.action = {1: "access_fingerprint", 2: "access_pin", 41: "access_remote"}[dp];
            } else if (!log && dp === 57) result.state = value[0] ? "UNLOCK" : "LOCK";
            else if (!log && dp === 10) result.battery = value.readUInt32BE();
            else if (!log && dp === 19) result.sound_volume = String(value[0]);
            else if (!log && (dp === 48 || dp === 49) && value[0] !== 0) logger.warning(`DP${dp} rejected by lock (status ${value[0]})`, NS);
        }
        return result;
    },
};

const tzLock: Tz.Converter = {
    key: ["state", "sound_volume"],
    convertSet: async (entity, key, value, meta) => {
        const s = state(meta.device);
        if (s?.phase !== "ready") throw new Error("No encrypted session, wake up the lock and reconfigure");
        if (key === "state") {
            const target = String(value).toUpperCase();
            const control = Buffer.concat([Buffer.from([target === "UNLOCK" ? 1 : 0]), be16(1), Buffer.from(s.authKey, "ascii"), be16(1)]);
            await send(meta.device, "dataRequest", Buffer.concat([nextSequence(s), point(49, 0, control)]));
        } else {
            await send(meta.device, "dataRequest", Buffer.concat([nextSequence(s), point(19, 4, Buffer.from([Number(value)]))]));
        }
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "TY0A01", manufacturerName: "_TYST12_snr3p274"}],
        model: "IFR 7001",
        vendor: "Intelbras",
        description: "Smart mortise door lock",
        extend: [
            m.deviceAddCustomCluster("intelbrasLock", {name: "intelbrasLock", ID: 0xef00, attributes: {}, commands, commandsResponse: commands}),
            // Must run after the custom cluster has been added.
            {configure: [startSession], isModernExtend: true},
        ],
        fromZigbee: [fzLock],
        toZigbee: [tzLock],
        exposes: [
            new exposes.Lock().withState("state", "LOCK", "UNLOCK", "State of the lock", ea.STATE_SET),
            e.battery(),
            e.enum("sound_volume", ea.STATE_SET, ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]).withDescription("Volume level (0 = mute)"),
            e.action(["access_fingerprint", "access_pin", "access_remote"]),
        ],
    },
];
