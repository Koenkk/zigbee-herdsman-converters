import {beforeEach, describe, expect, test, vi} from "vitest";
import * as zhc from "../src";
import type {Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Hive SLR thermostat converter", () => {
    let device: ReturnType<typeof mockDevice>;
    let definition: Awaited<ReturnType<typeof zhc.findByDevice>>;
    let mockMeta: Tz.Meta;

    beforeEach(async () => {
        vi.clearAllMocks();

        device = mockDevice({
            modelID: "SLR2",
            manufacturerName: "Computime",
            endpoints: [
                {ID: 5, inputClusters: ["hvacThermostat"]},
                {ID: 6, inputClusters: ["hvacThermostat"]},
            ],
        });

        definition = await zhc.findByDevice(device);

        mockMeta = {
            state: {},
            device,
            message: null,
            mapped: definition,
            options: null,
            publish: null,
            endpoint_name: "heat",
        };
    });

    function findConverter(key: string) {
        const converter = definition?.toZigbee.find((c) => c.key.includes(key));
        expect(converter).toBeDefined();
        return converter as Tz.Converter;
    }

    describe("system_mode", () => {
        test("setting heat writes system_mode and setpoint_hold atomically", async () => {
            mockMeta.state = {occupied_heating_setpoint: 20};
            const converter = findConverter("system_mode");
            const result = await converter.convertSet?.(device.endpoints[0], "system_mode", "heat", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 2000},
                {disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({
                state: {system_mode: "heat", temperature_setpoint_hold: true, occupied_heating_setpoint: 20},
            });
        });

        test("setting off writes system_mode and setpoint_hold without setpoint", async () => {
            const converter = findConverter("system_mode");
            const result = await converter.convertSet?.(device.endpoints[0], "system_mode", "off", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 0, tempSetpointHold: 0},
                {disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({
                state: {system_mode: "off", temperature_setpoint_hold: false},
            });
        });

        test("setting auto writes system_mode and setpoint_hold without setpoint", async () => {
            const converter = findConverter("system_mode");
            const result = await converter.convertSet?.(device.endpoints[0], "system_mode", "auto", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 1, tempSetpointHold: 0},
                {disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({
                state: {system_mode: "auto", temperature_setpoint_hold: false},
            });
        });

        test("setting emergency_heating writes with setpoint_hold enabled", async () => {
            mockMeta.state = {occupied_heating_setpoint: 18};
            const converter = findConverter("system_mode");
            const result = await converter.convertSet?.(device.endpoints[0], "system_mode", "emergency_heating", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 5, tempSetpointHold: 1, occupiedHeatingSetpoint: 1800},
                {disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({
                state: {system_mode: "emergency_heating", temperature_setpoint_hold: true, occupied_heating_setpoint: 18},
            });
        });

        test("setting heat without prior setpoint omits occupiedHeatingSetpoint", async () => {
            const converter = findConverter("system_mode");
            await converter.convertSet?.(device.endpoints[0], "system_mode", "heat", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1},
                {disableDefaultResponse: true},
            );
        });
    });

    describe("occupied_heating_setpoint", () => {
        test("setting setpoint writes with heat mode and setpoint_hold", async () => {
            const converter = findConverter("occupied_heating_setpoint");
            const result = await converter.convertSet?.(device.endpoints[0], "occupied_heating_setpoint", 21, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 2100},
                {disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({
                state: {system_mode: "heat", temperature_setpoint_hold: true, occupied_heating_setpoint: 21},
            });
        });

        test("setting setpoint preserves current system_mode if already heat", async () => {
            mockMeta.state = {system_mode: "heat"};
            const converter = findConverter("occupied_heating_setpoint");
            await converter.convertSet?.(device.endpoints[0], "occupied_heating_setpoint", 22.5, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 2250},
                {disableDefaultResponse: true},
            );
        });

        test("setting setpoint rounds to nearest integer centidegree", async () => {
            const converter = findConverter("occupied_heating_setpoint");
            await converter.convertSet?.(device.endpoints[0], "occupied_heating_setpoint", 20.5, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 2050},
                {disableDefaultResponse: true},
            );
        });
    });

    describe("temperature_setpoint_hold", () => {
        test("enabling hold writes with current mode and setpoint", async () => {
            mockMeta.state = {system_mode: "heat", occupied_heating_setpoint: 19};
            const converter = findConverter("temperature_setpoint_hold");
            const result = await converter.convertSet?.(device.endpoints[0], "temperature_setpoint_hold", true, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 1900},
                {disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({
                state: {system_mode: "heat", temperature_setpoint_hold: true, occupied_heating_setpoint: 19},
            });
        });

        test("disabling hold writes with current mode", async () => {
            mockMeta.state = {system_mode: "auto"};
            const converter = findConverter("temperature_setpoint_hold");
            const result = await converter.convertSet?.(device.endpoints[0], "temperature_setpoint_hold", false, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 1, tempSetpointHold: 0},
                {disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({
                state: {system_mode: "auto", temperature_setpoint_hold: false},
            });
        });

        test("enabling hold defaults to heat mode when no current mode", async () => {
            const converter = findConverter("temperature_setpoint_hold");
            const result = await converter.convertSet?.(device.endpoints[0], "temperature_setpoint_hold", true, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1},
                {disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({
                state: {system_mode: "heat", temperature_setpoint_hold: true},
            });
        });
    });

    describe("convertGet", () => {
        test("reads system_mode", async () => {
            const converter = findConverter("system_mode");
            await converter.convertGet?.(device.endpoints[0], "system_mode", mockMeta);
            expect(device.endpoints[0].read).toHaveBeenCalledWith("hvacThermostat", ["systemMode"]);
        });

        test("reads occupied_heating_setpoint", async () => {
            const converter = findConverter("occupied_heating_setpoint");
            await converter.convertGet?.(device.endpoints[0], "occupied_heating_setpoint", mockMeta);
            expect(device.endpoints[0].read).toHaveBeenCalledWith("hvacThermostat", ["occupiedHeatingSetpoint"]);
        });

        test("reads temperature_setpoint_hold", async () => {
            const converter = findConverter("temperature_setpoint_hold");
            await converter.convertGet?.(device.endpoints[0], "temperature_setpoint_hold", mockMeta);
            expect(device.endpoints[0].read).toHaveBeenCalledWith("hvacThermostat", ["tempSetpointHold"]);
        });
    });
});
