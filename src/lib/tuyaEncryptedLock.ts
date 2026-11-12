import {createCipheriv, createDecipheriv, randomBytes} from "node:crypto";
import {Zcl} from "zigbee-herdsman";
import * as exposes from "./exposes";
import {logger} from "./logger";
import {
    type AuthorizationSnapshot,
    authorizationPolicy,
    deviceAuthorizationStore,
    encodeRemoteLockAuthorization,
    generateRemoteLockAuthorization,
    type RemoteAuthorizationPolicy,
    type RemoteLockAuthorization,
} from "./tuyaLockAuthorization";
import {deviceSessionStore, type SessionSnapshot, validateSessionSnapshot} from "./tuyaLockSession";
import {type EncryptedLockPacket, sendEncryptedLockPackets} from "./tuyaLockTransport";
import type {DefinitionWithExtend, KeyValue, Zh} from "./types";

interface Packet extends EncryptedLockPacket {
    sequence?: number;
}
interface Point {
    id: number;
    type: number;
    value: Buffer;
}
interface CredentialRequest {
    type: "pin" | "fingerprint";
    // biome-ignore lint/style/useNamingConvention: public MQTT property.
    member_id: number;
    administrator?: boolean;
    // biome-ignore lint/style/useNamingConvention: public MQTT property.
    credential_id?: number;
}
interface CredentialEvent {
    dp: number;
    sequence: number;
    type: string;
    stage: number;
    administrator: boolean;
    memberId: number;
    credentialId: number;
    progress?: number;
    status: number;
}
interface SessionResult {
    state: KeyValue;
    outgoing: Packet[];
    gatewayStatus?: {sequence: number; status: number};
    confirmations?: {dp: number; sequence: number; status: number; keyId: number}[];
    credentialEvents?: CredentialEvent[];
    volumeReport?: {sequence: number; level: string};
}
interface Deferred {
    promise: Promise<Error | undefined>;
    settle: (error?: Error) => void;
}
interface Operation {
    kind?: string;
    dp?: number;
    target?: string;
    keyId?: number;
    sequence: number;
    done: Deferred;
    acknowledged?: boolean;
    reported?: boolean;
    level?: string;
    action?: string;
    request?: CredentialRequest;
    previousSequences?: Set<number>;
    responseSequence?: number;
    credentialId?: number;
    cancelRequested?: boolean;
    publicState?: KeyValue;
}
interface SessionOptions {
    random?: (size: number) => Buffer;
    now?: () => number;
    timezoneOffset?: () => number;
}
export interface ControllerOptions {
    session?: LockSession;
    send?: (endpoint: Zh.Endpoint, packets: Packet[]) => Promise<void>;
    sessionTimeout?: number;
    commandTimeout?: number;
    enrollmentTimeout?: number;
    clock?: () => number;
    stateStore?: ReturnType<typeof deviceSessionStore>;
    authorizationStore?: ReturnType<typeof deviceAuthorizationStore>;
    now?: () => number;
    generateAuthorization?: typeof generateRemoteLockAuthorization;
}

// Observed on TY0A01/_TYST12_snr3p274. This is the older Tuya 0x21/0x22 protocol.
// Never log the decoded buffer: some reports contain credentials or key material.
const NS = "zhc:ifr7001";
export const clusterName = "ifr7001Tuya";
const commands = Object.fromEntries(
    Object.entries({
        dataRequest: 0x00,
        dataResponse: 0x01,
        report: 0x02,
        versionRequest: 0x10,
        versionResponse: 0x11,
        dynamicKeyRequest: 0x20,
        baseKey: 0x21,
        sessionKey: 0x22,
        logReport: 0x23,
        syncTime: 0x24,
        gatewayStatus: 0x25,
        gatewayStatusAck: 0x26,
    }).map(([name, Id]) => [name, {name, ID: Id, parameters: [{name: "payload", type: Zcl.BuffaloZclDataType.BUFFER}]}]),
);
export const clusterDefinition = {name: clusterName, ID: 0xef00, attributes: {}, commands, commandsResponse: commands};
const commandTypes = Object.keys(commands).map((name) => `command${name[0].toUpperCase()}${name.slice(1)}`);
const idsByType = Object.fromEntries(Object.entries(commands).map(([name, {ID}]) => [`command${name[0].toUpperCase()}${name.slice(1)}`, ID]));
const be16 = (value: number) => {
    const b = Buffer.alloc(2);
    b.writeUInt16BE(value);
    return b;
};
const be32 = (value: number) => {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(value);
    return b;
};
export function encrypt(plain: Buffer, key: Buffer) {
    const cipher = createCipheriv("aes-128-ecb", key, null);
    return Buffer.concat([cipher.update(plain), cipher.final()]);
}
export function decrypt(payload: Buffer, key: Buffer) {
    if (!Buffer.isBuffer(payload) || !payload.length || payload.length % 16 || payload.length > 512) throw new Error("Invalid ciphertext size");
    const cipher = createDecipheriv("aes-128-ecb", key, null);
    return Buffer.concat([cipher.update(payload), cipher.final()]);
}
export function encodePoint(id: number, type: number, value: Buffer) {
    return Buffer.concat([Buffer.from([id, type]), be16(value.length), value]);
}
export function parsePoints(payload: Buffer, offset = 2): Point[] {
    if (payload.length < offset) throw new Error("Truncated header");
    const result = [];
    while (offset < payload.length) {
        if (offset + 4 > payload.length) throw new Error("Truncated datapoint");
        const id = payload[offset];
        const type = payload[offset + 1];
        const length = payload.readUInt16BE(offset + 2);
        offset += 4;
        if (
            type > 5 ||
            offset + length > payload.length ||
            ((type === 1 || type === 4) && length !== 1) ||
            (type === 2 && length !== 4) ||
            (type === 5 && ![1, 2, 4].includes(length))
        )
            throw new Error("Invalid datapoint");
        const value = payload.subarray(offset, offset + length);
        if (type === 1 && value[0] > 1) throw new Error("Invalid boolean");
        result.push({id, type, value});
        offset += length;
    }
    return result;
}
function decodeState(points: Point[], timestamped: boolean) {
    const state: KeyValue = {};
    for (const {id, type, value} of points) {
        // Only live DP57 drives state. DP8 may be a historical/retransmitted event.
        if (!timestamped && id === 57 && type === 1) state.state = value[0] ? "UNLOCK" : "LOCK";
        if (!timestamped && id === 10 && type === 2 && value.readUInt32BE() <= 100) state.battery = value.readUInt32BE();
        if (!timestamped && id === 19 && type === 4 && value[0] <= 9) state.sound_volume = String(value[0]);
        if (timestamped && type === 2 && [1, 2, 41].includes(id)) {
            state.action = ({1: "access_fingerprint", 2: "access_pin", 41: "access_remote"} as Record<number, string>)[id];
        }
    }
    return state;
}

