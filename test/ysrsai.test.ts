import {describe, expect, test, vi} from "vitest";
import * as zhc from "../src";
import type {KeyValue, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

async function setup(modelID: string, message: KeyValue, state: KeyValue = {}) {
    const device = mockDevice({modelID, endpoints: [{ID: 1}]});
    const mapped = await zhc.findByDevice(device);
    const converter = mapped.toZigbee.find((candidate) => candidate.key.includes("state"));
    const meta: Tz.Meta = {state, device, message, mapped, options: {}, endpoint_name: null, publish: null};
    const run = (key = "state", value = message.state) => converter.convertSet(device.endpoints[0], key, value, meta);
    return {device, mapped, converter, meta, run};
}

describe.each(["ZB-DL01", "ZB-CT01"])("YSRSAI %s published workaround", (modelID) => {
    test.each([{}, {state: "ON"}, {state: "OFF"}])("OFF uses a direct off command with cached state %j", async (state) => {
        const {device, run} = await setup(modelID, {state: "OFF", transition: 3}, state);
        expect(await run()).toEqual({state: {state: "OFF"}});
        expect(vi.mocked(device.endpoints[0].command).mock.calls).toEqual([["genOnOff", "off", {}]]);
    });

    test("ON turns on before setting brightness with transition", async () => {
        const {device, run} = await setup(modelID, {state: "ON", brightness: 100, transition: 5}, {state: "OFF"});
        expect(await run()).toEqual({state: {state: "ON", brightness: 100}});
        expect(vi.mocked(device.endpoints[0].command).mock.calls).toEqual([
            ["genOnOff", "on", {}],
            ["genLevelCtrl", "moveToLevel", {level: 100, transtime: 50, optionsMask: 0, optionsOverride: 0}],
        ]);
    });

    test("brightness-only uses moveToLevel", async () => {
        const {device, run} = await setup(modelID, {brightness: 80, transition: 1.5});
        expect(await run("brightness", 80)).toEqual({state: {state: "ON", brightness: 80}});
        expect(vi.mocked(device.endpoints[0].command).mock.calls).toEqual([
            ["genLevelCtrl", "moveToLevel", {level: 80, transtime: 15, optionsMask: 0, optionsOverride: 0}],
        ]);
    });

    test("the same message is processed only once", async () => {
        const {device, run} = await setup(modelID, {state: "ON", brightness: 100, transition: 5});
        await run();
        expect(await run("brightness", 100)).toBeUndefined();
        expect(await run("transition", 5)).toBeUndefined();
        expect(device.endpoints[0].command).toHaveBeenCalledTimes(2);
    });

    test("preserves the published default level and transition", async () => {
        const {device, run} = await setup(modelID, {state: "ON"}, {state: "OFF", brightness: 80});
        expect(await run()).toEqual({state: {state: "ON", brightness: 255}});
        expect(device.endpoints[0].command).toHaveBeenLastCalledWith("genLevelCtrl", "moveToLevel", {
            level: 255,
            transtime: 20,
            optionsMask: 0,
            optionsOverride: 0,
        });
    });

    test("preserves the published zero-transition fallback", async () => {
        const {device, run} = await setup(modelID, {state: "ON", brightness: 100, transition: 0});
        await run();
        expect(device.endpoints[0].command).toHaveBeenLastCalledWith("genLevelCtrl", "moveToLevel", {
            level: 100,
            transtime: 20,
            optionsMask: 0,
            optionsOverride: 0,
        });
    });

    test.each([{state: "TOGGLE"}, {brightness_percent: 50}])("preserves unsupported message behavior for %j", async (message) => {
        const {device, run} = await setup(modelID, message);
        expect(await run()).toBeUndefined();
        expect(device.endpoints[0].command).not.toHaveBeenCalled();
    });

    test("keeps Tuya features and CT color control", async () => {
        const {mapped, converter} = await setup(modelID, {});
        expect(converter).not.toBe(zhc.toZigbee.light_onoff_brightness);
        expect(mapped.toZigbee.some((candidate) => candidate.key.includes("do_not_disturb"))).toBe(true);
        expect(mapped.toZigbee.some((candidate) => candidate.key.includes("effect"))).toBe(true);
        if (modelID === "ZB-CT01") {
            expect(mapped.toZigbee.some((candidate) => candidate.key.includes("color_temp"))).toBe(true);
        }
    });
});

test("RGB+CCT model keeps its existing converter", async () => {
    const {converter} = await setup("ZB-CL03", {});
    expect(converter).toBe(zhc.toZigbee.light_onoff_brightness);
});
