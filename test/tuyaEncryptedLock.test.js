/** biome-ignore-all lint/suspicious/useAwait: asynchronous fake radio/store contracts intentionally resolve or reject without IO. */
import assert from "node:assert/strict";
import {setImmediate as tick} from "node:timers/promises";
import {test} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {prepareDefinition} from "../src/index";
import {setLogger} from "../src/lib/logger";
import {
    clusterDefinition,
    clusterName,
    createDefinition,
    decrypt,
    encodePoint,
    encrypt,
    LockController,
    LockSession,
    parsePoints,
} from "../src/lib/tuyaEncryptedLock";

function memoryStore() {
    const entries = new Map();
    return {
        entries,
        async load(id) {
            return structuredClone(entries.get(id));
        },
        async save(id, state) {
            entries.set(id, structuredClone(state));
        },
    };
}
const uuid = "0011223344556677";
const base = Buffer.from("00112233445566778899aabbccddeeff", "hex");
const a = Buffer.from("01020304", "hex");
const b = Buffer.from("05060708", "hex");
const key = Buffer.concat([a, b, Buffer.from("tuya22ff")]);
const point = (dp, kind, hex) => encodePoint(dp, kind, Buffer.from(hex, "hex"));
const withSequence = (...values) => Buffer.concat([Buffer.from([0, 9]), ...values]);
function negotiated() {
    const session = new LockSession(`0x${uuid}`, {
        random: (n) => Buffer.from(n === 16 ? base : a),
        now: () => 1800000000000,
        timezoneOffset: () => 180,
    });
    const first = session.start();
    assert.equal(first.command, "baseKey");
    assert.equal(decrypt(first.payload, Buffer.from(uuid)).toString("hex"), "00025600001000112233445566778899aabbccddeeff6b49d2000002");
    const second = session.handle(0x21, encrypt(Buffer.from("000256000000", "hex"), Buffer.from(uuid)));
    assert.equal(second.outgoing[0].command, "sessionKey");
    assert.equal(decrypt(second.outgoing[0].payload, base).toString("hex"), "000355000004010203046b49d2000003");
    const ready = session.handle(0x22, encrypt(Buffer.from("00035500000405060708", "hex"), base));
    assert.equal(session.phase, "ready");
    assert.deepEqual(session.key, key);
    assert.deepEqual(
        ready.outgoing.map((p) => p.command),
        ["syncTime", "gatewayStatus"],
    );
    const time = decrypt(ready.outgoing[0].payload, key);
    assert.equal(time.readUInt32BE(2), 1800000000);
    assert.equal(time.readUInt32BE(6), 1800000000 - 10800);
    return session;
}
const authorization = {keyId: 0x1234, key: Buffer.from("12345678")};
function radioController(options = {}) {
    const packets = [];
    const device = {ieeeAddr: `0x${uuid}`, getEndpoint: () => ({}), addCustomCluster() {}};
    const controller = new LockController(device, {
        session: negotiated(),
        send: async (_ep, sent) => {
            packets.push(...sent);
        },
        authorizationStore: confirmedAuthorizationStore(),
        now: () => 1800000000000,
        stateStore: memoryStore(),
        ...options,
    });
    return {controller, packets};
}
function ack(sequence, status = 0, keyId = authorization.keyId) {
    const p = Buffer.alloc(2);
    p.writeUInt16BE(sequence);
    const id = Buffer.alloc(2);
    id.writeUInt16BE(keyId);
    return encrypt(Buffer.concat([p, encodePoint(49, 0, Buffer.concat([Buffer.from([status]), id]))]), key);
}
const motor = (target) => encrypt(withSequence(point(57, 1, target === "UNLOCK" ? "01" : "00")), key);