const credentialKinds = {pin: 1, fingerprint: 3};
export function validateVolume(value: unknown) {
    if (!(typeof value === "string" && /^[0-9]$/.test(value)) && !(Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 9)) {
        throw new Error("IFR7001: volume must be an integer level from 0 (mute) to 9");
    }
    return String(value);
}
export function validateCredentialRequest(action: string, input: unknown): CredentialRequest {
    const value = input as Partial<CredentialRequest>;
    const allowed = action === "enroll" ? ["type", "member_id", "administrator"] : ["type", "member_id", "administrator", "credential_id"];
    if (
        !["enroll", "delete"].includes(action) ||
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.keys(value).some((k) => !allowed.includes(k)) ||
        !Object.hasOwn(credentialKinds, value.type) ||
        !Number.isInteger(value.member_id) ||
        value.member_id < 1 ||
        value.member_id > 999 ||
        (value.administrator !== undefined && typeof value.administrator !== "boolean") ||
        (action === "delete" && (!Number.isInteger(value.credential_id) || value.credential_id < 1 || value.credential_id > 998))
    ) {
        throw new Error("IFR7001: invalid credential fields; deletion requires one explicit credential ID");
    }
    return {
        type: value.type,
        member_id: value.member_id,
        administrator: value.administrator ?? false,
        ...(action === "delete" ? {credential_id: value.credential_id} : {}),
    };
}
function credentialEvents(points: Point[], sequence: number): CredentialEvent[] {
    return points
        .filter((p) => [54, 55].includes(p.id) && p.type === 0 && p.value.length === 9)
        .flatMap(({id, value: v}) => {
            const type = Object.keys(credentialKinds).find((k) => credentialKinds[k as keyof typeof credentialKinds] === v[0]);
            const memberId = v.readUInt16BE(3);
            const credentialId = v.readUInt16BE(5);
            if (
                !type ||
                v[2] > 1 ||
                memberId < 1 ||
                memberId > 999 ||
                credentialId < 1 ||
                credentialId > 999 ||
                (id === 54 && ![0, 0xfc, 0xfd, 0xfe, 0xff].includes(v[1])) ||
                (id === 55 && (v[1] !== 0 || v[7] !== 1))
            )
                return [];
            return [
                {
                    dp: id,
                    sequence,
                    type,
                    stage: v[1],
                    administrator: !!v[2],
                    memberId,
                    credentialId,
                    progress: id === 54 ? v[7] : undefined,
                    status: v[8],
                },
            ];
        });
}

export class LockSession {
    uuidKey: Buffer;
    random: (size: number) => Buffer;
    now: () => number;
    timezoneOffset: () => number;
    sequence: number;
    replaySequence: number;
    phase: "idle" | "base" | "session" | "ready";
    baseConfirmed: boolean;
    ieeeAddr: string;
    seen: Map<string, number>;
    baseKey?: Buffer;
    nonceA?: Buffer;
    key?: Buffer;
    baseSequence?: number;
    sessionSequence?: number;
    previousReady?: SessionSnapshot;
    startedAt?: number;

