import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src";
import * as store from "../src/lib/store";
import type {Definition, KeyValue, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

async function setup(modelID = "TERNCY-PP01") {
    const device = mockDevice(
        {
            modelID,
            manufacturerID: 0x1228,
            manufacturerName: "Xiaoyan",
            endpoints: [
                {
                    ID: 1,
                    inputClusters: ["genBasic", "genPowerCfg", "msTemperatureMeasurement", "msIlluminanceMeasurement", "msOccupancySensing"],
                    inputClusterIDs: [0xfccc],
                },
            ],
        },
        "EndDevice",
    );
    const definition = await findByDevice(device);
    return {device, endpoint: device.endpoints[0], definition};
}
function convert(definition: Definition, device: Zh.Device, data: number[], publish = vi.fn(), options: KeyValue = {}) {
    const converter = definition.fromZigbee.find((c) => c.cluster === "manuSpecificClusterAduroSmart" && c.type === "raw");
    return converter.convert(definition, {data: Buffer.from(data), endpoint: device.endpoints[0], device} as never, publish, options, {
        device,
        state: {},
        logger: {debug: vi.fn()},
    } as never);
}
const motion = (status: number, light = 165) => [0x0d, 0x28, 0x12, 1, 4, light & 0xff, light >> 8, status];
describe("TERNCY-PP01", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        store.clear();
    });
    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        store.clear();
    });
    it("exposes battery and independent left/right motion while preserving existing measurements", async () => {
        const {device, definition} = await setup();
        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
        expect(exposes.map((e) => e.property)).toEqual(
            expect.arrayContaining([
                "battery",
                "occupancy",
                "occupancy_left",
                "occupancy_right",
                "action_side",
                "temperature",
                "illuminance",
                "action",
            ]),
        );
    });
    it.each([
        [1, "single"],
        [2, "double"],
        [3, "triple"],
        [4, "quadruple"],
    ])("decodes %s clicks", async (count, action) => {
        const {device, definition} = await setup();
        expect(convert(definition, device, [0x0d, 0x28, 0x12, 1, 0, 8, Number(count)])).toEqual({action});
    });
    it.each([0x05, 0x07])("decodes right ON bitmap %s and direct-lux illumination", async (status) => {
        const {device, definition} = await setup();
        expect(convert(definition, device, motion(status))).toMatchObject({
            occupancy: true,
            occupancy_right: true,
            action_side: "right",
            side: "right",
            illuminance: 165,
        });
        expect(convert(definition, device, motion(status))).not.toHaveProperty("occupancy_left");
    });
    it.each([0x28, 0x38])("decodes left ON bitmap %s", async (status) => {
        const {device, definition} = await setup();
        expect(convert(definition, device, motion(status))).toMatchObject({occupancy_left: true, action_side: "left", side: "left"});
    });
    it("clears only the side flagged as updated, without clearing overall occupancy prematurely", async () => {
        const {device, definition} = await setup();
        convert(definition, device, motion(0x28));
        convert(definition, device, motion(0x05));
        const leftOff = convert(definition, device, motion(0x20));
        expect(leftOff).toMatchObject({occupancy_left: false});
        expect(leftOff).not.toHaveProperty("occupancy_right");
        expect(leftOff).not.toHaveProperty("action_side");
        expect(leftOff).not.toHaveProperty("occupancy", false);
    });
    it("expires each side independently and preserves overall occupancy_timeout", async () => {
        const {device, definition} = await setup();
        const publish = vi.fn();
        convert(definition, device, motion(0x28), publish, {occupancy_timeout: 2});
        await vi.advanceTimersByTimeAsync(1000);
        convert(definition, device, motion(0x05), publish, {occupancy_timeout: 2});
        await vi.advanceTimersByTimeAsync(1000);
        expect(publish).toHaveBeenCalledWith({occupancy_left: false});
        expect(publish).not.toHaveBeenCalledWith({occupancy_right: false});
        await vi.advanceTimersByTimeAsync(1000);
        expect(publish).toHaveBeenCalledWith({occupancy_right: false});
        expect(publish).toHaveBeenCalledWith({occupancy: false});
    });
    it("cancels pending side clears on explicit OFF and honors timeout=0", async () => {
        const {device, definition} = await setup();
        const publish = vi.fn();
        convert(definition, device, motion(0x28), publish, {occupancy_timeout: 2});
        convert(definition, device, motion(0x20), publish, {occupancy_timeout: 2});
        await vi.advanceTimersByTimeAsync(3000);
        expect(publish).not.toHaveBeenCalledWith({occupancy_left: false});
        publish.mockClear();
        convert(definition, device, motion(0x05), publish, {occupancy_timeout: 0});
        await vi.advanceTimersByTimeAsync(100000);
        expect(publish).not.toHaveBeenCalled();
    });
    it("decodes light-only reports", async () => {
        const {device, definition} = await setup();
        expect(convert(definition, device, motion(0, 0))).toEqual({illuminance: 0});
    });
    it.each(
        [[], [0x0d], [0x0d, 0x28, 0x12, 1, 4, 10, 0], [0x0d, 0x28, 0x12, 1, 0, 8, 7]].map((data) => [data]),
    )("ignores malformed/unsupported frame %j", async (data) => {
        const {device, definition} = await setup();
        expect(convert(definition, device, data)).toBeUndefined();
    });
    it("keeps non-PP01 raw behavior unchanged", async () => {
        const {device, definition} = await setup("TERNCY-SD01");
        expect(convert(definition, device, motion(0x05))).toMatchObject({occupancy: true, action_side: "right", side: "right"});
        expect(convert(definition, device, [0x0d, 0x28, 0x12, 1, 0, 8, 4])).toBeUndefined();
    });
    it("handles right OFF and renews a detection without a stale timer", async () => {
        const {device, definition} = await setup();
        const publish = vi.fn();
        convert(definition, device, motion(0x05), publish, {occupancy_timeout: 2});
        await vi.advanceTimersByTimeAsync(500);
        expect(convert(definition, device, motion(0x04), publish)).toMatchObject({occupancy_right: false});
        convert(definition, device, motion(0x05), publish, {occupancy_timeout: 2});
        await vi.advanceTimersByTimeAsync(1500);
        expect(publish).not.toHaveBeenCalledWith({occupancy_right: false});
        await vi.advanceTimersByTimeAsync(500);
        expect(publish).toHaveBeenCalledWith({occupancy_right: false});
    });
    it("handles a synthetic both-side update without conflating the two sensors", async () => {
        const {device, definition} = await setup();
        expect(convert(definition, device, motion(0x2d))).toMatchObject({occupancy_left: true, occupancy_right: true, action_side: "left"});
        expect(convert(definition, device, motion(0x24))).toMatchObject({occupancy_left: false, occupancy_right: false});
    });
    it("keeps standard-cluster illuminance as direct lux and temperature at deci-degrees", async () => {
        const {device, definition, endpoint} = await setup();
        const illuminance = definition.fromZigbee.find((c) => c.cluster === "msIlluminanceMeasurement");
        expect(illuminance.convert(definition, {data: {measuredValue: 165}, device, endpoint} as never, vi.fn(), {}, {device} as never)).toEqual({
            illuminance: 165,
        });
        const temperature = definition.fromZigbee.find((c) => c.cluster === "msTemperatureMeasurement");
        expect(temperature.convert(definition, {data: {measuredValue: 254}, device, endpoint} as never, vi.fn(), {}, {device} as never)).toEqual({
            temperature: 25.4,
        });
        const battery = definition.fromZigbee.find((c) => c.cluster === "genPowerCfg");
        expect(
            battery.convert(definition, {data: {batteryPercentageRemaining: 48}, device, endpoint} as never, vi.fn(), {}, {device} as never),
        ).toEqual({battery: 48});
    });
    it("does not read or write private settings during configuration", async () => {
        const {device, definition, endpoint} = await setup();
        const coordinator = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).endpoints[0];
        await definition.configure(device, coordinator, definition);
        expect(vi.mocked(endpoint.read).mock.calls.every(([cluster]) => cluster !== "manuSpecificClusterAduroSmart")).toBe(true);
        expect(endpoint.write).not.toHaveBeenCalled();
        expect(endpoint.command).not.toHaveBeenCalled();
    });
});
