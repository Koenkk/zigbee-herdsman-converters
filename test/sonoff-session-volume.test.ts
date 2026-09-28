import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import type {Fz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Sonoff irrigation session volume", () => {
    async function setup(modelID = "SWV-ZF2", softwareBuildID = "1.0.9") {
        const device = mockDevice({modelID, softwareBuildID, endpoints: [{ID: 1}, {ID: 2}]});
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee.find((c) => c.convert.toString().includes("irrigationScheduleStatus"));
        const convert = (status: number, unit: number, amount: number, endpointID = 2) => {
            const data = Buffer.alloc(status === 0 || status === 3 ? 15 : 21);
            data[0] = status;
            data[2] = 1;
            data.writeUInt32BE(843126525, 4);
            data.writeUInt32BE(843127185, 8);
            if (data.length === 21) {
                data.writeUInt32BE(843126555, 12);
                data[16] = unit;
                data.writeUInt16BE(amount, 19);
            } else data[12] = unit;
            const message = {
                data: {irrigationScheduleStatus: [...data]},
                endpoint: device.getEndpoint(endpointID),
                device,
                type: "attributeReport",
                cluster: "customClusterEwelink",
                meta: {},
                groupID: 0,
                linkquality: 100,
            } as Fz.Message<"customClusterEwelink", undefined, "attributeReport">;
            return converter.convert(definition, message, () => {}, {}, {device, state: {}, deviceExposesChanged: () => {}});
        };
        return {definition, device, convert};
    }

    it.each([
        [0, 3.785411784],
        [1, 1],
        [2, 4.54609],
    ])("normalizes unit %s to liters while preserving composite payload", async (unit, factor) => {
        const {convert} = await setup();
        const result = await convert(2, unit, 6);
        expect(result).toMatchObject({
            actual_irrigation_amount_2: 6 * factor,
            irrigation_schedule_status_2: {actual_irrigation_amount: 6, schedule_status: "running"},
        });
        expect(result).not.toHaveProperty("actual_irrigation_amount_1");
    });

    it.each([0, 3])("clears stale scalar for status %s", async (status) => {
        const {convert} = await setup();
        expect(await convert(status, 1, 0)).toMatchObject({actual_irrigation_amount_2: null});
    });

    it("publishes zero and final totals separately for both outlets", async () => {
        const {convert} = await setup();
        expect(await convert(2, 1, 0, 1)).toMatchObject({actual_irrigation_amount_1: 0});
        expect(await convert(1, 1, 6, 2)).toMatchObject({actual_irrigation_amount_2: 6});
        expect(await convert(2, 255, 6)).toMatchObject({actual_irrigation_amount_2: null});
    });

    it("exposes each dual outlet as a numeric sensor in liters", async () => {
        const {definition, device} = await setup();
        const exposes = (typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes) as Array<{
            property: string;
            unit?: string;
        }>;
        expect(exposes.filter((e) => e.property?.startsWith("actual_irrigation_amount"))).toMatchObject([
            {property: "actual_irrigation_amount_1", unit: "L"},
            {property: "actual_irrigation_amount_2", unit: "L"},
        ]);
    });

    it("also publishes the single-outlet flow-meter model", async () => {
        const {convert} = await setup("SWV-ZFE", "1.1.0");
        expect(await convert(2, 1, 6, 1)).toMatchObject({actual_irrigation_amount: 6});
    });

    it("publishes shared flow using the standard scale and preserves invalid readings as unknown", async () => {
        const {definition, device} = await setup();
        const converter = definition.fromZigbee.find((c) => c.cluster === "msFlowMeasurement");
        for (const [raw, expected] of [
            [0, 0],
            [4, 0.4],
            [6, 0.6],
            [null, null],
            [65535, null],
            [-1, null],
        ]) {
            const result = converter.convert(
                definition,
                {data: {measuredValue: raw}, endpoint: device.getEndpoint(1)} as Fz.Message<"msFlowMeasurement", undefined, "attributeReport">,
                () => {},
                {},
                {device, state: {}, deviceExposesChanged: () => {}},
            );
            expect(result).toEqual({flow: expected});
        }
    });
});
