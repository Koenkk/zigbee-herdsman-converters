import {mkdtempSync, rmSync} from "node:fs";
import {join} from "node:path";
import {describe, expect, it, vi} from "vitest";
import {Device, Entity} from "zigbee-herdsman/dist/controller/model";
import {InterviewState} from "zigbee-herdsman/dist/controller/model/device";
import {type AuthorizationSnapshot, authorizationPolicy, deviceAuthorizationStore} from "../src/lib/tuyaLockAuthorization";
import {deviceSessionStore, type SessionSnapshot, sessionMetaKey} from "../src/lib/tuyaLockSession";
import {mockDevice} from "./utils";

const ieee = "0x0011223344556677";
function ready(): SessionSnapshot {
    return {
        version: 1,
        ieeeAddr: ieee,
        phase: "ready",
        baseConfirmed: true,
        baseKey: "00112233445566778899aabbccddeeff",
        nonceA: "01020304",
        key: "01020304050607087475796132326666",
        sequence: 40,
        replaySequence: 50,
        baseSequence: 2,
        sessionSequence: 3,
    };
}
const device = () => mockDevice({modelID: "TY0A01", ieeeAddr: ieee, endpoints: []});

describe("Tuya encrypted lock persistence", () => {
    it("survives reopening the real herdsman database and recreating device objects", async () => {
        const {Database} = await vi.importActual<typeof import("zigbee-herdsman/dist/controller/database")>(
            "zigbee-herdsman/dist/controller/database",
        );
        const directory = mkdtempSync(join(process.cwd(), ".tuya-lock-session-test-"));
        const path = join(directory, "database.db");
        try {
            Entity.injectDatabase(Database.open(path));
            Device.resetCache();
            const first = Device.create(
                "EndDevice",
                ieee,
                1234,
                undefined,
                "_TYST12_snr3p274",
                "Battery",
                "TY0A01",
                InterviewState.Successful,
                undefined,
            );
            const authorization: AuthorizationSnapshot = {
                version: 1,
                ieeeAddr: ieee,
                stage: "confirmed",
                keyId: 1,
                key: Buffer.from("12345678").toString("hex"),
                policy: authorizationPolicy(1800000000000),
                used: 3,
            };
            await deviceAuthorizationStore(first).save(ieee, authorization);
            await deviceSessionStore(first).save(ieee, ready());
            Device.resetCache();
            Entity.injectDatabase(Database.open(path));
            const restored = Device.find(ieee);
            expect(restored).toBeDefined();
            expect(restored).not.toBe(first);
            if (!restored) throw new Error("Missing restored synthetic device");
            expect(await deviceSessionStore(restored).load(ieee)).toEqual(ready());
            expect(await deviceAuthorizationStore(restored).load(ieee)).toEqual(authorization);
        } finally {
            Device.resetCache();
            rmSync(directory, {recursive: true, force: true});
        }
    });
    it("uses the device database, preserves other metadata, and restores a detached checkpoint", async () => {
        const d = device();
        d.meta.configured = 1;
        const save = vi.spyOn(d, "save");
        const first = deviceSessionStore(d);
        const snapshot = ready();
        await first.save(ieee, snapshot);
        snapshot.sequence = 1;
        expect(save).toHaveBeenCalledWith();
        expect(d.meta.configured).toBe(1);
        const restarted = device();
        restarted.meta = JSON.parse(JSON.stringify(d.meta));
        const state = await deviceSessionStore(restarted).load(ieee);
        expect(state?.sequence).toBe(40);
        if (state) state.sequence = 2;
        expect((await first.load(ieee))?.sequence).toBe(40);
    });
    it("returns no session for a new device and keeps each device separate", async () => {
        expect(await deviceSessionStore(device()).load(ieee)).toBeUndefined();
        const first = device();
        await deviceSessionStore(first).save(ieee, ready());
        expect(await deviceSessionStore(device()).load(ieee)).toBeUndefined();
        await expect(deviceSessionStore(first).load("0x1122334455667788")).rejects.toThrow("device");
    });
    it("restores pending nonce renewal with its old key and reserved counters", async () => {
        const d = device();
        const state: SessionSnapshot = {
            ...ready(),
            phase: "session",
            key: undefined,
            sequence: 42,
            replaySequence: 52,
            sessionSequence: 42,
            nonceA: "05060708",
            previous: ready(),
        };
        await deviceSessionStore(d).save(ieee, state);
        const restored = device();
        restored.meta = JSON.parse(JSON.stringify(d.meta));
        expect(await deviceSessionStore(restored).load(ieee)).toEqual({...state, key: undefined});
    });
    it("saves counter reservations before callers can send a packet", async () => {
        const d = device();
        const events: string[] = [];
        vi.spyOn(d, "save").mockImplementation(() => {
            events.push("checkpoint");
        });
        await deviceSessionStore(d).save(ieee, ready());
        events.push("radio");
        expect(events).toEqual(["checkpoint", "radio"]);
    });
    it("blocks radio and rolls back metadata on write failure without exposing secrets", async () => {
        const d = device();
        const store = deviceSessionStore(d);
        const packet = vi.fn();
        await store.save(ieee, ready());
        vi.spyOn(d, "save").mockImplementation(() => {
            throw new Error("secret values from a lower layer");
        });
        await expect(store.save(ieee, {...ready(), sequence: 41}).then(packet)).rejects.toThrow("checkpoint failed");
        expect(packet).not.toHaveBeenCalled();
        expect((await store.load(ieee))?.sequence).toBe(40);
    });
    it.each([
        {version: 2},
        {ieeeAddr: "0x1122334455667788"},
        {key: "bad"},
        {baseKey: "bad"},
        {nonceA: "bad"},
        {phase: "unknown"},
        {phase: "ready", baseConfirmed: false},
        {sequence: 0},
        {replaySequence: 65001},
        {baseSequence: -1},
        {sessionSequence: 0},
        {pendingUnlock: true},
        {credentials: []},
    ])("rejects malformed or foreign checkpoints and queued operations: %j", async (change) => {
        const d = device();
        d.meta[sessionMetaKey] = {...ready(), ...change};
        await expect(deviceSessionStore(d).load(ieee)).rejects.toThrow("Invalid Tuya lock session");
    });
    it("rejects nested or foreign previous checkpoints", async () => {
        for (const previous of [
            {...ready(), previous: ready()},
            {...ready(), baseKey: "ffffffffffffffffffffffffffffffff"},
        ]) {
            const d = device();
            d.meta[sessionMetaKey] = {...ready(), previous};
            await expect(deviceSessionStore(d).load(ieee)).rejects.toThrow("previous");
        }
    });
});
