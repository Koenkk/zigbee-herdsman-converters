import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import {mockDevice} from "./utils";

describe("Bosch thermostats", () => {
    it("exposes standard weekly schedule controls for BTH-RM230Z", async () => {
        const device = mockDevice({
            modelID: "RBSH-RTH0-ZB-EU",
            manufacturerName: "BOSCH",
            endpoints: [{ID: 1, inputClusters: ["genOnOff", "hvacThermostat", "hvacUserInterfaceCfg", "msRelativeHumidity"]}],
        });
        const definition = await findByDevice(device);

        expect(definition.toZigbee.some((converter) => converter.key.includes("weekly_schedule"))).toBe(true);
        expect(definition.toZigbee.some((converter) => converter.key.includes("clear_weekly_schedule"))).toBe(true);
        expect(definition.fromZigbee.some((converter) => converter.cluster === "hvacThermostat")).toBe(true);
        expect(JSON.stringify(definition.exposes)).toContain("weekly_schedule");

        const coordinator = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1);
        const endpoint = device.getEndpoint(1);
        await definition.configure?.(device, coordinator, definition);

        expect(endpoint.read).toHaveBeenCalledWith("hvacThermostat", ["numberOfWeeklyTrans", "numberOfDailyTrans", "startOfWeek"]);
    });

    it("does not expose weekly schedule controls for BTH-RM", async () => {
        const device = mockDevice({
            modelID: "RBSH-RTH0-BAT-ZB-EU",
            manufacturerName: "BOSCH",
            endpoints: [{ID: 1, inputClusters: ["hvacThermostat", "hvacUserInterfaceCfg"]}],
        });
        const definition = await findByDevice(device);

        expect(definition.toZigbee.some((converter) => converter.key.includes("weekly_schedule"))).toBe(false);
        expect(JSON.stringify(definition.exposes)).not.toContain("weekly_schedule");
    });
});