function confirmedAuthorizationStore() {
    let value = {
        version: 1,
        ieeeAddr: `0x${uuid}`,
        stage: "confirmed",
        keyId: authorization.keyId,
        key: authorization.key.toString("hex"),
        policy: {validFrom: 1799999000, validTo: 1924963199, maxUses: 65535},
        used: 0,
    };
    return {
        async load() {
            return structuredClone(value);
        },
        async save(_id, state) {
            value = structuredClone(state);
        },
    };
}
test("negotiates using independently specified wire vectors and local time", () => {
    negotiated();
});
test("live motor state, battery and mute; ignores raw enrollment data", () => {
    const s = negotiated();
    const p = withSequence(point(57, 1, "01"), point(10, 2, "00000064"), point(19, 4, "00"), point(54, 0, "aabbcc"));
    assert.deepEqual(s.handle(2, encrypt(p, key)).state, {state: "UNLOCK", battery: 100, sound_volume: "0"});
    assert.deepEqual(s.handle(2, encrypt(withSequence(point(57, 1, "00")), key)).state, {state: "LOCK"});
});
test("historical state never overwrites live state; retransmissions ACK without duplicate action", () => {
    const s = negotiated();
    const header = Buffer.from("1234006b49d200", "hex");
    const p = encrypt(Buffer.concat([header, point(8, 1, "01"), point(1, 2, "00000003")]), key);
    const result = s.handle(0x23, p);
    assert.deepEqual(result.state, {action: "access_fingerprint"});
    const ack = decrypt(result.outgoing[0].payload, key);
    assert.deepEqual(ack.subarray(0, 7), header);
    assert.equal(ack.length, 13);
    assert.notEqual(ack.readUInt16BE(11), 0x1234); // independent anti-replay counter
    const duplicate = s.handle(0x23, p);
    assert.deepEqual(duplicate.state, {});
    assert.equal(duplicate.outgoing.length, 1);
});
test("rejects malformed TLVs, invalid booleans, invalid ciphertext and mismatched handshake", () => {
    assert.throws(() => parsePoints(Buffer.from("0001390100020001", "hex")));
    assert.throws(() => parsePoints(Buffer.from("00013901000102", "hex")));
    assert.throws(() => decrypt(Buffer.alloc(15), key));
    const s = new LockSession(`0x${uuid}`);
    assert.throws(() => s.handle(2, encrypt(withSequence(point(57, 1, "01")), key)), /Session unavailable/);
    s.start();
    assert.throws(() => s.handle(0x21, encrypt(Buffer.from("000356000000", "hex"), Buffer.from(uuid))), /acknowledgement/);
    assert.equal(s.phase, "base");
    const ready = negotiated();
    assert.deepEqual(ready.handle(2, encrypt(withSequence(point(10, 2, "ffffffff")), key)).state, {});
});
test("herdsman round-trips opaque encrypted frames in both ZCL directions", () => {
    const clusters = {[clusterName]: clusterDefinition};
    const payload = encrypt(withSequence(point(57, 1, "01")), key);
    for (const direction of [Zcl.Direction.CLIENT_TO_SERVER, Zcl.Direction.SERVER_TO_CLIENT]) {
        const f = Zcl.Frame.create(Zcl.FrameType.SPECIFIC, direction, true, undefined, 7, "report", clusterName, {payload}, clusters);
        const encoded = f.toBuffer();
        const decoded = Zcl.Frame.fromBuffer(0xef00, Zcl.Header.fromBuffer(encoded), encoded, clusters);
        assert.equal(decoded.cluster.name, clusterName);
        assert.deepEqual(decoded.payload.payload, payload);
    }
});
test("remote unlock waits for matching acknowledgement AND a fresh motor report", async () => {
    const {controller: c, packets} = radioController();
    const done = c.operate("UNLOCK");
    let completed = false;
    void done.then(() => {
        completed = true;
    });
    await tick();
    assert.equal(packets.length, 1);
    assert.equal(packets[0].command, "dataRequest");
    await c.receive(2, ack(packets[0].sequence + 1));
    await c.receive(2, ack(packets[0].sequence, 0, 1));
    await tick();
    assert.equal(completed, false);
    await c.receive(2, ack(packets[0].sequence));
    await tick();
    assert.equal(completed, false);
    assert.deepEqual(await c.receive(2, motor("UNLOCK")), {state: "UNLOCK"});
    await done;
    assert.equal(completed, true);
    c.stop();
});
test("remote lock waits for acknowledgement even when the requested motor state arrived first", async () => {
    const {controller: c, packets} = radioController();
    const done = c.operate("LOCK");
    let completed = false;
    void done.then(() => {
        completed = true;
    });
    await tick();
    await c.receive(2, motor("LOCK"));
    await tick();
    assert.equal(completed, false);
    await c.receive(2, ack(packets[0].sequence));
    await done;
    assert.equal(completed, true);
    c.stop();
});
test("live state is never suppressed when an identical report follows a fast state toggle", () => {
    const s = negotiated();
    assert.deepEqual(s.handle(2, motor("LOCK")).state, {state: "LOCK"});
    assert.deepEqual(s.handle(2, motor("UNLOCK")).state, {state: "UNLOCK"});
    assert.deepEqual(s.handle(2, motor("LOCK")).state, {state: "LOCK"});
});
test("rejected authorization fails without retry or optimistic state", async () => {
    const {controller: c, packets} = radioController();
    const done = c.operate("UNLOCK");
    const rejected = assert.rejects(done, /status 3/);
    await tick();
    await c.receive(2, ack(packets[0].sequence, 3));
    await rejected;
    assert.equal(packets.length, 1);
    c.stop();
});
test("timeout discards the command; late replies, duplicate clicks and announcements cannot replay it", async () => {
    const {controller: c, packets} = radioController({commandTimeout: 20});
    const done = c.operate("UNLOCK");
    const rejected = assert.rejects(done, /timeout/);
    await tick();
    await assert.rejects(c.operate("LOCK"), /already active/);
    await rejected;
    await c.receive(2, ack(packets[0].sequence));
    await c.receive(2, motor("UNLOCK"));
    await assert.rejects(c.operate("UNLOCK"), /too recent/);
    c.stop();
    await assert.rejects(c.operate("UNLOCK"), /stopped/);
    assert.equal(packets.filter((p) => p.command === "dataRequest").length, 1);
});
test("session timeout then late handshake never dispatches the expired actuator command", async () => {
    const {controller: c, packets} = radioController({session: new LockSession(`0x${uuid}`), sessionTimeout: 20});
    const rejected = assert.rejects(c.operate("UNLOCK"), /session timeout/);
    await tick();
    const root = decrypt(packets[0].payload, Buffer.from(uuid));
    await rejected;
    const baseKey = root.subarray(6, 22);
    await c.receive(0x21, encrypt(Buffer.concat([root.subarray(0, 2), Buffer.from("56000000", "hex")]), Buffer.from(uuid)));
    const nonce = decrypt(packets[1].payload, baseKey);
    await c.receive(0x22, encrypt(Buffer.concat([nonce.subarray(0, 2), Buffer.from("55000004", "hex"), b]), baseKey));
    assert.equal(c.session.phase, "ready");
    assert.equal(
        packets.some((p) => p.command === "dataRequest"),
        false,
    );
    c.stop();
});
test("a cold controller negotiates before actuation; stop cancels an in-flight operation", async () => {
    let c;
    let liveBase;
    const sent = [];
    const device = {ieeeAddr: `0x${uuid}`, getEndpoint: () => ({}), addCustomCluster() {}};
    const send = async (_ep, packets) => {
        for (const packet of packets) {
            sent.push(packet);
            if (packet.command === "baseKey") {
                const p = decrypt(packet.payload, Buffer.from(uuid));
                liveBase = p.subarray(6, 22);
                queueMicrotask(
                    () => void c.receive(0x21, encrypt(Buffer.concat([p.subarray(0, 2), Buffer.from("56000000", "hex")]), Buffer.from(uuid))),
                );
            } else if (packet.command === "sessionKey") {
                const p = decrypt(packet.payload, liveBase);
                queueMicrotask(() => void c.receive(0x22, encrypt(Buffer.concat([p.subarray(0, 2), Buffer.from("55000004", "hex"), b]), liveBase)));
            }
        }
    };
    c = new LockController(device, {send, authorizationStore: confirmedAuthorizationStore(), now: () => 1800000000000, stateStore: memoryStore()});
    const rejected = assert.rejects(c.operate("UNLOCK"), /stopped/);
    await tick();
    assert.deepEqual(
        sent.map((p) => p.command),
        ["baseKey", "sessionKey", "syncTime", "gatewayStatus", "dataRequest"],
    );
    c.stop();
    await rejected;
    assert.equal(sent.filter((p) => p.command === "dataRequest").length, 1);
});

