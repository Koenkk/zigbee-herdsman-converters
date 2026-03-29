import {beforeEach, describe, expect, test, vi} from "vitest";
import * as zhc from "../src";
import type {Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

// Tests for the combined hiveSLRThermostat converter, which writes
// system_mode, temperature_setpoint_hold, and occupied_heating_setpoint
// atomically per the SLR2 device documentation:
// https://www.zigbee2mqtt.io/devices/SLR2.html

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

    // -------------------------------------------------------------------------
    // Protocol rules from SLR2 documentation:
    //   heat:              system_mode=heat(4), hold=1, setpoint required
    //   off:               system_mode=off(0),  hold=0
    //   auto (schedule):   system_mode=auto(1), hold=0
    //   emergency_heating: system_mode=emergency_heating(5), hold=1, setpoint+duration required
    //   INVALID:           off + hold=1
    //   All attributes must be sent as a single command.
    // -------------------------------------------------------------------------

    describe("all attributes are written in a single ZCL transaction", () => {
        test("system_mode, hold, and setpoint are sent in one write call", async () => {
            mockMeta.state = {occupied_heating_setpoint: 20};
            const converter = findConverter("system_mode");
            await converter.convertSet?.(device.endpoints[0], "system_mode", "heat", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledTimes(1);
            expect(device.endpoints[0].write).toHaveBeenCalledWith("hvacThermostat", expect.objectContaining({systemMode: 4, tempSetpointHold: 1}), {
                disableDefaultResponse: true,
            });
        });
    });

    describe("heat mode requires hold=1 and includes setpoint", () => {
        test("via system_mode", async () => {
            mockMeta.state = {occupied_heating_setpoint: 20};
            const converter = findConverter("system_mode");
            const result = await converter.convertSet?.(device.endpoints[0], "system_mode", "heat", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 2000},
                {disableDefaultResponse: true},
            );
            expect(result?.state).toStrictEqual({
                system_mode: "heat",
                temperature_setpoint_hold: true,
                occupied_heating_setpoint: 20,
            });
        });

        test("via occupied_heating_setpoint", async () => {
            const converter = findConverter("occupied_heating_setpoint");
            const result = await converter.convertSet?.(device.endpoints[0], "occupied_heating_setpoint", 21, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 2100},
                {disableDefaultResponse: true},
            );
            expect(result?.state).toStrictEqual({
                system_mode: "heat",
                temperature_setpoint_hold: true,
                occupied_heating_setpoint: 21,
            });
        });

        test("via temperature_setpoint_hold", async () => {
            mockMeta.state = {occupied_heating_setpoint: 19};
            const converter = findConverter("temperature_setpoint_hold");
            const result = await converter.convertSet?.(device.endpoints[0], "temperature_setpoint_hold", true, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 1900},
                {disableDefaultResponse: true},
            );
            expect(result?.state).toStrictEqual({
                system_mode: "heat",
                temperature_setpoint_hold: true,
                occupied_heating_setpoint: 19,
            });
        });
    });

    describe("off mode requires hold=0", () => {
        test("via system_mode", async () => {
            const converter = findConverter("system_mode");
            const result = await converter.convertSet?.(device.endpoints[0], "system_mode", "off", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 0, tempSetpointHold: 0},
                {disableDefaultResponse: true},
            );
            expect(result?.state).toStrictEqual({
                system_mode: "off",
                temperature_setpoint_hold: false,
            });
        });
    });

    describe("auto mode requires hold=0", () => {
        test("via system_mode", async () => {
            const converter = findConverter("system_mode");
            const result = await converter.convertSet?.(device.endpoints[0], "system_mode", "auto", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 1, tempSetpointHold: 0},
                {disableDefaultResponse: true},
            );
            expect(result?.state).toStrictEqual({
                system_mode: "auto",
                temperature_setpoint_hold: false,
            });
        });

        test("disabling hold switches to auto (schedule) mode", async () => {
            mockMeta.state = {system_mode: "heat"};
            const converter = findConverter("temperature_setpoint_hold");
            const result = await converter.convertSet?.(device.endpoints[0], "temperature_setpoint_hold", false, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 1, tempSetpointHold: 0},
                {disableDefaultResponse: true},
            );
            expect(result?.state).toStrictEqual({
                system_mode: "auto",
                temperature_setpoint_hold: false,
            });
        });
    });

    describe("emergency_heating requires hold=1 and includes setpoint", () => {
        test("via system_mode", async () => {
            mockMeta.state = {occupied_heating_setpoint: 18};
            const converter = findConverter("system_mode");
            const result = await converter.convertSet?.(device.endpoints[0], "system_mode", "emergency_heating", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 5, tempSetpointHold: 1, occupiedHeatingSetpoint: 1800},
                {disableDefaultResponse: true},
            );
            expect(result?.state).toStrictEqual({
                system_mode: "emergency_heating",
                temperature_setpoint_hold: true,
                occupied_heating_setpoint: 18,
            });
        });
    });

    describe("off + hold=1 is never produced", () => {
        test("setting setpoint when off switches to heat", async () => {
            mockMeta.state = {system_mode: "off"};
            const converter = findConverter("occupied_heating_setpoint");
            const result = await converter.convertSet?.(device.endpoints[0], "occupied_heating_setpoint", 22, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 2200},
                {disableDefaultResponse: true},
            );
            expect(result?.state?.system_mode).toBe("heat");
        });

        test("enabling hold when off switches to heat", async () => {
            mockMeta.state = {system_mode: "off", occupied_heating_setpoint: 20};
            const converter = findConverter("temperature_setpoint_hold");
            const result = await converter.convertSet?.(device.endpoints[0], "temperature_setpoint_hold", true, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 2000},
                {disableDefaultResponse: true},
            );
            expect(result?.state?.system_mode).toBe("heat");
        });
    });

    describe("setting setpoint always enters heat mode", () => {
        test("from auto mode", async () => {
            mockMeta.state = {system_mode: "auto"};
            const converter = findConverter("occupied_heating_setpoint");
            const result = await converter.convertSet?.(device.endpoints[0], "occupied_heating_setpoint", 18, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 1800},
                {disableDefaultResponse: true},
            );
            expect(result?.state?.system_mode).toBe("heat");
        });

        test("from no prior state", async () => {
            const converter = findConverter("occupied_heating_setpoint");
            const result = await converter.convertSet?.(device.endpoints[0], "occupied_heating_setpoint", 25, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1, occupiedHeatingSetpoint: 2500},
                {disableDefaultResponse: true},
            );
            expect(result?.state?.system_mode).toBe("heat");
        });
    });

    describe("setpoint encoding", () => {
        test("temperature is encoded as centidegrees", async () => {
            const converter = findConverter("occupied_heating_setpoint");
            await converter.convertSet?.(device.endpoints[0], "occupied_heating_setpoint", 20.5, mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith("hvacThermostat", expect.objectContaining({occupiedHeatingSetpoint: 2050}), {
                disableDefaultResponse: true,
            });
        });
    });

    describe("heat mode without prior setpoint omits occupiedHeatingSetpoint", () => {
        test("only system_mode and hold are written", async () => {
            const converter = findConverter("system_mode");
            await converter.convertSet?.(device.endpoints[0], "system_mode", "heat", mockMeta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "hvacThermostat",
                {systemMode: 4, tempSetpointHold: 1},
                {disableDefaultResponse: true},
            );
        });
    });

    describe("convertGet reads individual attributes", () => {
        test("system_mode", async () => {
            const converter = findConverter("system_mode");
            await converter.convertGet?.(device.endpoints[0], "system_mode", mockMeta);
            expect(device.endpoints[0].read).toHaveBeenCalledWith("hvacThermostat", ["systemMode"]);
        });

        test("occupied_heating_setpoint", async () => {
            const converter = findConverter("occupied_heating_setpoint");
            await converter.convertGet?.(device.endpoints[0], "occupied_heating_setpoint", mockMeta);
            expect(device.endpoints[0].read).toHaveBeenCalledWith("hvacThermostat", ["occupiedHeatingSetpoint"]);
        });

        test("temperature_setpoint_hold", async () => {
            const converter = findConverter("temperature_setpoint_hold");
            await converter.convertGet?.(device.endpoints[0], "temperature_setpoint_hold", mockMeta);
            expect(device.endpoints[0].read).toHaveBeenCalledWith("hvacThermostat", ["tempSetpointHold"]);
        });
    });
});
