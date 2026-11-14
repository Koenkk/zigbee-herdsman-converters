import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import {mockDevice} from "./utils";

describe("Nobø thermostats", () => {
    it.each([
        ["SWT-IZ", "start"],
        ["SWT-IZ", "deviceAnnounce"],
        ["SPC-IZ", "start"],
        ["SPC-IZ", "deviceAnnounce"],
    ] as const)("%s reads thermostat state on %s", async (modelID, eventType) => {
        const device = mockDevice({modelID, endpoints: [{ID: 1, inputClusters: ["genIdentify", "hvacThermostat"]}]});
        const endpoint = device.getEndpoint(1);
        const definition = await findByDevice(device);

        await definition.onEvent?.({type: eventType, data: {device, deviceExposesChanged: () => {}, state: {}, options: {}}});

        expect(endpoint.read).toHaveBeenCalledWith("hvacThermostat", [
            "occupiedHeatingSetpoint",
            "unoccupiedHeatingSetpoint",
            "systemMode",
            "runningMode",
            "localTemp",
        ]);
    });
});
