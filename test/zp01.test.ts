import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import {mockDevice} from "./utils";

describe("ZP01", () => {
    it.each(["_TZ3000_lf56vpxj", "_TZ3040_o4mkahkc"])("resolves to ZP01 and carries the PIR settings for %s", async (manufacturerName) => {
        const device = mockDevice({
            modelID: "TS0202",
            manufacturerName,
            endpoints: [
                {
                    ID: 1,
                    inputClusters: ["genPowerCfg", "genIdentify", "genGroups", "ssIasZone", "genBasic"],
                },
            ],
        });

        const definition = await findByDevice(device);

        expect(definition.model).toBe("ZP01");
        expect(definition.exposes.map((expose) => expose.name)).toEqual(
            expect.arrayContaining(["occupancy", "battery", "battery_low", "voltage", "tamper", "sensitivity", "keep_time"]),
        );

        const converter = definition.toZigbee.find((c) => c.key?.includes("keep_time"));
        expect(converter?.key).toEqual(expect.arrayContaining(["sensitivity", "keep_time"]));
    });

    it("writes keep_time to ssIasZone as manufacturer attribute 0xf001", async () => {
        const device = mockDevice({
            modelID: "TS0202",
            manufacturerName: "_TZ3040_o4mkahkc",
            endpoints: [{ID: 1, inputClusters: ["ssIasZone", "genPowerCfg"]}],
        });
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(1);
        const converter = definition.toZigbee.find((c) => c.key?.includes("keep_time"));

        await converter?.convertSet?.(endpoint, "keep_time", 30, {
            device,
            mapped: definition,
            message: {keep_time: 30},
            options: {},
            state: {},
            endpoint_name: undefined,
            publish: () => {},
        });

        const calls = vi.mocked(endpoint.write).mock.calls;
        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toBe("ssIasZone");
        expect(calls[0][1]).toEqual({61441: {value: 0, type: 32}});
    });

    it("writes sensitivity to the standard IAS Zone sensitivity level", async () => {
        const device = mockDevice({
            modelID: "TS0202",
            manufacturerName: "_TZ3000_lf56vpxj",
            endpoints: [{ID: 1, inputClusters: ["ssIasZone", "genPowerCfg"]}],
        });
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(1);
        const converter = definition.toZigbee.find((c) => c.key?.includes("sensitivity"));

        await converter?.convertSet?.(endpoint, "sensitivity", "high", {
            device,
            mapped: definition,
            message: {sensitivity: "high"},
            options: {},
            state: {},
            endpoint_name: undefined,
            publish: () => {},
        });

        const calls = vi.mocked(endpoint.write).mock.calls;
        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toBe("ssIasZone");
        expect(calls[0][1]).toEqual({currentZoneSensitivityLevel: 2});
    });
});
