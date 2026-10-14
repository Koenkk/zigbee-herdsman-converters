import {beforeEach, describe, expect, test, vi} from "vitest";
import {prepareDefinition} from "../src";
import * as m from "../src/lib/modernExtend";
import * as store from "../src/lib/store";
import type {Fz, KeyValue, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("withCombinedOnOff", () => {
    const endpoints = {first: 1, second: 2, third: 3};
    const extend = m.light({color: true});
    const definition = prepareDefinition({
        zigbeeModel: ["test_light"],
        model: "test_light",
        vendor: "test",
        description: "test",
        endpoint: () => endpoints,
        extend: [m.withCombinedOnOff(extend)],
    });
    let device: ReturnType<typeof mockDevice>;
    let meta: Tz.Meta;
    const converter = definition.toZigbee.find((converter) => converter.key.includes("brightness"));
    const allOff = {state_first: "OFF", state_second: "OFF", state_third: "OFF"};

    beforeEach(() => {
        store.clear();
        device = mockDevice({
            modelID: "test_light",
            endpoints: Object.values(endpoints).map((Id) => ({ID: Id, meta: {onLevelSupported: false}})),
        });
        meta = {device, mapped: definition, state: {...allOff}, message: {}, options: {}, publish: vi.fn(), endpoint_name: undefined};
    });

    const set = (message: KeyValue, endpoint?: keyof typeof endpoints) => {
        meta = {...meta, message, endpoint_name: endpoint};
        const key = Object.keys(message)[0];
        return converter.convertSet(device.getEndpoint(endpoints[endpoint] ?? 1), key, message[key], meta);
    };
    const report = (Id: number, onOff: number, state: KeyValue) => {
        const converter = definition.fromZigbee.find((converter) => converter.cluster === "genOnOff");
        const msg = {device, endpoint: device.getEndpoint(Id), data: {onOff}, type: "attributeReport", cluster: "genOnOff"} as Fz.Message;
        return converter.convert(definition, msg, vi.fn(), {}, {device, state, deviceExposesChanged: vi.fn()});
    };

    test("preserves exposes and leaves the wrapped extension untouched", () => {
        const originalSet = extend.toZigbee[0].convertSet;
        const wrapped = m.withCombinedOnOff(extend);
        expect(wrapped.exposes).toBe(extend.exposes);
        expect(wrapped.meta).toBe(extend.meta);
        expect(extend.toZigbee[0].convertSet).toBe(originalSet);
        expect(wrapped.toZigbee).not.toBe(extend.toZigbee);
        expect(wrapped.fromZigbee).not.toBe(extend.fromZigbee);
    });

    test.each([
        [{}, 0, undefined],
        [{}, 1, "ON"],
        [{state_second: "OFF"}, 0, undefined],
        [{state_second: "OFF", state_third: "OFF"}, 0, "OFF"],
        [{state_second: "ON", state_third: "OFF"}, 0, "ON"],
        [{state_second: "OFF", state_third: "ON"}, 0, "ON"],
    ])("aggregates reports without treating unknown channels as OFF: %j", async (state, onOff, combined) => {
        const result = await report(1, onOff as number, state as KeyValue);
        expect(result).toEqual({state_first: onOff ? "ON" : "OFF", ...(combined === undefined ? {} : {state: combined})});
    });

    test("also aggregates reports from an existing multiEndpoint definition", async () => {
        const mapped = {...definition, meta: {...definition.meta, multiEndpoint: true}};
        const converter = mapped.fromZigbee.find((converter) => converter.cluster === "genOnOff");
        const msg = {device, endpoint: device.getEndpoint(1), data: {onOff: 0}, type: "attributeReport", cluster: "genOnOff"} as Fz.Message;
        expect(
            await converter.convert(mapped, msg, vi.fn(), {}, {device, state: {...allOff, state_third: "ON"}, deviceExposesChanged: vi.fn()}),
        ).toEqual({state_first: "OFF", state: "ON"});
    });

    test.each(["ON", "OFF"])("fans out generic %s to every named endpoint", async (state) => {
        const result = await set({state});
        for (const endpoint of device.endpoints) expect(endpoint.command).toHaveBeenCalledExactlyOnceWith("genOnOff", state.toLowerCase(), {}, {});
        expect(result).toMatchObject({membersState: {[device.ieeeAddr]: {state, state_first: state, state_second: state, state_third: state}}});
    });

    test.each([0, 1])("generic TOGGLE reads every channel before choosing a common state: %s", async (onOff) => {
        for (const endpoint of device.endpoints) endpoint.read.mockResolvedValue({onOff: endpoint.ID === 3 ? onOff : 0});
        meta.state = {state: onOff ? "OFF" : "ON"};
        await set({state: "TOGGLE"});
        for (const endpoint of device.endpoints) {
            expect(endpoint.read).toHaveBeenCalledExactlyOnceWith("genOnOff", ["onOff"]);
            expect(endpoint.command).toHaveBeenCalledExactlyOnceWith("genOnOff", onOff ? "off" : "on", {}, {});
        }
    });

    test.each([undefined, 2, "1"])("does not send TOGGLE commands after an invalid read: %s", async (onOff) => {
        device.getEndpoint(1).read.mockResolvedValue({onOff: 0});
        device.getEndpoint(2).read.mockResolvedValue({onOff});
        await expect(set({state: "TOGGLE"})).rejects.toThrow();
        for (const endpoint of device.endpoints) expect(endpoint.command).not.toHaveBeenCalled();
    });

    test("channel commands use channel state and keep the aggregate ON while another channel is ON", async () => {
        meta.state = {state: "ON", state_first: "OFF", state_second: "ON", state_third: "OFF"};
        const result = await set({state: "TOGGLE"}, "first");
        expect(result).toMatchObject({membersState: {[device.ieeeAddr]: {state: "ON", state_first: "ON"}}});
        expect(device.getEndpoint(2).command).not.toHaveBeenCalled();
        expect(device.getEndpoint(3).command).not.toHaveBeenCalled();
    });

    test("multiple channel commands share pending updates without changing the input cache", async () => {
        const original = meta.state;
        await set({state: "ON"}, "first");
        const result = await set({state: "OFF"}, "second");
        expect(result).toMatchObject({membersState: {[device.ieeeAddr]: {state: "ON", state_second: "OFF"}}});
        expect(original).toEqual(allOff);
    });

    test("generic brightness stays on the default endpoint", async () => {
        await set({brightness: 100});
        expect(device.getEndpoint(1).command).toHaveBeenCalledOnce();
        expect(device.getEndpoint(2).command).not.toHaveBeenCalled();
        expect(device.getEndpoint(3).command).not.toHaveBeenCalled();
    });

    test("explicit generic power carries timing to all channels and brightness only to the default endpoint", async () => {
        await set({state: "ON", brightness: 100, transition: 2});
        expect(device.getEndpoint(1).command).toHaveBeenCalledWith(
            "genLevelCtrl",
            "moveToLevelWithOnOff",
            expect.objectContaining({level: 100, transtime: 20}),
            {},
        );
        for (const ID of [2, 3])
            expect(device.getEndpoint(ID).command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                expect.objectContaining({level: 254, transtime: 20}),
                {},
            );
    });

    test.each([undefined, "second"])("GET reads the appropriate endpoints: %s", async (endpoint) => {
        await converter.convertGet(device.getEndpoint(endpoints[endpoint] ?? 1), "state", {...meta, endpoint_name: endpoint});
        for (const ep of device.endpoints) expect(ep.read).toHaveBeenCalledTimes(endpoint === undefined || ep.ID === 2 ? 1 : 0);
    });

    test("attempts remaining channels after a failure and publishes only successful changes", async () => {
        device.getEndpoint(2).command.mockRejectedValue(new Error("failed"));
        await expect(set({state: "ON"})).rejects.toThrow("failed");
        expect(device.getEndpoint(3).command).toHaveBeenCalledOnce();
        expect(meta.publish).toHaveBeenCalledExactlyOnceWith({state_first: "ON", state_third: "ON", state: "ON"});
    });

    test("does not publish a partial optimistic update when optimistic is disabled", async () => {
        meta.options = {optimistic: false};
        device.getEndpoint(2).command.mockRejectedValue(new Error("failed"));
        await expect(set({state: "ON"})).rejects.toThrow("failed");
        expect(meta.publish).not.toHaveBeenCalled();
    });

    test("respects aggregate optimistic filtering", async () => {
        meta.options = {filtered_optimistic: ["^state$"]};
        const result = await set({state: "ON"}, "first");
        expect(result).toEqual({state: {}, membersState: {[device.ieeeAddr]: {state_first: "ON"}}});
    });
});
