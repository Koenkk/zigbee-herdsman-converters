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

interface CredentialRequest {
    type: "pin" | "fingerprint";
    // biome-ignore lint/style/useNamingConvention: MQTT property name
    member_id: number;
    administrator: boolean;
    // biome-ignore lint/style/useNamingConvention: MQTT property name
    credential_id?: number;
}
interface CredentialOperation {
    action: "enroll" | "delete";
    request: CredentialRequest;
    sequence: number;
    responseSequence?: number;
    assignedId?: number;
    cancelSequence?: number;
    previousSequences: Set<number>;
    publish: Tz.Meta["publish"];
    timer: ReturnType<typeof setTimeout>;
}

// Only in-flight operations and recent response sequences; the lock owns all users and credential IDs.
const credentials = new Map<string, CredentialOperation>();
const credentialSequences = new Map<string, Set<number>>();
const credentialKinds = {pin: 1, fingerprint: 3};
const credentialErrors: Record<number, string> = {
    0: "timeout",
    1: "rejected",
    2: "duplicate",
    3: "capacity",
    4: "invalid_pin",
    5: "pin_length",
    6: "invalid_type",
    7: "busy",
    8: "busy",
    254: "not_found",
};

function clearCredential(ieeeAddr: string) {
    const op = credentials.get(ieeeAddr);
    if (op) clearTimeout(op.timer);
    credentials.delete(ieeeAddr);
    return op;
}

function interruptCredential(ieeeAddr: string) {
    clearCredential(ieeeAddr)?.publish({credential_status: "interrupted", credential_error: "interrupted"});
}

function credentialRequest(action: "enroll" | "delete", value: unknown): CredentialRequest {
    const input = value as CredentialRequest;
    const allowed = ["type", "member_id", "administrator", ...(action === "delete" ? ["credential_id"] : [])];
    if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.keys(input).some((k) => !allowed.includes(k)) ||
        !Object.hasOwn(credentialKinds, input.type) ||
        !Number.isInteger(input.member_id) ||
        input.member_id < 1 ||
        input.member_id > 999 ||
        (input.administrator !== undefined && typeof input.administrator !== "boolean") ||
        (action === "delete" && (!Number.isInteger(input.credential_id) || input.credential_id < 1 || input.credential_id > 998))
    ) {
        throw new Error("Invalid credential request; deletion requires exactly one credential ID (1-998)");
    }
    return {...input, administrator: input.administrator ?? false};
}

