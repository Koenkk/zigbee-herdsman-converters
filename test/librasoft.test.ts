import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import * as globalStore from "../src/lib/store";
import type {Definition, Fz, KeyValueAny, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

// visspoint-io4: endpoints 1-4, each with genOnOff (relay) and genBinaryInput (dry contact input).
// The firmware handles On With Timed Off (genOnOff 0x42) as a relay pulse.

function buildDevice() {
    return mockDevice({
        modelID: "visspoint-io4",
        manufacturerName: "LibraSoft",
        endpoints: [1, 2, 3, 4].map((id) => ({ID: id, inputClusters: ["genBasic", "genIdentify", "genOnOff", "genBinaryInput"]})),
    });
}

describe("LibraSoft visspoint-io4", () => {
    let device: ReturnType<typeof mockDevice>;
    let definition: Definition;
    let state: KeyValueAny;

    // Mirrors Zigbee2MQTT: the first converter matching the key and endpoint name handles the message.
    // optimistic = false: Zigbee2MQTT ignores the state returned by the converter
    const set = async (endpointName: string, message: KeyValueAny, optimistic = true) => {
        const [key, value] = Object.entries(message)[0];
        const converter = definition.toZigbee.find((c) => c.key.includes(key) && (!c.endpoints || c.endpoints.includes(endpointName)));
        const endpoint = device.getEndpoint(Number(endpointName));
        const meta = {state, device, message, mapped: definition, options: {}, endpoint_name: endpointName} as unknown as Tz.Meta;
        const result = await converter.convertSet(endpoint, key, value, meta);
        if (optimistic) for (const [k, v] of Object.entries(result?.state ?? {})) state[`${k}_${endpointName}`] = v;
        return {endpoint, result};
    };

    beforeEach(async () => {
        device = buildDevice();
        definition = await findByDevice(device);
        state = {};
        vi.spyOn(device, "save").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        globalStore.clear();
    });

    it("is matched by model ID", () => {
        expect(definition.model).toBe("visspoint-io4");
        expect(definition.vendor).toBe("LibraSoft");
    });

    it("plain ON/OFF when no pulse time is stored", async () => {
        const {endpoint} = await set("2", {state: "ON"});
        expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "on", {}, expect.anything());
        await set("2", {state: "OFF"});
        expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "off", {}, expect.anything());
    });

    it("storing a pulse time sends nothing to the device", async () => {
        const {endpoint, result} = await set("1", {trigger: 0.5});
        expect(result).toStrictEqual({state: {trigger: 0.5}});
        expect(endpoint.command).not.toHaveBeenCalled();
    });

    it("ON with a stored pulse time sends On With Timed Off", async () => {
        await set("3", {trigger: 3});
        const {endpoint} = await set("3", {state: "ON"});
        expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "onWithTimedOff", {ctrlbits: 0, ontime: 30, offwaittime: 0}, expect.anything());
    });

    it("pulse time 0 restores plain switching", async () => {
        await set("1", {trigger: 0.5});
        await set("1", {trigger: 0});
        const {endpoint} = await set("1", {state: "ON"});
        expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "on", {}, expect.anything());
    });

    it("explicit on_time takes precedence over the stored pulse time", async () => {
        await set("4", {trigger: 10});
        const {endpoint} = await set("4", {state: "ON", on_time: 0.5});
        expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "onWithTimedOff", {ctrlbits: 0, ontime: 5, offwaittime: 0}, expect.anything());
    });

    it("stores the pulse time also when optimistic is disabled", async () => {
        await set("1", {trigger: 0.5}, false);
        expect(state.trigger_1).toBeUndefined();
        expect(device.save).toHaveBeenCalled();
        const {endpoint} = await set("1", {state: "ON"}, false);
        expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "onWithTimedOff", {ctrlbits: 0, ontime: 5, offwaittime: 0}, expect.anything());
    });

    it("falls back to a pulse time kept in the published state", async () => {
        state.trigger_4 = 2;
        const {endpoint} = await set("4", {state: "ON"});
        expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "onWithTimedOff", {ctrlbits: 0, ontime: 20, offwaittime: 0}, expect.anything());
    });

    it("reads the relay state back after a pulse", async () => {
        vi.useFakeTimers();
        await set("2", {trigger: 0.5});
        const {endpoint} = await set("2", {state: "ON"});
        await vi.advanceTimersByTimeAsync(2400);
        expect(endpoint.read).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(200);
        expect(endpoint.read).toHaveBeenCalledWith("genOnOff", ["onOff"]);
    });

    it("OFF cancels the pending read-back", async () => {
        vi.useFakeTimers();
        const {endpoint} = await set("1", {state: "ON", on_time: 1});
        await set("1", {state: "OFF"});
        await vi.advanceTimersByTimeAsync(5000);
        expect(endpoint.read).not.toHaveBeenCalled();
    });

    it("a failed command keeps the read-back of a running pulse", async () => {
        vi.useFakeTimers();
        const {endpoint} = await set("2", {state: "ON", on_time: 1});
        vi.mocked(endpoint.command).mockRejectedValueOnce(new Error("timeout"));
        await expect(set("2", {state: "OFF"})).rejects.toThrow("timeout");
        await expect(set("2", {state: "bad"})).rejects.toThrow();
        await vi.advanceTimersByTimeAsync(3000);
        expect(endpoint.read).toHaveBeenCalledWith("genOnOff", ["onOff"]);
    });

    it.each([0.1, "1.5", 6553])("accepts pulse time %s", async (value) => {
        const {result} = await set("1", {trigger: value});
        expect(result).toStrictEqual({state: {trigger: Number(value)}});
    });

    it.each([-1, -0.01, 0.01, 0.09, 6553.1, 6554, "abc", "", null, false, true])("rejects pulse time %s", async (value) => {
        await expect(set("1", {trigger: value})).rejects.toThrow("trigger must be 0 (plain switching) or a number of seconds");
    });

    it("publishes the stored pulse time when the state does not show it", () => {
        const converters = definition.fromZigbee.filter((c) => c.cluster === "genOnOff" && c.type.includes("attributeReport"));
        const report = (meta: Fz.Meta) => {
            const msg = {data: {onOff: 1}, endpoint: device.getEndpoint(2), type: "attributeReport", cluster: "genOnOff", device};
            return Object.assign({}, ...converters.map((c) => c.convert(definition, msg as unknown as Fz.Message, () => {}, {}, meta)));
        };
        expect(report({state: {}, device} as unknown as Fz.Meta)).toStrictEqual({state_2: "ON", trigger_2: 0});
        expect(report({state: {trigger_2: 1.5}, device} as unknown as Fz.Meta)).toStrictEqual({state_2: "ON"});
        device.meta.visspointTrigger = {2: 3};
        expect(report({state: {trigger_2: 1.5}, device} as unknown as Fz.Meta)).toStrictEqual({state_2: "ON", trigger_2: 3});
    });
});
