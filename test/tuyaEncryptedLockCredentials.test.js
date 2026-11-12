/** biome-ignore-all lint/suspicious/useAwait: asynchronous fake radio/store contracts intentionally resolve or reject without IO. */
import assert from "node:assert/strict";
import {setImmediate as tick} from "node:timers/promises";
import {test} from "vitest";
import {prepareDefinition} from "../src/index";
import {
    createDefinition,
    decrypt,
    encodePoint,
    encrypt,
    LockController,
    LockSession,
    validateCredentialRequest,
    validateVolume,
} from "../src/lib/tuyaEncryptedLock";

const uuid = "0011223344556677";
const base = Buffer.from("00112233445566778899aabbccddeeff", "hex");
const a = Buffer.from("01020304", "hex");
const b = Buffer.from("05060708", "hex");
const key = Buffer.concat([a, b, Buffer.from("tuya22ff")]);
const request = {type: "fingerprint", member_id: 42, administrator: false};
function session() {
    const s = new LockSession(`0x${uuid}`, {random: (n) => Buffer.from(n === 16 ? base : a), now: () => 1800000000000});
    s.start();
    s.handle(0x21, encrypt(Buffer.from("000256000000", "hex"), Buffer.from(uuid)));
    s.handle(0x22, encrypt(Buffer.from("00035500000405060708", "hex"), base));
    return s;
}
function fixture(options = {}) {
    const entries = new Map();
    const store = {
        async load(id) {
            return entries.get(id);
        },
        async save(id, v) {
            entries.set(id, structuredClone(v));
        },
    };
    const sent = [];
    const published = [];
    const device = {
        meta: {},
        save() {},
        ieeeAddr: `0x${uuid}`,
        getEndpoint() {
            return {};
        },
        addCustomCluster() {},
    };
    const c = new LockController(device, {session: session(), stateStore: store, send: async (_ep, packets) => sent.push(...packets), ...options});
    return {c, device, store, sent, published, publish: (x) => published.push(x)};
}
function payload(dp, {type = 3, stage = 0, admin = 0, member = 42, id = 7, count = 3, status = 0, sequence = 5000} = {}) {
    const v = Buffer.alloc(9);
    v[0] = type;
    v[1] = stage;
    v[2] = admin;
    v.writeUInt16BE(member, 3);
    v.writeUInt16BE(id, 5);
    v[7] = count;
    v[8] = status;
    const header = Buffer.alloc(2);
    header.writeUInt16BE(sequence);
    return encrypt(Buffer.concat([header, encodePoint(dp, 0, v)]), key);
}
const reply = (c, dp, options) => c.receive(2, payload(dp, options));

