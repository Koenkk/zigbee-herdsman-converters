import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {KeyValueAny} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Moes ZS-SF-EUC-WH-MS button action", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const setup = async () => {
        const device = mockDevice({modelID: "TS0601", manufacturerName: "_TZE28C1000000_i8sdouy0", endpoints: [{ID: 1}]});
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(1);
        const converters = definition.fromZigbee.filter((converter) => converter.cluster === "manuSpecificTuya");
        const published: KeyValueAny[] = [];
        const publish = (payload: KeyValueAny) => published.push(payload);
        const report = async (dp: number, data: number[]) => {
            const result: KeyValueAny = {};
            for (const converter of converters) {
                const msg = {
                    data: {seq: 0, dpValues: [{dp, datatype: dp === 2 ? 2 : 4, data: Buffer.from(data)}]},
                    endpoint,
                    device,
                    meta: {rawData: Buffer.alloc(0)},
                    groupID: 0,
                    type: "commandDataReport",
                    cluster: "manuSpecificTuya",
                    linkquality: 0,
                };
                // biome-ignore lint/suspicious/noExplicitAny: test message
                Object.assign(result, await converter.convert(definition, msg as any, publish, {}, {device, state: {}} as any));
            }
            return result;
        };
        return {report, published};
    };

    it("publishes up/down for a single DP 1 report (physical press)", async () => {
        const {report, published} = await setup();
        await report(1, [0]);
        expect(published).toStrictEqual([]);
        vi.advanceTimersByTime(300);
        expect(published).toStrictEqual([{action: "up"}]);
        await report(1, [2]);
        vi.advanceTimersByTime(300);
        expect(published).toStrictEqual([{action: "up"}, {action: "down"}]);
    });

    it("drops the double DP 1 echo of a command sent to the device", async () => {
        const {report, published} = await setup();
        await report(1, [2]);
        await report(1, [2]);
        vi.advanceTimersByTime(300);
        expect(published).toStrictEqual([]);
    });

    it("detects pause from a repeated raw DP 2 report", async () => {
        const {report} = await setup();
        expect((await report(2, [0, 0, 0, 100])).action).toBeUndefined();
        expect((await report(2, [0, 0, 0, 100])).action).toBe("pause");
        expect((await report(2, [0, 0, 0, 95])).action).toBeUndefined();
    });
});
