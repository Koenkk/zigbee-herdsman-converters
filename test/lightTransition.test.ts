import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import {Group} from "zigbee-herdsman/dist/controller/model";
import * as tz from "../src/converters/toZigbee";
import * as light from "../src/lib/light";
import * as store from "../src/lib/store";
import type {KeyValue, Tz, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("level transition tracking", () => {
    let device: ReturnType<typeof mockDevice>;
    let meta: Tz.Meta;
    let now: number;
    beforeEach(() => {
        store.clear();
        now = 1000;
        vi.spyOn(performance, "now").mockImplementation(() => now);
        device = mockDevice({
            modelID: "test_light",
            endpoints: [1, 2].map((id) => ({ID: id, inputClusters: ["genLevelCtrl"], meta: {onLevelSupported: false}})),
        });
        meta = {
            device,
            state: {state: "ON", brightness: 100},
            message: {},
            options: {},
            publish: vi.fn(),
            endpoint_name: undefined,
            // @ts-expect-error mock definition
            mapped: {meta: {stopBeforeOff: true}},
        };
    });
    afterEach(() => store.clear());
    const endpoint = () => device.getEndpoint(1);
    const set = (message: KeyValue, entity: Zh.Endpoint | Zh.Group = endpoint()) => {
        const key = Object.keys(message)[0];
        return tz.light_onoff_brightness.convertSet(entity, key, message[key], {...meta, message});
    };
    const clearCommands = () => {
        for (const ep of device.endpoints) ep.command.mockClear();
    };
    const group = () => {
        const group: Zh.Group = Object.create(Group.prototype);
        Object.defineProperty(group, "members", {value: device.endpoints});
        group.command = vi.fn().mockResolvedValue(undefined);
        return group;
    };

    test.each([0, 2, 293.7])("skips STOP only after the actual transmitted duration has elapsed: %s", async (transition) => {
        await set({brightness: 200, transition});
        expect(endpoint().command).toHaveBeenCalledWith(
            "genLevelCtrl",
            "moveToLevelWithOnOff",
            expect.objectContaining({transtime: transition * 10}),
            {},
        );
        now += transition * 1000;
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenCalledExactlyOnceWith("genOnOff", "off", {}, {});
    });

    test("stops before OFF during the final tenth of a transition", async () => {
        await set({brightness: 200, transition: 293.7});
        now += 293600;
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test("starts the timer after the send resolves", async () => {
        endpoint().command.mockImplementationOnce(() => {
            now += 1000;
            return Promise.resolve({});
        });
        await set({brightness: 200, transition: 2});
        now = 3000;
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test("a new immediate level command replaces an active fade", async () => {
        await set({brightness: 200, transition: 20});
        await set({brightness: 150, transition: 0});
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenCalledExactlyOnceWith("genOnOff", "off", {}, {});
    });

    test("a requested fade to OFF replaces the old timer with its own duration", async () => {
        await set({brightness: 200, transition: 20});
        await set({state: "OFF", transition: 2});
        clearCommands();
        now += 2000;
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenCalledExactlyOnceWith("genOnOff", "off", {}, {});
    });

    test.each(["brightness_step", "brightness_step_onoff"])("tracks %s transitions", async (key) => {
        await tz.light_brightness_step.convertSet(endpoint(), key, 20, {...meta, message: {transition: 2}});
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test.each(["brightness_move", "brightness_move_onoff"])("does not expire a continuous %s", async (key) => {
        await tz.light_brightness_move.convertSet(endpoint(), key, 10, meta);
        now += 1000000;
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test("unknown/default ZCL duration does not create a finite timer", async () => {
        await light.levelControlCommand(endpoint(), "moveToLevel", {level: 200, transtime: 0xffff}, {});
        now += 10000000;
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test("restart loses timer knowledge and falls back to STOP", async () => {
        await set({brightness: 200, transition: 0});
        store.clear();
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test("failed replacement commands leave history unknown", async () => {
        await set({brightness: 200, transition: 0});
        endpoint().command.mockRejectedValueOnce(new Error("timeout"));
        await expect(set({brightness: 150, transition: 2})).rejects.toThrow("timeout");
        clearCommands();
        now += 10000;
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test("a delayed acknowledgement cannot replace newer unknown history", async () => {
        let resolve: (value: undefined) => void;
        endpoint().command.mockImplementationOnce(
            () =>
                new Promise((done) => {
                    resolve = done;
                }),
        );
        const sending = set({brightness: 200, transition: 0});
        light.invalidateLevelTransition(endpoint());
        resolve(undefined);
        await sending;
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test.each(["command", "zclcommand", "scene_recall", "write", "reset"])("%s invalidates an idle timer", async (key) => {
        await set({brightness: 200, transition: 0});
        endpoint().zclCommand = vi.fn().mockResolvedValue({});
        const converter = {command: tz.command, zclcommand: tz.zcl_command, scene_recall: tz.scene_recall, write: tz.write, reset: tz.factory_reset}[
            key
        ];
        await converter.convertSet(
            endpoint(),
            key,
            key === "scene_recall" ? 1 : {cluster: "genLevelCtrl", command: "move", payload: {rate: 10, movemode: 0}},
            meta,
        );
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test("plain ON leaves the device's default fade duration unknown", async () => {
        await set({brightness: 200, transition: 0});
        await set({state: "ON"});
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test("device scope includes a sibling fade and STOP only clears the target", async () => {
        meta.mapped = {...meta.mapped, meta: {stopBeforeOff: "device"}} as Tz.Meta["mapped"];
        await set({brightness: 100, transition: 0});
        await set({brightness: 200, transition: 20}, device.getEndpoint(2));
        clearCommands();
        await light.stopLevelTransitionBeforeOff(endpoint(), meta);
        await light.stopLevelTransitionBeforeOff(device.getEndpoint(2), meta);
        for (const ep of device.endpoints) expect(ep.command).toHaveBeenCalledExactlyOnceWith("genLevelCtrl", "stop", {}, {});
        clearCommands();
        await light.stopLevelTransitionBeforeOff(endpoint(), meta);
        expect(endpoint().command).not.toHaveBeenCalled();
    });

    test("endpoint scope does not stop for an unrelated sibling fade", async () => {
        await set({brightness: 100, transition: 0});
        await set({brightness: 200, transition: 20}, device.getEndpoint(2));
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenCalledExactlyOnceWith("genOnOff", "off", {}, {});
    });

    test("a group command invalidates member timers even after its expected duration", async () => {
        await set({brightness: 100, transition: 0});
        await light.levelControlCommand(group(), "moveToLevelWithOnOff", {level: 150, transtime: 20}, {});
        now += 10000;
        clearCommands();
        await set({state: "OFF"});
        expect(endpoint().command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
    });

    test("mixed groups stop when any opted-in member needs it", async () => {
        const target = group();
        meta.mapped = [{meta: {}}, {meta: {stopBeforeOff: true}}] as Tz.Meta["mapped"];
        await set({state: "OFF"}, target);
        expect(target.command).toHaveBeenNthCalledWith(1, "genLevelCtrl", "stop", {}, {});
        expect(target.command).toHaveBeenNthCalledWith(2, "genOnOff", "off", {}, {});
    });

    test("group OFF skips STOP when all opted-in members are known idle", async () => {
        for (const ep of device.endpoints) await light.levelControlCommand(ep, "moveToLevel", {level: 100, transtime: 0}, {});
        const target = group();
        meta.mapped = [{meta: {stopBeforeOff: true}}, {meta: {stopBeforeOff: true}}] as Tz.Meta["mapped"];
        await set({state: "OFF"}, target);
        expect(target.command).toHaveBeenCalledExactlyOnceWith("genOnOff", "off", {}, {});
    });
});
