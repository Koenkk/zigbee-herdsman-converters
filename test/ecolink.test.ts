import {describe, expect, it, vi} from "vitest";
import * as fz from "../src/converters/fromZigbee";
import {findByDevice} from "../src/index";
import {repInterval} from "../src/lib/constants";
import type {Fz} from "../src/lib/types";
import {assertDefinition, mockDevice, reportingItem} from "./utils";

function contactSensor() {
    return mockDevice(
        {
            modelID: "4655BC0-R",
            manufacturerName: "Ecolink",
            powerSource: "Battery",
            endpoints: [{inputClusters: ["genPowerCfg", "msTemperatureMeasurement", "ssIasZone"]}],
        },
        "EndDevice",
    );
}

describe("Ecolink 4655BC0-R", () => {
    it("exposes battery percentage and voltage, configures voltage reporting, and preserves existing features", async () => {
        await assertDefinition({
            device: contactSensor(),
            meta: {battery: {voltageToPercentage: {min: 2100, max: 3000}}},
            fromZigbee: [fz.temperature, fz.ias_contact_alarm_1, expect.objectContaining({cluster: "genPowerCfg"})],
            toZigbee: ["battery", "voltage"],
            exposes: ["battery", "battery_low", "contact", "tamper", "temperature", "voltage"],
            bind: {1: ["msTemperatureMeasurement", "genPowerCfg"]},
            read: {1: [["genPowerCfg", ["batteryVoltage"]]]},
            write: {},
            configureReporting: {
                1: [
                    ["msTemperatureMeasurement", [reportingItem("measuredValue", 10, repInterval.HOUR, 100)]],
                    ["genPowerCfg", [reportingItem("batteryVoltage", repInterval.HOUR, repInterval.MAX, 10)]],
                ],
            },
        });
    });

    it.each(["attributeReport", "readResponse"] as const)("converts voltage to battery percentage for %s", async (type) => {
        const device = contactSensor();
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee.find((candidate) => candidate.cluster === "genPowerCfg" && candidate.type.includes(type));
        if (!converter) throw new Error("Missing Ecolink battery converter");

        for (const [batteryVoltage, battery] of [
            [20, 0],
            [21, 0],
            [28, 78],
            [30, 100],
            [32, 100],
        ]) {
            const message = {data: {batteryVoltage}, type, cluster: "genPowerCfg", endpoint: device.getEndpoint(1), device} as Fz.Message;
            expect(await converter.convert(definition, message, vi.fn(), {}, {device} as Fz.Meta)).toEqual({
                voltage: batteryVoltage * 100,
                battery,
            });
        }

        const invalidMessage = {data: {batteryVoltage: 255}, type, cluster: "genPowerCfg"} as Fz.Message;
        expect(await converter.convert(definition, invalidMessage, vi.fn(), {}, {device} as Fz.Meta)).toEqual({});
    });

    it("can request voltage even when the device rejects the percentage attribute", async () => {
        const device = contactSensor();
        const endpoint = device.getEndpoint(1);
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((candidate) => candidate.key.includes("battery"));
        if (!converter?.convertGet) throw new Error("Missing Ecolink battery getter");

        vi.mocked(endpoint.read).mockRejectedValueOnce(new Error("UNSUPPORTED_ATTRIBUTE")).mockResolvedValueOnce({batteryVoltage: 28});

        await converter.convertGet(endpoint, "battery", {device, mapped: definition} as never);

        expect(endpoint.read).toHaveBeenNthCalledWith(1, "genPowerCfg", ["batteryPercentageRemaining"]);
        expect(endpoint.read).toHaveBeenNthCalledWith(2, "genPowerCfg", ["batteryVoltage"]);
    });
});
