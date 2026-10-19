import {describe, expect, it, vi} from "vitest";
import {findByDevice, fromZigbee} from "../src/index";
import {mockDevice} from "./utils";

describe.each(["YRD430 PB", "YRD430 TS"])("Yale %s PIN responses", (modelID) => {
    const responses = [
        {type: "commandSetPinCodeRsp", property: "last_successful_pincode_save"},
        {type: "commandClearPinCodeRsp", property: "last_successful_pincode_clear"},
    ] as const;

    it.each(responses)("publishes $property for a successful $type", async ({type, property}) => {
        const device = mockDevice({modelID, endpoints: [{ID: 1, inputClusters: ["closuresDoorLock"]}]}, "EndDevice");
        const definition = await findByDevice(device);
        const converters = definition.fromZigbee.filter(
            (converter) => converter.cluster === "closuresDoorLock" && Array.isArray(converter.type) && converter.type.includes(type),
        );

        expect(definition.model).toBe("YRD430-BLE");
        expect(converters).toStrictEqual([fromZigbee.lock_set_pin_code_response]);
        vi.spyOn(Date, "now").mockReturnValue(1792432074595);

        const result = await converters[0].convert(
            definition,
            {type, cluster: "closuresDoorLock", data: {status: 0}, endpoint: device.getEndpoint(1), device} as never,
            vi.fn(),
            {},
            {} as never,
        );

        expect(result).toStrictEqual({[property]: 1792432074595});
    });

    it.each(responses)("does not publish success for a failed $type", async ({type}) => {
        const device = mockDevice({modelID, endpoints: [{ID: 1, inputClusters: ["closuresDoorLock"]}]}, "EndDevice");
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee.find(
            (entry) => entry.cluster === "closuresDoorLock" && Array.isArray(entry.type) && entry.type.includes(type),
        );

        expect(converter).toBe(fromZigbee.lock_set_pin_code_response);
        for (const status of [1, 2, 3, 255]) {
            const result = await converter.convert(
                definition,
                {type, cluster: "closuresDoorLock", data: {status}, endpoint: device.getEndpoint(1), device} as never,
                vi.fn(),
                {},
                {} as never,
            );
            expect(result).toBeUndefined();
        }
    });
});