test("session loss cancels actuation and recovers with confirmed base key, without reprovisioning", async () => {
    const {controller: c, packets} = radioController();
    const failed = assert.rejects(c.operate("UNLOCK"), /session lost/);
    await tick();
    await c.receive(2, Buffer.alloc(15));
    await failed;
    assert.deepEqual(
        packets.map((p) => p.command),
        ["dataRequest", "sessionKey"],
    );
    assert.equal(c.session.phase, "session");
    c.stop();
});
test("private snapshot restores the same key and advances command/counter values after restart", async () => {
    const store = memoryStore();
    const first = radioController({
        stateStore: store,
        send: async () => {
            throw new Error("Simulated process exit after checkpoint");
        },
    });
    await assert.rejects(first.controller.operate("UNLOCK"), /delivery failed/);
    const saved = await store.load(`0x${uuid}`);
    assert.equal(saved.phase, "ready");
    assert.equal(saved.sequence, 6);
    assert.equal(saved.replaySequence, 6);
    assert.equal("target" in saved, false);
    assert.equal("operation" in saved, false);
    first.controller.stop();
    const restored = new LockSession(`0x${uuid}`);
    const packets = [];
    const second = radioController({
        session: restored,
        stateStore: store,
        send: async (_ep, sent) => {
            packets.push(...sent);
            if (sent.length) throw new Error("Radio unavailable");
        },
    });
    await second.controller.begin(true);
    assert.equal(restored.phase, "ready");
    assert.equal(packets.length, 0); // boot never rekeys a valid persisted session
    assert.deepEqual(restored.key, key);
    assert.deepEqual(await second.controller.receive(2, motor("LOCK")), {state: "LOCK"});
    await assert.rejects(second.controller.operate("LOCK"), /delivery failed/);
    assert.equal(packets.length, 1);
    assert.equal(packets[0].sequence, 7);
    assert.equal(decrypt(packets[0].payload, key).readUInt16BE(decrypt(packets[0].payload, key).length - 2), 7);
    second.controller.stop();
});
test("a checkpoint is durable before any actuator radio call and write failure blocks radio", async () => {
    const store = memoryStore();
    const instance = radioController({
        stateStore: store,
        send: async (_ep, packets) => {
            if (!packets.length) return;
            const saved = await store.load(`0x${uuid}`);
            assert.equal(saved.sequence, packets[0].sequence);
            assert.equal(saved.replaySequence, 6);
            throw new Error("No delivery");
        },
    });
    await assert.rejects(instance.controller.operate("UNLOCK"), /delivery failed/);
    instance.controller.stop();
    let radioCalls = 0;
    const failed = radioController({
        stateStore: {
            async load() {},
            async save() {
                throw new Error("Disk full");
            },
        },
        send: async () => {
            radioCalls++;
        },
    });
    await assert.rejects(failed.controller.operate("UNLOCK"), /delivery failed/);
    assert.equal(radioCalls, 0);
    failed.controller.stop();
});
test("invalid or foreign private snapshots are rejected without starting a new session", async () => {
    const state = negotiated().snapshot();
    for (const patch of [
        {version: 2},
        {ieeeAddr: "0x8899aabbccddeeff"},
        {key: "bad"},
        {sequence: 0},
        {replaySequence: 65535},
        {baseConfirmed: false},
    ]) {
        const s = new LockSession(`0x${uuid}`);
        assert.throws(() => s.restore({...state, ...patch}), /Invalid Tuya lock session/);
        assert.equal(s.phase, "idle");
    }
    const store = memoryStore();
    await store.save(`0x${uuid}`, {...state, key: "bad"});
    const instance = radioController({session: new LockSession(`0x${uuid}`), stateStore: store});
    await assert.rejects(instance.controller.begin(), /Invalid Tuya lock session/);
    assert.equal(instance.packets.length, 0);
    instance.controller.stop();
});
test("restoring a confirmed partial handshake uses nonce negotiation, not a new base key", async () => {
    const store = memoryStore();
    const s = negotiated();
    s.rekey();
    await store.save(`0x${uuid}`, s.snapshot());
    const instance = radioController({session: new LockSession(`0x${uuid}`), stateStore: store});
    await instance.controller.begin();
    assert.equal(instance.packets[0].command, "sessionKey");
    assert.equal(instance.controller.session.baseConfirmed, true);
    instance.controller.stop();
});
test("nonce renewal keeps a durable previous session until the new key is accepted", async () => {
    const store = memoryStore();
    const {controller: c, packets} = radioController({stateStore: store});
    c.session.random = (length) => Buffer.alloc(length, 0x33);
    const renewed = c.renewSession();
    await tick();
    assert.equal(packets[0].command, "sessionKey");
    const checkpoint = await store.load(`0x${uuid}`);
    assert.equal(checkpoint.phase, "session");
    assert.equal(checkpoint.previous.key, key.toString("hex"));
    const request = decrypt(packets[0].payload, base);
    await c.receive(0x22, encrypt(Buffer.concat([request.subarray(0, 2), Buffer.from("55000004", "hex"), b]), base));
    await renewed;
    const final = await store.load(`0x${uuid}`);
    assert.equal(final.phase, "ready");
    assert.equal(final.previous, undefined);
    assert.notEqual(final.key, key.toString("hex"));
    assert(packets.every((p) => p.command !== "dataRequest"));
    c.stop();
});
test("failed nonce renewal restores the previous working key while retaining reserved counters", async () => {
    const store = memoryStore();
    const {controller: c, packets} = radioController({stateStore: store, sessionTimeout: 20});
    const before = c.session.snapshot();
    await assert.rejects(c.renewSession(), /nonce renewal timeout/);
    const after = await store.load(`0x${uuid}`);
    assert.equal(after.phase, "ready");
    assert.equal(after.key, before.key);
    assert.equal(after.previous, undefined);
    assert(after.sequence > before.sequence);
    assert(after.replaySequence > before.replaySequence);
    assert.equal(packets.filter((p) => p.command === "sessionKey").length, 1);
    assert(packets.every((p) => p.command !== "dataRequest"));
    c.stop();
});
test("a pending renewal checkpoint preserves the previous key across process restart", () => {
    const s = negotiated();
    s.rekey();
    const restored = new LockSession(`0x${uuid}`);
    restored.restore(JSON.parse(JSON.stringify(s.snapshot())));
    assert.equal(restored.phase, "session");
    assert(restored.rollback());
    assert.deepEqual(restored.key, key);
    assert.equal(restored.phase, "ready");
});