test("credential wire vectors reproduce seven-byte enrollment and single-credential deletion without any PIN", () => {
    for (const [type, kind] of [
        ["fingerprint", "03"],
        ["pin", "01"],
    ]) {
        const p = session().credential("enroll", {...request, type});
        assert.equal(decrypt(p.payload, key).subarray(2, -6).toString("hex"), `36000007${kind}0000002a03e7`);
    }
    const p = session().credential("delete", {type: "pin", member_id: 42, credential_id: 7});
    assert.equal(decrypt(p.payload, key).subarray(2, -6).toString("hex"), "37000008010000002a000701");
    const cancel = session().credential("enroll", request, true);
    assert.equal(decrypt(cancel.payload, key).subarray(2, -6).toString("hex"), "3600000703fe00002a03e7");
});
test("credential fields reject bulk deletion, reserved IDs, PIN submission, tags and coerced input", () => {
    for (const v of [
        null,
        [],
        {...request, member_id: 0},
        {...request, member_id: "42"},
        {...request, member_id: 1000},
        {...request, type: "card"},
        {...request, administrator: "false"},
        {...request, pin: "000000"},
        {...request, delete_all: true},
    ]) {
        assert.throws(() => validateCredentialRequest("enroll", v), /invalid credential/);
    }
    for (const id of [undefined, 0, -1, 999, 1000, "7"]) assert.throws(() => validateCredentialRequest("delete", {...request, credential_id: id}));
    assert.equal(validateCredentialRequest("enroll", {type: "pin", member_id: 42}).administrator, false);
});
test("Z2M definition exposes write-only forms and routes credentials through toZigbee, never fromZigbee", () => {
    const def = createDefinition();
    prepareDefinition(def);
    assert.equal(def.fromZigbee.length, 1);
    const converter = def.toZigbee.find((x) => x.key.includes("credential_enroll"));
    assert.equal(typeof converter.convertSet, "function");
    for (const action of ["enroll", "delete"]) {
        const form = def.exposes.find((e) => e.name === `credential_${action}`);
        assert.equal(form.type, "composite");
        assert.equal(form.access, 2);
        assert.deepEqual(
            form.features.map((x) => x.name),
            ["type", "member_id", "administrator", ...(action === "delete" ? ["credential_id"] : [])],
        );
    }
});
test("credential reports are internal metadata and cannot publish raw enrollment data unsolicited", () => {
    const s = session();
    const p = s.handle(2, payload(54));
    assert.deepEqual(p.state, {});
    assert.equal(p.credentialEvents[0].memberId, 42);
    for (const opts of [{type: 0}, {type: 2}, {admin: 4}, {member: 0}, {stage: 17}])
        assert.equal(s.handle(2, payload(54, opts)).credentialEvents.length, 0);
});
test("enrollment binds independent peer sequence on start, follows progress, and ignores mismatched and premature completion", async () => {
    const {c, sent, publish} = fixture();
    const done = c.manageCredential("enroll", request, publish);
    await tick();
    assert.equal(sent.length, 1);
    assert.notEqual(c.operation.sequence, 5000);
    assert.deepEqual(await reply(c, 54, {stage: 255}), {});
    assert.deepEqual(await reply(c, 54, {member: 43}), {});
    assert.deepEqual(await reply(c, 54, {admin: 1}), {});
    const accepted = await reply(c, 54);
    assert.equal(accepted.credential_status, "enrolling");
    assert.equal(accepted.credential_id, 7);
    assert.equal(accepted.credential_total, 3);
    for (const opts of [
        {stage: 255, sequence: 5001},
        {stage: 255, id: 8},
    ])
        assert.deepEqual(await reply(c, 54, opts), {});
    assert.equal((await reply(c, 54, {stage: 252, count: 1})).credential_progress, 1);
    assert.equal(c.busy, true);
    await assert.rejects(c.operate("UNLOCK"), /active/);
    await reply(c, 54, {stage: 255, count: 3});
    const result = await done;
    assert.equal(result.credential_status, "success");
    assert.equal(result.credential_progress, 3);
    assert.equal(c.busy, false);
    assert.equal(sent.length, 1);
    assert.deepEqual(await reply(c, 54, {stage: 255}), {});
    c.stop();
});
test("PIN enrollment accepts the observed start-total 2 and final counter 1, keeping the PIN on the keypad", async () => {
    const {c, sent} = fixture();
    const done = c.manageCredential("enroll", {...request, type: "pin"});
    await tick();
    await reply(c, 54, {type: 1, count: 2});
    await reply(c, 54, {type: 1, stage: 252, count: 1});
    await reply(c, 54, {type: 1, stage: 255, count: 1});
    const state = await done;
    assert.equal(state.credential_status, "success");
    assert.equal(state.credential_total, 2);
    assert.equal(state.credential_progress, 1);
    assert.equal(decrypt(sent[0].payload, key).length, 19);
    c.stop();
});
test("single deletion requires matching request sequence, member, kind, role and ID; only FF means success", async () => {
    const {c, sent} = fixture();
    const done = c.manageCredential("delete", {...request, credential_id: 7});
    await tick();
    const sequence = c.operation.sequence;
    for (const opts of [{sequence: sequence + 1}, {sequence, member: 43}, {sequence, id: 8}, {sequence, type: 1}, {sequence, admin: 1}])
        assert.deepEqual(await reply(c, 55, {...opts, count: 1, status: 255}), {});
    await reply(c, 55, {sequence, count: 1, status: 255});
    assert.equal((await done).credential_status, "success");
    assert.equal(sent.length, 1);
    c.stop();
});
test("rejected deletion and enrollment fail without motor movement or automatic retry", async () => {
    for (const [action, dp, event] of [
        ["delete", 55, {count: 1, status: 1}],
        ["enroll", 54, {stage: 253, status: 2}],
    ]) {
        const {c, sent, published, publish} = fixture();
        const check = assert.rejects(
            c.manageCredential(action, {...request, ...(action === "delete" ? {credential_id: 7} : {})}, publish),
            /rejected|failed/,
        );
        await tick();
        await reply(c, dp, {...event, sequence: action === "delete" ? c.operation.sequence : 5000});
        await check;
        assert.equal(published.at(-1).credential_status, "failed");
        assert.equal(published.at(-1).credential_error, action === "delete" ? "not_found" : "duplicate");
        assert.equal(sent.length, 1);
        c.stop();
    }
});
test("cancellation sends only a cancel DP54 and waits for the peer, without auto-deleting an enrolled credential", async () => {
    const {c, sent} = fixture();
    const done = c.manageCredential("enroll", request);
    await tick();
    await reply(c, 54);
    await c.cancelEnrollment();
    assert.equal(c.busy, true);
    assert.equal(sent.length, 2);
    assert.equal(decrypt(sent[1].payload, key)[7], 254);
    await reply(c, 54, {stage: 254});
    assert.equal((await done).credential_status, "cancelled");
    await assert.rejects(c.cancelEnrollment(), /no active/);
    assert.equal(sent.length, 2);
    c.stop();
});
test("timeout and late enrollment completion never retry or perform an unsolicited delete", async () => {
    const {c, sent, published, publish} = fixture({enrollmentTimeout: 15});
    await assert.rejects(c.manageCredential("enroll", request, publish), /timeout/);
    assert.equal(published.at(-1).credential_status, "timeout");
    assert.equal(c.busy, false);
    assert.deepEqual(await reply(c, 54), {});
    assert.deepEqual(await reply(c, 54, {stage: 255}), {});
    assert.equal(sent.length, 1);
    c.stop();
});
test("stop interrupts enrollment, and checkpoint restores only cryptographic state without credentials or queued operations", async () => {
    const {c, store, sent, device} = fixture();
    const done = assert.rejects(c.manageCredential("enroll", request), /stopped/);
    await tick();
    c.stop();
    await done;
    const snapshot = await store.load(device.ieeeAddr);
    assert.equal(Object.hasOwn(snapshot, "operation"), false);
    assert.equal(Object.hasOwn(snapshot, "request"), false);
    const restored = new LockController(device, {stateStore: store, send: async (_ep, packets) => sent.push(...packets)});
    await restored.begin();
    assert.equal(sent.length, 1);
    restored.stop();
});
test("converter publishes only credential metadata, and never changes lock state or echoes the command payload", async () => {
    const {device, store, sent} = fixture();
    await store.save(device.ieeeAddr, session().snapshot());
    const def = createDefinition({stateStore: store, send: async (_ep, packets) => sent.push(...packets)});
    const pub = [];
    const conv = def.toZigbee.find((x) => x.key.includes("credential_enroll"));
    const done = conv.convertSet({}, "credential_enroll", request, {device, publish: (x) => pub.push(x)});
    await tick();
    for (const stage of [0, 252, 255]) await def.fromZigbee[0].convert(def, {device, type: "commandReport", data: {payload: payload(54, {stage})}});
    const result = await done;
    assert.equal(result.state.credential_status, "success");
    assert.equal(Object.hasOwn(result.state, "state"), false);
    assert.equal(Object.hasOwn(result.state, "credential_enroll"), false);
    assert.equal(JSON.stringify(result).includes("pin_code"), false);
    assert.equal(pub[0].credential_status, "starting");
    await def.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
});

