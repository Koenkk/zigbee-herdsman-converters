import {describe, expect, test, vi} from "vitest";
import {findByDevice} from "../src";
import type {Definition, Expose, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

// Real endpoint/cluster descriptors captured from paired hardware (herdsman
// database): endpoint 10, HA profile 260, temperature-sensor device 770.
// Base = ENS210 + ENS16x, Pro adds SCD41 (msCO2 / 0x040D) and VCNL4040
// (msIlluminanceMeasurement / 0x0400). The 0xFC01 custom cluster carries
// eCO2/tVOC/VOC-level on both variants.
const BASE_CLUSTERS = ["genBasic", "genIdentify", "genAnalogOutput", "msTemperatureMeasurement", "msRelativeHumidity"];
const PRO_CLUSTERS = [...BASE_CLUSTERS, "msIlluminanceMeasurement", "msCO2"];

function mockAirCube(inputClusters: string[]): Zh.Device {
    return mockDevice(
        {
            modelID: "AirCube",
            manufacturerName: "StuckAtPrototype",
            endpoints: [{ID: 10, profileID: 260, deviceID: 770, inputClusters, inputClusterIDs: [0xfc01]}],
        },
        "EndDevice",
    );
}

function exposeNames(definition: Definition, device: Zh.Device): string[] {
    const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : (definition.exposes ?? []);
    return (exposes as Expose[]).map((expose) => expose.name);
}

describe("StuckAtPrototype AirCube", () => {
    test("Pro exposes CO2 + illuminance and configures their reporting", async () => {
        const device = mockAirCube(PRO_CLUSTERS);
        const definition = await findByDevice(device);
        expect(definition.model).toBe("AirCube");

        expect(exposeNames(definition, device)).toEqual(
            expect.arrayContaining(["temperature", "humidity", "eco2", "voc", "aqi", "brightness", "co2", "illuminance", "identify"]),
        );
        // Brightness is the only writable value.
        expect(definition.toZigbee?.find((converter) => converter.key.includes("brightness"))?.convertSet).toBeDefined();

        const coordinatorEndpoint = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).endpoints[0];
        await definition.configure?.(device, coordinatorEndpoint, definition);

        const reporting = vi.mocked(device.endpoints[0].configureReporting).mock.calls.map((call) => call[0]);
        expect(reporting).toContain("msCO2");
        expect(reporting).toContain("msIlluminanceMeasurement");
    });

    test("Base matches the same definition, hides Pro-only values, and configure does not throw", async () => {
        const device = mockAirCube(BASE_CLUSTERS);
        const definition = await findByDevice(device);
        expect(definition.model).toBe("AirCube");

        const names = exposeNames(definition, device);
        expect(names).toEqual(expect.arrayContaining(["temperature", "humidity", "eco2", "voc", "aqi", "brightness", "identify"]));
        expect(names).not.toContain("co2");
        expect(names).not.toContain("illuminance");

        // Regression: an ungated m.co2()/m.illuminance() configure calls
        // getEndpointsWithCluster(), which throws on a Base unit lacking the
        // cluster. The gate must skip it instead.
        const coordinatorEndpoint = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).endpoints[0];
        await expect(definition.configure?.(device, coordinatorEndpoint, definition)).resolves.toBeUndefined();

        const reporting = vi.mocked(device.endpoints[0].configureReporting).mock.calls.map((call) => call[0]);
        expect(reporting).not.toContain("msCO2");
        expect(reporting).not.toContain("msIlluminanceMeasurement");
    });
});
