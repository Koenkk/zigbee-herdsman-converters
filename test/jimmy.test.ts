import {describe, expect, it, vi} from "vitest";
import {definitions} from "../src/devices/jimmy";
import type {Tz} from "../src/lib/types";
import {assertDefinition, mockDevice, reportingItem} from "./utils";

const MODES = ["button_multi", "button_toggle", "button_scene", "rocker_toggle", "rocker_follow", "rocker_reverse"];
const ACTION_SUFFIXES = [
    "toggle",
    "brightness_move_up",
    "brightness_move_down",
    "brightness_stop",
    "color_temperature_cool",
    "color_temperature_warm",
    "color_temperature_move_cooler",
    "color_temperature_move_warmer",
    "color_temperature_stop",
    "on",
    "off",
    "scene",
];

const definition = definitions[0];
const modeConverter = definition.fromZigbee?.[0];
const actionConverter = definition.fromZigbee?.[1];
const modeToZigbee = definition.toZigbee?.[0];

const mockConversionMeta = {
    state: {},
    device: mockDevice({modelID: "H2-ZB-SW-V1", endpoints: []}),
    deviceExposesChanged: vi.fn(),
} as never;

describe("JIMMY H2-ZB-SW-V1", () => {
    it("matches only the reported manufacturer and model", () => {
        expect(definition.fingerprint).toEqual([{modelID: "H2-ZB-SW-V1", manufacturerName: "JIMMY"}]);
        expect(definition.zigbeeModel).toBeUndefined();
    });

    it("advertises OTA upgrade support", () => {
        expect(definition.ota).toBe(true);
    });

    it("uses the official model definition and preserves all four mode endpoints", async () => {
        const endpoints = [1, 2, 3, 4];
        await assertDefinition({
            device: mockDevice({
                modelID: "H2-ZB-SW-V1",
                manufacturerName: "JIMMY",
                endpoints: endpoints.map((Id) => ({
                    ID: Id,
                    inputClusters: ["genMultistateValue"],
                    outputClusterIDs: [0xfc10],
                })),
            }),
            meta: undefined,
            fromZigbee: definition.fromZigbee ?? [],
            toZigbee: ["ch1_mode", "ch2_mode", "ch3_mode", "ch4_mode"],
            exposes: ["action", "ch1_mode", "ch2_mode", "ch3_mode", "ch4_mode"],
            bind: {1: ["genMultistateValue"], 2: ["genMultistateValue"], 3: ["genMultistateValue"], 4: ["genMultistateValue"]},
            read: {
                1: [["genMultistateValue", ["presentValue"]]],
                2: [["genMultistateValue", ["presentValue"]]],
                3: [["genMultistateValue", ["presentValue"]]],
                4: [["genMultistateValue", ["presentValue"]]],
            },
            write: {},
            configureReporting: {
                1: [["genMultistateValue", [reportingItem("presentValue", 0, 3600, 0)]]],
                2: [["genMultistateValue", [reportingItem("presentValue", 0, 3600, 0)]]],
                3: [["genMultistateValue", [reportingItem("presentValue", 0, 3600, 0)]]],
                4: [["genMultistateValue", [reportingItem("presentValue", 0, 3600, 0)]]],
            },
        });
    });

    it("maps all six mode values to the original endpoint-prefixed properties", async () => {
        expect(modeConverter).toBeDefined();
        if (!modeConverter) throw new Error("Missing mode converter");
        for (const endpointId of [1, 2, 3, 4]) {
            for (const [presentValue, mode] of MODES.entries()) {
                const result = await modeConverter.convert(
                    definition as never,
                    {endpoint: {ID: endpointId}, data: {presentValue}} as never,
                    vi.fn(),
                    {},
                    mockConversionMeta,
                );
                expect(result).toEqual({[`ch${endpointId}_mode`]: mode});
            }
        }
    });

    it("maps all 48 action codes to the original action names", async () => {
        expect(actionConverter).toBeDefined();
        if (!actionConverter) throw new Error("Missing action event converter");
        for (const endpointId of [1, 2, 3, 4]) {
            for (const [index, suffix] of ACTION_SUFFIXES.entries()) {
                const result = await actionConverter.convert(
                    definition as never,
                    {endpoint: {ID: endpointId}, data: {action: index + 1, sequence: index}} as never,
                    vi.fn(),
                    {},
                    mockConversionMeta,
                );
                expect(result).toEqual({action: `ch${endpointId}_${suffix}`});
            }
        }
    });

    it("keeps mode reads and writes on their explicit endpoint", async () => {
        expect(modeToZigbee).toBeDefined();
        if (!modeToZigbee?.convertSet || !modeToZigbee.convertGet) throw new Error("Missing mode read/write converter");
        const device = mockDevice({
            modelID: "H2-ZB-SW-V1",
            endpoints: [1, 2, 3, 4].map((Id) => ({ID: Id, inputClusters: ["genMultistateValue"]})),
        });
        const meta = {device} as Tz.Meta;

        await modeToZigbee.convertSet(device.getEndpoint(1), "ch2_mode", "rocker_follow", meta);
        expect(device.getEndpoint(2).write).toHaveBeenCalledWith("genMultistateValue", {presentValue: 4});

        await modeToZigbee.convertGet(device.getEndpoint(1), "ch4_mode", meta);
        expect(device.getEndpoint(4).read).toHaveBeenCalledWith("genMultistateValue", ["presentValue"]);
    });

    it("rejects unknown action codes, sequence values, and mode names", async () => {
        expect(actionConverter).toBeDefined();
        if (!actionConverter) throw new Error("Missing action event converter");
        if (!modeToZigbee?.convertSet) throw new Error("Missing mode write converter");
        const convertAction = (msg: unknown) => actionConverter.convert(definition as never, msg as never, vi.fn(), {}, mockConversionMeta);

        expect(await convertAction({endpoint: {ID: 1}, data: {action: 13, sequence: 0}})).toBeUndefined();
        expect(await convertAction({endpoint: {ID: 1}, data: {action: 1, sequence: 0x10000}})).toBeUndefined();
        expect(await convertAction({data: {action: 1, sequence: 0}})).toBeUndefined();
        expect(await convertAction({endpoint: {ID: 1}, data: {sequence: 0}})).toBeUndefined();
        await expect(modeToZigbee.convertSet(undefined, "ch1_mode", "unknown", {device: mockConversionMeta.device} as Tz.Meta)).rejects.toThrow(
            "Unsupported channel mode: unknown",
        );
    });
});
