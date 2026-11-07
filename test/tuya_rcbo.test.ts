import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import {mockDevice} from "./utils";

describe("TS0601_rcbo under-voltage threshold", () => {
    it.each([
        ["_TZE200_hkdl5fmv", 50],
        ["_TZE284_hkdl5fmv", 100],
    ] as const)("exposes the appropriate minimum for %s", async (manufacturerName, expectedMin) => {
        const device = mockDevice({modelID: "TS0601", manufacturerName, endpoints: [{ID: 1}]});
        const definition = await findByDevice(device);
        expect(definition.model).toBe("TS0601_rcbo");

        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
        expect(exposes.find((expose) => expose.property === "under_voltage_threshold")).toMatchObject({
            value_min: expectedMin,
            value_max: 215,
            value_step: 1,
        });
    });
});
