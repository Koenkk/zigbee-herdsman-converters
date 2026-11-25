import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {tzLegrand} from "../src/lib/legrand";
import type {KeyValue, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Legrand light_state_device_mode_aware", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it.each([
        ["plain on", {state: "ON"}, {state: "OFF", brightness: 0}, "on", 1],
        ["toggle to on", {state: "TOGGLE"}, {state: "OFF", brightness: 0}, "toggle", 1],
        ["off", {state: "OFF"}, {state: "ON", brightness: 100}, "off", 0],
        ["on with brightness", {state: "ON", brightness: 100}, {state: "OFF", brightness: 0}, "moveToLevelWithOnOff", 0],
        ["on with brightness in relay mode", {state: "ON", brightness: 100}, {state: "OFF", device_mode: "dimmer_off"}, "on", 0],
        ["brightness in relay mode", {brightness: 100}, {state: "ON", device_mode: "dimmer_off"}, "moveToLevelWithOnOff", 0],
    ])("%s", async (_name, message: KeyValue, state, command, reads) => {
        const endpoint = mockDevice({modelID: "", endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}]}).getEndpoint(1);
        const [key, value] = Object.entries(message)[0];
        await tzLegrand.light_state_device_mode_aware.convertSet(endpoint, key, value, {message, state, options: {}} as Tz.Meta);
        expect(vi.mocked(endpoint.command).mock.calls.map((c) => c[1])).toStrictEqual([command]);
        await vi.advanceTimersByTimeAsync(1499);
        expect(endpoint.read).toHaveBeenCalledTimes(0);
        await vi.advanceTimersByTimeAsync(1);
        expect(vi.mocked(endpoint.read).mock.calls).toStrictEqual(Array(reads).fill(["genLevelCtrl", ["currentLevel"]]));
    });
});
