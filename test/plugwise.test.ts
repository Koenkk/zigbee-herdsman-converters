import {beforeEach, describe, expect, it, vi} from "vitest";
import type {Models as ZHModels} from "zigbee-herdsman";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import type {Definition, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

const PLUGWISE_MFG = {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V};

describe("Plugwise 170-01 (Emma)", () => {
    let emma: Definition;

    beforeEach(async () => {
        const device = mockDevice({modelID: "170-01", endpoints: []});
        emma = await findByDevice(device);
    });

    describe("manufacturer-specific OpenTherm attributes", () => {
        let meta: Tz.Meta;
        let endpoint: ZHModels.Endpoint;
        let writeFn: ReturnType<typeof vi.fn>;
        let readFn: ReturnType<typeof vi.fn>;

        // Each writable mfg attribute: the exposed property, the underlying cluster
        // attribute, the user-facing set value, and the scaled value written on the wire.
        const cases = [
            {property: "external_heat_demand", attribute: "plugwiseExternalHeatDemand", input: 60, raw: 6000},
            {property: "external_heat_demand_timeout", attribute: "plugwiseExternalHeatDemandTimeout", input: 600, raw: 600},
            {property: "max_dhw_setpoint", attribute: "plugwiseMaxDhwSetpoint", input: 65, raw: 6500},
            {property: "max_boiler_setpoint", attribute: "plugwiseMaxBoilerSetpoint", input: 75, raw: 7500},
        ];

        beforeEach(() => {
            writeFn = vi.fn();
            readFn = vi.fn();
            // endpoint_name (!= undefined) makes determineEndpoint return this entity directly.
            endpoint = {write: writeFn, read: readFn} as unknown as ZHModels.Endpoint;
            meta = {endpoint_name: null} as unknown as Tz.Meta;
        });

        it.each(cases)("$property convertSet writes the scaled value with the Plugwise manufacturer code", async ({
            property,
            attribute,
            input,
            raw,
        }) => {
            // Arrange
            const converter = emma.toZigbee?.find((c) => c.key.includes(property));
            if (!converter?.convertSet) throw new Error(`No toZigbee convertSet for '${property}'`);

            // Act
            const result = await converter.convertSet(endpoint, property, input, meta);

            // Assert
            expect(writeFn).toHaveBeenCalledTimes(1);
            expect(writeFn).toHaveBeenCalledWith("hvacThermostat", {[attribute]: raw}, PLUGWISE_MFG);
            expect(result).toStrictEqual({state: {[property]: input}});
        });

        it.each(cases)("$property convertGet reads the attribute with the Plugwise manufacturer code", async ({property, attribute}) => {
            // Arrange
            const converter = emma.toZigbee?.find((c) => c.key.includes(property));
            if (!converter?.convertGet) throw new Error(`No toZigbee convertGet for '${property}'`);

            // Act
            await converter.convertGet(endpoint, property, meta);

            // Assert
            expect(readFn).toHaveBeenCalledTimes(1);
            expect(readFn).toHaveBeenCalledWith("hvacThermostat", [attribute], PLUGWISE_MFG);
        });

        describe("battery_type (Plugwise genPowerCfg mfg attribute)", () => {
            it.each([
                ["alkaline", 0x00],
                ["nimh", 0x01],
            ])("convertSet '%s' writes value %i to genPowerCfg with the Plugwise manufacturer code", async (value, raw) => {
                // Arrange
                const converter = emma.toZigbee?.find((c) => c.key.includes("battery_type"));
                if (!converter?.convertSet) throw new Error("No toZigbee convertSet for 'battery_type'");

                // Act
                await converter.convertSet(endpoint, "battery_type", value, meta);

                // Assert
                expect(writeFn).toHaveBeenCalledTimes(1);
                expect(writeFn).toHaveBeenCalledWith("genPowerCfg", {plugwiseBatteryType: raw}, PLUGWISE_MFG);
            });

            it("convertGet reads battery_type with the Plugwise manufacturer code", async () => {
                // Arrange
                const converter = emma.toZigbee?.find((c) => c.key.includes("battery_type"));
                if (!converter?.convertGet) throw new Error("No toZigbee convertGet for 'battery_type'");

                // Act
                await converter.convertGet(endpoint, "battery_type", meta);

                // Assert
                expect(readFn).toHaveBeenCalledTimes(1);
                expect(readFn).toHaveBeenCalledWith("genPowerCfg", ["plugwiseBatteryType"], PLUGWISE_MFG);
            });
        });
    });

    describe("product_variant (genBasic productCode 0x000A)", () => {
        const findGenBasicConverter = () => emma.fromZigbee?.find((c) => c.cluster === "genBasic" && c.type.includes("readResponse"));

        it("registers a genBasic fromZigbee converter for product_variant", () => {
            expect(findGenBasicConverter()).toBeDefined();
        });

        it.each([
            ["Buffer", Buffer.from("OpenTherm", "utf8"), "OpenTherm"],
            ["string", "Wireless", "Wireless"],
        ])("fromZigbee converts a %s productCode into product_variant", (_label, raw, expected) => {
            // Arrange
            const converter = findGenBasicConverter();
            if (!converter?.convert) throw new Error("No genBasic fromZigbee convert for product_variant");

            // Act
            const result = converter.convert(emma, {data: {productCode: raw}} as never, () => {}, {}, {} as never);

            // Assert
            expect(result).toStrictEqual({product_variant: expected});
        });

        it("fromZigbee ignores messages without a productCode attribute", () => {
            // Arrange
            const converter = findGenBasicConverter();
            if (!converter?.convert) throw new Error("No genBasic fromZigbee convert for product_variant");

            // Act
            const result = converter.convert(emma, {data: {}} as never, () => {}, {}, {} as never);

            // Assert
            expect(result).toBeUndefined();
        });

        it("convertGet (read button) reads genBasic productCode", async () => {
            // Arrange
            const readFn = vi.fn();
            const endpoint = {read: readFn} as unknown as ZHModels.Endpoint;
            const converter = emma.toZigbee?.find((c) => c.key.includes("product_variant"));
            if (!converter?.convertGet) throw new Error("No toZigbee convertGet for 'product_variant'");

            // Act
            await converter.convertGet(endpoint, "product_variant", {} as unknown as Tz.Meta);

            // Assert
            expect(readFn).toHaveBeenCalledTimes(1);
            expect(readFn).toHaveBeenCalledWith("genBasic", ["productCode"]);
        });
    });
});
