import {beforeEach, expect, it, vi} from "vitest";
import * as store from "../src/lib/store";
import type {Zh} from "../src/lib/types";
import {fzZosung, tzZosung} from "../src/lib/zosung";
import {mockDevice} from "./utils";

const endpoint = (modelID = "TS1201", ieeeAddr = "0x12345678") => mockDevice({modelID, ieeeAddr, endpoints: [{ID: 1}]}).getEndpoint(1);
const send = (ep: Zh.Endpoint, code = "first") => tzZosung.zosung_ir_code_to_send.convertSet(ep, "ir_code_to_send", code, {} as never);
const learn = (ep: Zh.Endpoint, value: string) => tzZosung.zosung_learn_ir_code.convertSet(ep, "learn_ir_code", value, {} as never);
const receive = (code: "01" | "02" | "04", ep: Zh.Endpoint, seq: number) =>
    fzZosung[`zosung_send_ir_code_${code}`].convert({} as never, {endpoint: ep, data: {seq, position: 0}} as never, vi.fn(), {}, {} as never);
const complete = async (ep: Zh.Endpoint, seq: number) => {
    await receive("02", ep, seq);
    await receive("04", ep, seq);
};
const lastCode00Seq = (ep: Zh.Endpoint) => vi.mocked(ep.command).mock.lastCall?.[2].seq;

beforeEach(() => {
    store.clear();
    vi.useFakeTimers();
});

it("waits for completion before sending the next code with the next sequence", async () => {
    const ep = endpoint();
    store.putValue(ep, "seq", 0xfffe);
    const first = send(ep);
    const second = send(ep, "second");
    await vi.advanceTimersByTimeAsync(0);
    expect(ep.command).toHaveBeenCalledTimes(1);
    expect(lastCode00Seq(ep)).toBe(0xffff);
    await complete(ep, 0xffff);
    await first;
    await vi.advanceTimersByTimeAsync(0);
    expect(lastCode00Seq(ep)).toBe(0);
    expect(store.getValue(ep, "irMessageInfo").data).toContain("second");
    await complete(ep, 0);
    await second;
});

it("waits for one endpoint to complete before starting another", async () => {
    const a = endpoint();
    const b = endpoint("TS1201", "0x87654321");
    const first = send(a);
    const second = send(b);
    await vi.advanceTimersByTimeAsync(0);
    expect(b.command).not.toHaveBeenCalled();
    await complete(a, 0);
    await first;
    await vi.advanceTimersByTimeAsync(0);
    expect(b.command).toHaveBeenCalledTimes(1);
    await complete(b, 0);
    await second;
});

it("always uses sequence zero for ZG-IR01", async () => {
    const ep = endpoint("ZG-IR01");
    const first = send(ep);
    const second = send(ep, "second");
    await vi.advanceTimersByTimeAsync(0);
    await complete(ep, 0);
    await first;
    await vi.advanceTimersByTimeAsync(0);
    expect(lastCode00Seq(ep)).toBe(0);
    await complete(ep, 0);
    await second;
});

it("releases the queue when Code00 or Code05 fails", async () => {
    const ep = endpoint();
    vi.mocked(ep.command).mockRejectedValueOnce(new Error("disconnected"));
    await expect(send(ep)).rejects.toThrow("disconnected");

    const second = send(ep, "second");
    const failure = expect(second).rejects.toThrow("disconnected");
    await vi.advanceTimersByTimeAsync(0);
    await receive("02", ep, 1);
    vi.mocked(ep.command).mockRejectedValueOnce(new Error("disconnected"));
    await expect(receive("04", ep, 1)).rejects.toThrow("disconnected");
    await failure;

    const third = send(ep, "third");
    await vi.advanceTimersByTimeAsync(0);
    await complete(ep, 2);
    await third;
});

it("times out a missing completion and rejects its late completion", async () => {
    const ep = endpoint();
    const first = send(ep);
    const failure = expect(first).rejects.toThrow("timed out");
    const second = send(ep, "second");
    await vi.advanceTimersByTimeAsync(7999);
    expect(ep.command).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await failure;
    expect(ep.command).toHaveBeenCalledTimes(2);
    await expect(complete(ep, 0)).rejects.toThrow("Unexpected sequence");
    await complete(ep, 1);
    await second;
});

it("retries Code00 until the first chunk request and ignores an earlier Code04", async () => {
    const ep = endpoint();
    const sending = send(ep);
    await vi.advanceTimersByTimeAsync(0);
    await receive("01", ep, 0);
    await receive("04", ep, 0);
    await vi.advanceTimersByTimeAsync(2000);
    expect(ep.command).toHaveBeenCalledTimes(2);
    await receive("02", ep, 0);
    await vi.advanceTimersByTimeAsync(4000);
    // Code00, retried Code00 and Code03
    expect(ep.command).toHaveBeenCalledTimes(3);
    await receive("04", ep, 0);
    await sending;
});

it("holds a send behind an active learn until the learn stops", async () => {
    const ep = endpoint();
    await learn(ep, "ON");
    const sending = send(ep);
    await vi.advanceTimersByTimeAsync(0);
    expect(ep.command).toHaveBeenCalledTimes(1);
    await learn(ep, "OFF");
    await vi.advanceTimersByTimeAsync(0);
    expect(ep.command).toHaveBeenLastCalledWith("zosungIRTransmit", "zosungSendIRCode00", expect.anything(), expect.anything());
    await complete(ep, 0);
    await sending;
});
