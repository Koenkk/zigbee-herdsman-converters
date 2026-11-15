import {beforeEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import * as tuya from "../src/lib/tuya";
import type {Definition, KeyValueAny, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

const commands: [number, string][] = [
    [5, "scene_1"],
    [6, "scene_2"],
    [7, "scene_3"],
    [8, "scene_4"],
    [9, "scene_5"],
    [10, "scene_6"],
    [104, "smart_curtain_open"],
    [105, "smart_curtain_stop"],
    [106, "smart_curtain_close"],
    [107, "roller_shutter_down"],
    [108, "roller_shutter_stop"],
    [109, "roller_shutter_up"],
    [110, "blinds_open"],
    [111, "blinds_stop"],
    [112, "blinds_close"],
    [115, "screen_down"],
    [116, "screen_stop"],
    [117, "screen_up"],
    [118, "gauze_curtain_open"],
    [119, "gauze_curtain_stop"],
    [120, "gauze_curtain_close"],
    [121, "smart_window_open"],
    [122, "smart_window_stop"],
    [123, "smart_window_close"],
    [124, "air_conditioner_on"],
    [125, "air_conditioner_off"],
    [126, "air_conditioner_cooling"],
    [127, "air_conditioner_heating"],
];

describe("Tuya T3E", () => {
    let device: ReturnType<typeof mockDevice>;
    let definition: Definition;
    let sequence = 0;

    beforeEach(async () => {
        device = mockDevice({modelID: "TS0601", manufacturerName: "_TZE200_mua6ucdj", endpoints: [{ID: 1}]});
        definition = await findByDevice(device);
    });

    function meta(message: KeyValueAny): Tz.Meta {
        return {state: {}, device, message, mapped: definition, options: {}, publish: vi.fn(), deviceExposesChanged: vi.fn(), endpoint_name: null};
    }

    function report(dp: number, datatype: number, data: number[], seq = ++sequence) {
        const msg = {
            data: {seq, dpValues: [{dp, datatype, data: Buffer.from(data)}]},
            device,
            endpoint: device.getEndpoint(1),
            meta: {zclTransactionSequenceNumber: seq},
        } as unknown as Parameters<typeof tuya.fz.datapoints.convert>[1];
        return tuya.fz.datapoints.convert(definition, msg, vi.fn(), {}, {state: {}, device, deviceExposesChanged: vi.fn()});
    }

    it("matches multiple panels by the exact manufacturer fingerprint", async () => {
        expect(definition.model).toBe("T3E_mua6ucdj");
        const other = mockDevice({modelID: "TS0601", manufacturerName: "_TZE200_mua6ucdj", ieeeAddr: "0x1111111111111111", endpoints: [{ID: 1}]});
        expect((await findByDevice(other)).model).toBe("T3E_mua6ucdj");
        const different = mockDevice({modelID: "TS0601", manufacturerName: "_TZE200_not_a_t3e", endpoints: [{ID: 1}]});
        expect((await findByDevice(different))?.model).not.toBe("T3E_mua6ucdj");
        expect(definition.endpoint(device)).toStrictEqual({l1: 1, l2: 1, l3: 1});
    });

    it("exposes 52 actions and twelve individual switches without GET", () => {
        const exposes = Array.isArray(definition.exposes) ? definition.exposes : definition.exposes(device, {});
        const action = exposes.find((e) => e.name === "action");
        expect(action).toMatchObject({values: expect.any(Array)});
        expect((action as {values: string[]}).values).toHaveLength(52);
        const switches = exposes.filter((e) => e.name?.startsWith("scene_switch_"));
        expect(switches).toHaveLength(12);
        expect(switches.every((e) => e.access === 3)).toBe(true);
    });

    it.each(commands)("reports button DP%i as %s and ignores other enum values", async (dp, action) => {
        expect(await report(dp, 4, [0])).toStrictEqual({action});
        expect(await report(dp, 4, [1])).toStrictEqual({});
    });

    it.each(Array.from({length: 12}, (_, i) => i))("receives and writes scene switch %i", async (i) => {
        const name = `scene_switch_${Math.floor(i / 4) + 1}_${(i % 4) + 1}`;
        for (const [state, byte, suffix] of [
            ["ON", 1, "on"],
            ["OFF", 0, "off"],
        ] as const) {
            expect(await report(130 + i, 1, [byte])).toStrictEqual({[name]: state, action: `${name}_${suffix}`});
            const message = {[name]: state};
            expect(await tuya.tz.datapoints.convertSet(device.getEndpoint(1), name, state, meta(message))).toStrictEqual({state: {}});
            expect(device.getEndpoint(1).command).toHaveBeenLastCalledWith(
                "manuSpecificTuya",
                "dataRequest",
                {
                    seq: expect.any(Number),
                    dpValues: [{dp: 130 + i, datatype: 1, data: Buffer.from([byte])}],
                },
                {disableDefaultResponse: true},
            );
        }
        // Numeric reports must not become fictitious boolean states.
        expect(await report(130 + i, 4, [1])).toStrictEqual({});
    });

    it.each([1, 2, 3])("preserves relay l%i receive and write paths", async (i) => {
        const name = `state_l${i}`;
        for (const [state, byte] of [
            ["ON", 1],
            ["OFF", 0],
        ] as const) {
            expect(await report(23 + i, 1, [byte])).toStrictEqual({[name]: state});
            expect(await tuya.tz.datapoints.convertSet(device.getEndpoint(1), name, state, meta({[name]: state}))).toStrictEqual({
                state: {[name]: state},
            });
            expect(device.getEndpoint(1).command).toHaveBeenLastCalledWith(
                "manuSpecificTuya",
                "dataRequest",
                {
                    seq: expect.any(Number),
                    dpValues: [{dp: 23 + i, datatype: 1, data: Buffer.from([byte])}],
                },
                {disableDefaultResponse: true},
            );
        }
    });

    it.each(["TOGGLE", "", "on", "1", 0, 1, true, false, null, {}])("rejects invalid scene-switch value %j without sending", async (value) => {
        const name = "scene_switch_1_1";
        await expect(tuya.tz.datapoints.convertSet(device.getEndpoint(1), name, value, meta({[name]: value}))).rejects.toThrow("expected ON or OFF");
        expect(device.getEndpoint(1).command).not.toHaveBeenCalled();
    });

    it("ignores unknown datapoints and suppresses duplicate telegrams", async () => {
        expect(await report(113, 4, [0])).toStrictEqual({});
        expect(await report(114, 4, [0])).toStrictEqual({});
        const seq = ++sequence;
        expect(await report(130, 1, [1], seq)).toStrictEqual({scene_switch_1_1: "ON", action: "scene_switch_1_1_on"});
        expect(await report(130, 1, [1], seq)).toBeUndefined();
    });

    it("sends multiple scene switches without an optimistic report and propagates transport errors", async () => {
        const message = {scene_switch_1_1: "ON", scene_switch_3_4: "OFF"};
        expect(await tuya.tz.datapoints.convertSet(device.getEndpoint(1), "scene_switch_1_1", "ON", meta(message))).toStrictEqual({state: {}});
        expect(device.getEndpoint(1).command).toHaveBeenCalledTimes(2);
        vi.mocked(device.getEndpoint(1).command).mockRejectedValueOnce(new Error("transport failure"));
        await expect(tuya.tz.datapoints.convertSet(device.getEndpoint(1), "scene_switch_1_1", "ON", meta(message))).rejects.toThrow(
            "transport failure",
        );
    });
});