    constructor(
        ieeeAddr: string,
        {random = randomBytes, now = () => Date.now(), timezoneOffset = () => new Date().getTimezoneOffset()}: SessionOptions = {},
    ) {
        const uuid = ieeeAddr.replace(/^0x/i, "").toLowerCase();
        if (!/^[0-9a-f]{16}$/.test(uuid)) throw new Error("Invalid IEEE address");
        this.uuidKey = Buffer.from(uuid, "ascii");
        this.random = random;
        this.now = now;
        this.timezoneOffset = timezoneOffset;
        this.sequence = 1;
        this.replaySequence = 1;
        this.phase = "idle";
        this.baseConfirmed = false;
        this.ieeeAddr = `0x${uuid}`;
        this.seen = new Map();
    }
    nextSequence() {
        this.sequence = this.sequence >= 65000 ? 1 : this.sequence + 1;
        return this.sequence;
    }
    tail() {
        this.replaySequence = this.replaySequence >= 65000 ? 1 : this.replaySequence + 1;
        return Buffer.concat([be32(Math.floor(this.now() / 1000)), be16(this.replaySequence)]);
    }
    outgoing(command: string, plain: Buffer, key = this.key): Packet {
        return {command, payload: encrypt(Buffer.concat([plain, this.tail()]), key)};
    }
    start() {
        this.previousReady = undefined;
        this.baseConfirmed = false;
        this.baseKey = this.random(16);
        this.nonceA = this.random(4);
        this.key = undefined;
        this.seen.clear();
        this.baseSequence = this.nextSequence();
        this.phase = "base";
        this.startedAt = this.now();
        return this.outgoing("baseKey", Buffer.concat([be16(this.baseSequence), encodePoint(86, 0, this.baseKey)]), this.uuidKey);
    }
    rekey() {
        if (this.phase === "ready") this.previousReady = this.snapshot();
        if (!this.baseConfirmed || !this.baseKey) return this.start();
        this.nonceA = this.random(4);
        this.key = undefined;
        this.seen.clear();
        this.sessionSequence = this.nextSequence();
        this.phase = "session";
        this.startedAt = this.now();
        return this.outgoing("sessionKey", Buffer.concat([be16(this.sessionSequence), encodePoint(85, 0, this.nonceA)]), this.baseKey);
    }
    snapshot(): SessionSnapshot | undefined {
        if (!this.baseKey || !this.nonceA || this.phase === "idle") return undefined;
        return {
            version: 1,
            ieeeAddr: this.ieeeAddr,
            phase: this.phase,
            baseConfirmed: this.baseConfirmed,
            baseKey: this.baseKey.toString("hex"),
            nonceA: this.nonceA.toString("hex"),
            key: this.key?.toString("hex"),
            sequence: this.sequence,
            replaySequence: this.replaySequence,
            baseSequence: this.baseSequence,
            sessionSequence: this.sessionSequence,
            previous: this.previousReady,
        };
    }
    restore(state: unknown) {
        validateSessionSnapshot(state, this.ieeeAddr);
        this.previousReady = state.previous;
        this.phase = state.phase;
        this.baseConfirmed = state.baseConfirmed;
        this.baseKey = Buffer.from(state.baseKey, "hex");
        this.nonceA = Buffer.from(state.nonceA, "hex");
        this.key = state.phase === "ready" ? Buffer.from(state.key, "hex") : undefined;
        this.sequence = state.sequence;
        this.replaySequence = state.replaySequence;
        this.baseSequence = state.baseSequence;
        this.sessionSequence = state.sessionSequence;
        this.seen.clear();
    }
    rollback() {
        if (!this.previousReady) return false;
        const previous = this.previousReady;
        const sequence = this.sequence;
        const replaySequence = this.replaySequence;
        this.restore(previous);
        this.previousReady = undefined;
        // Counters reserved during an unsuccessful renewal must never be reused.
        this.sequence = sequence;
        this.replaySequence = replaySequence;
        return true;
    }
    gatewayStatus() {
        if (this.phase !== "ready") throw new Error("Session unavailable");
        const sequence = this.nextSequence();
        return {...this.outgoing("gatewayStatus", Buffer.concat([be16(sequence), Buffer.from([1])])), sequence};
    }
    authorization(authorization: RemoteLockAuthorization, policy: RemoteAuthorizationPolicy) {
        if (this.phase !== "ready") throw new Error("Session unavailable");
        const value = encodeRemoteLockAuthorization(authorization, policy, "ifr7001_observed");
        const sequence = this.nextSequence();
        return {...this.outgoing("dataRequest", Buffer.concat([be16(sequence), encodePoint(48, 0, value)])), sequence};
    }
    control(target: string, authorization: RemoteLockAuthorization) {
        if (this.phase !== "ready") throw new Error("Session unavailable");
        if (!["LOCK", "UNLOCK"].includes(target)) throw new Error("Unsupported lock command");
        const auth = validateAuthorization(authorization);
        const value = Buffer.concat([Buffer.from([target === "UNLOCK" ? 1 : 0]), be16(auth.keyId), auth.key, be16(1)]);
        const sequence = this.nextSequence();
        return {...this.outgoing("dataRequest", Buffer.concat([be16(sequence), encodePoint(49, 0, value)])), sequence};
    }
    credential(action: string, request: CredentialRequest, cancel = false) {
        if (this.phase !== "ready") throw new Error("Session unavailable");
        const input = validateCredentialRequest(action, request);
        if (cancel && action !== "enroll") throw new Error("IFR7001: invalid cancellation");
        const value = Buffer.concat([
            Buffer.from([credentialKinds[input.type], cancel ? 0xfe : 0, Number(input.administrator)]),
            be16(input.member_id),
            be16(action === "enroll" ? 999 : input.credential_id),
            ...(action === "delete" ? [Buffer.from([1])] : []),
        ]);
        const sequence = this.nextSequence();
        return {...this.outgoing("dataRequest", Buffer.concat([be16(sequence), encodePoint(action === "enroll" ? 54 : 55, 0, value)])), sequence};
    }
    volume(value: unknown) {
        const level = validateVolume(value);
        if (this.phase !== "ready") throw new Error("Session unavailable");
        const sequence = this.nextSequence();
        return {...this.outgoing("dataRequest", Buffer.concat([be16(sequence), encodePoint(19, 4, Buffer.from([Number(level)]))])), sequence};
    }
    handle(command: number, payload: Buffer): SessionResult {
        if (command === 0x11) return {state: {}, outgoing: []};
        if (command === 0x21 && this.phase === "base") {
            const plain = decrypt(payload, this.uuidKey);
            if (plain.length !== 6 || plain.readUInt16BE() !== this.baseSequence || plain[2] !== 86 || plain[3] !== 0 || plain.readUInt16BE(4) !== 0)
                throw new Error("Invalid base acknowledgement");
            this.baseConfirmed = true;
            this.sessionSequence = this.nextSequence();
            this.phase = "session";
            return {
                state: {},
                outgoing: [this.outgoing("sessionKey", Buffer.concat([be16(this.sessionSequence), encodePoint(85, 0, this.nonceA)]), this.baseKey)],
            };
        }
        if (command === 0x22 && this.phase === "session") {
            const plain = decrypt(payload, this.baseKey);
            if (
                plain.length !== 10 ||
                plain.readUInt16BE() !== this.sessionSequence ||
                plain[2] !== 85 ||
                plain[3] !== 0 ||
                plain.readUInt16BE(4) !== 4
            )
                throw new Error("Invalid session response");
            this.key = Buffer.concat([this.nonceA, plain.subarray(6, 10), Buffer.from("tuya22ff")]);
            this.previousReady = undefined;
            this.phase = "ready";
            const utc = Math.floor(this.now() / 1000);
            return {
                state: {},
                outgoing: [
                    this.outgoing("syncTime", Buffer.concat([be16(this.nextSequence()), be32(utc), be32(utc - this.timezoneOffset() * 60)])),
                    this.outgoing("gatewayStatus", Buffer.concat([be16(this.nextSequence()), Buffer.from([1])])),
                ],
            };
        }
        // Duplicated handshake frames must never be interpreted under the session key.
        if ([0x21, 0x22].includes(command)) return {state: {}, outgoing: []};
        if (this.phase !== "ready") throw new Error("Session unavailable");
        const plain = decrypt(payload, this.key);
        if (command === 0x20) return {state: {}, outgoing: []};
        if (command === 0x26) {
            if (plain.length !== 3) throw new Error("Invalid gateway status response");
            return {state: {}, outgoing: [], gatewayStatus: {sequence: plain.readUInt16BE(), status: plain[2]}};
        }
        if (command !== 0x01 && command !== 0x02 && command !== 0x23) return {state: {}, outgoing: []};
        const timestamped = command === 0x23;
        if (timestamped && (plain.length < 7 || plain[2] !== 0)) throw new Error("Unknown log envelope");
        const points = parsePoints(plain, timestamped ? 7 : 2);
        const outgoing = timestamped ? [this.outgoing("logReport", plain.subarray(0, 7))] : [];
        // A retry still needs its ACK, but must not repeat an access event.
        const dedup = `${command}:${payload.toString("hex")}`;
        const lastSeen = this.seen.get(dedup);
        const duplicate = lastSeen !== undefined && this.now() - lastSeen < 60000;
        this.seen.set(dedup, this.now());
        if (this.seen.size > 128) this.seen.delete(this.seen.keys().next().value);
        const confirmations = !timestamped
            ? points
                  .filter((p) => [48, 49].includes(p.id) && p.type === 0 && p.value.length === 3)
                  .map((p) => ({dp: p.id, sequence: plain.readUInt16BE(), status: p.value[0], keyId: p.value.readUInt16BE(1)}))
            : [];
        return {
            state: duplicate && timestamped ? {} : decodeState(points, timestamped),
            outgoing,
            confirmations,
            credentialEvents: timestamped ? [] : credentialEvents(points, plain.readUInt16BE()),
            volumeReport:
                !timestamped && points.some((p) => p.id === 19 && p.type === 4 && p.value[0] <= 9)
                    ? {sequence: plain.readUInt16BE(), level: String(points.find((p) => p.id === 19 && p.type === 4 && p.value[0] <= 9).value[0])}
                    : undefined,
        };
    }
}

