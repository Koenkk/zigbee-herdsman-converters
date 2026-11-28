import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {Group} from "zigbee-herdsman/dist/controller/model";
import {definitions} from "../src/devices/sygonix";
import {prepareDefinition} from "../src/index";
import {access} from "../src/lib/exposes";
import {logger} from "../src/lib/logger";
import * as globalStore from "../src/lib/store";
import * as tuya from "../src/lib/tuya";
import type {KeyValue, Tuya, Tz, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Sygonix SY-6872860", () => {
    beforeEach(() => {
        globalStore.clear();
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    const setup = (ieeeAddr = "0x12345678") => {
        const definition = prepareDefinition(definitions[0]);
        const device = mockDevice({
            modelID: "TS0601",
            manufacturerName: "_TZE284_hva0ao7p",
            ieeeAddr,
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
        const makeMeta = (message: KeyValue, options: KeyValue = {}): Tz.Meta => ({
            device,
            mapped: definition,
            message,
            options,
            state,
            publish,
            endpoint_name: undefined,
            deviceExposesChanged: () => {},
        });
        const converterFor = (key: string) => {
            const converter = definition.toZigbee.find((candidate) => !candidate.key || candidate.key.includes(key));
            if (!converter) throw new Error(`No converter for '${key}'`);
            return converter;
        };
        const send = (key: string, value: number | string, options: KeyValue = {}) => {
            const converter = converterFor(key);
            if (!converter.convertSet) throw new Error(`No SET converter for '${key}'`);
            return converter.convertSet(endpoint, key, value, makeMeta({[key]: value}, options));
        };
        const sendMessage = async (message: KeyValue) => {
            const used = new Set<Tz.Converter>();
            const results: Tz.ConvertSetResult[] = [];
            for (const [key, value] of Object.entries(message)) {
                const converter = converterFor(key);
                if (used.has(converter)) continue;
                if (!converter.convertSet) throw new Error(`No SET converter for '${key}'`);
                used.add(converter);
                results.push(await converter.convertSet(endpoint, key, value, makeMeta(message)));
            }
            return results;
        };
        const get = (key: string, target: Zh.Endpoint | Zh.Group = endpoint) => {
            const converter = converterFor(key);
            if (!converter.convertGet) throw new Error(`No GET converter for '${key}'`);
            const meta = makeMeta({[key]: ""});
            if (target !== endpoint) {
                meta.device = undefined;
                meta.mapped = [definition];
            }
            return converter.convertGet(target, key, meta);
        };
        const start = () => definition.onEvent({type: "start", data: {device, state, options: {}, deviceExposesChanged: () => {}}});
        return {definition, device, command, publish, report, reportFrame, send, sendMessage, get, start};
    };

    it("exposes position GET, movement status and favorite recall", () => {
        const {definition, device} = setup();
        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
        const cover = exposes.find((expose) => expose.type === "cover");
        expect(cover?.features.find((feature) => feature.name === "position")?.access).toBe(access.ALL);
        expect(cover?.features.find((feature) => feature.name === "state")?.access).toBe(access.STATE_SET);
        expect(exposes.find((expose) => expose.name === "motor_state")?.access).toBe(access.STATE);
        expect(exposes.find((expose) => expose.name === "goto_favorite")?.access).toBe(access.SET);
    });

    it("queries current position and refreshes the confirmed favorite without moving or polling", async () => {
        const {command, publish, report, send, get} = setup();
        report(19, 37);
        expect(await get("position")).toBeUndefined();
        expect(command).toHaveBeenCalledExactlyOnceWith("manuSpecificTuya", "dataQuery", {});
        await expect(send("goto_favorite", "recall")).rejects.toThrow("has not been reported");
        expect(report(3, 42)).toEqual({position: 42, state: "OPEN"});
        expect(report(19, 45)).toEqual({favorite_position: 45});
        await vi.advanceTimersByTimeAsync(60000);
        expect(command).toHaveBeenCalledTimes(1);
        expect(publish).not.toHaveBeenCalled();
        await send("goto_favorite", "recall");
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, 45])}]});
    });

    it("rejects group and unsupported GET requests without sending commands", async () => {
        const {command, get} = setup();
        const group = Object.create(Group.prototype) as Group;
        const groupCommand = vi.spyOn(group, "command").mockResolvedValue(undefined);
        await expect(get("position", group)).rejects.toThrow("Not an endpoint");
        for (const key of ["state", "battery", "unsupported"]) {
            await expect(get(key)).rejects.toThrow(`Getting '${key}' is not supported`);
        }
        expect(groupCommand).not.toHaveBeenCalled();
        expect(command).not.toHaveBeenCalled();
    });

    it.each([false, true])("sends each command exactly once in mixed SET messages (position first=%s)", async (positionFirst) => {
        const {command, publish, sendMessage} = setup();
        const message = positionFirst ? {position: 75, state: "OPEN"} : {state: "OPEN", position: 75};
        expect(await sendMessage(message)).toEqual([{state: {}}]);
        const state = {dp: 1, datatype: 4, data: Buffer.from([0])};
        const position = {dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, 75])};
        expect(command).toHaveBeenCalledTimes(2);
        expect(command.mock.calls.map((call) => call[2])).toEqual(
            (positionFirst ? [position, state] : [state, position]).map((dp) => expect.objectContaining({dpValues: [dp]})),
        );
        expect(publish).not.toHaveBeenCalled();
    });

    it.each([false, true])("reports actual position and movement separately from targets (invert_cover=%s)", async (invertCover) => {
        const {command, publish, report, send} = setup();
        const options = {invert_cover: invertCover};
        expect(await send("position", 80, options)).toEqual({state: {}});
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, invertCover ? 20 : 80])}]});
        expect(report(2, 80, options)).toEqual({});
        expect(report(1, 0, options, 4)).toEqual({motor_state: invertCover ? "closing" : "opening"});
        expect(report(3, 37, options)).toEqual({position: invertCover ? 63 : 37, state: "OPEN"});
        expect(report(1, 2, options, 4)).toEqual({motor_state: invertCover ? "opening" : "closing"});
        expect(report(1, 1, options, 4)).toEqual({motor_state: "stopped"});
        expect(report(3, invertCover ? 100 : 0, options)).toEqual({position: 0, state: "CLOSE"});
        expect(report(3, invertCover ? 0 : 100, options)).toEqual({position: 100, state: "OPEN"});
        expect(publish).not.toHaveBeenCalled();
        for (const [value, native] of [
            ["OPEN", invertCover ? 2 : 0],
            ["CLOSE", invertCover ? 0 : 2],
            ["STOP", 1],
        ] as const) {
            expect(await send("state", value, options)).toEqual({state: {}});
            expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp: 1, datatype: 4, data: Buffer.from([native])}]});
        }
    });

    it.each([false, true])("combines position and stop in one report regardless of datapoint order (position first=%s)", (positionFirst) => {
        const {publish, reportFrame} = setup();
        const stop = {dp: 1, datatype: 4, data: Buffer.from([1])};
        const position = {dp: 3, datatype: 2, data: Buffer.from([0, 0, 0, 37])};
        expect(reportFrame(positionFirst ? [position, stop] : [stop, position])).toEqual({position: 37, state: "OPEN", motor_state: "stopped"});
        expect(publish).not.toHaveBeenCalled();
    });

    it.each([false, true])("recalls only a confirmed native favorite without double inversion (invert_cover=%s)", async (invertCover) => {
        const {command, report, send} = setup();
        const options = {invert_cover: invertCover};
        await expect(send("goto_favorite", "recall", options)).rejects.toThrow("has not been reported");
        expect(command).not.toHaveBeenCalled();
        expect(report(19, 37, options)).toEqual({favorite_position: 37});
        expect(await send("goto_favorite", "recall", options)).toEqual({state: {}});
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, 37])}]});
        expect(await send("favorite_position", 40, options)).toEqual({state: {}});
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp: 19, datatype: 2, data: Buffer.from([0, 0, 0, 40])}]});
        await expect(send("goto_favorite", "recall", options)).rejects.toThrow("has not been reported");
        report(19, 40, options);
        await send("goto_favorite", "recall", options);
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, 40])}]});
    });

    it("rejects unset, invalid and unrecognized favorite commands without moving", async () => {
        const {command, report, reportFrame, send} = setup();
        for (const value of [0, 101, 255]) {
            report(19, 37);
            report(19, value);
            await expect(send("goto_favorite", "recall")).rejects.toThrow("unset or invalid");
        }
        reportFrame([{dp: 19, datatype: 3, data: Buffer.from("37.5")}]);
        await expect(send("goto_favorite", "recall")).rejects.toThrow("unset or invalid");
        report(19, 37);
        await expect(send("goto_favorite", "other")).rejects.toThrow("must be 'recall'");
        expect(command).not.toHaveBeenCalled();
    });

    it.each([
        ["motor_direction", "reversed", 5, 1],
        ["cover_limit", "up", 16, 0],
        ["cover_limit", "down", 16, 1],
    ] as const)("invalidates the favorite without changing the %s=%s physical command", async (key, value, dp, native) => {
        const {command, report, send} = setup();
        report(19, 37);
        await send(key, value);
        expect(command).toHaveBeenCalledTimes(1);
        expect(command.mock.lastCall?.[2]).toMatchObject({dpValues: [{dp, datatype: 4, data: Buffer.from([native])}]});
        await expect(send("goto_favorite", "recall")).rejects.toThrow("has not been reported");
        expect(command).toHaveBeenCalledTimes(1);
    });

    it.each([false, true])("never recalls the old favorite in a mixed favorite SET (recall first=%s)", async (recallFirst) => {
        const {command, report, sendMessage} = setup();
        report(19, 37);
        const message = recallFirst ? {goto_favorite: "recall", favorite_position: 40} : {favorite_position: 40, goto_favorite: "recall"};
        await expect(sendMessage(message)).rejects.toThrow("has not been reported");
        expect(command.mock.calls.every((call) => call[2].dpValues.every((dp: Tuya.DpValue) => dp.dp === 19))).toBe(true);
    });

    it("keeps reported favorites isolated between motors", async () => {
        const first = setup("0x12345678");
        const second = setup("0x87654321");
        first.report(19, 37);
        await expect(second.send("goto_favorite", "recall")).rejects.toThrow("has not been reported");
        await first.send("goto_favorite", "recall");
        expect(first.command).toHaveBeenCalledTimes(1);
        expect(second.command).not.toHaveBeenCalled();
    });

    it("refreshes on startup and announce, and clears the favorite on stop", async () => {
        const {definition, device, command, report, send, start} = setup();
        report(19, 37);
        await start();
        expect(command).toHaveBeenCalledExactlyOnceWith("manuSpecificTuya", "dataQuery", {});
        await expect(send("goto_favorite", "recall")).rejects.toThrow("has not been reported");
        report(19, 37);
        await definition.onEvent({type: "deviceAnnounce", data: {device, state: {}, options: {}, deviceExposesChanged: () => {}}});
        expect(command).toHaveBeenCalledTimes(2);
        await expect(send("goto_favorite", "recall")).rejects.toThrow("has not been reported");
        report(19, 37);
        await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
        await expect(send("goto_favorite", "recall")).rejects.toThrow("has not been reported");
        expect(command).toHaveBeenCalledTimes(2);
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
    });
});
