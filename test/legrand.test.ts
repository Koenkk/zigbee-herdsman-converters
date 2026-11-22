import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {Group} from "zigbee-herdsman/dist/controller/model";
import {findByDevice} from "../src/index";
import * as globalStore from "../src/lib/store";
import type {KeyValueAny, Tz, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

const dimmers = [
    {
        model: "067797",
        modelID: " Dimmer switch with neutral\u0000\u0000\u0000\u0000",
        manufacturerName:
            " Legrand\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
    },
    {model: "4411C/L4411C/N4411C/NT4411C", modelID: " Dimmer switch with neutral\u0000\u0000\u0000\u0000", manufacturerName: " BTicino"},
];

describe.each(dimmers)("Legrand/BTicino dimmer $model state converter", ({model, modelID, manufacturerName}) => {
    let endpoint: Zh.Endpoint;
    let converter: Tz.Converter;

    beforeEach(async () => {
        vi.useFakeTimers();
        const device = mockDevice({
            modelID,
            manufacturerName,
            endpoints: [{ID: 1, inputClusters: ["genBasic", "genIdentify", "genOnOff", "genLevelCtrl", "lightingBallastCfg"]}],
        });
        endpoint = device.getEndpoint(1);
        const definition = await findByDevice(device);
        expect(definition.model).toBe(model);
        converter = definition.toZigbee.find((c) => c.key.includes("state"));
        expect(converter.key).toEqual(["state"]);
    });

    afterEach(() => {
        globalStore.clear();
        vi.useRealTimers();
    });

    const set = (entity: Zh.Endpoint | Zh.Group, message: KeyValueAny, state: KeyValueAny) =>
        converter.convertSet(entity, "state", message.state, {
            message,
            state,
            options: {},
            mapped: undefined,
            device: undefined,
            endpoint_name: undefined,
            publish: vi.fn(),
        } as unknown as Tz.Meta) as Promise<KeyValueAny>;

    const levelReads = () => (vi.mocked(endpoint.read).mock.calls as unknown[][]).filter(([cluster]) => cluster === "genLevelCtrl");

    it("publishes OnLevel and reads currentLevel back after a plain on from OFF", async () => {
        const result = await set(endpoint, {state: "ON"}, {state: "OFF", brightness: 0, level_config: {on_level: 254}});
        expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "on", {}, expect.anything());
        expect(result.state).toEqual({state: "ON", brightness: 254});

        await vi.advanceTimersByTimeAsync(1499);
        expect(levelReads()).toHaveLength(0);
        await vi.advanceTimersByTimeAsync(1);
        expect(levelReads()).toEqual([["genLevelCtrl", ["currentLevel"]]]);
    });

    it("reads currentLevel back even when OnLevel is unknown", async () => {
        const result = await set(endpoint, {state: "ON"}, {state: "OFF", brightness: 0});
        expect(result.state).toEqual({state: "ON", brightness: 1});
        await vi.advanceTimersByTimeAsync(1500);
        expect(levelReads()).toEqual([["genLevelCtrl", ["currentLevel"]]]);
    });

    it("ignores OnLevel 255 (previous level)", async () => {
        const result = await set(endpoint, {state: "ON"}, {state: "OFF", brightness: 0, level_config: {on_level: 255}});
        expect(result.state).toEqual({state: "ON", brightness: 1});
    });

    it("treats a toggle that turns the light on like on", async () => {
        const result = await set(endpoint, {state: "TOGGLE"}, {state: "OFF", brightness: 0, level_config: {on_level: 200}});
        expect(result.state.brightness).toBe(200);
        await vi.advanceTimersByTimeAsync(1500);
        expect(levelReads()).toHaveLength(1);
    });

    it("waits for the transition before reading", async () => {
        await set(endpoint, {state: "ON", transition: 3}, {state: "OFF", brightness: 0, level_config: {on_level: 254}});
        await vi.advanceTimersByTimeAsync(3999);
        expect(levelReads()).toHaveLength(0);
        await vi.advanceTimersByTimeAsync(1);
        expect(levelReads()).toHaveLength(1);
    });

    it("does not override the brightness of a light that was already on", async () => {
        const result = await set(endpoint, {state: "ON"}, {state: "ON", brightness: 100, level_config: {on_level: 254}});
        expect(result.state).toEqual({state: "ON"});
    });

    it.each([
        ["off", {state: "OFF"}, {state: "ON", brightness: 100}],
        ["a toggle that turns the light off", {state: "TOGGLE"}, {state: "ON", brightness: 100}],
        ["an explicit brightness", {state: "ON", brightness: 50}, {state: "OFF", brightness: 0}],
        ["an explicit brightness_percent", {state: "ON", brightness_percent: 50}, {state: "OFF", brightness: 0}],
        ["relay mode (dimmer_off)", {state: "ON"}, {state: "OFF", device_mode: "dimmer_off", level_config: {on_level: 254}}],
    ])("does not read currentLevel for %s", async (_name, message, state) => {
        const result = await set(endpoint, message, state);
        expect(result.state.brightness === 254).toBe(false);
        await vi.advanceTimersByTimeAsync(5000);
        expect(levelReads()).toHaveLength(0);
    });

    it("does not read currentLevel for a group", async () => {
        // @ts-expect-error private
        const group: Group = new Group(1, 1, [], {});
        vi.spyOn(group, "command").mockImplementation(async () => {});
        vi.spyOn(group, "read").mockImplementation(async () => {});
        const result = await set(group, {state: "ON"}, {state: "OFF", brightness: 0, level_config: {on_level: 254}});
        expect(result.state.brightness).toBe(1);
        await vi.advanceTimersByTimeAsync(5000);
        expect(group.read).not.toHaveBeenCalled();
    });

    it("swallows a failed read", async () => {
        vi.mocked(endpoint.read).mockRejectedValue(new Error("timeout"));
        await set(endpoint, {state: "ON"}, {state: "OFF", brightness: 0});
        await vi.advanceTimersByTimeAsync(1500);
        expect(levelReads()).toHaveLength(1);
    });
});