export function validateAuthorization(auth: RemoteLockAuthorization) {
    if (!auth || !Number.isInteger(auth.keyId) || auth.keyId < 0 || auth.keyId > 65535) throw new Error("Remote authorization is invalid");
    const key = Buffer.isBuffer(auth.key)
        ? Buffer.from(auth.key)
        : typeof auth.key === "string" && /^[0-9a-f]{16}$/i.test(auth.key)
          ? Buffer.from(auth.key, "hex")
          : undefined;
    if (key?.length !== 8) throw new Error("Remote authorization is invalid");
    return {keyId: auth.keyId, key};
}
function deferred(timeout: number, message: string): Deferred {
    let complete: (error?: Error) => void;
    const promise = new Promise<Error | undefined>((resolve) => {
        complete = resolve;
    });
    let finished = false;
    const settle = (error?: Error) => {
        if (!finished) {
            finished = true;
            clearTimeout(timer);
            complete(error);
        }
    };
    const timer = setTimeout(() => settle(new Error(message)), timeout);
    return {promise, settle};
}
async function checked(promise: Promise<Error | undefined>) {
    const error = await promise;
    if (error) throw error;
}
export class LockController {
    device: Zh.Device;
    session: LockSession;
    store: ReturnType<typeof deviceSessionStore>;
    authorizationStore: ReturnType<typeof deviceAuthorizationStore>;
    now: () => number;
    generateAuthorization: typeof generateRemoteLockAuthorization;
    writeQueue: Promise<void>;
    send: (packets: Packet[]) => Promise<void>;
    sessionTimeout: number;
    commandTimeout: number;
    enrollmentTimeout: number;
    credentialSequences: Set<number>;
    clock: () => number;
    disposed: boolean;
    busy: boolean;
    onNetworkJoin: (event: {reason: string}) => void;
    initializing?: Promise<void>;
    ready?: Deferred;
    beganAt?: number;
    joining?: Promise<void>;
    lastNetworkJoin?: number;
    operation?: Operation;
    lastCommandAt?: number;
    warnedAt?: number;

