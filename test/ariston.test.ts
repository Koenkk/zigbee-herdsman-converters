import {beforeEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {Definition, Fz, KeyValueAny} from "../src/lib/types";
import {mockDevice} from "./utils";

// Endpoints and clusters as interviewed from a real Ariston boiler gateway.
function buildDevice() {
    return mockDevice({
        modelID: "Rem4 Heater",
        manufacturerName: "Ariston",
        endpoints: [
            {ID: 2, inputClusters: ["genBasic", "genIdentify", "genOnOff", "hvacThermostat"], outputClusters: ["genIdentify"]},
            {ID: 232, inputClusters: ["genBasic", "genPowerCfg", "genIdentify"], outputClusters: ["genIdentify", "genOta"]},
            {ID: 242, inputClusters: ["greenPower"], outputClusters: ["greenPower"]},
        ],
    });
}

function convert(definition: Definition, data: KeyValueAny) {
    const msg = {data: {...data}, type: "attributeReport", cluster: "hvacThermostat", endpoint: {ID: 2}} as unknown as Fz.Message<
        "hvacThermostat",
        undefined,
        ["attributeReport"]
    >;
    const result: KeyValueAny = {};
    for (const converter of definition.fromZigbee.filter((c) => c.cluster === "hvacThermostat")) {
        Object.assign(result, converter.convert(definition, msg as never, vi.fn(), {}, {state: {}, device: {}} as never));
    }
    return result;
}

describe("Ariston Rem4 Heater", () => {
    let definition: Definition;

    beforeEach(async () => {
        definition = await findByDevice(buildDevice());
    });

    it("exposes the thermostat interface", () => {
        expect(definition.model).toBe("Rem4 Heater");
        const exposes = (definition.exposes as {type: string; name?: string; features?: {name: string}[]}[]).map(
            (e) => `${e.name ?? e.type}${e.features ? `(${e.features.map((f) => f.name).join(",")})` : ""}`,
        );
        expect(exposes).toStrictEqual([
            "switch(state)",
            "climate(local_temperature,occupied_heating_setpoint,system_mode,control_sequence_of_operation)",
            "outdoor_temperature",
        ]);
    });

    it("keeps the other attributes when the boiler reports a non-standard running mode", () => {
        // Reported by the boiler outside winter mode; not part of the ZCL ThermostatRunningMode enum.
        expect(convert(definition, {runningMode: 1, occupiedHeatingSetpoint: 1900, systemMode: 4})).toStrictEqual({
            occupied_heating_setpoint: 19,
            system_mode: "heat",
        });
    });

    it("converts the outdoor temperature", () => {
        expect(convert(definition, {outdoorTemp: -10})).toStrictEqual({outdoor_temperature: -0.1});
    });
});
