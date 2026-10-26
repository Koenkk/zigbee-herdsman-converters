import {describe, expect, it, vi} from "vitest";
import * as fz from "../src/converters/fromZigbee";
import {findByDevice} from "../src/index";
import {access} from "../src/lib/exposes";
import {fzLegrand, tzLegrand} from "../src/lib/legrand";
import type {TuyaClosuresWindowCovering} from "../src/lib/tuya";
import type {Fz, KeyValue, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Legrand 067776A movement", () => {
    async function setup(hardwareVersion = 6) {
        const device = mockDevice({
            modelID: " Shutter SW with level control\u0000",
            manufacturerName: " Legrand",
            endpoints: [{ID: 1, inputClusters: ["closuresWindowCovering", "genBinaryInput", "genIdentify"]}],
        });
        device.hardwareVersion = hardwareVersion;
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(1);
        let state: KeyValue = {position: 100, moving: false, state: "OPEN"};

        const message = (
            data: Record<string, number>,
            type: "attributeReport" | "readResponse" = "attributeReport",
        ): Fz.Message<"closuresWindowCovering", TuyaClosuresWindowCovering, ["attributeReport", "readResponse"]> => ({
            data,
            type,
            cluster: "closuresWindowCovering",
            device,
            endpoint,
            groupID: 0,
            linkquality: 100,
            meta: {rawData: Buffer.alloc(0)},
        });

        const meta = (): Fz.Meta => ({device, state, deviceExposesChanged: vi.fn()});
        const convert = async (
            data: Record<string, number>,
            options: KeyValue = {},
            type: "attributeReport" | "readResponse" = "attributeReport",
        ) => {
            const msg = message(data, type);
            let payload: KeyValue = {};
            for (const converter of definition.fromZigbee) {
                if (converter.cluster === msg.cluster && converter.type.includes(type)) {
                    const result = await converter.convert(definition, msg, vi.fn(), options, meta());
                    payload = {...payload, ...result};
                }
            }
            state = {...state, ...payload};
            return state;
        };

        const createTzMeta = (request: KeyValue): Tz.Meta => ({
            message: request,
            device,
            mapped: definition,
            options: {},
            state,
            endpoint_name: undefined,
            publish: vi.fn(),
            deviceExposesChanged: vi.fn(),
        });
        const getter = definition.toZigbee.find((converter) => converter.key.includes("moving"));

        return {device, definition, endpoint, message, meta, convert, createTzMeta, getter};
    }

    it.each([6, 9, 13, 16])("wires the moving getter and incoming converter for hardware version %s", async (hardwareVersion) => {
        const {definition, device, getter} = await setup(hardwareVersion);
        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
        expect(exposes.find((expose) => expose.property === "moving").access).toBe(access.STATE_GET);
        expect(getter).toBe(tzLegrand.cover_moving);
        expect(definition.fromZigbee).toContain(fzLegrand.cover_position_tilt_with_moving);
        expect(definition.fromZigbee).not.toContain(fz.cover_position_tilt);
        expect(definition.fromZigbee).not.toContain(fzLegrand.cover_moving_state);
        expect(definition.toZigbee).toContain(tzLegrand.cover_state_with_moving);
        expect(definition.toZigbee).toContain(tzLegrand.cover_position_with_moving);
    });

    it("reads current position and target together without a command, write or optimistic state", async () => {
        const {getter, endpoint, createTzMeta} = await setup();
        const result = await getter.convertGet(endpoint, "moving", createTzMeta({moving: ""}));
        expect(endpoint.read).toHaveBeenCalledExactlyOnceWith("closuresWindowCovering", ["currentPositionLiftPercentage", "tuyaMovingState"]);
        expect(endpoint.command).not.toHaveBeenCalled();
        expect(endpoint.write).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
        expect(getter.convertSet).toBeUndefined();
    });

    it("waits for the read to complete", async () => {
        const {getter, endpoint, createTzMeta} = await setup();
        const {promise, resolve} = Promise.withResolvers<Record<string, unknown>>();
        vi.mocked(endpoint.read).mockReturnValueOnce(promise);
        let completed = false;
        const request = getter.convertGet(endpoint, "moving", createTzMeta({moving: ""})).then(() => {
            completed = true;
        });
        await Promise.resolve();
        expect(completed).toBe(false);
        resolve({});
        await request;
        expect(completed).toBe(true);
    });

    it.each(["Timeout", "UNSUPPORTED_ATTRIBUTE"])("propagates read failures: %s", async (message) => {
        const {getter, endpoint, createTzMeta} = await setup();
        const error = new Error(message);
        vi.mocked(endpoint.read).mockRejectedValueOnce(error);
        await expect(getter.convertGet(endpoint, "moving", createTzMeta({moving: ""}))).rejects.toBe(error);
    });

    it("replays close, intermediate stop and immediate reopening without overwriting movement state", async () => {
        const {convert} = await setup();
        for (const [data, position, moving, state] of [
            [{currentPositionLiftPercentage: 18, tuyaMovingState: 18}, 82, false, "OPEN"],
            [{tuyaMovingState: 100}, 82, true, "closing"],
            [{currentPositionLiftPercentage: 18, tuyaMovingState: 100}, 82, true, "closing"],
            [{currentPositionLiftPercentage: 63, tuyaMovingState: 63}, 37, false, "OPEN"],
            [{tuyaMovingState: 0}, 37, true, "opening"],
            [{currentPositionLiftPercentage: 63, tuyaMovingState: 0}, 37, true, "opening"],
            [{currentPositionLiftPercentage: 0}, 100, true, "opening"],
            [{currentPositionLiftPercentage: 0, tuyaMovingState: 0}, 100, false, "OPEN"],
        ] satisfies [Record<string, number>, number, boolean, string][]) {
            expect(await convert(data)).toMatchObject({position, moving, state});
        }
    });

    it("handles consecutive complete close-open-close cycles without a timer", async () => {
        const {convert} = await setup();
        for (const target of [100, 0, 100]) {
            const direction = target === 100 ? "closing" : "opening";
            expect(await convert({tuyaMovingState: target})).toMatchObject({moving: true, state: direction});
            expect(await convert({currentPositionLiftPercentage: 50})).toMatchObject({position: 50, moving: true, state: direction});
            expect(await convert({currentPositionLiftPercentage: target, tuyaMovingState: target})).toMatchObject({
                position: 100 - target,
                moving: false,
                state: target === 100 ? "CLOSE" : "OPEN",
            });
        }
    });

    it("changes direction immediately when a new target arrives during movement", async () => {
        const {convert} = await setup();
        await convert({currentPositionLiftPercentage: 50, tuyaMovingState: 0});
        expect(await convert({currentPositionLiftPercentage: 50, tuyaMovingState: 100})).toMatchObject({
            position: 50,
            moving: true,
            state: "closing",
        });
    });

    it.each(["attributeReport", "readResponse"] as const)("preserves native stationary position, tilt and mode handling for %s", async (type) => {
        const {definition, message, meta, convert} = await setup();
        for (const options of [{}, {invert_cover: true}]) {
            for (const data of [
                {currentPositionLiftPercentage: 0, tuyaMovingState: 0},
                {currentPositionLiftPercentage: 100, tuyaMovingState: 100},
                {currentPositionLiftPercentage: 45, tuyaMovingState: 45},
                {currentPositionLiftPercentage: 255},
                {currentPositionTiltPercentage: 75},
                {windowCoveringMode: 3},
                {},
            ]) {
                const msg = message(data, type);
                const before = {...meta().state};
                const movement = fzLegrand.cover_moving_state.convert(definition, msg, vi.fn(), options, meta());
                const position = await fz.cover_position_tilt.convert(definition, msg, vi.fn(), options, meta());
                expect(await convert(data, options, type)).toStrictEqual({...before, ...movement, ...position});
            }
        }
    });

    it.each(["opening", "closing"])("keeps %s across position-only read responses", async (direction) => {
        const {convert} = await setup();
        await convert({currentPositionLiftPercentage: 50, tuyaMovingState: direction === "opening" ? 0 : 100});
        expect(await convert({currentPositionLiftPercentage: 40}, {}, "readResponse")).toMatchObject({
            position: 60,
            moving: true,
            state: direction,
        });
    });

    it("does not infer movement from a position-only report while stopped", async () => {
        const {convert} = await setup();
        expect(await convert({currentPositionLiftPercentage: 40})).toMatchObject({position: 60, moving: false, state: "OPEN"});
    });

    it("preserves tilt and mode data during movement", async () => {
        const {convert} = await setup();
        await convert({tuyaMovingState: 100});
        expect(await convert({currentPositionTiltPercentage: 25, windowCoveringMode: 3})).toMatchObject({
            tilt: 75,
            moving: true,
            state: "closing",
            cover_mode: {reversed: true, calibration: true},
        });
    });

    it("keeps the native STOP command and does not preserve movement after it", async () => {
        const {definition, endpoint, createTzMeta, convert} = await setup();
        await convert({tuyaMovingState: 100});
        const converter = definition.toZigbee.find((item) => item.key.includes("state"));
        const meta = createTzMeta({state: "STOP"});
        const result = await converter.convertSet(endpoint, "state", "STOP", meta);
        expect(endpoint.command).toHaveBeenCalledWith("closuresWindowCovering", "stop", {}, expect.any(Object));
        expect(result).toMatchObject({state: {moving: false, action: "stopped", state: "OPEN"}});
        if (!result) {
            throw new Error("STOP did not return a state");
        }
        Object.assign(meta.state, result.state);
        expect(await convert({currentPositionLiftPercentage: 40})).toMatchObject({position: 60, moving: false, state: "OPEN"});
    });
});
