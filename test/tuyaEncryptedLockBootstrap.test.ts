import {setImmediate as tick} from "node:timers/promises";
import {afterEach, describe, expect, it, vi} from "vitest";
import {decrypt, encodePoint, encrypt, LockController, LockSession} from "../src/lib/tuyaEncryptedLock";
import {type AuthorizationSnapshot, authorizationMetaKey, authorizationPolicy, deviceAuthorizationStore} from "../src/lib/tuyaLockAuthorization";
import {sessionMetaKey} from "../src/lib/tuyaLockSession";
import {mockDevice} from "./utils";

const ieeeAddr = "0x0011223344556677";
const base = Buffer.from("00112233445566778899aabbccddeeff", "hex");
const a = Buffer.from("01020304", "hex");
const key = Buffer.concat([a, Buffer.from("05060708", "hex"), Buffer.from("tuya22ff")]);
const now = 1800000000000;
const controllers: LockController[] = [];
afterEach(() => {
    for (const c of controllers.splice(0)) c.stop();
});
function readySession() {
    const session = new LockSession(ieeeAddr, {random: (n) => Buffer.from(n === 16 ? base : a), now: () => now});
    session.start();
    session.handle(0x21, encrypt(Buffer.from("000256000000", "hex"), Buffer.from(ieeeAddr.slice(2))));
    session.handle(0x22, encrypt(Buffer.from("00035500000405060708", "hex"), base));
    return session;
}
function fixture(stage?: AuthorizationSnapshot["stage"]) {
    const device = mockDevice({ieeeAddr, modelID: "TY0A01", endpoints: [{ID: 1}]});
    vi.spyOn(device, "save");
    const packets: {command: string; payload: Buffer; sequence?: number}[] = [];
    const generated = vi.fn(() => ({keyId: 1, key: Buffer.from("12345678")}));
    if (stage)
        device.meta[authorizationMetaKey] = {
            version: 1,
            ieeeAddr,
            stage,
            keyId: 1,
            key: Buffer.from("12345678").toString("hex"),
            policy: authorizationPolicy(now),
            used: 0,
        };
    const send = vi.fn((_ep, sent) => {
        packets.push(...sent);
        return Promise.resolve();
    });
    const c = new LockController(device, {session: readySession(), send, now: () => now, generateAuthorization: generated, commandTimeout: 200});
    controllers.push(c);
    const snapshot = () => structuredClone(device.meta[authorizationMetaKey]) as AuthorizationSnapshot;
    const ack = (dp = 48, status = 0, seq = packets.at(-1).sequence, id = 1) => {
        const prefix = Buffer.alloc(2);
        prefix.writeUInt16BE(seq);
        const value = Buffer.alloc(3);
        value[0] = status;
        value.writeUInt16BE(id, 1);
        return c.receive(1, encrypt(Buffer.concat([prefix, encodePoint(dp, 0, value)]), key));
    };
    return {device, c, packets, generated, send, snapshot, ack};
}

