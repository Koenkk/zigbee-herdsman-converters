import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {definitions} from "../src/devices/develco";
import {prepareDefinition} from "../src/index";
import * as globalStore from "../src/lib/store";
import type {Fz, KeyValueAny, Tz, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

const getDefinition = (model: string) => prepareDefinition(definitions.find((d) => d.model === model));

function mockSiren(model: string) {
    const device = mockDevice({modelID: model, endpoints: [{ID: 43, inputClusters: ["genBasic", "ssIasZone", "ssIasWd"]}]});
    vi.spyOn(device, "save").mockImplementation(() => {});
    return device;
}

async function sendWarning(model: string, value: KeyValueAny, state: KeyValueAny = {}, device = mockSiren(model)) {
    const definition = getDefinition(model);
    const endpoint = device.getEndpoint(43);
    const publish = vi.fn();
    const meta = {message: {}, device, mapped: definition, options: {}, state, publish} as unknown as Tz.Meta;
    const result = await definition.toZigbee.find((c) => c.key?.includes("warning")).convertSet(endpoint, "warning", value, meta);
    const info = vi.mocked(endpoint.command).mock.calls.at(-1)[2].startwarninginfo;
    return {device, publish, result, info};
}

function zoneStatus(device: Zh.Device, state: KeyValueAny): KeyValueAny {
    const definition = getDefinition("SIRZB-111");
    const msg = {
        data: {zonestatus: 0x30},
        type: "commandStatusChangeNotification",
        device,
        endpoint: device.getEndpoint(43),
    } as unknown as Fz.Message<"ssIasZone">;
    return definition.fromZigbee
        .filter((c) => c.cluster === "ssIasZone")
        .reduce(
            (acc, c) =>
                Object.assign(
                    acc,
                    c.convert(definition, msg, () => {}, {}, {state, device, deviceExposesChanged: () => {}}),
                ),
            {},
        );
}

describe("Develco sirens", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        globalStore.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // https://github.com/Koenkk/zigbee2mqtt/issues/33296
    it.each([
        ["SIRZB-111", {mode: "burglar", level: "very_high", strobe: true}, 0x17],
        ["SIRZB-111", {mode: "stop", level: "very_high", strobe: true, duration: 10}, 0],
        ["SIRZB-110", {mode: "burglar", level: "very_high", strobe: true}, 0xd1],
    ])("%s %j sends info byte %d", async (model, value, expected) => {
        expect((await sendWarning(model, value)).info).toBe(expected);
    });

    it("warning_active turns on, then off when max_duration ends the warning", async () => {
        const {result, publish} = await sendWarning("SIRZB-111", {mode: "burglar", duration: 60}, {max_duration: 5});
        expect(result).toStrictEqual({state: {warning_active: true}});
        vi.advanceTimersByTime(4999);
        expect(publish).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(publish).toHaveBeenCalledWith({warning_active: false});
    });

    it("warning_active turns off on stop and cancels the pending timer", async () => {
        const {device, publish} = await sendWarning("SIRZB-111", {mode: "burglar", duration: 60});
        const stop = await sendWarning("SIRZB-111", {mode: "stop"}, {warning_active: true}, device);
        expect(stop.result).toStrictEqual({state: {warning_active: false}});
        vi.advanceTimersByTime(60_000);
        expect(publish).not.toHaveBeenCalled();
    });

    it.each([
        ["ended warning", 3, {warning_active: true}, false],
        ["running warning, unknown state", 600, {}, true],
        ["no warning sent", undefined, {warning_active: true}, false],
        ["state already right", undefined, {warning_active: false}, undefined],
    ])("warning_active after a restart: %s", async (_name, duration, state, expected) => {
        const device = mockSiren("SIRZB-111");
        if (duration) await sendWarning("SIRZB-111", {mode: "burglar", duration}, {}, device);
        globalStore.clear();
        vi.advanceTimersByTime(4000);
        expect(zoneStatus(device, state).warning_active).toBe(expected);
    });
});
