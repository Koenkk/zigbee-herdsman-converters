import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import {mockDevice} from "./utils";

describe("Nobø thermostats", () => {
    it.each(["SWT-IZ", "SPC-IZ"])("%s reads thermostat state on start", async (modelID) => {
        const device = mockDevice({modelID, endpoints: [{ID: 1, inputClusters: ["genIdentify", "hvacThermostat"]}]});
        const endpoint = device.getEndpoint(1);
        const definition = await findByDevice(device);

        await definition.onEvent?.({type: "start", data: {device, deviceExposesChanged: () => {}, state: {}, options: {}}});

        expect(endpoint.read).toHaveBeenCalledWith("hvacThermostat", [
            "occupiedHeatingSetpoint",
            "unoccupiedHeatingSetpoint",
            "systemMode",
            "runningMode",
            "localTemp",
        ]);
    });
});
