import {beforeEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import * as globalStore from "../src/lib/store";
import * as tuya from "../src/lib/tuya";
import type {Expose, Fz, KeyValue, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

const manufacturer = "_TZ3000_uz6ibhib";
const layout = [
    {ID: 1, inputClusterIDs: [0, 3, 4, 5, 6, 0xe000, 0xe001]},
    {ID: 2, inputClusterIDs: [4, 5, 6, 0xe001]},
    {ID: 3, inputClusterIDs: [4, 5, 6, 0xe001]},
    {ID: 4, inputClusterIDs: [4, 5, 6, 0xe001]},
];
const settings = (control = "ENABLE", seconds = 1): KeyValue =>
    Object.fromEntries(
        [1, 2, 3, 4].flatMap((i) => [
            [`inching_control_${i}`, control],
            [`inching_time_${i}`, seconds],
        ]),
    );
const packet = (records: number[]) => ({payload: Buffer.from(Buffer.from(records).toString("base64"), "ascii")});
const properties = (exposes: Expose[]) =>
    exposes.flatMap((expose) => (expose.property ? [expose.property] : (expose.features?.map((feature) => feature.property) ?? [])));

async function resolve(name = manufacturer, ieeeAddr = "0x00124b0000000001") {
    const device = mockDevice({modelID: "TS0004", manufacturerName: name, ieeeAddr, endpoints: layout});
    const definition = await findByDevice(device);
    await definition.onEvent?.({type: "start", data: {device, deviceExposesChanged: vi.fn(), state: {}, options: {}}});
    const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
    const meta = (state: KeyValue = {}, message: KeyValue = {}): Tz.Meta => ({
        device,
        mapped: definition,
        state,
        message,
        options: {},
        publish: vi.fn(),
        deviceExposesChanged: vi.fn(),
        endpoint_name: undefined,
    });
    const convert = (key: string) => definition.toZigbee.find((converter) => converter.key?.includes(key));
    return {device, definition, exposes, meta, convert};
}

describe("Tuya inching channel encoding", () => {
    it("encodes channels 1 through 6 as consecutive channel IDs rather than powers of two", () => {
        const value: KeyValue = {};
        for (let i = 1; i <= 6; i++) {
            value[`inching_control_${i}`] = i % 2 ? "ENABLE" : "DISABLE";
            value[`inching_time_${i}`] = i;
        }
        expect(Buffer.from(tuya.valueConverter.inchingSwitch.to(value), "base64")).toEqual(
            Buffer.from([1, 0, 1, 2, 0, 2, 5, 0, 3, 6, 0, 4, 9, 0, 5, 10, 0, 6]),
        );
    });

    it("decodes independent protocol records for all six channels", () => {
        const captured = Buffer.from([1, 0, 60, 2, 1, 0, 5, 0, 1, 6, 0, 2, 9, 0x80, 0, 10, 0xff, 0xff]).toString("base64");
        expect(tuya.valueConverter.inchingSwitch.from(captured)).toEqual({
            inching_control_1: "ENABLE",
            inching_time_1: 60,
            inching_control_2: "DISABLE",
            inching_time_2: 256,
            inching_control_3: "ENABLE",
            inching_time_3: 1,
            inching_control_4: "DISABLE",
            inching_time_4: 2,
            inching_control_5: "ENABLE",
            inching_time_5: 32768,
            inching_control_6: "DISABLE",
            inching_time_6: 65535,
        });
    });

    it("keeps high duration bytes binary before base64 encoding", () => {
        expect(
            Buffer.from(
                tuya.valueConverter.inchingSwitch.to({
                    inching_control_1: "ENABLE",
                    inching_time_1: 0x80ff,
                    inching_control_4: "ENABLE",
                    inching_time_4: 0xffff,
                }),
                "base64",
            ),
        ).toEqual(Buffer.from([1, 0x80, 0xff, 7, 0xff, 0xff]));
    });
});

describe("TS0004 _TZ3000_uz6ibhib", () => {
    beforeEach(() => globalStore.clear());

    it("uses the existing model, exposes verified per-channel features and registers its private command", async () => {
        const {device, definition, exposes} = await resolve();
        expect(definition.model).toBe("TS0004");
        expect(definition.endpoint(device)).toEqual({l1: 1, l2: 2, l3: 3, l4: 4});
        expect(properties(exposes)).toEqual([
            "state_l1",
            "state_l2",
            "state_l3",
            "state_l4",
            "countdown_l1",
            "countdown_l2",
            "countdown_l3",
            "countdown_l4",
            "power_on_behavior_l1",
            "power_on_behavior_l2",
            "power_on_behavior_l3",
            "power_on_behavior_l4",
            "inching_control_set",
        ]);
        expect(exposes.filter((expose) => expose.name === "countdown").map((expose) => expose.access)).toEqual([7, 7, 7, 7]);
        expect(exposes.find((expose) => expose.property === "inching_control_set").access).toBe(2);
        expect(device.customClusters.manuSpecificTuya4.commands.setInchingSwitch.ID).toBe(0xfb);
    });

    it("sends all four records on endpoint 1 when only channel 4 changes", async () => {
        const {device, meta, convert} = await resolve();
        const expected = {...settings(), inching_control_4: "DISABLE"};
        const result = await convert("inching_control_set").convertSet(
            device.getEndpoint(4),
            "inching_control_set",
            {inching_control_4: "DISABLE"},
            meta({inching_control_set: settings()}),
        );
        expect(device.getEndpoint(1).command).toHaveBeenCalledExactlyOnceWith(
            "manuSpecificTuya4",
            "setInchingSwitch",
            packet([1, 0, 1, 3, 0, 1, 5, 0, 1, 6, 0, 1]),
            {disableDefaultResponse: true},
        );
        expect(device.getEndpoint(4).command).not.toHaveBeenCalled();
        expect(result).toEqual({state: {inching_control_set: expected}});
    });

    it("requires all peer settings initially instead of silently disabling unknown channels", async () => {
        const {device, meta, convert} = await resolve();
        await expect(
            convert("inching_control_set").convertSet(
                device.getEndpoint(1),
                "inching_control_set",
                {inching_control_4: "ENABLE", inching_time_4: 1},
                meta(),
            ),
        ).rejects.toThrow("provide all channels");
        expect(device.getEndpoint(1).command).not.toHaveBeenCalled();
        await convert("inching_control_set").convertSet(device.getEndpoint(1), "inching_control_set", settings(), meta());
        expect(device.getEndpoint(1).command).toHaveBeenCalledOnce();
    });

    it.each([0, -1, 65536, 0.1, "1", null, Number.NaN, Number.POSITIVE_INFINITY])(
        "rejects an invalid delay before transmitting (%s)",
        async (value) => {
            const {device, meta, convert} = await resolve();
            await expect(
                convert("inching_control_set").convertSet(
                    device.getEndpoint(1),
                    "inching_control_set",
                    {inching_time_4: value},
                    meta({inching_control_set: settings()}),
                ),
            ).rejects.toThrow();
            expect(device.getEndpoint(1).command).not.toHaveBeenCalled();
        },
    );

    it.each([{inching_control_4: "ON"}, {inching_control_5: "ENABLE"}, {inching_time_5: 1}])(
        "rejects invalid modes and unknown channel fields (%j)",
        async (value) => {
            const {device, meta, convert} = await resolve();
            await expect(
                convert("inching_control_set").convertSet(
                    device.getEndpoint(1),
                    "inching_control_set",
                    value,
                    meta({inching_control_set: settings()}),
                ),
            ).rejects.toThrow();
            expect(device.getEndpoint(1).command).not.toHaveBeenCalled();
        },
    );

    it("encodes the maximum delay without truncating either duration byte", async () => {
        const {device, meta, convert} = await resolve();
        await convert("inching_control_set").convertSet(
            device.getEndpoint(1),
            "inching_control_set",
            {inching_time_4: 65535},
            meta({inching_control_set: settings()}),
        );
        expect(device.getEndpoint(1).command).toHaveBeenCalledWith(
            "manuSpecificTuya4",
            "setInchingSwitch",
            packet([1, 0, 1, 3, 0, 1, 5, 0, 1, 7, 0xff, 0xff]),
            {disableDefaultResponse: true},
        );
    });

    it("serializes concurrent partial writes and preserves the preceding successful update", async () => {
        const {device, meta, convert} = await resolve();
        const endpoint = device.getEndpoint(1);
        let release: () => void;
        vi.mocked(endpoint.command).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    release = () => resolve({});
                }),
        );
        const context = meta({inching_control_set: settings()});
        const first = convert("inching_control_set").convertSet(endpoint, "inching_control_set", {inching_time_4: 2}, context);
        const second = convert("inching_control_set").convertSet(endpoint, "inching_control_set", {inching_control_1: "DISABLE"}, context);
        await vi.waitFor(() => expect(endpoint.command).toHaveBeenCalledTimes(1));
        release();
        await Promise.all([first, second]);
        expect(endpoint.command).toHaveBeenLastCalledWith("manuSpecificTuya4", "setInchingSwitch", packet([0, 0, 1, 3, 0, 1, 5, 0, 1, 7, 0, 2]), {
            disableDefaultResponse: true,
        });
    });

    it("does not cache a failed write and permits the next queued request", async () => {
        const {device, meta, convert} = await resolve();
        const endpoint = device.getEndpoint(1);
        const context = meta({inching_control_set: settings()});
        vi.mocked(endpoint.command).mockRejectedValueOnce(new Error("radio failed"));
        await expect(convert("inching_control_set").convertSet(endpoint, "inching_control_set", {inching_time_4: 2}, context)).rejects.toThrow(
            "radio failed",
        );
        await convert("inching_control_set").convertSet(endpoint, "inching_control_set", {inching_control_1: "DISABLE"}, context);
        expect(endpoint.command).toHaveBeenLastCalledWith("manuSpecificTuya4", "setInchingSwitch", packet([0, 0, 1, 3, 0, 1, 5, 0, 1, 7, 0, 1]), {
            disableDefaultResponse: true,
        });
    });

    it("isolates the last successful table per device", async () => {
        const first = await resolve(manufacturer, "0x00124b0000000001");
        const second = await resolve(manufacturer, "0x00124b0000000002");
        await first
            .convert("inching_control_set")
            .convertSet(first.device.getEndpoint(1), "inching_control_set", {inching_time_4: 2}, first.meta({inching_control_set: settings()}));
        await second
            .convert("inching_control_set")
            .convertSet(
                second.device.getEndpoint(1),
                "inching_control_set",
                {inching_time_4: 3},
                second.meta({inching_control_set: settings("DISABLE", 5)}),
            );
        expect(second.device.getEndpoint(1).command).toHaveBeenCalledWith(
            "manuSpecificTuya4",
            "setInchingSwitch",
            packet([0, 0, 5, 2, 0, 5, 4, 0, 5, 6, 0, 3]),
            {disableDefaultResponse: true},
        );
    });

    it("ignores empty inching responses which cannot confirm any setting", async () => {
        const {device, definition} = await resolve();
        const message = {
            endpoint: device.getEndpoint(1),
            device,
            data: {inching: ""},
            type: "readResponse",
        } as Parameters<typeof tuya.fz.inchingSwitch.convert>[1];
        expect(
            tuya.fz.inchingSwitch.convert(definition, message, vi.fn(), {}, {
                device,
                state: {inching_control_set: settings()},
                deviceExposesChanged: vi.fn(),
            } as Fz.Meta),
        ).toBeUndefined();
    });

    it("uses second-based countdowns and can read each relay's remaining time", async () => {
        const {device, meta, convert} = await resolve();
        const endpoint = device.getEndpoint(4);
        await convert("countdown").convertSet(endpoint, "countdown", 7, meta({}, {countdown: 7}));
        expect(endpoint.command).toHaveBeenCalledWith(
            "genOnOff",
            "onWithTimedOff",
            {ctrlbits: 0, ontime: 7, offwaittime: 7},
            {disableDefaultResponse: true},
        );
        await convert("countdown").convertGet(endpoint, "countdown", meta());
        expect(endpoint.read).toHaveBeenCalledWith("genOnOff", ["onTime"]);
        await expect(convert("countdown").convertSet(endpoint, "countdown", 43201, meta({}, {countdown: 43201}))).rejects.toThrow("43200");
    });

    it("requests no default response for ordinary relay commands on this firmware", async () => {
        const {device, meta, convert} = await resolve();
        const result = await convert("state").convertSet(device.getEndpoint(1), "state", "ON", meta({}, {state: "ON"}));
        expect(device.getEndpoint(1).command).toHaveBeenCalledWith("genOnOff", "on", {}, {disableDefaultResponse: true});
        expect(result).toEqual({state: {state: "ON", countdown: 0}});
    });

    it.each(["_TZ3000_unlistedxx", "_TZ3000_r9e2w7dn", "_TZ3000_excgg5kb"])(
        "preserves other TS0004 variants and their normal relay result (%s)",
        async (name) => {
            const {device, meta, convert, exposes} = await resolve(name);
            const keys = properties(exposes);
            expect(keys).toContain("backlight_mode");
            expect(keys).not.toContain("inching_control_set");
            expect(keys.some((key) => key.startsWith("countdown"))).toBe(false);
            const result = await convert("state").convertSet(device.getEndpoint(1), "state", "ON", meta({}, {state: "ON"}));
            expect(result).toEqual({state: {state: "ON"}});
            expect(device.getEndpoint(1).command).toHaveBeenCalledWith("genOnOff", "on", {}, {disableDefaultResponse: false});
        },
    );
});
