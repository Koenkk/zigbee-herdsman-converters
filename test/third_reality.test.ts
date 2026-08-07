import {describe, expect, test, vi} from "vitest";
import {findByDevice} from "../src";
import type {Definition, Expose, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

function getDeviceExposes(definition: Definition, device: Zh.Device): Expose[] {
    return typeof definition.exposes === "function" ? definition.exposes(device, {}) : (definition.exposes ?? []);
}

function getConverter(definition: Definition, cluster: string) {
    const converter = definition.fromZigbee?.find((item) => item.cluster === cluster);
    expect(converter).toBeDefined();
    return converter;
}

function getSoilGetConverter(definition: Definition) {
    const converter = definition.toZigbee?.find((item) => item.key.includes("soil_moisture"));
    expect(converter?.convertGet).toBeDefined();
    return converter;
}

describe("Third Reality soil moisture sensors", () => {
    test("3RSM0147Z falls back to relative humidity cluster for soil moisture on older hardware", async () => {
        const device = mockDevice(
            {
                modelID: "3RSM0147Z",
                manufacturerName: "Third Reality, Inc",
                endpoints: [
                    {ID: 1, inputClusters: ["genBasic", "genPowerCfg", "msTemperatureMeasurement", "msRelativeHumidity"], inputClusterIDs: [0xff01]},
                ],
            },
            "EndDevice",
        );
        const definition = await findByDevice(device);
        const coordinatorEndpoint = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).endpoints[0];

        await definition.configure?.(device, coordinatorEndpoint, definition);

        const bindClusters = vi.mocked(device.endpoints[0].bind).mock.calls.map((call) => call[0]);
        const reportingClusters = vi.mocked(device.endpoints[0].configureReporting).mock.calls.map((call) => call[0]);
        expect(bindClusters).toContain("msRelativeHumidity");
        expect(bindClusters).not.toContain("msSoilMoisture");
        expect(reportingClusters).toContain("msRelativeHumidity");
        expect(reportingClusters).not.toContain("msSoilMoisture");

        const exposes = getDeviceExposes(definition, device).map((expose) => expose.property);
        expect(exposes).toContain("soil_moisture");
        expect(exposes).not.toContain("humidity");

        const converter = getConverter(definition, "msRelativeHumidity");
        const result = converter?.convert(definition, {data: {measuredValue: 6615}, device} as never, vi.fn(), {}, {device} as never);
        expect(result).toStrictEqual({soil_moisture: 66.15});

        vi.mocked(device.endpoints[0].read).mockClear();
        await getSoilGetConverter(definition)?.convertGet?.(device.endpoints[0], "soil_moisture", {device} as never);
        expect(device.endpoints[0].read).toHaveBeenCalledWith("msRelativeHumidity", ["measuredValue"]);
    });

    test("3RSM0147Z uses native soil moisture cluster when present", async () => {
        const device = mockDevice(
            {
                modelID: "3RSM0147Z",
                manufacturerName: "Third Reality, Inc",
                endpoints: [
                    {
                        ID: 1,
                        inputClusters: ["genBasic", "genPowerCfg", "msTemperatureMeasurement", "msRelativeHumidity", "msSoilMoisture"],
                        inputClusterIDs: [0xff01],
                    },
                ],
            },
            "EndDevice",
        );
        const definition = await findByDevice(device);
        const coordinatorEndpoint = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).endpoints[0];

        await definition.configure?.(device, coordinatorEndpoint, definition);

        const bindClusters = vi.mocked(device.endpoints[0].bind).mock.calls.map((call) => call[0]);
        const reportingClusters = vi.mocked(device.endpoints[0].configureReporting).mock.calls.map((call) => call[0]);
        expect(bindClusters).toContain("msSoilMoisture");
        expect(reportingClusters).toContain("msSoilMoisture");

        const nativeConverter = getConverter(definition, "msSoilMoisture");
        const nativeResult = nativeConverter?.convert(definition, {data: {measuredValue: 5519}, device} as never, vi.fn(), {}, {device} as never);
        expect(nativeResult).toStrictEqual({soil_moisture: 55.19});

        const fallbackConverter = getConverter(definition, "msRelativeHumidity");
        const fallbackResult = fallbackConverter?.convert(definition, {data: {measuredValue: 1234}, device} as never, vi.fn(), {}, {device} as never);
        expect(fallbackResult).toBeUndefined();

        vi.mocked(device.endpoints[0].read).mockClear();
        await getSoilGetConverter(definition)?.convertGet?.(device.endpoints[0], "soil_moisture", {device} as never);
        expect(device.endpoints[0].read).toHaveBeenCalledWith("msSoilMoisture", ["measuredValue"]);
    });
});
