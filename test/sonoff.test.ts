import type {Mock} from "vitest";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {Models as ZHModels} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import type {Definition, Fz, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

interface State {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    readonly weekly_schedule_sunday?: string;
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    readonly weekly_schedule_monday?: string;
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    readonly weekly_schedule_tuesday?: string;
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    readonly weekly_schedule_wednesday?: string;
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    readonly weekly_schedule_thursday?: string;
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    readonly weekly_schedule_friday?: string;
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    readonly weekly_schedule_saturday?: string;
}

describe("Sonoff TRVZB", () => {
    let trv: Definition;

    beforeEach(async () => {
        const device = mockDevice({modelID: "TRVZB", endpoints: []});

        trv = await findByDevice(device);
    });

    describe("weekly schedule", () => {
        describe("fromZigbee", () => {
            let fzConverter: Fz.Converter;
            let meta: Fz.Meta;

            beforeEach(() => {
                fzConverter = trv.fromZigbee.find((c) => c.cluster === "hvacThermostat" && c.type.includes("commandGetWeeklyScheduleRsp"));

                meta = {
                    state: {},
                    device: null,
                    deviceExposesChanged: null,
                };
            });

            const days = [
                {dayofweek: 0x01, day: "sunday"},
                {dayofweek: 0x02, day: "monday"},
                {dayofweek: 0x04, day: "tuesday"},
                {dayofweek: 0x08, day: "wednesday"},
                {dayofweek: 0x10, day: "thursday"},
                {dayofweek: 0x20, day: "friday"},
                {dayofweek: 0x40, day: "saturday"},
            ];

            describe.each(days)("when a commandGetWeeklyScheduleRsp message is received for $day", ({dayofweek, day}) => {
                it("should set state", () => {
                    const msg: Fz.Message = {
                        data: {
                            dayofweek: dayofweek,
                            transitions: [
                                {
                                    transitionTime: 0,
                                    heatSetpoint: 500,
                                },
                                {
                                    transitionTime: 90,
                                    heatSetpoint: 1000,
                                },
                            ],
                        },
                        endpoint: null,
                        device: null,
                        meta: null,
                        groupID: null,
                        type: "commandGetWeeklyScheduleRsp",
                        cluster: "hvacThermostat",
                        linkquality: 0,
                    };

                    const state = fzConverter.convert(trv, msg, null, null, meta) as State;

                    expect(state).toEqual({
                        [`weekly_schedule_${day}`]: "00:00/5 01:30/10",
                    });
                });
            });

            describe("when multiple commandGetWeeklyScheduleRsp messages are received for different days", () => {
                let state1: State;
                let state2: State;

                beforeEach(() => {
                    const msg1: Fz.Message = {
                        data: {
                            dayofweek: 0x01,
                            transitions: [
                                {
                                    transitionTime: 0,
                                    heatSetpoint: 500,
                                },
                                {
                                    transitionTime: 90,
                                    heatSetpoint: 1000,
                                },
                            ],
                        },
                        endpoint: null,
                        device: null,
                        meta: null,
                        groupID: null,
                        type: "commandGetWeeklyScheduleRsp",
                        cluster: "hvacThermostat",
                        linkquality: 0,
                    };

                    const msg2: Fz.Message = {
                        data: {
                            dayofweek: 0x02,
                            transitions: [
                                {
                                    transitionTime: 60,
                                    heatSetpoint: 550,
                                },
                                {
                                    transitionTime: 180,
                                    heatSetpoint: 1250,
                                },
                            ],
                        },
                        endpoint: null,
                        device: null,
                        meta: null,
                        groupID: null,
                        type: "commandGetWeeklyScheduleRsp",
                        cluster: "hvacThermostat",
                        linkquality: 0,
                    };

                    state1 = fzConverter.convert(trv, msg1, null, null, meta) as State;
                    state2 = fzConverter.convert(trv, msg2, null, null, meta) as State;
                });

                it("should return individual day schedules", () => {
                    expect(state1).toEqual({
                        weekly_schedule_sunday: "00:00/5 01:30/10",
                    });
                    expect(state2).toEqual({
                        weekly_schedule_monday: "01:00/5.5 03:00/12.5",
                    });
                });
            });
        });

        describe("toZigbee", () => {
            let tzConverter: Tz.Converter;
            let meta: Tz.Meta;
            let commandFn: Mock;
            let endpoint: ZHModels.Endpoint;

            const invalidTransitions = [
                {transition: "", description: "empty string"},
                {transition: "0:00/5", description: "hours not two digits"},
                {transition: "24:00/5", description: "hours greater than 23"},
                {transition: "23:0/5", description: "minutes not two digits"},
                {transition: "23:60/5", description: "minutes greater than 59"},
                {transition: "23:59", description: "missing slash"},
                {transition: "23:59/", description: "missing temperature"},
                {transition: "23:59/-1", description: "negative temperature"},
                {transition: "23:59/523:59/5", description: "missing space separator"},
                {transition: "00:00/10.1", description: "temperature decimal point is not 0.5"},
            ];

            beforeEach(() => {
                tzConverter = trv.toZigbee.find((c) => c.key.includes("weekly_schedule_monday"));

                meta = {
                    state: {},
                    device: null,
                    message: null,
                    mapped: null,
                    options: null,
                    publish: null,
                    endpoint_name: null,
                };

                commandFn = vi.fn();

                endpoint = {
                    command: commandFn,
                } as unknown as ZHModels.Endpoint;
            });

            it.each(invalidTransitions)("should throw error if transition format is invalid ($description)", async ({transition, description}) => {
                await expect(tzConverter.convertSet(endpoint, "weekly_schedule_monday", transition, meta)).rejects.toEqual(
                    new Error(`Invalid schedule: transitions must be in format HH:mm/temperature (e.g. 12:00/15.5), found: ${transition}`),
                );
            });

            it("should throw error if first transition does not start at 00:00", async () => {
                await expect(tzConverter.convertSet(endpoint, "weekly_schedule_monday", "00:01/5", meta)).rejects.toEqual(
                    new Error("Invalid schedule: the first transition of each day should start at 00:00"),
                );
            });

            it("should throw error if day has more than 6 transitions", async () => {
                await expect(
                    tzConverter.convertSet(endpoint, "weekly_schedule_monday", "00:00/1 00:00/1 00:00/1 00:00/1 00:00/1 00:00/1 00:00/1", meta),
                ).rejects.toEqual(new Error("Invalid schedule: days must have no more than 6 transitions"));
            });

            it.each([3, 36])("should throw error if temperature value is outside of valid range ($temperature) ", async (temperature) => {
                await expect(tzConverter.convertSet(endpoint, "weekly_schedule_monday", `00:00/${temperature}`, meta)).rejects.toEqual(
                    new Error(`Invalid schedule: temperature value must be between 4-35 (inclusive), found: ${temperature}`),
                );
            });

            it("should send setWeeklySchedule command if transitions are valid", async () => {
                await tzConverter.convertSet(endpoint, "weekly_schedule_sunday", "00:00/5 06:30/10.5 12:00/15 18:30/20 20:45/15.5 23:00/4", meta);

                expect(commandFn).toHaveBeenCalledWith(
                    "hvacThermostat",
                    "setWeeklySchedule",
                    {
                        dayofweek: 1,
                        numoftrans: 6,
                        mode: 1,
                        transitions: [
                            {
                                heatSetpoint: 500,
                                transitionTime: 0,
                            },
                            {
                                heatSetpoint: 1050,
                                transitionTime: 390,
                            },
                            {
                                heatSetpoint: 1500,
                                transitionTime: 720,
                            },
                            {
                                heatSetpoint: 2000,
                                transitionTime: 1110,
                            },
                            {
                                heatSetpoint: 1550,
                                transitionTime: 1245,
                            },
                            {
                                heatSetpoint: 400,
                                transitionTime: 1380,
                            },
                        ],
                    },
                    {},
                );
            });

            it("should send setWeeklySchedule command with transitions in ascending time order", async () => {
                await tzConverter.convertSet(endpoint, "weekly_schedule_sunday", "00:00/5 12:00/15 06:30/10.5", meta);

                expect(commandFn).toHaveBeenCalledWith(
                    "hvacThermostat",
                    "setWeeklySchedule",
                    {
                        dayofweek: 1,
                        numoftrans: 3,
                        mode: 1,
                        transitions: [
                            {
                                heatSetpoint: 500,
                                transitionTime: 0,
                            },
                            {
                                heatSetpoint: 1050,
                                transitionTime: 390,
                            },
                            {
                                heatSetpoint: 1500,
                                transitionTime: 720,
                            },
                        ],
                    },
                    {},
                );
            });

            it("should send a setWeeklySchedule command for each day", async () => {
                await tzConverter.convertSet(endpoint, "weekly_schedule_sunday", "00:00/5", meta);
                await tzConverter.convertSet(endpoint, "weekly_schedule_monday", "00:00/10", meta);
                await tzConverter.convertSet(endpoint, "weekly_schedule_tuesday", "00:00/15", meta);

                expect(commandFn).toHaveBeenCalledTimes(3);

                expect(commandFn).toHaveBeenCalledWith(
                    "hvacThermostat",
                    "setWeeklySchedule",
                    {
                        dayofweek: 1,
                        numoftrans: 1,
                        mode: 1,
                        transitions: [
                            {
                                heatSetpoint: 500,
                                transitionTime: 0,
                            },
                        ],
                    },
                    {},
                );

                expect(commandFn).toHaveBeenCalledWith(
                    "hvacThermostat",
                    "setWeeklySchedule",
                    {
                        dayofweek: 2,
                        numoftrans: 1,
                        mode: 1,
                        transitions: [
                            {
                                heatSetpoint: 1000,
                                transitionTime: 0,
                            },
                        ],
                    },
                    {},
                );

                expect(commandFn).toHaveBeenCalledWith(
                    "hvacThermostat",
                    "setWeeklySchedule",
                    {
                        dayofweek: 4,
                        numoftrans: 1,
                        mode: 1,
                        transitions: [
                            {
                                heatSetpoint: 1500,
                                transitionTime: 0,
                            },
                        ],
                    },
                    {},
                );
            });
        });
    });
});
