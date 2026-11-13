import {describe, expect, it, vi} from "vitest";
import {definitions} from "../src/devices/intelbras";
import {prepareDefinition} from "../src/index";
import type {Fz} from "../src/lib/types";
import {mockDevice} from "./utils";

const definition = prepareDefinition(definitions[0]);
const ready = () => ({
    phase: "ready",
    baseKey: "11".repeat(16),
    nonce: "22".repeat(4),
    key: "33".repeat(16),
    sequence: 34,
    replay: 89,
    authKey: "01234567",
});
function setup(session?: object) {
    const device = mockDevice({ieeeAddr: "0x0011223344556677", endpoints: [{ID: 1}]});
    vi.spyOn(device, "save").mockImplementation(() => {});
    if (session) device.meta.intelbrasLock = session;
    const configure = () => definition.configure(device, device.getEndpoint(1), definition);
    return {device, endpoint: device.getEndpoint(1), configure};
}

describe("Intelbras IFR 7001 reconfiguration", () => {
    it("preserves persisted session keys, authorization and counters across repeated configure calls", async () => {
        const stored = JSON.parse(JSON.stringify(ready()));
        const {device, endpoint, configure} = setup(stored);
        await configure();
        await configure();
        expect(device.meta.intelbrasLock).toBe(stored);
        expect(device.meta.intelbrasLock).toEqual(ready());
        expect(endpoint.command).not.toHaveBeenCalled();
        expect(device.save).not.toHaveBeenCalled();
    });

    it("starts negotiation when there is no persisted session", async () => {
        const {device, endpoint, configure} = setup();
        await configure();
        expect(device.meta.intelbrasLock).toMatchObject({phase: "base", sequence: 2, replay: 2});
        expect(endpoint.command).toHaveBeenCalledOnce();
        expect(vi.mocked(endpoint.command).mock.calls[0].slice(0, 2)).toEqual(["intelbrasLock", "baseKey"]);
    });

    it.each([undefined, "", "00", "zz".repeat(16)])("renegotiates when ready metadata has unusable key %s", async (key) => {
        const {device, endpoint, configure} = setup({...ready(), key});
        await configure();
        expect(device.meta.intelbrasLock).toMatchObject({phase: "base", sequence: 35, replay: 90, authKey: "01234567"});
        expect(endpoint.command).toHaveBeenCalledOnce();
    });

    it.each(["base", "session"])("retries incomplete negotiation in phase %s", async (phase) => {
        const {device, endpoint, configure} = setup({...ready(), phase});
        await configure();
        expect(device.meta.intelbrasLock).toMatchObject({phase: "base", sequence: 35, replay: 90});
        expect(endpoint.command).toHaveBeenCalledOnce();
    });

    it("still renegotiates after a decryption failure in a ready session", async () => {
        const {device, endpoint} = setup(ready());
        const converter = definition.fromZigbee[0];
        await converter.convert(
            definition,
            {device, type: "commandReport", data: {payload: Buffer.alloc(0)}} as unknown as Fz.Message,
            () => {},
            {},
            {} as Fz.Meta,
        );
        expect(device.meta.intelbrasLock).toMatchObject({phase: "base", sequence: 35, replay: 90});
        expect(endpoint.command).toHaveBeenCalledOnce();
    });
});
