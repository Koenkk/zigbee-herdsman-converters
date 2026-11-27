import {beforeEach, describe, expect, it, vi} from "vitest";
import {definitions} from "../src/devices/sygonix";
import {prepareDefinition} from "../src/index";
import {logger} from "../src/lib/logger";
import * as globalStore from "../src/lib/store";
import * as tuya from "../src/lib/tuya";
import type {KeyValue, Tuya, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Sygonix SY-6872860", () => {
    beforeEach(() => globalStore.clear());

    const setup = () => {
        const definition = prepareDefinition(definitions[0]);
        const device = mockDevice({
            modelID: "TS0601",
            manufacturerName: "_TZE284_hva0ao7p",
            endpoints: [{ID: 1}],
        });
        const endpoint = device.getEndpoint(1);
        const command = vi.mocked(endpoint.command);
        const publish = vi.fn();
        const state = {favorite_position: 37};
        const reportFrame = (dpValues: Tuya.DpValue[], options: KeyValue = {}) => {
            return tuya.fz.datapoints.convert(
                definition,
                {
                    type: "commandDataReport",
                    cluster: "manuSpecificTuya",
                    data: {seq: 1, dpValues},
                    device,
                    endpoint,
                    groupID: 0,
                    linkquality: 100,
                    meta: {rawData: Buffer.alloc(0)},
                },
                publish,
                options,
                {device, state, deviceExposesChanged: () => {}},
            );
        };
        const report = (dp: number, value: number, options: KeyValue = {}, datatype = 2) => {
            const data = datatype === 2 ? Buffer.alloc(4) : Buffer.from([value]);
            if (datatype === 2) data.writeUInt32BE(value);
            return reportFrame([{dp, datatype, data}], options);
        };
        const send = (key: string, value: number | string, options: KeyValue = {}) => {
            const meta: Tz.Meta = {
                device,
                mapped: definition,
                message: {[key]: value},
                options,
                state,
                publish,
                endpoint_name: undefined,
                deviceExposesChanged: () => {},
            };
            return tuya.tz.datapoints.convertSet(endpoint, key, value, meta);
        };
        const start = () => definition.onEvent({type: "start", data: {device, state, options: {}, deviceExposesChanged: () => {}}});
        return {definition, device, command, publish, report, reportFrame, send, start};
    };

    it.each([false, true])("keeps target echoes separate from actual position (invert_cover=%s)", async (invertCover) => {
        const {command, publish, report, send} = setup();
        const options = {invert_cover: invertCover};
        expect(await send("position", 80, options)).toEqual({state: {}});
        expect(command.mock.lastCall?.[2]).toMatchObject({
            dpValues: [{dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, invertCover ? 20 : 80])}],
        });
        expect(report(2, 80, options)).toEqual({});
        expect(report(3, 37, options)).toEqual({position: invertCover ? 63 : 37, state: "OPEN"});
        expect(report(3, invertCover ? 100 : 0, options)).toEqual({position: 0, state: "CLOSE"});
        expect(report(1, 0, options, 4)).toEqual({motor_state: invertCover ? "closing" : "opening"});
        expect(report(1, 1, options, 4)).toEqual({});
        expect(report(3, 37, options)).toEqual({position: invertCover ? 63 : 37, state: "OPEN", motor_state: "stopped"});
        expect(report(1, 2, options, 4)).toEqual({motor_state: invertCover ? "opening" : "closing"});
        expect(publish).not.toHaveBeenCalled();
    });

    it.each([false, true])("publishes a combined STOP and position report atomically in either order (position first=%s)", (positionFirst) => {
        const {publish, report, reportFrame} = setup();
        const stop = {dp: 1, datatype: 4, data: Buffer.from([1])};
        const position = {dp: 3, datatype: 2, data: Buffer.from([0, 0, 0, 37])};
        expect(reportFrame(positionFirst ? [position, stop] : [stop, position])).toEqual({position: 37, state: "OPEN", motor_state: "stopped"});
        expect(report(3, 40)).toEqual({position: 40, state: "OPEN"});
        expect(publish).not.toHaveBeenCalled();
    });

    it("waits for a valid final position after duplicate STOP reports", () => {
        const {publish, report} = setup();
        expect(report(1, 2, {}, 4)).toEqual({motor_state: "closing"});
        expect(report(1, 1, {}, 4)).toEqual({});
        expect(report(1, 1, {}, 4)).toEqual({});
        expect(report(3, 255)).toEqual({});
        expect(report(3, 0)).toEqual({position: 0, state: "CLOSE", motor_state: "stopped"});
        expect(publish).not.toHaveBeenCalled();
    });

    it("discards a pending STOP when a new movement starts", () => {
        const {report} = setup();
        expect(report(1, 1, {}, 4)).toEqual({});
        expect(report(1, 0, {}, 4)).toEqual({motor_state: "opening"});
        expect(report(3, 37)).toEqual({position: 37, state: "OPEN"});
    });

    it.each([false, true])("requires a reported favorite and recalls its native percentage (invert_cover=%s)", async (invertCover) => {
        const {command, publish, report, send} = setup();
        const options = {invert_cover: invertCover};
        await expect(send("goto_favorite", "recall", options)).rejects.toThrow("has not been reported");
        expect(command).not.toHaveBeenCalled();

        expect(report(19, 37, options)).toEqual({favorite_position: invertCover ? 63 : 37});
        expect(await send("goto_favorite", "recall", options)).toEqual({state: {}});
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, 37])}]});

        expect(await send("favorite_position", invertCover ? 60 : 40, options)).toEqual({state: {}});
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp: 19, datatype: 2, data: Buffer.from([0, 0, 0, 40])}]});
        await expect(send("goto_favorite", "recall", options)).rejects.toThrow("has not been reported");

        expect(report(19, 40, options)).toEqual({favorite_position: invertCover ? 60 : 40});
        await send("goto_favorite", "recall", options);
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, 40])}]});
        expect(publish).not.toHaveBeenCalled();
    });

    it.each([false, true])("handles the unset sentinel without turning it into an endpoint (invert_cover=%s)", async (invertCover) => {
        const {report, send} = setup();
        const options = {invert_cover: invertCover};
        expect(report(19, 100, options)).toEqual({favorite_position: invertCover ? 0 : 100});
        await send("favorite_position", invertCover ? 0 : 100, options);
        expect(report(19, 0, options)).toEqual({favorite_position: null});
        await expect(send("goto_favorite", "recall", options)).rejects.toThrow("unset");
        for (const value of [invertCover ? 100 : 0, -1, 101, 37.5, Number.NaN, "37"]) {
            await expect(send("favorite_position", value, options)).rejects.toThrow("must be an integer");
        }
    });

    it.each([
        ["motor_direction", "reversed", 5, 1],
        ["cover_limit", "up", 16, 0],
        ["cover_limit", "down", 16, 1],
    ] as const)("invalidates a confirmed favorite when changing %s to %s", async (key, value, dp, native) => {
        const {command, report, send} = setup();
        report(19, 37);
        expect(await send(key, value)).toEqual({state: {}});
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp, datatype: 4, data: Buffer.from([native])}]});
        await expect(send("goto_favorite", "recall")).rejects.toThrow("has not been reported");
        expect(report(16, native, {}, 4)).toEqual({});
    });

    it("refreshes status on startup and preserves announce handling", async () => {
        const {definition, device, command, report, send, start} = setup();
        report(19, 37);
        report(1, 1, {}, 4);
        await start();
        expect(command).toHaveBeenCalledExactlyOnceWith("manuSpecificTuya", "dataQuery", {});
        await expect(send("goto_favorite", "recall")).rejects.toThrow("has not been reported");
        expect(report(3, 37)).toEqual({position: 37, state: "OPEN"});
        report(19, 37);
        await send("goto_favorite", "recall");
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, 37])}]});

        command.mockClear();
        await definition.onEvent({type: "deviceAnnounce", data: {device, state: {}, options: {}, deviceExposesChanged: () => {}}});
        expect(command).toHaveBeenCalledExactlyOnceWith("manuSpecificTuya", "dataQuery", {});
    });

    it("keeps recall unavailable after a failed startup query without failing other hooks", async () => {
        const {device, command, report, send, start} = setup();
        const warning = vi.spyOn(logger, "warning").mockImplementation(() => {});
        const addCustomCluster = vi.spyOn(device, "addCustomCluster");
        report(19, 37);
        command.mockRejectedValueOnce(new Error("offline"));
        await expect(start()).resolves.toBeUndefined();
        expect(addCustomCluster).toHaveBeenCalled();
        expect(warning).toHaveBeenCalledExactlyOnceWith("Failed to query Sygonix status on startup: Error: offline", "zhc:sygonix");
        await expect(send("goto_favorite", "recall")).rejects.toThrow("has not been reported");
        warning.mockRestore();
    });
});