test("fresh configure negotiates, verifies gateway and provisions local authorization without moving the motor", async () => {
    const definition = createDefinition({stateStore: memoryStore(), now: () => 1800000000000});
    const sent = [];
    const warnings = [];
    setLogger({warning: (message) => warnings.push(message), debug() {}, info() {}, error() {}});
    const endpoint = {command: async (...args) => sent.push(args)};
    const device = {
        meta: {},
        save() {},
        ieeeAddr: `0x${uuid}`,
        getEndpoint: () => endpoint,
        addCustomCluster: (name, data) => assert.equal(data.ID, 0xef00),
    };
    await definition.onEvent({type: "start", data: {device}});
    const configured = definition.configure(device);
    assert.equal(sent.length, 1);
    const rootPlain = decrypt(sent[0][2].payload, Buffer.from(uuid));
    const liveBase = rootPlain.subarray(6, 22);
    const seq = rootPlain.subarray(0, 2);
    const meta = {logger: {warning: (m) => warnings.push(m)}};
    const convert = (type, payload) => definition.fromZigbee[0].convert(definition, {device, endpoint, type, data: {payload}}, () => {}, {}, meta);
    await convert("commandBaseKey", encrypt(Buffer.concat([seq, Buffer.from("56000000", "hex")]), Buffer.from(uuid)));
    const noncePlain = decrypt(sent[1][2].payload, liveBase);
    await convert("commandSessionKey", encrypt(Buffer.concat([noncePlain.subarray(0, 2), Buffer.from("55000004", "hex"), b]), liveBase));
    const working = Buffer.concat([noncePlain.subarray(6, 10), b, Buffer.from("tuya22ff")]);
    await tick();
    const statusPacket = sent.filter((row) => row[1] === "gatewayStatus").at(-1);
    const statusPlain = decrypt(statusPacket[2].payload, working);
    await convert("commandGatewayStatusAck", encrypt(Buffer.concat([statusPlain.subarray(0, 2), Buffer.from([1])]), working));
    await tick();
    const authPacket = sent.find((row) => row[1] === "dataRequest");
    const authPlain = decrypt(authPacket[2].payload, working);
    assert.equal(authPlain[2], 48);
    const credentialId = authPlain.subarray(7, 9);
    await convert(
        "commandDataResponse",
        encrypt(Buffer.concat([authPlain.subarray(0, 2), encodePoint(48, 0, Buffer.concat([Buffer.from([0]), credentialId]))]), working),
    );
    await configured;
    assert.equal(device.meta.tuyaEncryptedLockAuthorization.stage, "confirmed");
    assert.deepEqual(await convert("commandReport", encrypt(withSequence(point(57, 1, "00")), working)), {state: "LOCK"});
    assert.equal(warnings.length, 0);
    endpoint.command = async () => {
        throw new Error("Radio offline");
    };
    assert.deepEqual(
        await convert("commandLogReport", encrypt(Buffer.concat([Buffer.from("0009006b49d200", "hex"), point(2, 2, "00000004")]), working)),
        {action: "access_pin"},
    );
    assert.equal(warnings.length, 1);
    assert(!warnings[0].includes("00000004"));
    assert.equal(prepareDefinition({...definition}).fingerprint[0].modelID, "TY0A01");
    assert.deepEqual(definition.toZigbee[0].key, ["state"]);
    assert.equal(definition.exposes[0].features[0].access, 3);
    assert.equal(sent.filter((row) => row[1] === "dataRequest").length, 1, "Configure only provisions DP48; it never sends DP49");
    await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
});
