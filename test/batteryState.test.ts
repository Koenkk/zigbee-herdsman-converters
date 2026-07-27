import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import * as tuya from "../src/lib/tuya";
import type {Definition, DefinitionExposesFunction, Expose} from "../src/lib/types";
import {mockDevice} from "./utils";

function resolveExposes(definition: Definition, device: ReturnType<typeof mockDevice>): Expose[] {
    return typeof definition.exposes === "function" ? (definition.exposes as DefinitionExposesFunction)(device, {}) : definition.exposes;
}

function batteryStateExpose(exposes: Expose[]): Expose | undefined {
    return exposes.find((expose) => expose.name === "battery_state");
}

describe("battery_state exposes", () => {
    it("marks the shared Tuya battery_state expose as diagnostic", () => {
        expect(tuya.exposes.batteryState().category).toBe("diagnostic");
    });

    it("marks direct Tuya battery_state exposes as diagnostic", async () => {
        const device = mockDevice({modelID: "TS0601", manufacturerName: "_TZE284_o9ofysmo", endpoints: [{ID: 1}]});
        const definition = await findByDevice(device);

        expect(definition.model).toBe("ZS-301Z");
        expect(batteryStateExpose(resolveExposes(definition, device))?.category).toBe("diagnostic");
    });

    it("marks modern enumLookup battery_state exposes as diagnostic", async () => {
        const device = mockDevice({modelID: "POK012", endpoints: [{ID: 1}]});
        const definition = await findByDevice(device);

        expect(definition.model).toBe("POK012");
        expect(batteryStateExpose(resolveExposes(definition, device))?.category).toBe("diagnostic");
    });
});