function credentialReply(device: Zh.Device, dp: number, sequence: number, value: Buffer): KeyValue {
    if (value.length !== 9 || ![1, 3].includes(value[0]) || value[2] > 1) return {};
    const type = value[0] === 1 ? "pin" : "fingerprint";
    const stage = value[1];
    const member = value.readUInt16BE(3);
    const id = value.readUInt16BE(5);
    if (
        member < 1 ||
        member > 999 ||
        id < 1 ||
        id > 999 ||
        (dp === 54 && ![0, 0xfc, 0xfd, 0xfe, 0xff].includes(stage)) ||
        (dp === 55 && (stage !== 0 || value[7] !== 1))
    )
        return {};
    const seen = credentialSequences.get(device.ieeeAddr) ?? new Set<number>();
    if (dp === 54) seen.add(sequence);
    while (seen.size > 64) seen.delete(seen.values().next().value);
    credentialSequences.set(device.ieeeAddr, seen);
    const op = credentials.get(device.ieeeAddr);
    if (op) {
        const r = op.request;
        if ((op.action === "enroll" ? 54 : 55) !== dp || r.type !== type || r.member_id !== member || r.administrator !== !!value[2]) return {};
        if (dp === 55) {
            if (sequence !== op.sequence || id !== r.credential_id) return {};
        } else {
            // Enrollment uses a lock-assigned sequence, not the request sequence. Bind it on the initial reply.
            if (op.previousSequences.has(sequence)) return {};
            if (stage === 0 && op.responseSequence === undefined && id !== 999) {
                op.responseSequence = sequence;
                op.assignedId = id;
            }
            const cancelled =
                stage === 0xfe &&
                op.cancelSequence !== undefined &&
                // Cancellation may use a fresh lock-assigned sequence with the allocation sentinel.
                (sequence === op.responseSequence || sequence === op.cancelSequence || id === 999) &&
                (id === 999 || id === op.assignedId);
            const rejected = stage === 0xfd && op.responseSequence === undefined;
            if (!cancelled && !rejected && (sequence !== op.responseSequence || id !== op.assignedId)) return {};
        }
    }
    const status =
        dp === 55
            ? value[8] === 0xff
                ? "success"
                : "failed"
            : ({0: "enrolling", 252: "enrolling", 253: "failed", 254: "cancelled", 255: "success"} as Record<number, string>)[stage];
    const result: KeyValue = {
        credential_operation: dp === 54 ? "enroll" : "delete",
        credential_status: status,
        credential_type: type,
        credential_member: member,
        credential_administrator: !!value[2],
        credential_id: id === 999 ? null : id,
        credential_code: value[8],
        credential_error:
            status !== "failed"
                ? "none"
                : dp === 54
                  ? (credentialErrors[value[8]] ?? "rejected")
                  : (({1: "not_found", 2: "protected"} as Record<number, string>)[value[8]] ?? "rejected"),
    };
    if (dp === 54) {
        if (stage === 0) Object.assign(result, {credential_total: value[7], credential_progress: 0});
        else if (stage === 0xfc || stage === 0xff) result.credential_progress = value[7];
    }
    if (op && ["success", "failed", "cancelled"].includes(status)) clearCredential(device.ieeeAddr);
    return result;
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
    interruptCredential(device.ieeeAddr);
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
            const length = plain.readUInt16BE(offset + 2);
            if (offset + 4 + length > plain.length) break;
            const value = plain.subarray(offset + 4, offset + 4 + length);
            offset += 4 + value.length;
            if (log && type === 2 && [1, 2, 41].includes(dp)) {
                result.action = {1: "access_fingerprint", 2: "access_pin", 41: "access_remote"}[dp];
            } else if (!log && dp === 57) result.state = value[0] ? "UNLOCK" : "LOCK";
            else if (!log && dp === 10) result.battery = value.readUInt32BE();
            else if (!log && dp === 19) result.sound_volume = String(value[0]);
            else if (!log && type === 0 && (dp === 54 || dp === 55))
                Object.assign(result, credentialReply(msg.device, dp, plain.readUInt16BE(), value));
            else if (!log && (dp === 48 || dp === 49) && value[0] !== 0) logger.warning(`DP${dp} rejected by lock (status ${value[0]})`, NS);
        }
        return result;
    },
};

const tzCredentials: Tz.Converter = {
    key: ["credential_enroll", "credential_delete", "credential_cancel"],
    convertSet: async (_entity, key, value, meta) => {
        if (!meta.device) throw new Error("Credential operations require a device");
        const device = meta.device;
        const s = state(device);
        if (s?.phase !== "ready") throw new Error("No encrypted session, wake up the lock and reconfigure");
        let op = credentials.get(device.ieeeAddr);
        if (key === "credential_cancel") {
            if (value !== "CANCEL" || op?.action !== "enroll" || op.cancelSequence !== undefined) throw new Error("No cancellable enrollment");
            op.cancelSequence = Number(nextSequence(s).readUInt16BE());
        } else {
            if (op) throw new Error("A credential operation is already active");
            const action = key === "credential_enroll" ? "enroll" : "delete";
            const request = credentialRequest(action, value);
            op = {
                action,
                request,
                sequence: nextSequence(s).readUInt16BE(),
                previousSequences: new Set(credentialSequences.get(device.ieeeAddr)),
                publish: meta.publish,
                timer: undefined,
            };
            const pending = op;
            op.timer = setTimeout(
                () => {
                    if (credentials.get(device.ieeeAddr) !== pending) return;
                    clearCredential(device.ieeeAddr);
                    pending.publish({credential_status: "timeout", credential_error: "timeout"});
                },
                action === "enroll" ? 90_000 : 15_000,
            );
            op.timer.unref?.();
            credentials.set(device.ieeeAddr, op);
            meta.publish({
                credential_operation: action,
                credential_status: "starting",
                credential_error: "none",
                credential_code: null,
                credential_type: request.type,
                credential_member: request.member_id,
                credential_administrator: request.administrator,
                credential_id: request.credential_id ?? null,
                credential_progress: 0,
                credential_total: 0,
            });
        }
        const r = op.request;
        const cancel = key === "credential_cancel";
        const payload = Buffer.concat([
            Buffer.from([credentialKinds[r.type], cancel ? 0xfe : 0, Number(r.administrator)]),
            be16(r.member_id),
            be16(op.action === "enroll" ? 999 : r.credential_id),
            ...(op.action === "delete" ? [Buffer.from([1])] : []),
        ]);
        try {
            await send(
                device,
                "dataRequest",
                Buffer.concat([be16(cancel ? op.cancelSequence : op.sequence), point(op.action === "enroll" ? 54 : 55, 0, payload)]),
            );
        } catch {
            // Delivery can be uncertain: keep tracking replies until timeout, never resend automatically.
            if (credentials.get(device.ieeeAddr) === op) op.publish({credential_status: "unknown", credential_error: "delivery"});
            throw new Error("Credential delivery uncertain; wait for a reply or timeout before retrying");
        }
    },
};

