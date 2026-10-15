import {afterEach, beforeEach, expect, it, vi} from "vitest";
import * as store from "../src/lib/store";
import type {Fz, Tz, Zh} from "../src/lib/types";
import {fzZosung, tzZosung} from "../src/lib/zosung";
import {mockDevice} from "./utils";

const send = (endpoint: Zh.Endpoint, code = "first") => tzZosung.zosung_ir_code_to_send.convertSet(endpoint, "ir_code_to_send", code, {} as Tz.Meta);
const ack = (endpoint: Zh.Endpoint, seq: number) =>
    fzZosung.zosung_send_ir_code_01.convert(
        {} as Parameters<typeof fzZosung.zosung_send_ir_code_01.convert>[0],
        {endpoint, data: {seq}} as Parameters<typeof fzZosung.zosung_send_ir_code_01.convert>[1],
        vi.fn(),
        {},
        {} as Fz.Meta,
    );
const requestChunk = (endpoint: Zh.Endpoint, seq: number) =>
    fzZosung.zosung_send_ir_code_02.convert(
        {} as Parameters<typeof fzZosung.zosung_send_ir_code_02.convert>[0],
        {endpoint, data: {seq, position: 0, maxlen: 64}} as Parameters<typeof fzZosung.zosung_send_ir_code_02.convert>[1],
        vi.fn(),
        {},
        {} as Fz.Meta,
    );
const complete = async (endpoint: Zh.Endpoint, seq: number) => {
    await requestChunk(endpoint, seq);
    return fzZosung.zosung_send_ir_code_04.convert(
        {} as Parameters<typeof fzZosung.zosung_send_ir_code_04.convert>[0],
        {endpoint, data: {seq}} as Parameters<typeof fzZosung.zosung_send_ir_code_04.convert>[1],
        vi.fn(),
        {},
        {} as Fz.Meta,
    );
};
const endpoint = (ieeeAddr = "0x12345678") => mockDevice({modelID: "TS1201", ieeeAddr, endpoints: [{ID: 1}]}).getEndpoint(1);

beforeEach(() => {
    store.clear();
    vi.useFakeTimers();
});
afterEach(() => {
    vi.useRealTimers();
});

it("waits for completion before replacing the frame and advances the sequence", async () => {
    const ep = endpoint();
    const first = send(ep);
    await vi.advanceTimersByTimeAsync(0);
    const second = send(ep, "second");
    await vi.advanceTimersByTimeAsync(0);
    expect(ep.command).toHaveBeenCalledTimes(1);
    expect(store.getValue(ep, "irMessageInfo").data).toContain("first");
    await complete(ep, 0);
    await first;
    await vi.advanceTimersByTimeAsync(0);
    expect(ep.command).toHaveBeenLastCalledWith("zosungIRTransmit", "zosungSendIRCode00", expect.objectContaining({seq: 1}), expect.anything());
    expect(store.getValue(ep, "irMessageInfo").data).toContain("second");
    await complete(ep, 1);
    await second;
});

it("waits for one endpoint to complete before starting another", async () => {
    const a = endpoint();
    const b = endpoint("0x87654321");
    const first = send(a);
    const second = send(b);
    await vi.advanceTimersByTimeAsync(0);
    expect(a.command).toHaveBeenCalledTimes(1);
    expect(b.command).not.toHaveBeenCalled();
    await complete(a, 0);
    await first;
    await vi.advanceTimersByTimeAsync(0);
    expect(b.command).toHaveBeenCalledTimes(1);
    await complete(b, 0);
    await Promise.all([first, second]);
});

it("releases the next sender after initiation fails", async () => {
    const ep = endpoint();
    vi.mocked(ep.command).mockRejectedValueOnce(new Error("disconnected"));
    const first = send(ep);
    const failure = expect(first).rejects.toThrow("disconnected");
    const second = send(ep, "second");
    await vi.advanceTimersByTimeAsync(0);
    await failure;
    expect(ep.command).toHaveBeenCalledTimes(2);
    await complete(ep, 1);
    await second;
});

it("times out a missing completion and releases the queue", async () => {
    const ep = endpoint();
    const first = send(ep);
    const failure = expect(first).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(0);
    const second = send(ep, "second");
    await vi.advanceTimersByTimeAsync(30000);
    await failure;
    expect(ep.command).toHaveBeenCalledTimes(2);
    await complete(ep, 1);
    await second;
});