describe("IFR7001 local authorization bootstrap", () => {
    it("checkpoints the new candidate and pending stage before transmitting DP48, and confirms only a matching acknowledgement", async () => {
        const f = fixture();
        f.send.mockImplementationOnce((_ep, sent) => {
            expect(f.snapshot().stage).toBe("pending");
            expect(f.device.meta[sessionMetaKey]).toBeDefined();
            f.packets.push(...sent);
            return Promise.resolve();
        });
        const setup = f.c.configureAuthorization();
        await tick();
        expect(f.generated).toHaveBeenCalledExactlyOnceWith(1);
        const plain = decrypt(f.packets[0].payload, key);
        expect(plain.subarray(2, 6)).toEqual(Buffer.from("30000015", "hex"));
        expect(plain[6]).toBe(1);
        expect(plain.subarray(19, 27)).toEqual(Buffer.from("12345678"));
        await f.ack(48, 0, f.packets[0].sequence + 1);
        await f.ack(48, 0, f.packets[0].sequence, 2);
        expect(f.snapshot().stage).toBe("pending");
        await f.ack();
        await setup;
        expect(f.snapshot().stage).toBe("confirmed");
        expect(f.packets).toHaveLength(1);
    });
    it("waits for DP48 success before an explicitly requested motor command, and never publishes optimistic state", async () => {
        const f = fixture();
        const operation = f.c.operate("UNLOCK");
        await tick();
        expect(f.packets).toHaveLength(1);
        await f.ack();
        await tick();
        expect(f.packets).toHaveLength(2);
        expect(decrypt(f.packets[1].payload, key)[2]).toBe(49);
        expect(f.snapshot().used).toBe(1);
        await f.ack(49);
        const seq = Buffer.alloc(2);
        seq.writeUInt16BE(20);
        await f.c.receive(2, encrypt(Buffer.concat([seq, encodePoint(57, 1, Buffer.from([1]))]), key));
        await operation;
    });
    it("preserves a rejected candidate and blocks the motor without regenerating or automatically retrying", async () => {
        const f = fixture();
        const result = expect(f.c.operate("UNLOCK")).rejects.toThrow("rejected");
        await tick();
        await f.ack(48, 1);
        await result;
        expect(f.snapshot().stage).toBe("uncertain");
        await expect(f.c.operate("UNLOCK")).rejects.toThrow("reconfigure");
        expect(f.packets).toHaveLength(1);
        expect(f.generated).toHaveBeenCalledTimes(1);
    });
    it.each(["pending", "uncertain"] as const)(
        "blocks a motor request after restarting in %s stage, while configuration retries the same key",
        async (stage) => {
            const f = fixture(stage);
            await expect(f.c.operate("LOCK")).rejects.toThrow("reconfigure");
            expect(f.packets).toHaveLength(0);
            const old = f.snapshot();
            const result = f.c.configureAuthorization();
            await tick();
            await f.ack();
            await result;
            expect(f.snapshot()).toMatchObject({...old, stage: "confirmed"});
            expect(f.generated).not.toHaveBeenCalled();
            expect(f.packets).toHaveLength(1);
        },
    );
    it("marks timed-out provisioning uncertain; late acknowledgement cannot confirm or actuate", async () => {
        const f = fixture();
        await expect(f.c.configureAuthorization()).rejects.toThrow("timeout");
        expect(f.snapshot().stage).toBe("uncertain");
        await f.ack();
        expect(f.snapshot().stage).toBe("uncertain");
        expect(f.packets).toHaveLength(1);
    });
    it("does not send anything when the candidate checkpoint fails", async () => {
        const f = fixture();
        vi.mocked(f.device.save).mockImplementationOnce(() => {
            throw new Error("disk full");
        });
        await expect(f.c.configureAuthorization()).rejects.toThrow("checkpoint failed");
        expect(f.packets).toHaveLength(0);
        expect(f.device.meta[authorizationMetaKey]).toBeUndefined();
    });
    it("does not actuate when confirmation cannot be persisted", async () => {
        const f = fixture();
        const result = expect(f.c.operate("UNLOCK")).rejects.toThrow("checkpoint failed");
        await tick();
        vi.mocked(f.device.save).mockImplementation(() => {
            throw new Error("disk full");
        });
        await f.ack();
        await result;
        expect(f.snapshot().stage).toBe("pending");
        expect(f.packets).toHaveLength(1);
    });
    it("restores confirmed authorization without provisioning again on restart or configuration", async () => {
        const f = fixture("confirmed");
        await f.c.configureAuthorization();
        expect(f.generated).not.toHaveBeenCalled();
        expect(f.packets).toHaveLength(0);
        const second = new LockController(f.device, {session: readySession(), send: f.send, now: () => now});
        controllers.push(second);
        await second.configureAuthorization();
        expect(f.packets).toHaveLength(0);
    });
    it.each(["expired", "exhausted"])("renews an %s policy with the same key and requires fresh confirmation", async (reason) => {
        const f = fixture("confirmed");
        const old = f.snapshot();
        f.device.meta[authorizationMetaKey] = {
            ...old,
            ...(reason === "expired" ? {policy: {...old.policy, validTo: now / 1000 - 1}} : {used: 65535}),
        };
        const result = f.c.configureAuthorization();
        await tick();
        expect(f.snapshot().stage).toBe("pending");
        await f.ack();
        await result;
        expect(f.snapshot()).toMatchObject({stage: "confirmed", key: old.key, used: 0});
        expect(f.generated).not.toHaveBeenCalled();
    });
    it("refuses corrupted authorization without creating a replacement or sending packets", async () => {
        const f = fixture("confirmed");
        f.device.meta[authorizationMetaKey] = {...f.snapshot(), key: "invalid"};
        await expect(f.c.configureAuthorization()).rejects.toThrow("Invalid Tuya lock authorization");
        expect(f.packets).toHaveLength(0);
        expect(f.generated).not.toHaveBeenCalled();
    });
    it("ordinary announcements preserve confirmation, while an actual network join invalidates it without replacing the credential", async () => {
        const f = fixture("confirmed");
        const original = f.snapshot();
        await f.c.begin();
        expect(f.packets).toHaveLength(0);
        expect(f.snapshot()).toEqual(original);
        await f.c.joinedNetwork();
        expect(f.snapshot()).toEqual({...original, stage: "prepared"});
        expect(f.packets.map((packet) => packet.command)).toEqual(["baseKey"]);
        await f.c.joinedNetwork();
        expect(f.packets).toHaveLength(1);
        expect(f.generated).not.toHaveBeenCalled();
    });
    it("keeps a prepared candidate but sends nothing if saving the pending marker fails", async () => {
        const f = fixture();
        vi.mocked(f.device.save)
            .mockImplementationOnce(() => {})
            .mockImplementationOnce(() => {
                throw new Error("disk full");
            });
        await expect(f.c.configureAuthorization()).rejects.toThrow("checkpoint failed");
        expect(f.packets).toHaveLength(0);
        expect(f.snapshot().stage).toBe("prepared");
        expect(f.generated).toHaveBeenCalledTimes(1);
    });
    it("store rejects a foreign IEEE address, clones values and restores metadata on persistence failure", async () => {
        const f = fixture("confirmed");
        const store = deviceAuthorizationStore(f.device);
        await expect(store.load("0x8899aabbccddeeff")).rejects.toThrow("device");
        const original = f.snapshot();
        const loaded = await store.load(ieeeAddr);
        loaded.stage = "pending";
        expect(f.snapshot()).toEqual(original);
        vi.mocked(f.device.save).mockImplementationOnce(() => {
            throw new Error("disk full");
        });
        await expect(store.save(ieeeAddr, loaded)).rejects.toThrow("checkpoint failed");
        expect(f.snapshot()).toEqual(original);
    });
});