const tzLock: Tz.Converter = {
    key: ["state", "sound_volume"],
    convertSet: async (entity, key, value, meta) => {
        if (credentials.has(meta.device?.ieeeAddr)) throw new Error("A credential operation is active; wait for its result or cancel enrollment");
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
            {
                configure: [
                    async (device) => {
                        const s = state(device);
                        // Reconfiguring must not discard a working session; decryption failures still renegotiate via startSession.
                        if (s?.phase === "ready" && /^[0-9a-f]{32}$/i.test(s.key ?? "")) return;
                        await startSession(device);
                    },
                ],
                isModernExtend: true,
            },
        ],
        fromZigbee: [fzLock],
        toZigbee: [tzLock, tzCredentials],
        onEvent: (event) => {
            if (event.type === "stop") {
                interruptCredential(event.data.ieeeAddr);
                credentialSequences.delete(event.data.ieeeAddr);
            }
        },
        exposes: [
            new exposes.Lock().withState("state", "LOCK", "UNLOCK", "State of the lock", ea.STATE_SET),
            e.battery(),
            e.enum("sound_volume", ea.STATE_SET, ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]).withDescription("Volume level (0 = mute)"),
            e.action(["access_fingerprint", "access_pin", "access_remote"]),
            ...(["enroll", "delete"] as const).map((action) => {
                const form = new exposes.Composite(`credential_${action}`, `credential_${action}`, ea.SET)
                    .withDescription(
                        action === "enroll"
                            ? "Start enrollment, then enter PIN or present finger on the lock. No PIN is sent via MQTT."
                            : "Delete one credential using the member, role and ID reported by the lock.",
                    )
                    .withFeature(e.enum("type", ea.SET, ["pin", "fingerprint"]))
                    .withFeature(e.numeric("member_id", ea.SET).withValueMin(1).withValueMax(999))
                    .withFeature(e.binary("administrator", ea.SET, true, false));
                if (action === "delete") form.withFeature(e.numeric("credential_id", ea.SET).withValueMin(1).withValueMax(998));
                return form;
            }),
            e.enum("credential_cancel", ea.SET, ["CANCEL"]).withDescription("Cancel active enrollment; wait for the lock to confirm."),
            e.enum("credential_operation", ea.STATE, ["enroll", "delete"]),
            e.enum("credential_status", ea.STATE, ["starting", "enrolling", "success", "failed", "cancelled", "timeout", "interrupted", "unknown"]),
            e.enum("credential_error", ea.STATE, [
                "none",
                "timeout",
                "rejected",
                "not_found",
                "protected",
                "duplicate",
                "capacity",
                "invalid_pin",
                "pin_length",
                "invalid_type",
                "busy",
                "interrupted",
                "delivery",
            ]),
            e.enum("credential_type", ea.STATE, ["pin", "fingerprint"]),
            e.numeric("credential_member", ea.STATE).withValueMin(1).withValueMax(999),
            e
                .numeric("credential_id", ea.STATE)
                .withValueMin(1)
                .withValueMax(998)
                .withDescription("ID reported by the lock; no local user database."),
            e.binary("credential_administrator", ea.STATE, true, false),
            e.numeric("credential_progress", ea.STATE).withValueMin(0).withValueMax(255),
            e.numeric("credential_total", ea.STATE).withValueMin(0).withValueMax(255),
            e.numeric("credential_code", ea.STATE).withValueMin(0).withValueMax(255).withDescription("Last result code reported by the lock."),
        ],
    },
];
