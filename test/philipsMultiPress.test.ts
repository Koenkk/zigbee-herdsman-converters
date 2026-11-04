import assert from "node:assert";
import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import {findByDevice} from "../src/index";
import {logger} from "../src/lib/logger";
import {type fz, m} from "../src/lib/philips";
import type {Definition, Fz, KeyValue, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Hue dimmer software multi-press", () => {
    let device: Zh.Device;
    let definition: Definition;
    let extend: ReturnType<typeof m.hueDimmerMultiPress>;
    let options: KeyValue;
    const publish = vi.fn();
    let sequence = 0;
    let meta: Fz.Meta;

    beforeEach(async () => {
        vi.useFakeTimers();
        device = mockDevice({modelID: "RWL022", endpoints: [{ID: 1}, {ID: 2}]});
        const found = await findByDevice(device);
        assert(found);
        definition = found;
        meta = {device, state: {}, deviceExposesChanged: vi.fn()};
        extend = m.hueDimmerMultiPress();
        options = {multi_press_enabled: true};
        publish.mockReset();
    });
    afterEach(async () => {
        await extend.onEvent[0]({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
        vi.useRealTimers();
    });

    function frame(button = 1, type = 0, endpoint = 1, target = device, transaction = ++sequence) {
        return {
            device: target,
            endpoint: target.getEndpoint(endpoint),
            cluster: "manuSpecificPhilips",
            type: "commandHueNotification",
            data: {button, type},
            meta: {zclTransactionSequenceNumber: transaction},
        } as Parameters<typeof fz.hue_dimmer_switch.convert>[1];
    }
    function send(button = 1, type = 0, endpoint = 1) {
        return extend.fromZigbee[0].convert(definition, frame(button, type, endpoint), publish, options, meta);
    }
    function click(button = 1, endpoint = 1) {
        send(button, 0, endpoint);
        send(button, 2, endpoint);
    }

    test("disabled by default, retaining native payloads and brightness", () => {
        options = {simulated_brightness: {delta: 10}};
        expect(send(3)).toMatchObject({action: "down_press", brightness: 245, action_brightness_delta: -10});
        send(3, 2);
        vi.advanceTimersByTime(1500);
        expect(publish).not.toHaveBeenCalled();
    });
    test.each([1, 2, 3, 4])("classifies all click counts for button %s", (button) => {
        const name = {1: "on", 2: "up", 3: "down", 4: "off"}[button];
        for (const count of [1, 2, 3, 4]) {
            for (let i = 0; i < count; i++) {
                click(button);
                vi.advanceTimersByTime(50);
            }
            vi.advanceTimersByTime(300);
            expect(publish).toHaveBeenLastCalledWith({action: `${name}_${["single", "double", "triple"][Math.min(count, 3) - 1]}_press`});
        }
        expect(publish).toHaveBeenCalledTimes(4);
    });
    test("orphan releases and held presses are not clicks", () => {
        send(1, 2);
        send(1, 0);
        send(1, 1);
        send(1, 1);
        send(1, 3);
        send(1, 2);
        vi.advanceTimersByTime(1500);
        expect(publish).not.toHaveBeenCalled();
    });
    test("a hold flushes earlier short clicks as a separate gesture", () => {
        click();
        send();
        expect(send(1, 1)).toMatchObject({action: "on_hold"});
        send(1, 3);
        vi.advanceTimersByTime(300);
        expect(publish.mock.calls).toEqual([[{action: "on_single_press"}]]);
    });
    test("the next press pauses the release-to-press timer", () => {
        click();
        vi.advanceTimersByTime(299);
        send();
        vi.advanceTimersByTime(500);
        expect(publish).not.toHaveBeenCalled();
        send(1, 2);
        vi.advanceTimersByTime(300);
        expect(publish).toHaveBeenCalledWith({action: "on_double_press"});
    });
    test("checks deadlines when the event loop has delayed a timer", () => {
        click();
        vi.setSystemTime(Date.now() + 300);
        send();
        send(1, 2);
        vi.advanceTimersByTime(300);
        expect(publish.mock.calls).toEqual([[{action: "on_single_press"}], [{action: "on_single_press"}]]);
    });
    test("separates buttons, endpoints and devices", async () => {
        const other = mockDevice({modelID: "RWL022", ieeeAddr: "0x87654321", endpoints: [{ID: 1}]});
        click(1);
        click(2);
        click(1, 2);
        for (const type of [0, 2]) extend.fromZigbee[0].convert(definition, frame(1, type, 1, other), publish, options, meta);
        vi.advanceTimersByTime(300);
        expect(publish.mock.calls).toEqual([
            [{action: "on_single_press"}],
            [{action: "up_single_press"}],
            [{action: "on_single_press"}],
            [{action: "on_single_press"}],
        ]);
        await extend.onEvent[0]({type: "stop", data: {ieeeAddr: other.ieeeAddr}});
    });
    test("uses the native transaction duplicate filter", () => {
        send();
        const release = frame(1, 2);
        for (let i = 0; i < 2; i++) extend.fromZigbee[0].convert(definition, release, publish, options, meta);
        vi.advanceTimersByTime(300);
        expect(publish.mock.calls).toEqual([[{action: "on_single_press"}]]);
    });
    test.each(["stop", "deviceOptionsChanged"] as const)("cancels pending work on %s", async (type) => {
        click();
        await extend.onEvent[0](
            type === "stop"
                ? {type, data: {ieeeAddr: device.ieeeAddr}}
                : {
                      type,
                      data: {device, options, from: options, to: {}, state: {}, deviceExposesChanged: vi.fn()},
                  },
        );
        vi.advanceTimersByTime(1500);
        expect(publish).not.toHaveBeenCalled();
    });
    test("disabling cancels a pending click", () => {
        click();
        options.multi_press_enabled = false;
        send(2);
        vi.advanceTimersByTime(1500);
        expect(publish).not.toHaveBeenCalled();
    });
    test.each([100, 1500, Number.NaN, 0, 1501])("validates timeout %s", (value) => {
        options.multi_press_timeout = value;
        click();
        const timeout = value >= 100 && value <= 1500 ? value : 300;
        vi.advanceTimersByTime(timeout - 1);
        expect(publish).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(publish).toHaveBeenCalledTimes(1);
    });
    test.each([false, true])("handles publishing errors (async: %s)", async (asyncError) => {
        const error = vi.spyOn(logger, "error").mockImplementation(() => {});
        publish.mockImplementationOnce(() => {
            if (asyncError) return Promise.reject(new Error("offline"));
            throw new Error("offline");
        });
        click();
        await vi.advanceTimersByTimeAsync(300);
        expect(error).toHaveBeenCalledOnce();
    });
});
