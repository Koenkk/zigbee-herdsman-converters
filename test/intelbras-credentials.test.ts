import {createCipheriv, createDecipheriv} from "node:crypto";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {definitions} from "../src/devices/intelbras";
import {prepareDefinition} from "../src/index";
import type {Fz, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

const definition = prepareDefinition(definitions[0]);
const request = {type: "fingerprint", member_id: 1, administrator: true};
const ieeeAddr = "0x0011223344556677";
let device: ReturnType<typeof mockDevice>;
let publish: ReturnType<typeof vi.fn>;
const converter = definition.toZigbee.find((c) => c.key.includes("credential_enroll"));
const be16 = (n: number) => Buffer.from([n >> 8, n & 255]);
function crypt(decrypt: boolean, data: Buffer) {
    const key = Buffer.from(device.meta.intelbrasLock.key, "hex");
    const cipher = decrypt ? createDecipheriv("aes-128-ecb", key, null) : createCipheriv("aes-128-ecb", key, null);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}
function set(key: string, value: unknown) {
    return converter.convertSet(device.getEndpoint(1), key, value, {device, publish} as unknown as Tz.Meta);
}
function reply(
    stage = 0,
    opts: {
        dp?: number;
        sequence?: number;
        id?: number;
        member?: number;
        type?: number;
        administrator?: number;
        progress?: number;
        status?: number;
        length?: number;
        dpType?: number;
    } = {},
) {
    const value = Buffer.concat([
        Buffer.from([opts.type ?? 3, stage, opts.administrator ?? 1]),
        be16(opts.member ?? 1),
        be16(opts.id ?? 23),
        Buffer.from([opts.progress ?? 3, opts.status ?? 0]),
    ]);
    const plain = Buffer.concat([
        be16(opts.sequence ?? 5000),
        Buffer.from([opts.dp ?? 54, opts.dpType ?? 0]),
        be16(opts.length ?? value.length),
        value,
    ]);
    return definition.fromZigbee[0].convert(
        definition,
        {device, type: "commandReport", data: {payload: crypt(false, plain)}} as unknown as Fz.Message,
        publish,
        {},
        {} as Fz.Meta,
    );
}
function sent() {
    const calls = vi.mocked(device.getEndpoint(1).command).mock.calls;
    return crypt(true, (calls.at(-1)[2] as {payload: Buffer}).payload);
}
beforeEach(() => {
    vi.useFakeTimers();
    device = mockDevice({ieeeAddr, endpoints: [{ID: 1}]});
    vi.spyOn(device, "save").mockImplementation(() => {});
    device.meta.intelbrasLock = {
        phase: "ready",
        baseKey: "11".repeat(16),
        nonce: "22".repeat(4),
        key: "33".repeat(16),
        sequence: 34,
        replay: 89,
        authKey: "01234567",
    };
    publish = vi.fn();
});
afterEach(async () => {
    await definition.onEvent?.({type: "stop", data: {ieeeAddr}});
    vi.useRealTimers();
});

describe("Intelbras credentials owned by the lock", () => {
    it.each(["pin", "fingerprint"])("sends only the enrollment request for %s, with lock allocation sentinel", async (type) => {
        const before = structuredClone(device.meta.intelbrasLock);
        await set("credential_enroll", {...request, type});
        const packet = sent();
        expect(packet.subarray(0, 13)).toEqual(Buffer.concat([be16(35), Buffer.from([54, 0, 0, 7, type === "pin" ? 1 : 3, 0, 1, 0, 1, 3, 231])]));
        expect(publish).toHaveBeenLastCalledWith(expect.objectContaining({credential_status: "starting", credential_id: null}));
        expect(device.meta.intelbrasLock).toEqual({...before, sequence: 35, replay: 90});
    });
    it("tracks the lock-assigned ID and response sequence independently of the request sequence", async () => {
        await set("credential_enroll", request);
        expect(await reply(0)).toMatchObject({credential_status: "enrolling", credential_id: 23, credential_total: 3});
        expect(await reply(0xfc, {progress: 1})).toMatchObject({credential_status: "enrolling", credential_progress: 1});
        expect(await reply(0xff, {progress: 3})).toMatchObject({credential_status: "success", credential_id: 23, credential_progress: 3});
        await vi.advanceTimersByTimeAsync(90_000);
        expect(publish).not.toHaveBeenCalledWith(expect.objectContaining({credential_status: "timeout"}));
        await set("credential_enroll", request);
    });
    it("does not infer success from progress or accept a terminal message before enrollment starts", async () => {
        await set("credential_enroll", request);
        expect(await reply(0xff)).toEqual({});
        await reply(0);
        expect(await reply(0xfc, {progress: 3})).toMatchObject({credential_status: "enrolling"});
        await expect(set("credential_enroll", request)).rejects.toThrow("already active");
    });
    it("ignores response sequences already observed before the request", async () => {
        expect(await reply()).toMatchObject({credential_id: 23});
        await set("credential_enroll", request);
        expect(await reply()).toEqual({});
        expect(await reply(0xff)).toEqual({});
        expect(await reply(0, {sequence: 5001, id: 24})).toMatchObject({credential_id: 24});
        expect(await reply(0xff, {sequence: 5001, id: 24})).toMatchObject({credential_status: "success"});
    });
    it.each([{sequence: 5001}, {id: 24}, {member: 2}, {type: 1}, {administrator: 0}, {dp: 55}])("ignores unrelated replies %j", async (opts) => {
        await set("credential_enroll", request);
        await reply();
        expect(await reply(0xff, opts)).toEqual({});
        await expect(set("credential_delete", {...request, credential_id: 23})).rejects.toThrow("already active");
    });
    it("reports lock rejection without inventing an assigned ID", async () => {
        await set("credential_enroll", request);
        expect(await reply(0xfd, {id: 999, status: 2})).toMatchObject({
            credential_status: "failed",
            credential_id: null,
            credential_error: "duplicate",
            credential_code: 2,
        });
        await set("credential_enroll", request);
    });
    it.each([
        undefined,
        null,
        [],
        "pin",
        {...request, pin: "123456"},
        {...request, type: "tag"},
        {...request, member_id: 0},
        {...request, member_id: 1000},
        {...request, administrator: "true"},
        {...request, credential_id: 23},
    ])("rejects invalid enrollment input %j without transmitting", async (value) => {
        await expect(set("credential_enroll", value)).rejects.toThrow("Invalid credential");
        expect(device.getEndpoint(1).command).not.toHaveBeenCalled();
    });
    it.each([undefined, 0, 999, 1000, 1.5, "23"])("rejects unsafe deletion ID %s", async (credentialId) => {
        await expect(set("credential_delete", {...request, credential_id: credentialId})).rejects.toThrow("exactly one");
        expect(device.getEndpoint(1).command).not.toHaveBeenCalled();
    });
    it("deletes one explicit credential and waits for a matching hardware result", async () => {
        await set("credential_delete", {...request, credential_id: 23});
        expect(sent().subarray(2, 14)).toEqual(Buffer.from([55, 0, 0, 8, 3, 0, 1, 0, 1, 0, 23, 1]));
        expect(await reply(0, {dp: 55, sequence: 36, progress: 1, status: 255})).toEqual({});
        expect(await reply(0, {dp: 55, sequence: 35, id: 24, progress: 1, status: 255})).toEqual({});
        expect(await reply(0, {dp: 55, sequence: 35, progress: 1, status: 255})).toMatchObject({credential_status: "success", credential_id: 23});
        await set("credential_enroll", request);
    });
    it.each([
        [0, "rejected"],
        [1, "not_found"],
        [2, "protected"],
    ])("reports deletion status %s as %s", async (status, error) => {
        await set("credential_delete", {...request, credential_id: 23});
        expect(await reply(0, {dp: 55, sequence: 35, progress: 1, status: Number(status)})).toMatchObject({
            credential_status: "failed",
            credential_error: error,
        });
    });
    it("keeps cancellation pending until a matching response and rejects duplicate cancellation", async () => {
        await set("credential_enroll", request);
        await reply();
        await set("credential_cancel", "CANCEL");
        expect(sent().subarray(0, 13)).toEqual(Buffer.from([0, 36, 54, 0, 0, 7, 3, 254, 1, 0, 1, 3, 231]));
        await expect(set("credential_cancel", "CANCEL")).rejects.toThrow("No cancellable");
        expect(await reply(0xfe, {sequence: 4000, id: 24})).toEqual({});
        expect(await reply(0xfe, {sequence: 5000})).toMatchObject({credential_status: "cancelled"});
        await set("credential_enroll", request);
    });
    it("accepts cancellation before the first reply using the cancellation request sequence", async () => {
        await set("credential_enroll", request);
        await set("credential_cancel", "CANCEL");
        expect(await reply(0xfe, {sequence: 36, id: 999})).toMatchObject({credential_status: "cancelled", credential_id: null});
    });
    it("accepts fresh lock-assigned cancellation sequences but rejects a previously observed cancellation", async () => {
        await reply(0xfe, {sequence: 4000, id: 999, status: 1});
        await set("credential_enroll", request);
        await reply();
        await set("credential_cancel", "CANCEL");
        expect(await reply(0xfe, {sequence: 4000, id: 999, status: 1})).toEqual({});
        expect(await reply(0xfe, {sequence: 5001, id: 999, status: 1})).toMatchObject({
            credential_status: "cancelled",
            credential_id: null,
            credential_code: 1,
        });
    });
    it("rejects cancellation without an enrollment", async () => {
        await expect(set("credential_cancel", "CANCEL")).rejects.toThrow("No cancellable");
        await set("credential_delete", {...request, credential_id: 23});
        await expect(set("credential_cancel", "CANCEL")).rejects.toThrow("No cancellable");
    });
    it("does not interrupt enrollment with remote motor or volume commands", async () => {
        await set("credential_enroll", request);
        const control = definition.toZigbee.find((c) => c.key.includes("state"));
        for (const [key, value] of [
            ["state", "UNLOCK"],
            ["sound_volume", "0"],
        ]) {
            await expect(control.convertSet(device.getEndpoint(1), key, value, {device, publish} as unknown as Tz.Meta)).rejects.toThrow(
                "credential operation is active",
            );
        }
        expect(device.getEndpoint(1).command).toHaveBeenCalledOnce();
    });
    it.each([
        ["credential_enroll", 90_000],
        ["credential_delete", 15_000],
    ])("expires %s without retransmission or a local credential list", async (key, timeout) => {
        await set(String(key), key === "credential_delete" ? {...request, credential_id: 23} : request);
        await vi.advanceTimersByTimeAsync(Number(timeout));
        expect(publish).toHaveBeenLastCalledWith({credential_status: "timeout", credential_error: "timeout"});
        expect(device.getEndpoint(1).command).toHaveBeenCalledOnce();
        expect(Object.keys(device.meta)).toEqual(["intelbrasLock"]);
        await set("credential_enroll", request);
    });
    it("handles uncertain delivery without retrying or losing late replies", async () => {
        vi.mocked(device.getEndpoint(1).command).mockRejectedValueOnce(new Error("radio"));
        await expect(set("credential_enroll", request)).rejects.toThrow("uncertain");
        expect(publish).toHaveBeenLastCalledWith({credential_status: "unknown", credential_error: "delivery"});
        await expect(set("credential_enroll", request)).rejects.toThrow("already active");
        await reply();
        expect(await reply(0xff)).toMatchObject({credential_status: "success"});
        expect(device.getEndpoint(1).command).toHaveBeenCalledOnce();
    });
    it("interrupts pending enrollment when the session changes", async () => {
        await set("credential_enroll", request);
        await definition.fromZigbee[0].convert(
            definition,
            {device, type: "commandReport", data: {payload: Buffer.alloc(0)}} as unknown as Fz.Message,
            publish,
            {},
            {} as Fz.Meta,
        );
        expect(publish).toHaveBeenLastCalledWith({credential_status: "interrupted", credential_error: "interrupted"});
    });
    it("cleans up timers and never resumes a pending operation on stop", async () => {
        await set("credential_enroll", request);
        await definition.onEvent({type: "stop", data: {ieeeAddr}});
        expect(publish).toHaveBeenLastCalledWith({credential_status: "interrupted", credential_error: "interrupted"});
        await vi.advanceTimersByTimeAsync(90_000);
        expect(device.getEndpoint(1).command).toHaveBeenCalledOnce();
        await set("credential_enroll", request);
    });
    it.each([{length: 10}, {length: 8}, {dpType: 1}, {type: 2}, {administrator: 2}, {id: 0}, {member: 0}])(
        "ignores malformed report %j",
        async (opts) => {
            await set("credential_enroll", request);
            expect(await reply(0, opts)).toEqual({});
        },
    );
});
