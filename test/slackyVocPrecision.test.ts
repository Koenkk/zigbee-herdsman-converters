import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import {mockDevice} from "./utils";

describe("Slacky R02 corrected firmware VOC contract", () => {
    it.each([1, 3, 5])("preserves raw %i ppb as ppm", async (raw) => {
        const device = mockDevice({modelID: "Tuya_CO2Sensor_r02", endpoints: [{ID: 1, inputClusters: ["genAnalogInput"]}]});
        const definition = await findByDevice(device);
        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
        expect(exposes?.find((expose) => expose.property === "voc")?.unit).toBe("ppm");
        const converter = definition.fromZigbee.find((candidate) => candidate.cluster === "genAnalogInput");
        if (!converter) throw new Error("Missing VOC converter");
        const result = await converter.convert(
            definition,
            {
                cluster: "genAnalogInput",
                data: {presentValue: Math.fround(raw / 1e9)},
                device,
                endpoint: device.getEndpoint(1),
                groupID: 0,
                linkquality: 100,
                meta: {rawData: Buffer.alloc(0)},
                type: "attributeReport",
            } as never,
            () => {},
            {},
            {device, deviceExposesChanged: () => {}, state: {}},
        );
        expect(result).toStrictEqual({voc: raw / 1000});
    });
});
