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

    it("exposes position GET while preserving position SET and cover commands", () => {
        const {definition, device} = setup();
        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
        const cover = exposes.find((expose) => expose.type === "cover");
        expect(cover?.features.find((feature) => feature.name === "position")?.access).toBe(access.ALL);
        expect(cover?.features.find((feature) => feature.name === "state")?.access).toBe(access.STATE_SET);
    });

    it("queries position once without optimistic state or ongoing polling", async () => {
        const {command, publish, get} = setup();
        expect(await get("position")).toBeUndefined();
        expect(command).toHaveBeenCalledExactlyOnceWith("manuSpecificTuya", "dataQuery", {});
        expect(publish).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(60000);
        expect(command).toHaveBeenCalledTimes(1);
        expect(publish).not.toHaveBeenCalled();
    });

    it("rejects a group position query without sending a command", async () => {
        const {command, publish, get} = setup();
        const group = Object.create(Group.prototype) as Group;
        const groupCommand = vi.spyOn(group, "command").mockResolvedValue(undefined);
        await expect(get("position", group)).rejects.toThrow("Not an endpoint");
        expect(groupCommand).not.toHaveBeenCalled();
        expect(command).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });

    it.each(["state", "battery", "unsupported"])("rejects an unsupported GET for %s", async (key) => {
        const {command, publish, get} = setup();
        await expect(get(key)).rejects.toThrow(`Getting '${key}' is not supported`);
        expect(command).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });

    it.each([false, true])(
        "routes a mixed SET message through one converter without duplicate commands (position first=%s)",
        async (positionFirst) => {
            const {command, publish, sendMessage} = setup();
            const message = positionFirst ? {position: 75, state: "OPEN"} : {state: "OPEN", position: 75};
            expect(await sendMessage(message)).toEqual([{state: {}}]);
            const state = {dp: 1, datatype: 4, data: Buffer.from([0])};
            const position = {dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, 75])};
            const expected = positionFirst ? [position, state] : [state, position];
            expect(command).toHaveBeenCalledTimes(2);
            expect(command.mock.calls.map((call) => call[2])).toEqual(expected.map((dp) => expect.objectContaining({dpValues: [dp]})));
            expect(publish).not.toHaveBeenCalled();
        },
    );

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
        vi.advanceTimersByTime(2000);
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
        const {publish, report} = setup();
        expect(report(1, 1, {}, 4)).toEqual({});
        vi.advanceTimersByTime(500);
        expect(report(1, 0, {}, 4)).toEqual({motor_state: "opening"});
        vi.advanceTimersByTime(2000);
        expect(publish).not.toHaveBeenCalled();
        expect(report(3, 37)).toEqual({position: 37, state: "OPEN"});
    });

    it.each([false, true])("reports a confirmed stop with unknown position when the final report is missing (invert_cover=%s)", (invertCover) => {
        const {command, publish, report} = setup();
        const options = {invert_cover: invertCover};
        report(3, 0, options);
        report(1, 0, options, 4);
        expect(report(1, 1, options, 4)).toEqual({});
        vi.advanceTimersByTime(999);
        expect(publish).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(publish).toHaveBeenCalledExactlyOnceWith({motor_state: "stopped", position: null, state: null});
        expect(command).not.toHaveBeenCalled();

        expect(report(3, 37, options)).toEqual({position: invertCover ? 63 : 37, state: "OPEN", motor_state: "stopped"});
        vi.advanceTimersByTime(2000);
        expect(publish).toHaveBeenCalledTimes(1);
    });

    it("cancels the fallback when the final position arrives after STOP", () => {
        const {publish, report} = setup();
        report(1, 2, {}, 4);
        report(1, 1, {}, 4);
        vi.advanceTimersByTime(124);
        expect(report(3, 0)).toEqual({position: 0, state: "CLOSE", motor_state: "stopped"});
        vi.advanceTimersByTime(2000);
        expect(publish).not.toHaveBeenCalled();
    });

    it("does not postpone or repeat the fallback for duplicate STOP or invalid position reports", () => {
        const {publish, report} = setup();
        report(1, 2, {}, 4);
        report(1, 1, {}, 4);
        vi.advanceTimersByTime(600);
        report(1, 1, {}, 4);
        expect(report(3, 255)).toEqual({});
        vi.advanceTimersByTime(400);
        expect(publish).toHaveBeenCalledExactlyOnceWith({motor_state: "stopped", position: null, state: null});
        report(1, 1, {}, 4);
        vi.advanceTimersByTime(2000);
        expect(publish).toHaveBeenCalledTimes(1);
    });

    it.each(["start", "stop"] as const)("cancels the pending fallback on %s", async (eventType) => {
        const {definition, device, publish, report, start} = setup();
        report(1, 1, {}, 4);
        vi.advanceTimersByTime(500);
        if (eventType === "start") await start();
        else await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
        vi.advanceTimersByTime(2000);
        expect(publish).not.toHaveBeenCalled();
        expect(report(3, 37)).toEqual({position: 37, state: "OPEN"});
    });

    it("keeps pending stops isolated between motors", () => {
        const first = setup("0x12345678");
        const second = setup("0x87654321");
        first.report(1, 1, {}, 4);
        second.report(1, 1, {}, 4);
        vi.advanceTimersByTime(500);
        first.report(1, 0, {}, 4);
        vi.advanceTimersByTime(500);
        expect(first.publish).not.toHaveBeenCalled();
        expect(second.publish).toHaveBeenCalledExactlyOnceWith({motor_state: "stopped", position: null, state: null});
    });

    it("limits the Home Assistant unknown-position override to the cover", () => {
        const {definition} = setup();
        const battery = {state_topic: "motor", value_template: "{{ value_json.battery }}"};
        const cover = {position_topic: "motor", set_position_topic: "motor/set", value_template: "{{ value_json.state }}"};
        definition.meta?.overrideHaDiscoveryPayload?.(battery);
        definition.meta?.overrideHaDiscoveryPayload?.(cover);
        expect(battery).toEqual({state_topic: "motor", value_template: "{{ value_json.battery }}"});
        expect(cover.value_template).toContain("{{ value_json.state }}");
        expect(cover.value_template).toContain("%}None{% else %}");
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
