import {describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import type {Fz, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Namron 4512758 thermostat", () => {
    const createDevice = () =>
        mockDevice({
            modelID: "4512758",
            endpoints: [
                {
                    ID: 1,
                    inputClusters: ["genOnOff", "hvacThermostat", "hvacUserInterfaceCfg", "seMetering", "haElectricalMeasurement"],
                    read: vi.fn((cluster) => {
                        if (cluster === "haElectricalMeasurement") {
                            return Promise.resolve({acCurrentDivisor: 1, acCurrentMultiplier: 1, acPowerDivisor: 1, acPowerMultiplier: 1});
                        }
                        if (cluster === "seMetering") {
                            return Promise.resolve({divisor: 1, multiplier: 1});
                        }
                        return Promise.resolve({});
                    }),
                },
            ],
        });

    it("maps runningMode to runningState and keeps pi_heating_demand on native scale", async () => {
        const device = createDevice();
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee.find((c) => c.cluster === "hvacThermostat" && c.type.includes("attributeReport"));

        // biome-ignore lint/style/noNonNullAssertion: converter exists for this definition
        const payload = converter!.convert(
            definition,
            {
                data: {runningMode: 0x10, pIHeatingDemand: 63},
                endpoint: device.getEndpoint(1),
                device,
                meta: {},
                groupID: null,
                type: "attributeReport",
                cluster: "hvacThermostat",
                linkquality: 0,
            },
            null,
            {},
            {
                state: {},
                device,
                deviceExposesChanged: () => {},
            } satisfies Fz.Meta,
        );

        expect(payload.running_state).toBe("idle");
        expect(payload.pi_heating_demand).toBe(63);
    });

    it("configures reads for duty_cycle and avoids reading pIHeatingDemand", async () => {
        const device = createDevice();
        const coordinator = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1);
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(1);
        endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {
            acCurrentDivisor: 1,
            acCurrentMultiplier: 1,
            acPowerDivisor: 1,
            acPowerMultiplier: 1,
        });
        endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 1, multiplier: 1});

        await definition.configure?.(device, coordinator, definition);

        const readCalls = endpoint.read.mock.calls as [string, Array<string | number>][];
        expect(readCalls.some((call) => call[0] === "hvacThermostat" && call[1].includes(0x8007))).toBeTruthy();
        expect(readCalls.some((call) => call[0] === "hvacThermostat" && call[1].includes("pIHeatingDemand"))).toBeFalsy();
    });

    it("writes pi_heating_demand and duty_cycle via thermostat cluster attributes", async () => {
        const device = createDevice();
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(1);
        const meta: Tz.Meta = {
            state: {},
            device,
            message: {},
            mapped: definition,
            options: {},
            publish: () => {},
            endpoint_name: null,
        };

        const piHeatingDemand = definition.toZigbee.find((converter) => converter.key.includes("pi_heating_demand"));
        const dutyCycle = definition.toZigbee.find((converter) => converter.key.includes("duty_cycle"));

        expect(piHeatingDemand?.convertSet).toBeDefined();
        expect(dutyCycle?.convertSet).toBeDefined();

        await piHeatingDemand.convertSet(endpoint, "pi_heating_demand", 55, meta);
        await dutyCycle.convertSet(endpoint, "duty_cycle", 10, meta);

        const writeCalls = endpoint.write.mock.calls as [string, Record<number, {value: number; type: number}>][];
        expect(
            writeCalls.some((call) => call[0] === "hvacThermostat" && call[1][0x0008]?.value === 55 && call[1][0x0008]?.type === Zcl.DataType.UINT8),
        ).toBeTruthy();
        expect(
            writeCalls.some((call) => call[0] === "hvacThermostat" && call[1][0x8007]?.value === 10 && call[1][0x8007]?.type === Zcl.DataType.UINT8),
        ).toBeTruthy();
    });
});