it("does not complete a new transmission on a stale acknowledgement", async () => {
    const ep = endpoint();
    const first = send(ep);
    const failure = expect(first).rejects.toThrow(/timed out/i);
    const second = send(ep, "second");
    await vi.advanceTimersByTimeAsync(30000);
    await failure;
    await expect(complete(ep, 0)).rejects.toThrow("Unexpected sequence");
    expect(store.getValue(ep, "irMessageInfo").data).toContain("second");
    await complete(ep, 1);
    await second;
});

it("releases the queue when the final acknowledgement fails", async () => {
    const ep = endpoint();
    const first = send(ep);
    const failure = expect(first).rejects.toThrow("disconnected");
    const second = send(ep, "second");
    await vi.advanceTimersByTimeAsync(0);
    await requestChunk(ep, 0);
    vi.mocked(ep.command).mockRejectedValueOnce(new Error("disconnected"));
    await expect(
        fzZosung.zosung_send_ir_code_04.convert(
            {} as Parameters<typeof fzZosung.zosung_send_ir_code_04.convert>[0],
            {endpoint: ep, data: {seq: 0}} as Parameters<typeof fzZosung.zosung_send_ir_code_04.convert>[1],
            vi.fn(),
            {},
            {} as Fz.Meta,
        ),
    ).rejects.toThrow("disconnected");
    await failure;
    await vi.advanceTimersByTimeAsync(0);
    await complete(ep, 1);
    await second;
});

it("wraps the persisted sequence at the protocol limit", async () => {
    const ep = endpoint();
    store.putValue(ep, "seq", 0xffff);
    const sending = send(ep);
    await vi.advanceTimersByTimeAsync(0);
    expect(ep.command).toHaveBeenLastCalledWith("zosungIRTransmit", "zosungSendIRCode00", expect.objectContaining({seq: 0}), expect.anything());
    await complete(ep, 0);
    await sending;
});

it("serializes ZG-IR01 transfers with the zero sequence used by its chunk requests", async () => {
    const ep = mockDevice({modelID: "ZG-IR01", ieeeAddr: "0x12345678", endpoints: [{ID: 1}]}).getEndpoint(1);
    const first = send(ep);
    const second = send(ep, "second");
    await vi.advanceTimersByTimeAsync(0);
    expect(ep.command).toHaveBeenCalledTimes(1);
    await complete(ep, 0);
    await first;
    await vi.advanceTimersByTimeAsync(0);
    expect(ep.command).toHaveBeenLastCalledWith("zosungIRTransmit", "zosungSendIRCode00", expect.objectContaining({seq: 0}), expect.anything());
    expect(store.getValue(ep, "irMessageInfo").data).toContain("second");
    await complete(ep, 0);
    await second;
});

it("ignores a stale Code04 before the first chunk request and retries Code00", async () => {
    const ep = endpoint();
    const sending = send(ep);
    await vi.advanceTimersByTimeAsync(0);
    await ack(ep, 0);
    // A leftover Code04 (ZG-IR01 reuses seq 0) must not complete a transfer whose
    // device never requested a chunk.
    await fzZosung.zosung_send_ir_code_04.convert(
        {} as Parameters<typeof fzZosung.zosung_send_ir_code_04.convert>[0],
        {endpoint: ep, data: {seq: 0}} as Parameters<typeof fzZosung.zosung_send_ir_code_04.convert>[1],
        vi.fn(),
        {},
        {} as Fz.Meta,
    );
    expect(store.getValue(ep, "irMessageInfo").data).toContain("first");
    await vi.advanceTimersByTimeAsync(2000);
    expect(ep.command).toHaveBeenCalledTimes(2);
    await complete(ep, 0);
    await sending;
});

it("stops retrying Code00 once the first chunk request arrives", async () => {
    const ep = endpoint();
    const sending = send(ep);
    await vi.advanceTimersByTimeAsync(0);
    await ack(ep, 0);
    await requestChunk(ep, 0);
    await vi.advanceTimersByTimeAsync(5000);
    // Code00 + Code03 only; a Code00 retransmit would add a third call.
    expect(ep.command).toHaveBeenCalledTimes(2);
    await complete(ep, 0);
    await sending;
});