    constructor(
        device: Zh.Device,
        {
            session = new LockSession(device.ieeeAddr),
            send = (endpoint, packets) => sendEncryptedLockPackets(endpoint, clusterName, packets),
            sessionTimeout = 8000,
            commandTimeout = 12000,
            enrollmentTimeout = 90000,
            clock = () => performance.now(),
            stateStore = deviceSessionStore(device),
            authorizationStore = deviceAuthorizationStore(device),
            now = Date.now,
            generateAuthorization = generateRemoteLockAuthorization,
        }: ControllerOptions = {},
    ) {
        this.authorizationStore = authorizationStore;
        this.now = now;
        this.generateAuthorization = generateAuthorization;
        this.device = device;
        this.session = session;
        this.store = stateStore;
        this.writeQueue = Promise.resolve();
        this.send = async (packets) => {
            // Reserve all counters on disk before a packet can reach the radio.
            const snapshot = this.session.snapshot();
            if (snapshot && ["base", "session", "ready"].includes(snapshot.phase)) {
                this.writeQueue = this.writeQueue.then(() => this.store.save(this.device.ieeeAddr, snapshot));
                await this.writeQueue;
            }
            if (this.disposed) throw new Error("IFR7001: controller stopped");
            await send(device.getEndpoint(1), packets);
        };
        this.sessionTimeout = sessionTimeout;
        this.commandTimeout = commandTimeout;
        this.enrollmentTimeout = enrollmentTimeout;
        this.credentialSequences = new Set();
        this.clock = clock;
        this.disposed = false;
        this.busy = false;
        // Herdsman omits deviceJoined for an already registered device, but
        // emits this per-device event for every actual network join.
        this.onNetworkJoin = (event) => {
            if (event.reason !== "deviceJoined" || this.disposed) return;
            this.joinedNetwork().catch(() => logger.warning("IFR7001: network join negotiation failed (contents omitted)", NS));
        };
        this.device.on?.("lastSeenChanged", this.onNetworkJoin);
    }
    async initialize() {
        this.initializing ??= (async () => {
            const snapshot = await this.store.load(this.device.ieeeAddr);
            if (this.disposed) throw new Error("IFR7001: controller stopped");
            if (snapshot) {
                this.session.restore(snapshot);
                logger.info("IFR7001: private protocol state restored", NS);
            }
        })();
        await this.initializing;
    }
    async begin(_force = false) {
        await this.initialize();
        if (this.disposed) throw new Error("IFR7001: controller stopped");
        this.device.addCustomCluster(clusterName, clusterDefinition);
        if (this.session.phase === "ready") return;
        if (this.ready && this.clock() - this.beganAt < this.sessionTimeout && this.session.phase !== "idle") return;
        this.cancelCommand(new Error("IFR7001: session changed; command cancelled"));
        this.ready?.settle(new Error("IFR7001: session replaced"));
        this.ready = deferred(this.sessionTimeout, "IFR7001: session timeout; wake the lock and retry explicitly");
        this.beganAt = this.clock();
        try {
            await this.send([this.session.baseConfirmed ? this.session.rekey() : this.session.start()]);
        } catch {
            this.session.phase = "idle";
            this.session.key = undefined;
            this.ready.settle(new Error("IFR7001: session delivery failed; wake the lock and retry explicitly"));
            logger.warning("IFR7001: session delivery failed; lock asleep or unreachable", NS);
        }
    }
    joinedNetwork() {
        if (this.joining !== undefined) return this.joining;
        if (this.lastNetworkJoin !== undefined && this.clock() - this.lastNetworkJoin < 2000) return Promise.resolve();
        this.lastNetworkJoin = this.clock();
        this.joining = this.resetForNetworkJoin().finally(() => {
            this.joining = undefined;
        });
        return this.joining;
    }
    async resetForNetworkJoin() {
        await this.initialize();
        if (this.disposed) throw new Error("IFR7001: controller stopped");
        logger.info("IFR7001: actual network join; negotiating fresh session", NS);
        this.cancelCommand(new Error("IFR7001: new network join; command cancelled"));
        this.ready?.settle(new Error("IFR7001: new network join"));
        this.ready = undefined;
        this.session.phase = "idle";
        this.session.key = undefined;
        this.session.baseConfirmed = false;
        const authorization = await this.authorizationStore.load(this.device.ieeeAddr);
        if (authorization) await this.authorizationStore.save(this.device.ieeeAddr, {...authorization, stage: "prepared"});
        await this.begin();
    }
    async ensureReady() {
        await this.initialize();
        if (this.disposed) throw new Error("IFR7001: controller stopped");
        if (this.session.phase === "ready") return;
        await this.begin();
        await checked(this.ready.promise);
        if (this.disposed || String(this.session.phase) !== "ready") throw new Error("IFR7001: session unavailable");
    }
    cancelCommand(error: Error) {
        this.operation?.done.settle(error);
        this.operation = undefined;
    }
    stop() {
        this.device.off?.("lastSeenChanged", this.onNetworkJoin);
        this.disposed = true;
        this.ready?.settle(new Error("IFR7001: controller stopped"));
        this.cancelCommand(new Error("IFR7001: controller stopped"));
        this.session.key = undefined;
        this.session.phase = "idle";
    }
    async receive(command: number, payload: Buffer) {
        await this.initialize();
        if (this.disposed) return {};
        this.device.addCustomCluster(clusterName, clusterDefinition);
        let result: SessionResult;
        const wasReady = this.session.phase === "ready";
        try {
            result = this.session.handle(command, payload);
        } catch {
            if (this.clock() - (this.warnedAt ?? Number.NEGATIVE_INFINITY) >= 30000) {
                this.warnedAt = this.clock();
                logger.warning("IFR7001: protocol frame rejected (contents omitted); recovering session", NS);
            }
            this.cancelCommand(new Error("IFR7001: session lost; command cancelled"));
            // Recover on traffic after a restart or power loss, without retaining actuator commands.
            if (!this.ready || this.clock() - this.beganAt >= this.sessionTimeout || wasReady) {
                this.session.phase = "idle";
                this.session.key = undefined;
                await this.begin();
            }
            return {};
        }
        const becameReady = !wasReady && this.session.phase === "ready";
        try {
            await this.send(result.outgoing);
        } catch {
            logger.warning("IFR7001: protocol reply delivery failed (contents omitted)", NS);
            if (becameReady) {
                this.session.phase = "idle";
                this.session.key = undefined;
                this.ready?.settle(new Error("IFR7001: session setup delivery failed"));
            }
        }
        if (becameReady && this.session.phase === "ready") {
            this.ready?.settle();
            logger.info("IFR7001: encrypted session ready", NS);
        }
        const op = this.operation;
        if (op) {
            if (op.kind === "volume" && result.volumeReport?.sequence === op.sequence && result.volumeReport.level === op.level) {
                logger.info("IFR7001: volume setting confirmed by lock", NS);
                op.done.settle();
            }
            if (op.kind === "credential") Object.assign(result.state, this.receiveCredential(op, result.credentialEvents));
            if (op.kind === "gateway" && result.gatewayStatus?.sequence === op.sequence) {
                logger.info(`IFR7001: encrypted gateway acknowledgement received (status ${result.gatewayStatus.status})`, NS);
                op.done.settle();
            }
            const confirmation = result.confirmations?.find((c) => c.dp === op.dp);
            if (confirmation) {
                const sequenceMatches = confirmation.sequence === op.sequence;
                const keyMatches = confirmation.keyId === op.keyId;
                logger.info(
                    `IFR7001: reply dp=${op.dp} status=${confirmation.status} sequence_matches=${sequenceMatches} key_id_matches=${keyMatches}`,
                    NS,
                );
                if (sequenceMatches && keyMatches) {
                    if (confirmation.status === 0) op.acknowledged = true;
                    else op.done.settle(new Error(`IFR7001: command rejected by lock (status ${confirmation.status})`));
                }
            }
            if (op.dp === 49 && result.state.state === op.target) op.reported = true;
            if (op.acknowledged && (op.dp === 48 || op.reported)) op.done.settle();
        }
        for (const event of result.credentialEvents ?? []) {
            if (event.dp === 54) this.credentialSequences.add(event.sequence);
        }
        while (this.credentialSequences.size > 64) this.credentialSequences.delete(this.credentialSequences.values().next().value);
        return result.state;
    }
    receiveCredential(op: Operation, events: CredentialEvent[] = []) {
        let changed = false;
        for (const event of events) {
            if (["success", "failed", "cancelled"].includes(String(op.publicState.credential_status))) break;
            const request = op.request;
            if (
                event.dp !== op.dp ||
                event.type !== request.type ||
                event.memberId !== request.member_id ||
                event.administrator !== request.administrator
            )
                continue;
            if (op.action === "enroll" && op.previousSequences.has(event.sequence)) continue;
            if (op.action === "delete") {
                if (event.sequence !== op.sequence || event.credentialId !== request.credential_id) continue;
                op.publicState.credential_status = event.status === 0xff ? "success" : "failed";
                op.publicState.credential_error =
                    event.status === 0xff ? "none" : event.status === 1 ? "not_found" : event.status === 2 ? "protected" : "rejected";
                changed = true;
                op.done.settle(event.status === 0xff ? undefined : new Error("IFR7001: credential deletion rejected"));
                continue;
            }
            // Enrollment replies use a device-assigned sequence, NOT the request
            // sequence. Bind that sequence and hardware ID on the initial stage.
            if (event.stage === 0 && op.responseSequence === undefined && event.credentialId !== 999) {
                op.responseSequence = event.sequence;
                op.credentialId = event.credentialId;
                op.publicState.credential_total = Math.min(event.progress, 15);
            }
            const cancellation = event.stage === 0xfe && op.cancelRequested;
            const initialFailure = event.stage === 0xfd && op.responseSequence === undefined;
            if (!cancellation && !initialFailure && (op.responseSequence !== event.sequence || op.credentialId !== event.credentialId)) continue;
            changed = true;
            if (event.credentialId !== 999) op.publicState.credential_id = event.credentialId;
            if ([0xfc, 0xff].includes(event.stage)) op.publicState.credential_progress = Math.min(event.progress, 15);
            op.publicState.credential_status = (
                {0: "enrolling", 252: "enrolling", 253: "failed", 254: "cancelled", 255: "success"} as Record<number, string>
            )[event.stage];
            op.publicState.credential_error =
                event.stage === 0xfd
                    ? ((
                          {
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
                          } as Record<number, string>
                      )[event.status] ?? "rejected")
                    : "none";
            if (event.stage === 0xff || event.stage === 0xfe) op.done.settle();
            if (event.stage === 0xfd) op.done.settle(new Error("IFR7001: enrollment failed; see credential status"));
        }
        return changed ? {...op.publicState} : {};
    }
    async manageCredential(action: string, value: unknown, publish: (state: KeyValue) => void = () => {}) {
        const request = validateCredentialRequest(action, value);
        if (this.disposed) throw new Error("IFR7001: controller stopped");
        if (this.busy || this.clock() - (this.lastCommandAt ?? Number.NEGATIVE_INFINITY) < 2000)
            throw new Error("IFR7001: command already active or too recent");
        this.busy = true;
        let op: Operation;
        try {
            await this.ensureReady();
            const packet = {...this.session.credential(action, request), expiresAt: performance.now() + this.commandTimeout};
            op = {
                kind: "credential",
                action,
                dp: action === "enroll" ? 54 : 55,
                request,
                sequence: packet.sequence,
                previousSequences: new Set(this.credentialSequences),
                done: deferred(
                    action === "enroll" ? this.enrollmentTimeout : this.commandTimeout,
                    "IFR7001: credential operation timeout; check before retrying",
                ),
                publicState: {
                    credential_operation: action,
                    credential_status: "starting",
                    credential_error: "none",
                    credential_type: request.type,
                    credential_member: request.member_id,
                    credential_id: request.credential_id ?? 0,
                    credential_administrator: request.administrator,
                    credential_progress: 0,
                    credential_total: 0,
                },
            };
            this.operation = op;
            this.lastCommandAt = this.clock();
            publish({...op.publicState});
            try {
                await this.send([packet]);
            } catch {
                op.done.settle(new Error("IFR7001: credential delivery failed; result uncertain"));
            }
            await checked(op.done.promise);
            return {...op.publicState};
        } catch (error) {
            if (op) {
                if (!["failed", "cancelled"].includes(String(op.publicState.credential_status))) {
                    op.publicState.credential_status = /timeout/i.test(error instanceof Error ? error.message : "") ? "timeout" : "failed";
                    op.publicState.credential_error = /timeout/i.test(error instanceof Error ? error.message : "") ? "timeout" : "interrupted";
                }
                publish({...op.publicState});
            }
            throw error;
        } finally {
            this.operation = undefined;
            this.busy = false;
        }
    }
    async cancelEnrollment() {
        const op = this.operation;
        if (this.disposed || op?.kind !== "credential" || op.action !== "enroll") throw new Error("IFR7001: no active enrollment to cancel");
        if (op.cancelRequested) throw new Error("IFR7001: cancellation already requested");
        op.cancelRequested = true;
        await this.send([{...this.session.credential("enroll", op.request, true), expiresAt: performance.now() + this.commandTimeout}]);
        // Original enrollment stays active until its cancellation reply/timeout.
    }
    async setVolume(value: unknown) {
        const level = validateVolume(value);
        if (this.disposed) throw new Error("IFR7001: controller stopped");
        if (this.busy || this.clock() - (this.lastCommandAt ?? Number.NEGATIVE_INFINITY) < 2000)
            throw new Error("IFR7001: command already active or too recent");
        this.busy = true;
        try {
            await this.ensureReady();
            const packet = {...this.session.volume(level), expiresAt: performance.now() + this.commandTimeout};
            const op = {
                kind: "volume",
                sequence: packet.sequence,
                level,
                done: deferred(this.commandTimeout, "IFR7001: volume confirmation timeout; check state before retrying"),
            };
            this.operation = op;
            this.lastCommandAt = this.clock();
            try {
                await this.send([packet]);
            } catch {
                op.done.settle(new Error("IFR7001: volume delivery failed; result uncertain"));
            }
            await checked(op.done.promise);
            return {sound_volume: level};
        } finally {
            this.operation = undefined;
            this.busy = false;
        }
    }
    async renewSession() {
        await this.initialize();
        if (this.disposed) throw new Error("IFR7001: controller stopped");
        if (this.busy) throw new Error("IFR7001: another command is active");
        if (!this.session.baseConfirmed) throw new Error("IFR7001: confirmed base key unavailable");
        this.busy = true;
        try {
            this.ready?.settle(new Error("IFR7001: renewing session"));
            this.ready = deferred(this.sessionTimeout, "IFR7001: nonce renewal timeout");
            this.beganAt = this.clock();
            await this.send([{...this.session.rekey(), expiresAt: performance.now() + this.sessionTimeout}]);
            await checked(this.ready.promise);
        } catch (error) {
            if (this.session.rollback()) await this.send([]);
            throw error;
        } finally {
            this.busy = false;
        }
    }
    async confirmGateway() {
        if (this.disposed) throw new Error("IFR7001: controller stopped");
        if (this.busy) throw new Error("IFR7001: another command is active");
        this.busy = true;
        try {
            await this.ensureReady();
            const packet = {...this.session.gatewayStatus(), expiresAt: performance.now() + this.commandTimeout};
            const op = {
                kind: "gateway",
                sequence: packet.sequence,
                done: deferred(this.commandTimeout, "IFR7001: encrypted gateway acknowledgement timeout"),
            };
            this.operation = op;
            try {
                await this.send([packet]);
            } catch {
                op.done.settle(new Error("IFR7001: gateway status delivery failed"));
            }
            await checked(op.done.promise);
        } finally {
            this.operation = undefined;
            this.busy = false;
        }
    }
    async ensureAuthorization(retryUncertain = false): Promise<AuthorizationSnapshot> {
        let state = await this.authorizationStore.load(this.device.ieeeAddr);
        if (!state) {
            const auth = this.generateAuthorization(1);
            state = {
                version: 1,
                ieeeAddr: this.device.ieeeAddr,
                stage: "prepared",
                keyId: auth.keyId,
                key: auth.key.toString("hex"),
                policy: authorizationPolicy(this.now()),
                used: 0,
            };
            await this.authorizationStore.save(this.device.ieeeAddr, state);
        }
        if (state.stage === "confirmed" && state.policy.validTo > Math.floor(this.now() / 1000) + 86400 && state.used < state.policy.maxUses)
            return state;
        if (["pending", "uncertain"].includes(state.stage) && !retryUncertain) {
            throw new Error("IFR7001: authorization result uncertain; wake lock and explicitly reconfigure before retrying");
        }
        if (state.policy.validTo <= Math.floor(this.now() / 1000) + 86400 || state.used >= state.policy.maxUses) {
            state = {...state, stage: "prepared", policy: authorizationPolicy(this.now()), used: 0};
            await this.authorizationStore.save(this.device.ieeeAddr, state);
        }
        const auth = {keyId: state.keyId, key: Buffer.from(state.key, "hex")};
        const packet = {...this.session.authorization(auth, state.policy), expiresAt: performance.now() + this.commandTimeout};
        state = {...state, stage: "pending"};
        // The pending marker must survive a crash between radio delivery and acknowledgement.
        await this.authorizationStore.save(this.device.ieeeAddr, state);
        const op: Operation = {
            dp: 48,
            keyId: auth.keyId,
            sequence: packet.sequence,
            acknowledged: false,
            done: deferred(this.commandTimeout, "IFR7001: authorization timeout; no actuator command sent"),
        };
        this.operation = op;
        try {
            try {
                await this.send([packet]);
            } catch {
                op.done.settle(new Error("IFR7001: authorization delivery failed; result uncertain"));
            }
            await checked(op.done.promise);
            state = {...state, stage: "confirmed"};
            await this.authorizationStore.save(this.device.ieeeAddr, state);
            logger.info("IFR7001: locally generated remote authorization confirmed", NS);
            return state;
        } catch (error) {
            // Preserve the same candidate. Only explicit reconfiguration can retry it.
            await this.authorizationStore.save(this.device.ieeeAddr, {...state, stage: "uncertain"});
            throw error;
        } finally {
            this.operation = undefined;
        }
    }
    async configureAuthorization() {
        if (this.disposed) throw new Error("IFR7001: controller stopped");
        if (this.busy) throw new Error("IFR7001: another command is active");
        this.busy = true;
        try {
            await this.ensureReady();
            await this.ensureAuthorization(true);
        } finally {
            this.operation = undefined;
            this.busy = false;
        }
    }
    async operate(target: string) {
        if (!["LOCK", "UNLOCK"].includes(target)) throw new Error("IFR7001: expected LOCK or UNLOCK");
        if (this.disposed) throw new Error("IFR7001: controller stopped");
        if (this.busy || this.clock() - (this.lastCommandAt ?? Number.NEGATIVE_INFINITY) < 2000)
            throw new Error("IFR7001: command already active or too recent");
        this.busy = true;
        try {
            await this.ensureReady();
            const authorization = await this.ensureAuthorization();
            const auth = {keyId: authorization.keyId, key: Buffer.from(authorization.key, "hex")};
            // Reserve a use even if delivery is uncertain; never replay a motor command.
            await this.authorizationStore.save(this.device.ieeeAddr, {...authorization, used: authorization.used + 1});
            if (this.disposed) throw new Error("IFR7001: controller stopped");
            const packet = {...this.session.control(target, auth), expiresAt: performance.now() + this.commandTimeout};
            const op = {
                dp: 49,
                target,
                keyId: auth.keyId,
                sequence: packet.sequence,
                acknowledged: false,
                reported: false,
                done: deferred(this.commandTimeout, "IFR7001: command timeout; result uncertain, check state before retrying"),
            };
            this.operation = op;
            this.lastCommandAt = this.clock();
            try {
                await this.send([packet]);
            } catch {
                op.done.settle(new Error("IFR7001: command delivery failed; result uncertain, check state before retrying"));
            }
            await checked(op.done.promise);
        } finally {
            this.operation = undefined;
            this.busy = false;
        }
    }
}
export function createDefinition(controllerOptions: ControllerOptions = {}): DefinitionWithExtend {
    const controllers = new Map<string, LockController>();
    function getController(device: Zh.Device) {
        if (!controllers.has(device.ieeeAddr)) {
            const controller = new LockController(device, controllerOptions);
            controllers.set(device.ieeeAddr, controller);
        }
        return controllers.get(device.ieeeAddr);
    }
    const definition: DefinitionWithExtend = {
        fingerprint: [{modelID: "TY0A01", manufacturerName: "_TYST12_snr3p274"}],
        model: "IFR 7001",
        vendor: "Intelbras",
        description: "Encrypted Tuya lock; PIN/fingerprint enrollment on the lock keypad and reader",
        fromZigbee: [
            {
                cluster: clusterName,
                type: commandTypes as DefinitionWithExtend["fromZigbee"][number]["type"],
                convert: (_model, msg) => getController(msg.device).receive(idsByType[msg.type], Buffer.from(msg.data.payload)),
            },
        ],
        toZigbee: [
            {
                key: ["state"],
                convertSet: async (_entity, _key, value, meta) => {
                    if (!meta.device || typeof value !== "string" || !["LOCK", "UNLOCK"].includes(value.toUpperCase()))
                        throw new Error("IFR7001: expected LOCK or UNLOCK on a device");
                    meta.publish({lock_command_result: "pending"});
                    try {
                        await getController(meta.device).operate(value.toUpperCase());
                        // Never optimistically publish state: only DP57 reports change it.
                        return {state: {lock_command_result: "success"}};
                    } catch (error) {
                        meta.publish({lock_command_result: /timeout/i.test(error instanceof Error ? error.message : "") ? "timeout" : "failed"});
                        throw error;
                    }
                },
            },
            {
                key: ["credential_enroll", "credential_delete", "credential_cancel"],
                convertSet: async (_entity, key, value, meta) => {
                    if (!meta.device) throw new Error("IFR7001: credential operation requires a device");
                    const controller = getController(meta.device);
                    if (key === "credential_cancel") {
                        if (value !== "CANCEL") throw new Error("IFR7001: expected CANCEL");
                        await controller.cancelEnrollment();
                        return;
                    }
                    const state = await controller.manageCredential(key === "credential_enroll" ? "enroll" : "delete", value, (state) =>
                        meta.publish(state),
                    );
                    return {state};
                },
            },
            {
                key: ["sound_volume"],
                convertSet: async (_entity, _key, value, meta) => {
                    if (!meta.device) throw new Error("IFR7001: volume setting requires a device");
                    return {state: await getController(meta.device).setVolume(value)};
                },
            },
        ],
        exposes: [
            new exposes.Lock().withState("state", "LOCK", "UNLOCK", "Reported motor state", exposes.access.STATE_SET),
            exposes.presets.battery(),
            exposes
                .enum(
                    "sound_volume",
                    exposes.access.STATE_SET,
                    Array.from({length: 10}, (_, n) => String(n)),
                )
                .withLabel("Volume")
                .withCategory("config")
                .withDescription("Volume level: 0 = mute; 1–9 increase the volume. Wait for the lock to confirm each change."),
            exposes.enum("lock_command_result", exposes.access.STATE, ["pending", "success", "timeout", "failed"]).withCategory("diagnostic"),
            exposes.presets.action(["access_fingerprint", "access_pin", "access_remote"]),
            ...["enroll", "delete"].map((action) => {
                const form = new exposes.Composite(`credential_${action}`, `credential_${action}`, exposes.access.SET)
                    .withDescription(
                        action === "enroll"
                            ? "Start enrollment; enter PIN on the lock keypad or touch its fingerprint reader. No PIN is sent via MQTT."
                            : "Delete exactly one credential; use its returned member ID, credential ID and administrator flag.",
                    )
                    .withFeature(exposes.enum("type", exposes.access.SET, ["pin", "fingerprint"]))
                    .withFeature(exposes.numeric("member_id", exposes.access.SET).withValueMin(1).withValueMax(999))
                    .withFeature(
                        new exposes.Binary("administrator", exposes.access.SET, true, false).withDescription(
                            "Must match the member role; false = common member",
                        ),
                    );
                if (action === "delete") form.withFeature(exposes.numeric("credential_id", exposes.access.SET).withValueMin(1).withValueMax(998));
                return form;
            }),
            exposes
                .enum("credential_cancel", exposes.access.SET, ["CANCEL"])
                .withDescription("Request cancellation of the current enrollment; wait for confirmation"),
            exposes.enum("credential_operation", exposes.access.STATE, ["enroll", "delete"]),
            exposes.enum("credential_status", exposes.access.STATE, ["starting", "enrolling", "success", "failed", "cancelled", "timeout"]),
            exposes.enum("credential_error", exposes.access.STATE, [
                "none",
                "timeout",
                "not_found",
                "protected",
                "rejected",
                "duplicate",
                "capacity",
                "invalid_pin",
                "pin_length",
                "invalid_type",
                "busy",
                "interrupted",
            ]),
            exposes.enum("credential_type", exposes.access.STATE, ["pin", "fingerprint"]),
            exposes.numeric("credential_member", exposes.access.STATE).withValueMin(1).withValueMax(999),
            exposes
                .numeric("credential_id", exposes.access.STATE)
                .withValueMin(0)
                .withValueMax(998)
                .withDescription("Assigned credential ID; 0 means not assigned yet"),
            new exposes.Binary("credential_administrator", exposes.access.STATE, true, false),
            exposes.numeric("credential_progress", exposes.access.STATE).withValueMin(0).withValueMax(15),
            exposes.numeric("credential_total", exposes.access.STATE).withValueMin(0).withValueMax(15),
        ],
        configure: async (device) => {
            const controller = getController(device);
            await controller.begin(true);
            if (controller.session.phase !== "ready") await checked(controller.ready.promise);
            try {
                await controller.confirmGateway();
            } catch {
                logger.info("IFR7001: gateway probe unconfirmed; renewing session from stored base", NS);
                await controller.renewSession();
                await controller.confirmGateway();
            }
            await controller.configureAuthorization();
        },
        onEvent: async (event) => {
            if (event.type === "stop") {
                const controller = controllers.get(event.data.ieeeAddr);
                controller?.stop();
                controllers.delete(event.data.ieeeAddr);
                return;
            }
            if (event.type === "deviceJoined") await getController(event.data.device).joinedNetwork();
            if (event.type === "start" || event.type === "deviceAnnounce") await getController(event.data.device).begin(true);
        },
    };
    return definition;
}
