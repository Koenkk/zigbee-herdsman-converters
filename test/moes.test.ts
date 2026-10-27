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
        const converters = definition.fromZigbee.filter((c) => c.cluster === "manuSpecificTuya");
        const published: KeyValueAny[] = [];
        let seq = 0;
        const report = async (value: number) => {
            const msg = {
                data: {seq: seq++, dpValues: [{dp: 1, datatype: 4, data: Buffer.from([value])}]},
                endpoint: device.getEndpoint(1),
                device,
                meta: {rawData: Buffer.alloc(0)},
                type: "commandDataReport",
                cluster: "manuSpecificTuya",
            };
            for (const converter of converters) {
                // biome-ignore lint/suspicious/noExplicitAny: test message
                await converter.convert(definition, msg as any, (p: KeyValueAny) => published.push(p), {}, {device, state: {}} as any);
            }
        };
        return {report, published};
    };

    it("publishes up/down for a single DP 1 report (physical press)", async () => {
        const {report, published} = await setup();
        await report(0);
        expect(published).toStrictEqual([]);
        vi.advanceTimersByTime(300);
        expect(published).toStrictEqual([{action: "up"}]);
        await report(2);
        vi.advanceTimersByTime(300);
        expect(published).toStrictEqual([{action: "up"}, {action: "down"}]);
    });

    it("drops the double DP 1 echo of a command sent to the device", async () => {
        const {report, published} = await setup();
        await report(2);
        await report(2);
        vi.advanceTimersByTime(300);
        expect(published).toStrictEqual([]);
    });
});
