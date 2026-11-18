import {describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {BuffaloZcl} from "zigbee-herdsman/dist/zspec/zcl/buffaloZcl";
import {findByDevice} from "../src/index";
import * as tuya from "../src/lib/tuya";
import type {Fz, KeyValue, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

const deviceFor = (modelID = "TS0301", manufacturerName = "_TZE210_yqwse3h5", ieeeAddr = "0x0000000000000001") =>
    mockDevice({modelID, manufacturerName, ieeeAddr, applicationVersion: 96, endpoints: [{ID: 1}]});

let sequence = 0;
const setup = async (manufacturer = "_TZE210_yqwse3h5", ieeeAddr = "0x0000000000000001") => {
    const device = deviceFor(manufacturer === "Yooksmart" ? "YKV24SAED" : "TS0301", manufacturer, ieeeAddr);
    const definition = await findByDevice(device);
    const endpoint = device.getEndpoint(1);
    const setter = definition.toZigbee.find((converter) => converter === tuya.tz.datapoints);
    const reader = definition.fromZigbee.find(
        (converter) =>
            converter.cluster === "manuSpecificTuya" &&
            converter.type.includes("commandDataReport") &&
            !converter.type.includes("commandMcuSyncTime"),
    );
    const reportRaw = async (
        dpValues: Parameters<typeof tuya.getDataValue>[0][],
        options: KeyValue = {},
        state: KeyValue = {},
        transactionSequenceNumber = sequence++,
    ) => {
        const publish = vi.fn();
        const result = await reader.convert(
            definition,
            {
                data: {dpValues},
                device,
                endpoint,
                type: "commandDataReport",
                cluster: "manuSpecificTuya",
                meta: {zclTransactionSequenceNumber: transactionSequenceNumber},
            } as Fz.Message<"manuSpecificTuya", undefined, "commandDataReport">,
            publish,
            options,
            {device, state} as Fz.Meta,
        );
        return {result, publish};
    };
    const report = (values: [number, number][], options: KeyValue = {}, state: KeyValue = {}) =>
        reportRaw(
            values.map(([dp, value]) => (dp === 1 || dp === 109 ? tuya.dpValueFromEnum(dp, value) : tuya.dpValueFromNumberValue(dp, value))),
            options,
            state,
        );
    const set = (message: KeyValue, options: KeyValue = {}, endpointName?: string) => {
        const key = Object.keys(message)[0];
        const meta: Tz.Meta = {device, mapped: definition, state: {}, message, options, publish: vi.fn(), endpoint_name: endpointName};
        return setter.convertSet(endpoint, key, message[key], meta);
    };
    return {device, definition, endpoint, reader, report, reportRaw, set};
};

describe("TS0301 dual rail", () => {
    it("retains all current SDK datapoint report types including alternate data reports", async () => {
        const {reader} = await setup();
        expect(reader.type).toEqual(tuya.fz.datapoints.type);
        expect(reader.type).toContain("commandDataReportAlt");
    });
    it("ignores an empty numeric actual position accepted by the herdsman wire parser", async () => {
        const {reportRaw} = await setup();
        const dpValues = new BuffaloZcl(Buffer.from([3, 2, 0, 0])).read(Zcl.BuffaloZclDataType.LIST_TUYA_DATAPOINT_VALUES, {});
        expect(dpValues).toEqual([{dp: 3, datatype: 2, data: Buffer.alloc(0)}]);
        const {result, publish} = await reportRaw(dpValues, {}, {position_top: 37, state_top: "OPEN"});
        expect(result).toEqual({});
        expect(publish).not.toHaveBeenCalled();
    });

    it.each([3, 102])("ignores malformed DP%s without dropping its valid sibling or battery", async (dp) => {
        const {reportRaw} = await setup();
        const sibling = dp === 3 ? 102 : 3;
        const rail = sibling === 3 ? "top" : "bottom";
        const invalid = [
            {datatype: 2, data: Buffer.alloc(0)},
            {datatype: 2, data: Buffer.from([0])},
            {datatype: 2, data: Buffer.from([0, 0, 0])},
            {datatype: 2, data: Buffer.from([0, 0, 0, 0, 0])},
            {datatype: 3, data: Buffer.from("100")},
            {datatype: 1, data: Buffer.from([0])},
            {datatype: 0, data: Buffer.alloc(4)},
            {datatype: 4, data: Buffer.from([100])},
            {datatype: 5, data: Buffer.from([0, 0, 0, 100])},
            {datatype: 2, data: Buffer.from([0, 0, 0, 101])},
            {datatype: 2, data: Buffer.from([255, 255, 255, 255])},
        ];
        for (const value of invalid) {
            // Round-trip the malformed and valid entries through the real herdsman DP parser.
            const entries = [{dp, ...value}, tuya.dpValueFromNumberValue(sibling, 25), tuya.dpValueFromNumberValue(13, 90)];
            const wire = Buffer.concat(entries.map(({dp, datatype, data}) => Buffer.concat([Buffer.from([dp, datatype, 0, data.length]), data])));
            const dpValues = new BuffaloZcl(wire).read(Zcl.BuffaloZclDataType.LIST_TUYA_DATAPOINT_VALUES, {});
            const {result, publish} = await reportRaw(dpValues, {}, {position_top: 37, state_top: "OPEN", position_bottom: 0, state_bottom: "CLOSE"});
            expect(result, JSON.stringify(value)).toEqual({[`position_${rail}`]: sibling === 3 ? 25 : 75, battery: 90});
            expect(publish).toHaveBeenCalledExactlyOnceWith({[`state_${rail}`]: "OPEN"});
        }
    });

    it.each(["_TZE210_inpjmc0h", "_TZE210_yqwse3h5", "Yooksmart"])("validates reports on the shared definition for %s", async (manufacturer) => {
        const {reportRaw} = await setup(manufacturer);
        const {result, publish} = await reportRaw([
            {dp: 3, datatype: 2, data: Buffer.alloc(0)},
            {dp: 102, datatype: 3, data: Buffer.from("100")},
            tuya.dpValueFromNumberValue(13, 90),
        ]);
        expect(result).toEqual({battery: 90});
        expect(publish).not.toHaveBeenCalled();
    });

    it("labels rail controls and opening percentages without renaming native properties", async () => {
        const {definition} = await setup();
        const covers = definition.exposes.filter((expose) => expose.type === "cover");
        expect(covers.map((cover) => cover.endpoint)).toEqual(["top", "bottom"]);
        expect(covers.flatMap((cover) => cover.features.map(({property, label, description}) => ({property, label, description})))).toEqual([
            {property: "state_top", label: "Top rail control", description: "Open lowers the top rail. Close raises the top rail."},
            {property: "position_top", label: "Opening from top", description: "Opening from the top: 0% = no opening; 100% = maximum opening."},
            {property: "state_bottom", label: "Bottom rail control", description: "Open raises the bottom rail. Close lowers the bottom rail."},
            {
                property: "position_bottom",
                label: "Opening from bottom",
                description: "Opening from the bottom: 0% = no opening; 100% = maximum opening.",
            },
        ]);
    });
    it("ignores top target echoes instead of publishing measured position", async () => {
        const {report} = await setup();
        const {result, publish} = await report([[2, 73]]);
        expect(result).toEqual({});
        expect(publish).not.toHaveBeenCalled();
    });
    it("ignores bottom target echoes instead of publishing measured position", async () => {
        const {report} = await setup();
        const {result, publish} = await report([[101, 73]]);
        expect(result).toEqual({});
        expect(publish).not.toHaveBeenCalled();
    });

    it.each(["top", "bottom"])("does not claim position_%s from a command ACK", async (rail) => {
        const {endpoint, set} = await setup();
        expect(endpoint.constructor.name).toBe("Endpoint");
        expect(await set({[`position_${rail}`]: 37})).toEqual({state: {}});
        expect(endpoint.command).toHaveBeenCalledTimes(1);
    });

    it.each(["top", "bottom"])("does not claim completed state_%s from operation ACKs or motion reports", async (rail) => {
        const {set, report} = await setup();
        for (const operation of ["OPEN", "CLOSE", "STOP"]) {
            expect(await set({[`state_${rail}`]: operation})).toEqual({state: {}});
        }
        for (const raw of [0, 1, 2]) {
            const {result, publish} = await report([[rail === "top" ? 1 : 109, raw]]);
            expect(result).toEqual({});
            expect(publish).not.toHaveBeenCalled();
        }
    });

    it.each([false, true])("converges only the reporting rail state from actual positions with invert_cover=%s", async (invert) => {
        const {set, report} = await setup();
        let state: KeyValue = {};
        for (const rail of ["top", "bottom"]) {
            for (const raw of [0, 30, 100]) {
                expect(await set({[`state_${rail}`]: "CLOSE"}, {invert_cover: invert})).toEqual({state: {}});
                const position = rail === "top" ? (invert ? 100 - raw : raw) : invert ? raw : 100 - raw;
                const {result, publish} = await report([[rail === "top" ? 3 : 102, raw]], {invert_cover: invert}, state);
                expect(result).toEqual({[`position_${rail}`]: position});
                expect(publish).toHaveBeenCalledExactlyOnceWith({[`state_${rail}`]: position === 0 ? "CLOSE" : "OPEN"});
                state = {...state, ...result, ...publish.mock.calls[0][0]};
            }
        }
        expect(state).toEqual({
            position_top: invert ? 0 : 100,
            state_top: invert ? "CLOSE" : "OPEN",
            position_bottom: invert ? 100 : 0,
            state_bottom: invert ? "OPEN" : "CLOSE",
        });
    });

    it.each([false, true])("decodes independent actual positions with invert_cover=%s", async (invert) => {
        const {report} = await setup();
        const options = {invert_cover: invert};
        const top = await report([[3, 23]], options);
        expect(top.result).toEqual({position_top: invert ? 77 : 23});
        expect(top.publish).toHaveBeenCalledWith({state_top: "OPEN"});
        const bottom = await report([[102, 68]], options);
        expect(bottom.result).toEqual({position_bottom: invert ? 68 : 32});
        expect(
            (
                await report(
                    [
                        [3, 23],
                        [102, 68],
                    ],
                    options,
                )
            ).result,
        ).toEqual({position_top: invert ? 77 : 23, position_bottom: invert ? 68 : 32});
    });

    it("keeps cached measurements on target/battery-only packets and starts cold without invented values", async () => {
        const {report} = await setup();
        expect((await report([[13, 90]])).result).toEqual({battery: 90});
        let state: KeyValue = {};
        for (const values of [
            [[3, 20]],
            [[102, 30]],
            [
                [2, 80],
                [101, 90],
            ],
            [[13, 72]],
        ] as [number, number][][]) {
            const {result} = await report(values, {}, state);
            expect(Object.values(result)).not.toContain(undefined);
            state = {...state, ...result};
        }
        expect(state).toEqual({position_top: 20, position_bottom: 70, battery: 72});
        expect(
            (
                await report([
                    [2, 80],
                    [101, 90],
                    [3, 17],
                    [102, 64],
                ])
            ).result,
        ).toEqual({position_top: 17, position_bottom: 36});
    });

    it.each([false, true])("encodes both rail targets with invert_cover=%s", async (invert) => {
        const {endpoint, set} = await setup();
        for (const position of [0, 37, 100]) {
            for (const rail of ["top", "bottom"]) {
                const raw = rail === "top" ? (invert ? 100 - position : position) : invert ? position : 100 - position;
                await set({position}, {invert_cover: invert}, rail);
                expect(endpoint.command).toHaveBeenLastCalledWith(
                    "manuSpecificTuya",
                    "dataRequest",
                    {
                        seq: 1,
                        dpValues: [{dp: rail === "top" ? 2 : 101, datatype: 2, data: Buffer.from([0, 0, 0, raw])}],
                    },
                    {disableDefaultResponse: true},
                );
            }
        }
    });

    it.each([
        ["top", "OPEN", 1, 1],
        ["top", "CLOSE", 1, 0],
        ["top", "STOP", 1, 2],
        ["bottom", "OPEN", 109, 0],
        ["bottom", "CLOSE", 109, 1],
        ["bottom", "STOP", 109, 2],
    ])("encodes %s %s with upstream rail operation convention", async (rail, operation, dp, raw) => {
        const {endpoint, set} = await setup();
        for (const invert of [false, true]) {
            await set({state: operation}, {invert_cover: invert}, rail as string);
            expect(endpoint.command).toHaveBeenLastCalledWith(
                "manuSpecificTuya",
                "dataRequest",
                {
                    seq: 1,
                    dpValues: [{dp, datatype: 4, data: Buffer.from([raw as number])}],
                },
                {disableDefaultResponse: true},
            );
        }
    });

    it("sends a combined payload as sequential separate SDK commands after ACK, not physical arrival", async () => {
        const {endpoint, set} = await setup();
        let acknowledge: () => void;
        vi.mocked(endpoint.command).mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    acknowledge = resolve;
                }),
        );
        const pending = set({position_top: 21, position_bottom: 63});
        await vi.waitFor(() => expect(endpoint.command).toHaveBeenCalledTimes(1));
        expect(vi.mocked(endpoint.command).mock.calls[0][2]).toEqual({seq: 1, dpValues: [{dp: 2, datatype: 2, data: Buffer.from([0, 0, 0, 21])}]});
        acknowledge();
        expect(await pending).toEqual({state: {}});
        expect(vi.mocked(endpoint.command).mock.calls[1][2]).toEqual({seq: 1, dpValues: [{dp: 101, datatype: 2, data: Buffer.from([0, 0, 0, 37])}]});
    });

    it("allows concurrent independent rail targets without waiting for arrival reports", async () => {
        const {endpoint, set} = await setup();
        let acknowledge: () => void;
        vi.mocked(endpoint.command).mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    acknowledge = resolve;
                }),
        );
        const top = set({position_top: 31});
        const bottom = set({position_bottom: 62});
        await vi.waitFor(() => expect(endpoint.command).toHaveBeenCalledTimes(2));
        expect(await bottom).toEqual({state: {}});
        acknowledge();
        expect(await top).toEqual({state: {}});
    });

    it("propagates transport failure without optimistic measurements or sending a combined second target", async () => {
        const {endpoint, set} = await setup();
        vi.mocked(endpoint.command).mockRejectedValueOnce(new Error("offline stub failure"));
        await expect(set({position_top: 10, position_bottom: 20})).rejects.toThrow("offline stub failure");
        expect(endpoint.command).toHaveBeenCalledTimes(1);
    });

    it("does not add a STOP barrier or actuation queue", async () => {
        const {endpoint, set} = await setup();
        let acknowledge: () => void;
        vi.mocked(endpoint.command).mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    acknowledge = resolve;
                }),
        );
        const target = set({position_top: 15});
        await vi.waitFor(() => expect(endpoint.command).toHaveBeenCalledTimes(1));
        await set({state_bottom: "STOP"});
        expect(endpoint.command).toHaveBeenCalledTimes(2);
        acknowledge();
        await target;
    });

    it("keeps devices independent", async () => {
        const first = await setup(undefined, "0x0000000000000001");
        const second = await setup(undefined, "0x0000000000000002");
        expect(first.device.ieeeAddr).not.toBe(second.device.ieeeAddr);
        await first.set({position_top: 40});
        expect(second.endpoint.command).not.toHaveBeenCalled();
        const packet = [tuya.dpValueFromNumberValue(3, 20), tuya.dpValueFromNumberValue(102, 40), tuya.dpValueFromNumberValue(13, 81)];
        expect((await first.reportRaw(packet, {}, {}, 42)).result).toEqual({position_top: 20, position_bottom: 60, battery: 81});
        expect((await second.reportRaw(packet, {}, {}, 42)).result).toEqual({position_top: 20, position_bottom: 60, battery: 81});
    });

    it.each(["top", "bottom"])("rejects invalid %s position before writing", async (rail) => {
        const {endpoint, set} = await setup();
        for (const value of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY, "50", null]) {
            await expect(set({[`position_${rail}`]: value})).rejects.toThrow();
        }
        expect(endpoint.command).not.toHaveBeenCalled();
    });

    it.each(["_TZE210_inpjmc0h", "_TZE210_yqwse3h5"])("preserves existing fingerprint %s", async (manufacturer) => {
        expect(await findByDevice(deviceFor("TS0301", manufacturer))).toMatchObject({model: "TS0301_dual_rail", vendor: "Tuya"});
    });

    it.each([
        ["D10110", "Yookee"],
        ["TS0301", "_TZE200_eatmkx5j"],
        ["YKV24SAED", "Other"],
        ["Other", "Yooksmart"],
        ["TS0301", "Yooksmart"],
    ])("does not broaden recognition to %s / %s", async (model, manufacturer) => {
        const definition = await findByDevice(deviceFor(model, manufacturer));
        expect(definition?.model).not.toBe("TS0301_dual_rail");
        expect(definition?.model).not.toBe("YKV24SAED");
    });

    it.each([
        ["D10110", "Yookee", "D10110"],
        ["TS0301", "_TZE200_eatmkx5j", "Day-Night Shade"],
    ])("preserves the separate %s definition", async (model, manufacturer, expected) => {
        expect(await findByDevice(deviceFor(model, manufacturer))).toMatchObject({model: expected});
    });

    it("keeps the public identity on the same native two-cover SDK contract", async () => {
        const {definition} = await setup();
        const branded = await findByDevice(deviceFor("YKV24SAED", "Yooksmart"));
        expect(branded.meta.tuyaDatapoints).toEqual(definition.meta.tuyaDatapoints);
        expect(branded.fromZigbee).toEqual(definition.fromZigbee);
        expect(branded.toZigbee).toEqual(definition.toZigbee);
        expect(branded.exposes).toEqual(definition.exposes);
        const exposes = definition.exposes as {type: string; endpoint?: string; name?: string}[];
        expect(exposes.filter((expose) => expose.type === "cover").map((expose) => expose.endpoint)).toEqual(["top", "bottom"]);
        expect(Object.keys(definition.endpoint(deviceFor()))).toEqual(["top", "bottom"]);
        expect(exposes.filter((expose) => expose.name === "battery")).toHaveLength(1);
    });

    it.each([false, true])("decodes actual position boundaries with invert_cover=%s", async (invert) => {
        const {report} = await setup();
        for (const raw of [0, 100]) {
            const top = invert ? 100 - raw : raw;
            const bottom = invert ? raw : 100 - raw;
            expect(
                (
                    await report(
                        [
                            [3, raw],
                            [102, raw],
                        ],
                        {invert_cover: invert},
                    )
                ).result,
            ).toEqual({position_top: top, position_bottom: bottom});
        }
    });

    it("recognizes the exact public Yooksmart identity without rewriting it", async () => {
        const device = deviceFor("YKV24SAED", "Yooksmart");
        const definition = await findByDevice(device);
        expect(definition).toMatchObject({model: "YKV24SAED", vendor: "Yooksmart"});
        expect(definition.endpoint(device)).toEqual({bottom: 1, top: 1});
        expect(device.modelID).toBe("YKV24SAED");
        expect(device.manufacturerName).toBe("Yooksmart");
    });
});
