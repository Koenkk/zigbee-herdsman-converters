import {beforeEach, describe, expect, it} from "vitest";
import {fromZigbee, numericAttributes2Payload, type TrvScheduleConfig, trv} from "../src/lib/lumi";
import * as globalStore from "../src/lib/store";
import type {Definition, Fz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("lib/lumi", () => {
    describe("ZNCLBL01LM terminal position readback", () => {
        const znclbl01lmDefinition = {model: "ZNCLBL01LM"} as Definition;

        const createCurtainMessage = () => {
            const device = mockDevice({modelID: "lumi.curtain.acn003", endpoints: [{ID: 1}]});
            const msg = {data: {}, device, endpoint: device.endpoints[0]} as Fz.Message<"manuSpecificLumi", undefined, "attributeReport">;

            return {device, msg};
        };

        beforeEach(() => {
            globalStore.clear();
        });

        it.each([
            {invert_cover: false, attr107Position: 99, expectedPosition: 99, expectedState: "OPEN"},
            {invert_cover: true, attr107Position: 1, expectedPosition: 99, expectedState: "CLOSE"},
        ])("uses attr 107 for movement updates when invert_cover=$invert_cover", async ({
            invert_cover,
            attr107Position,
            expectedPosition,
            expectedState,
        }) => {
            const {msg} = createCurtainMessage();

            const payload = await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {107: attr107Position});

            expect(payload).toStrictEqual({position: expectedPosition, state: expectedState});
        });

        it.each([
            {invert_cover: false, staleTerminalPosition: 99},
            {invert_cover: true, staleTerminalPosition: 1},
        ])("ignores attr 107 in a same-message stop payload when invert_cover=$invert_cover", async ({invert_cover, staleTerminalPosition}) => {
            const {device, msg} = createCurtainMessage();

            const stoppedPayload = await numericAttributes2Payload(
                msg,
                {} as Fz.Meta,
                znclbl01lmDefinition,
                {invert_cover},
                {107: staleTerminalPosition, 1057: 2},
            );

            expect(stoppedPayload).toMatchObject({motor_state: "stopped", running: false});
            expect(stoppedPayload).not.toHaveProperty("position");
            expect(device.endpoints[0].read).toHaveBeenCalledWith("closuresWindowCovering", ["currentPositionLiftPercentage"]);

            const stalePayload = await numericAttributes2Payload(
                msg,
                {} as Fz.Meta,
                znclbl01lmDefinition,
                {invert_cover},
                {107: staleTerminalPosition},
            );

            expect(stalePayload).toStrictEqual({});
        });

        it("reads final position only when changing to stopped", async () => {
            const {device, msg} = createCurtainMessage();

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover: false}, {1057: 2});

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover: false}, {1057: 2});

            expect(device.endpoints[0].read).toHaveBeenCalledTimes(1);
        });

        it.each([
            {
                invert_cover: false,
                runningStateValue: 1,
                resumedAttr107Position: 80,
                expectedPayload: {position: 80, state: "OPEN", motor_state: "opening", running: true},
            },
            {
                invert_cover: true,
                runningStateValue: 0,
                resumedAttr107Position: 20,
                expectedPayload: {position: 80, state: "CLOSE", motor_state: "opening", running: true},
            },
        ])("uses attr 107 in the first same-message resume payload when invert_cover=$invert_cover", async ({
            invert_cover,
            runningStateValue,
            resumedAttr107Position,
            expectedPayload,
        }) => {
            const {device, msg} = createCurtainMessage();

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1057: 2});

            const resumedPayload = await numericAttributes2Payload(
                msg,
                {} as Fz.Meta,
                znclbl01lmDefinition,
                {invert_cover},
                {107: resumedAttr107Position, 1057: runningStateValue},
            );

            expect(resumedPayload).toStrictEqual(expectedPayload);
            expect(device.endpoints[0].read).toHaveBeenCalledTimes(1);
        });

        it.each([
            {
                invert_cover: false,
                readbackPosition: 37,
                staleTerminalPosition: 99,
                expectedReadbackPayload: {position: 37, state: "OPEN"},
            },
            {
                invert_cover: true,
                readbackPosition: 37,
                staleTerminalPosition: 1,
                expectedReadbackPayload: {position: 63, state: "CLOSE"},
            },
        ])("keeps attr 107 ignored after readback while stopped when invert_cover=$invert_cover", async ({
            invert_cover,
            readbackPosition,
            staleTerminalPosition,
            expectedReadbackPayload,
        }) => {
            const {device, msg} = createCurtainMessage();

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1057: 2});

            const readbackPayload = fromZigbee.lumi_curtain_position_tilt.convert(
                znclbl01lmDefinition,
                {
                    data: {currentPositionLiftPercentage: readbackPosition},
                    endpoint: device.endpoints[0],
                } as Fz.Message<"closuresWindowCovering", undefined, "readResponse">,
                null,
                {invert_cover},
                {} as Fz.Meta,
            );

            expect(readbackPayload).toStrictEqual(expectedReadbackPayload);

            const lateAttr107Payload = await numericAttributes2Payload(
                msg,
                {} as Fz.Meta,
                znclbl01lmDefinition,
                {invert_cover},
                {107: staleTerminalPosition},
            );

            expect(lateAttr107Payload).toStrictEqual({});
        });

        it.each([
            {invert_cover: false, runningStateValue: 1, resumedAttr107Position: 99, expectedPosition: 99, expectedState: "OPEN"},
            {invert_cover: true, runningStateValue: 0, resumedAttr107Position: 1, expectedPosition: 99, expectedState: "CLOSE"},
        ])("uses attr 107 again after a later resume when invert_cover=$invert_cover", async ({
            invert_cover,
            runningStateValue,
            resumedAttr107Position,
            expectedPosition,
            expectedState,
        }) => {
            const {msg} = createCurtainMessage();

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1057: 2});

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1057: runningStateValue});

            const resumedPayload = await numericAttributes2Payload(
                msg,
                {} as Fz.Meta,
                znclbl01lmDefinition,
                {invert_cover},
                {107: resumedAttr107Position},
            );

            expect(resumedPayload).toStrictEqual({position: expectedPosition, state: expectedState});
        });
    });

    describe("trv", () => {
        const factoryDefaultScheduleData = "043e01e0000009600438000006a405640000089881e000000898";
        const factoryDefaultSchedule: TrvScheduleConfig = {
            days: ["mon", "tue", "wed", "thu", "fri"],
            events: [
                {time: 480, temperature: 24},
                {time: 1080, temperature: 17},
                {time: 1380, temperature: 22},
                {time: 480, temperature: 22},
            ],
        };

        describe(trv.decodePreset, () => {
            it("decodes setup mode", () => {
                const preset = trv.decodePreset(3);

                expect(preset).toEqual({
                    setup: true,
                    preset: undefined,
                });
            });

            it("decodes user preset", () => {
                const preset = trv.decodePreset(0);

                expect(preset).toEqual({
                    setup: false,
                    preset: "manual",
                });
            });
        });

        describe(trv.decodeHeartbeat, () => {
            // Samples copied from the debug logs, e.g., Received Zigbee message from 'Thermostat1', type 'attributeReport', cluster 'manuSpecificLumi', data '{"247":{"data":[3,40,28,...
            const heartbeatSetup = Buffer.from([
                3, 40, 28, 5, 33, 3, 0, 10, 33, 18, 126, 13, 35, 25, 9, 0, 0, 17, 35, 1, 0, 0, 0, 101, 32, 3, 102, 41, 156, 9, 103, 41, 96, 9, 104,
                35, 0, 0, 0, 0, 105, 32, 100, 106, 32, 0,
            ]);
            const heartbeatNormalOperation = Buffer.from([
                3, 40, 23, 5, 33, 4, 0, 10, 33, 7, 15, 13, 35, 25, 8, 0, 0, 17, 35, 1, 0, 0, 0, 101, 32, 0, 102, 41, 118, 7, 103, 41, 108, 7, 104, 35,
                0, 0, 0, 0, 105, 32, 99, 106, 32, 0,
            ]);
            const heartbeatValveAlarm = Buffer.from([
                3, 40, 22, 5, 33, 4, 0, 10, 33, 7, 15, 13, 35, 25, 8, 0, 0, 17, 35, 1, 0, 0, 0, 101, 32, 0, 102, 41, 98, 7, 103, 41, 244, 1, 104, 35,
                1, 0, 0, 0, 105, 32, 96, 106, 32, 0,
            ]);

            it("decodes heartbeat in setup mode", () => {
                const heartbeat = trv.decodeHeartbeat(
                    // @ts-expect-error mock
                    {},
                    {},
                    heartbeatSetup,
                );

                expect(heartbeat).toEqual({
                    device_temperature: 28,
                    power_outage_count: 2,
                    firmware_version: "0.0.0_0925",
                    setup: true,
                    preset: undefined,
                    local_temperature: 24.6,
                    internal_heating_setpoint: 24,
                    valve_alarm: false,
                    battery: 100,
                });
            });

            it("decodes heartbeat in normal operation", () => {
                const heartbeat = trv.decodeHeartbeat(
                    // @ts-expect-error mock
                    {},
                    {},
                    heartbeatNormalOperation,
                );

                expect(heartbeat).toEqual({
                    device_temperature: 23,
                    power_outage_count: 3,
                    firmware_version: "0.0.0_0825",
                    setup: false,
                    preset: "manual",
                    local_temperature: 19.1,
                    internal_heating_setpoint: 19,
                    valve_alarm: false,
                    battery: 99,
                });
            });

            it("decodes valve alarm", () => {
                const heartbeat = trv.decodeHeartbeat(
                    // @ts-expect-error mock
                    {},
                    {},
                    heartbeatValveAlarm,
                );

                expect(heartbeat).toEqual(
                    expect.objectContaining({
                        valve_alarm: true,
                    }),
                );
            });
        });

        describe(trv.decodeSchedule, () => {
            it("reads schedule object from buffer", () => {
                const data = Buffer.from(factoryDefaultScheduleData, "hex");

                const schedule = trv.decodeSchedule(data);

                expect(schedule).toEqual(factoryDefaultSchedule);
            });
        });

        describe(trv.validateSchedule, () => {
            it("fails on empty events", () => {
                expect(() =>
                    trv.validateSchedule({
                        days: ["mon"],
                        events: [],
                    }),
                ).toThrowError(/must contain an array of 4/);
            });

            it("fails on insufficient number of events", () => {
                expect(() =>
                    trv.validateSchedule({
                        days: ["mon"],
                        events: [{time: 0, temperature: 0}],
                    }),
                ).toThrowError(/must contain an array of 4/);
            });

            it("fails on invalid event time type", () => {
                expect(() =>
                    trv.validateSchedule({
                        days: ["mon"],
                        events: [
                            {time: -1, temperature: 0},
                            {time: 0, temperature: 10},
                            {time: 0, temperature: 10},
                            {time: 0, temperature: 10},
                        ],
                    }),
                ).toThrowError(/Time must be a positive integer number/);
            });

            it("fails on invalid event temperature value", () => {
                expect(() =>
                    trv.validateSchedule({
                        days: ["mon"],
                        events: [
                            {time: 0, temperature: 4},
                            {time: 0, temperature: 10},
                            {time: 0, temperature: 10},
                            {time: 0, temperature: 10},
                        ],
                    }),
                ).toThrowError(/temperature must be between/);
            });

            it("fails on invalid event temperature value", () => {
                expect(() =>
                    trv.validateSchedule({
                        days: ["mon"],
                        events: [
                            {time: 0, temperature: 30.1},
                            {time: 0, temperature: 10},
                            {time: 0, temperature: 10},
                            {time: 0, temperature: 10},
                        ],
                    }),
                ).toThrowError(/temperature must be between/);
            });

            it("fails if any individual duration is less than 1 hour", () => {
                expect(() =>
                    trv.validateSchedule({
                        days: ["mon"],
                        events: [
                            {time: 0, temperature: 5},
                            {time: 59, temperature: 5},
                            {time: 5 * 60, temperature: 5},
                            {time: 23 * 60, temperature: 5},
                        ],
                    }),
                ).toThrowError(/at least 1 hour apart/);
            });

            it("fails if minimum total duration is more than 24 hours", () => {
                expect(() =>
                    trv.validateSchedule({
                        days: ["mon"],
                        events: [
                            {time: 8, temperature: 5},
                            {time: 10 * 60, temperature: 5},
                            {time: 23 * 60, temperature: 5},
                            {time: 9 * 60, temperature: 5},
                        ],
                    }),
                ).toThrowError(/at most 24 hours apart/);
            });
        });

        describe(trv.encodeSchedule, () => {
            it("converts schedule object to buffer", () => {
                const buffer = trv.encodeSchedule(factoryDefaultSchedule);

                expect(buffer).toEqual(Buffer.from(factoryDefaultScheduleData, "hex"));
            });
        });

        describe(trv.stringifySchedule, () => {
            it("converts schedule object to human-readable string pattern", () => {
                const schedule = trv.stringifySchedule(factoryDefaultSchedule);

                expect(schedule).toEqual("mon,tue,wed,thu,fri|8:00,24.0|18:00,17.0|23:00,22.0|8:00,22.0");
            });
        });

        describe(trv.parseSchedule, () => {
            it("converts human-readable string pattern to schedule object", () => {
                const schedule = trv.parseSchedule("mon,tue,wed,thu,fri|8:00,24.0|18:00,17.0|23:00,22.0|8:00,22.0");

                expect(schedule).toEqual(factoryDefaultSchedule);
            });

            it("converts undefined value to empty schedule object", () => {
                const schedule = trv.parseSchedule(undefined);

                expect(schedule).toEqual({days: [], events: []});
            });

            it("converts empty string to empty schedule object", () => {
                const schedule = trv.parseSchedule("");

                expect(schedule).toEqual({days: [], events: []});
            });

            it("handles invalid time pattern", () => {
                expect(() => trv.parseSchedule("mon,tue,wed,thu,fri|8-00,24.0|18:00,17.0|23:00,22.0|8:00,22.0")).toThrowError(/Invalid time format/);
            });
        });

        describe("Feeder schedule", () => {
            it("Schedule 0 days", () => {
                const data = Buffer.from([0, 5, 43, 8, 0, 8, 200, 2, 47, 47]);
                const result = fromZigbee.lumi_feeder.convert(
                    null,
                    // @ts-expect-error mock
                    {data: {65521: data}},
                    null,
                    null,
                    null,
                );
                expect(result).toStrictEqual({schedule: []});
            });

            it("Schedule 1 day", () => {
                const data = Buffer.from([0, 5, 9, 8, 0, 8, 200, 10, 55, 70, 48, 49, 48, 49, 48, 49, 48, 48]);
                const result = fromZigbee.lumi_feeder.convert(
                    null,
                    // @ts-expect-error mock
                    {data: {65521: data}},
                    null,
                    null,
                    null,
                );
                expect(result).toStrictEqual({schedule: [{days: "everyday", hour: 1, minute: 1, size: 1}]});
            });
            it("Too small frame", () => {
                const data = Buffer.from([128, 2, 2, 48]);
                const result = fromZigbee.lumi_feeder.convert(
                    null,
                    // @ts-expect-error mock
                    {data: {65521: data}},
                    null,
                    null,
                    null,
                );
                expect(result).toStrictEqual({});
            });
        });
    });
});
