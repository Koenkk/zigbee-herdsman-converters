import {beforeEach, describe, expect, it, vi} from "vitest";
import type {Models as ZHModels} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import type {Definition, Fz, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

describe("Hive SLR1c daily heating schedules", () => {
    let receiver: Definition;
    let scheduleFromZigbee: Fz.Converter<"hvacThermostat", undefined, ["commandGetWeeklyScheduleRsp"]>;
    let scheduleToZigbee: Tz.Converter;
    let convertSet: NonNullable<Tz.Converter["convertSet"]>;
    let convertGet: NonNullable<Tz.Converter["convertGet"]>;
    let endpoint: ZHModels.Endpoint;
    let meta: Tz.Meta;
    let command: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        // Arrange: find the SLR1c definition and mock its endpoint.
        receiver = await findByDevice(mockDevice({modelID: "SLR1c", endpoints: []}));
        scheduleFromZigbee = receiver.fromZigbee
            .filter((converter) => converter.cluster === "hvacThermostat" && converter.type.includes("commandGetWeeklyScheduleRsp"))
            .at(-1) as Fz.Converter<"hvacThermostat", undefined, ["commandGetWeeklyScheduleRsp"]>;
        scheduleToZigbee = receiver.toZigbee.find((converter) => converter.key?.includes("schedule_monday"));
        if (!scheduleToZigbee?.convertSet || !scheduleToZigbee.convertGet) {
            throw new Error("SLR1c daily schedule converter must support reading and writing");
        }
        convertSet = scheduleToZigbee.convertSet;
        convertGet = scheduleToZigbee.convertGet;
        command = vi.fn();
        endpoint = {command} as unknown as ZHModels.Endpoint;
        meta = {
            mapped: receiver,
            state: {},
            message: {},
            device: undefined,
            endpoint_name: undefined,
            options: {},
            publish: vi.fn(),
            deviceExposesChanged: vi.fn(),
        };
    });

    function response(dayofweek: number, transitions: {transitionTime: number; heatSetpoint: number}[]) {
        return {
            cluster: "hvacThermostat",
            type: "commandGetWeeklyScheduleRsp",
            data: {dayofweek, transitions},
            endpoint,
            device: null,
            meta: null,
            groupID: null,
            linkquality: 0,
        } as Fz.Message<"hvacThermostat", undefined, ["commandGetWeeklyScheduleRsp"]>;
    }

    it("exposes the seven writable/readable daily schedules without removing climate features", () => {
        // Act: inspect the prepared definition.
        const exposed = (typeof receiver.exposes === "function" ? receiver.exposes({isDummyDevice: true}, {}) : receiver.exposes).map(
            (expose) => expose.property,
        );
        // Assert: all days are available and the native thermostat remains exposed.
        for (const day of days) {
            expect(exposed).toContain(`schedule_${day}`);
            expect(scheduleToZigbee.key).toContain(`schedule_${day}`);
        }
        expect(exposed).toContain("temperature_setpoint_hold");
        expect(receiver.toZigbee.some((converter) => converter.key?.includes("weekly_schedule"))).toBe(true);
    });

    it.each(days)("formats the receiver's %s schedule for Home Assistant", (day) => {
        // Arrange: a Hive schedule containing duplicate padding.
        const mask = 1 << days.indexOf(day);
        const transitions = [
            {transitionTime: 360, heatSetpoint: 2050},
            ...Array.from({length: 5}, () => ({transitionTime: 1170, heatSetpoint: 100})),
        ];
        // Act: convert the Zigbee response.
        const state = scheduleFromZigbee.convert(
            receiver,
            response(mask, transitions),
            vi.fn(),
            {},
            {state: {}, device: null, deviceExposesChanged: vi.fn()},
        );
        // Assert: preserve all six entries exactly as the receiver reports them.
        expect(state).toEqual({[`schedule_${day}`]: "06:00/20.5 19:30/1 19:30/1 19:30/1 19:30/1 19:30/1"});
    });

    it("supports responses containing multiple day flags", () => {
        const result = scheduleFromZigbee.convert(
            receiver,
            response(0x06, [{transitionTime: 30, heatSetpoint: 2125}]),
            vi.fn(),
            {},
            {
                state: {},
                device: null,
                deviceExposesChanged: vi.fn(),
            },
        );
        expect(result).toEqual({schedule_monday: "00:30/21.25", schedule_tuesday: "00:30/21.25"});
    });

    it("does not publish malformed receiver transition data", () => {
        const result = scheduleFromZigbee.convert(
            receiver,
            response(0x02, [{transitionTime: 1440, heatSetpoint: 2050}]),
            vi.fn(),
            {},
            {
                state: {},
                device: null,
                deviceExposesChanged: vi.fn(),
            },
        );
        expect(result).toBeUndefined();
    });

    it("writes a schedule starting after midnight using centidegrees and the correct day bit", async () => {
        // Act: write the same type of schedule verified on the physical receiver.
        const result = await convertSet(endpoint, "schedule_monday", "06:00/20.5 19:30/1 19:30/1 19:30/1 19:30/1 19:30/1", meta);
        // Assert: no optimistic state, correct native Zigbee payload.
        expect(result).toBeUndefined();
        expect(command).toHaveBeenCalledOnce();
        expect(command).toHaveBeenCalledWith(
            "hvacThermostat",
            "setWeeklySchedule",
            {
                dayofweek: 2,
                numoftrans: 6,
                mode: 1,
                transitions: [
                    {transitionTime: 360, heatSetpoint: 2050},
                    ...Array.from({length: 5}, () => ({transitionTime: 1170, heatSetpoint: 100})),
                ],
            },
            expect.any(Object),
        );
    });

    it("normalizes whitespace between entries without changing temperatures", async () => {
        await convertSet(endpoint, "schedule_friday", " 06:00/21.25  \n 19:30/1 \t", meta);
        expect(command).toHaveBeenCalledWith(
            "hvacThermostat",
            "setWeeklySchedule",
            {
                dayofweek: 32,
                numoftrans: 2,
                mode: 1,
                transitions: [
                    {transitionTime: 360, heatSetpoint: 2125},
                    {transitionTime: 1170, heatSetpoint: 100},
                ],
            },
            expect.any(Object),
        );
    });

    it.each(days)("requests just the %s schedule from the receiver", async (day) => {
        await convertGet(endpoint, `schedule_${day}`, meta);
        expect(command).toHaveBeenCalledWith(
            "hvacThermostat",
            "getWeeklySchedule",
            {daystoreturn: 1 << days.indexOf(day), modetoreturn: 1},
            expect.any(Object),
        );
    });

    it.each([
        ["", "cannot be empty"],
        ["6:00/20.5", "time must use HH:mm"],
        ["25:30/16", "invalid time"],
        ["06:60/16", "invalid time"],
        ["06:00/20.555", "two decimal places"],
        ["06:00/40", "outside the supported values"],
        ["06:00/2", "outside the supported values"],
        ["06:00/21 06:00/18", "conflicting temperatures"],
        ["19:30/1 06:00/20.5", "chronological order"],
        ["06:00/20 07:00/20 08:00/20 09:00/20 10:00/20 11:00/20 12:00/20", "at most six"],
        ["06:00/21 19:30", "expected HH:mm/temperature"],
    ])("rejects invalid schedule '%s' without sending any Zigbee command", async (value, message) => {
        // Act and assert: invalid input must never reach the receiver.
        await expect(convertSet(endpoint, "schedule_monday", value, meta)).rejects.toThrow(message);
        expect(command).not.toHaveBeenCalled();
    });
});
