import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import * as tuya from "../src/lib/tuya";
import type {Fz, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Beca BVRF-L001", () => {
    const makeDevice = () => mockDevice({modelID: "TS0601", manufacturerName: "_TZE204_6ewjlefg", endpoints: [{ID: 1}]});

    it("matches the observed Zigbee fingerprint and decodes the tested datapoints", async () => {
        const device = makeDevice();
        const definition = await findByDevice(device);
        expect(definition.model).toBe("BVRF-L001");
        expect(definition.vendor).toBe("Beca");

        const message = {
            device,
            endpoint: device.getEndpoint(1),
            cluster: "manuSpecificTuya",
            type: "commandDataReport",
            meta: {zclTransactionSequenceNumber: 1},
            data: {
                dpValues: [
                    {dp: 1, datatype: 1, data: [1]},
                    {dp: 2, datatype: 4, data: [0]},
                    {dp: 16, datatype: 2, data: [0, 0, 0, 230]},
                    {dp: 24, datatype: 2, data: [0, 0, 1, 29]},
                    {dp: 40, datatype: 1, data: [0]},
                    {dp: 49, datatype: 4, data: [3]},
                ],
            },
        } as Fz.Message<"manuSpecificTuya", undefined, "commandDataReport">;

        expect(tuya.fz.datapoints.convert(definition, message, () => {}, {}, {device, state: {}, deviceExposesChanged: () => {}})).toStrictEqual({
            state: "ON",
            system_mode: "cool",
            current_heating_setpoint: 23,
            local_temperature: 28.5,
            child_lock: "UNLOCK",
            fan_mode: "high",
        });
    });

    it.each([
        ["state", "OFF", 1, 1, [0]],
        ["system_mode", "dry", 2, 4, [3]],
        ["current_heating_setpoint", 23, 16, 2, [0, 0, 0, 230]],
        ["fan_mode", "medium", 49, 4, [2]],
        ["child_lock", "LOCK", 40, 1, [1]],
    ] as const)("sends %s with the correct Tuya datatype and value", async (key, value, dp, datatype, data) => {
        const device = makeDevice();
        const definition = await findByDevice(device);
        expect(definition.toZigbee).toContain(tuya.tz.datapoints);
        const converter = tuya.tz.datapoints;
        const meta: Tz.Meta = {
            device,
            mapped: definition,
            message: {[key]: value},
            options: {},
            state: {},
            endpoint_name: undefined,
            publish: () => {},
        };
        await converter.convertSet(device.getEndpoint(1), key, value, meta);
        expect(device.getEndpoint(1).command).toHaveBeenCalledWith(
            "manuSpecificTuya",
            "dataRequest",
            {seq: 1, dpValues: [{dp, datatype, data: Buffer.from(data)}]},
            {disableDefaultResponse: true},
        );
    });

    it.each([15, 32.5, 33])("rejects out-of-range or fractional setpoint %s before sending", async (value) => {
        const device = makeDevice();
        const definition = await findByDevice(device);
        expect(definition.toZigbee).toContain(tuya.tz.datapoints);
        const converter = tuya.tz.datapoints;
        const meta: Tz.Meta = {
            device,
            mapped: definition,
            message: {current_heating_setpoint: value},
            options: {},
            state: {},
            endpoint_name: undefined,
            publish: () => {},
        };
        await expect(converter.convertSet(device.getEndpoint(1), "current_heating_setpoint", value, meta)).rejects.toThrow(
            "current_heating_setpoint must be an integer from 16 to 32 °C",
        );
        expect(device.getEndpoint(1).command).not.toHaveBeenCalled();
    });
});
