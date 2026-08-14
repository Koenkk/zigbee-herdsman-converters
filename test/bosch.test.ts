import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import {boschThermostatExtend} from "../src/lib/bosch";
import {repInterval} from "../src/lib/constants";
import type {DefinitionExposesFunction, KeyValueAny} from "../src/lib/types";
import {mockDevice, reportingItem} from "./utils";

describe("Bosch thermostats", () => {
    it("exposes standard weekly schedule controls for BTH-RM230Z", async () => {
        const device = mockDevice({
            modelID: "RBSH-RTH0-ZB-EU",
            manufacturerName: "BOSCH",
            endpoints: [{ID: 1, inputClusters: ["genOnOff", "hvacThermostat", "hvacUserInterfaceCfg", "msRelativeHumidity"]}],
        });
        vi.spyOn(device, "save").mockImplementation(() => {});
        const definition = await findByDevice(device);

        expect(definition.toZigbee.some((converter) => converter.key.includes("weekly_schedule"))).toBe(true);
        expect(definition.toZigbee.some((converter) => converter.key.includes("clear_weekly_schedule"))).toBe(true);
        expect(definition.fromZigbee.some((converter) => converter.cluster === "hvacThermostat")).toBe(true);
        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
        expect(JSON.stringify(exposes)).toContain("weekly_schedule");

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

describe("Bosch thermostat relayState extension", () => {
    const relayStateExposes = (device: ReturnType<typeof mockDevice>) => {
        const relayState = boschThermostatExtend.relayState();
        expect(relayState.exposes).toHaveLength(1);

        const expose = relayState.exposes?.[0] as DefinitionExposesFunction;
        return expose(device, {});
    };

    it("exposes and configures the relay when the device supports genOnOff", async () => {
        const relayState = boschThermostatExtend.relayState();
        const device = mockDevice({modelID: "RBSH-RTH0-ZB-EU", endpoints: [{ID: 1, inputClusters: ["genOnOff"]}]});
        const coordinatorEndpoint = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1);

        await relayState.configure?.[0](device, coordinatorEndpoint, {} as never);

        const exposes = relayStateExposes(device);
        expect(exposes.map((expose) => expose.type)).toStrictEqual(["switch"]);
        expect(exposes[0].features?.map((feature) => feature.property)).toStrictEqual(["state"]);
        expect(device.getEndpoint(1).bind).toHaveBeenCalledWith("genOnOff", coordinatorEndpoint);
        expect(device.getEndpoint(1).configureReporting).toHaveBeenCalledWith("genOnOff", [reportingItem("onOff", 0, repInterval.MAX, 1)]);
    });

    it("does not expose or configure the relay when the device does not support genOnOff", async () => {
        const relayState = boschThermostatExtend.relayState();
        const device = mockDevice({modelID: "RBSH-RTH0-ZB-EU", endpoints: [{ID: 1, inputClusters: ["hvacThermostat"]}]});
        const coordinatorEndpoint = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1);

        await relayState.configure?.[0](device, coordinatorEndpoint, {} as never);

        expect(relayStateExposes(device)).toStrictEqual([]);
        expect(device.getEndpoint(1).bind).not.toHaveBeenCalled();
        expect(device.getEndpoint(1).configureReporting).not.toHaveBeenCalled();
    });
});

describe("Bosch Room thermostat II 230V Home Assistant climate modes", () => {
    const getDefinition = () =>
        findByDevice(
            mockDevice({
                modelID: "RBSH-RTH0-ZB-EU",
                manufacturerName: "BOSCH",
                endpoints: [{ID: 1, inputClusters: ["hvacThermostat"]}],
            }),
        );

    const buildPayload = async (options = {}) => {
        const definition = await getDefinition();
        const payload: KeyValueAny = {
            mode_command_topic: "zigbee2mqtt/bad_thermostat/set/system_mode",
        };

        definition.meta?.overrideHaDiscoveryPayload?.(payload, options);

        return {definition, payload};
    };

    it("defaults to heat-only Home Assistant climate discovery", async () => {
        const {definition, payload} = await buildPayload();
        const option = definition.options?.find((option) => option.name === "homeassistant_climate_modes");

        expect(option?.label).toBe("Home Assistant climate modes");
        expect(payload.mode_command_topic).toBe("zigbee2mqtt/bad_thermostat/set");
        expect(payload.mode_command_template).toContain("{% set active_modes = ['heat'] %}");
        expect(payload.mode_state_template).toContain("{% set fallback_mode = 'heat' %}");
        expect(payload.modes).toStrictEqual(["off", "heat", "auto"]);
    });

    it("can expose cool-only Home Assistant climate discovery", async () => {
        const {payload} = await buildPayload({homeassistant_climate_modes: "cool"});

        expect(payload.mode_command_template).toContain("{% set active_modes = ['cool'] %}");
        expect(payload.mode_state_template).toContain("{% set fallback_mode = 'cool' %}");
        expect(payload.modes).toStrictEqual(["off", "cool", "auto"]);
    });

    it("can expose heat and cool Home Assistant climate discovery", async () => {
        const {payload} = await buildPayload({homeassistant_climate_modes: "heat_cool"});

        expect(payload.mode_command_template).toContain("{% set active_modes = ['heat','cool'] %}");
        expect(payload.mode_state_template).toContain("{% set fallback_mode = 'heat' %}");
        expect(payload.modes).toStrictEqual(["off", "heat", "cool", "auto"]);
    });
});