test("a completed enrollment sequence cannot attach late packets to a later enrollment", async () => {
    const {c} = fixture({clock: () => 5000});
    const first = c.manageCredential("enroll", request);
    await tick();
    await reply(c, 54);
    await reply(c, 54, {stage: 255});
    await first;
    c.lastCommandAt = 0;
    const second = c.manageCredential("enroll", request);
    await tick();
    assert.deepEqual(await reply(c, 54), {});
    assert.deepEqual(await reply(c, 54, {stage: 255}), {});
    await reply(c, 54, {sequence: 5001, id: 8});
    await reply(c, 54, {sequence: 5001, id: 8, stage: 255});
    assert.equal((await second).credential_id, 8);
    c.stop();
});
const volumeReply = (level, sequence = 6) => {
    const header = Buffer.alloc(2);
    header.writeUInt16BE(sequence);
    return encrypt(Buffer.concat([header, encodePoint(19, 4, Buffer.from([level]))]), key);
};
test("volume uses DP19 enum with exactly one byte for levels 0 through 9", () => {
    for (let n = 0; n <= 9; n++) {
        const packet = session().volume(String(n));
        assert.equal(decrypt(packet.payload, key).subarray(2, -6).toString("hex"), `13040001${n.toString(16).padStart(2, "0")}`);
    }
});
test("volume accepts only single-digit levels or integer numbers, rejecting ambiguous and out-of-range inputs", () => {
    for (let n = 0; n <= 9; n++) {
        assert.equal(validateVolume(n), String(n));
        assert.equal(validateVolume(String(n)), String(n));
    }
    for (const value of [-1, 10, 1.5, Number.NaN, Number.POSITIVE_INFINITY, null, true, false, {}, [], "", "00", " 1", "mute", "1.0"])
        assert.throws(() => validateVolume(value), /volume must/);
});
test("volume selector is native enum with state feedback; valid reports are strings and invalid values are ignored", () => {
    const expose = createDefinition().exposes.find((x) => x.name === "sound_volume");
    assert.equal(expose.type, "enum");
    assert.equal(expose.access, 3);
    assert.equal(expose.category, "config");
    assert.deepEqual(expose.values, ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    assert.deepEqual(session().handle(2, volumeReply(0)).state, {sound_volume: "0"});
    assert.deepEqual(session().handle(2, volumeReply(9)).state, {sound_volume: "9"});
    assert.deepEqual(session().handle(2, volumeReply(10)).state, {});
});
test("volume change waits for a matching DP19 value and sequence, without optimistic state or motor requests", async () => {
    const {c, sent} = fixture();
    const done = c.setVolume("2");
    await tick();
    const sequence = c.operation.sequence;
    await c.receive(2, volumeReply(2, sequence + 1));
    assert.equal(c.busy, true);
    await c.receive(2, volumeReply(1, sequence));
    assert.equal(c.busy, true);
    await assert.rejects(c.manageCredential("enroll", request), /active/);
    await c.receive(2, volumeReply(2, sequence));
    assert.deepEqual(await done, {sound_volume: "2"});
    assert.equal(sent.length, 1);
    assert.equal(c.busy, false);
    c.stop();
});
test("volume timeout, stop and radio failure discard the operation without replaying it", async () => {
    const timeout = fixture({commandTimeout: 15});
    await assert.rejects(timeout.c.setVolume("0"), /timeout/);
    assert.equal(timeout.sent.length, 1);
    assert.equal(timeout.c.busy, false);
    timeout.c.stop();
    let calls = 0;
    const failed = fixture({
        send: async () => {
            calls++;
            throw new Error("radio");
        },
    });
    await assert.rejects(failed.c.setVolume("0"), /delivery failed/);
    assert.equal(calls, 1);
    failed.c.stop();
    const stopped = fixture();
    const done = assert.rejects(stopped.c.setVolume("0"), /stopped/);
    await tick();
    stopped.c.stop();
    await done;
    assert.equal(stopped.sent.length, 1);
});
test("volume setter rejects malformed input before any radio access", async () => {
    const {c, sent} = fixture();
    await assert.rejects(c.setVolume(100), /volume must/);
    assert.equal(sent.length, 0);
    assert.equal(c.busy, false);
    c.stop();
});
