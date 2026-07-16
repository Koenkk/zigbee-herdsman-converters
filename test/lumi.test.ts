import {beforeEach, describe, expect, it, vi} from "vitest";
import {fromZigbee, lumiModernExtend, numericAttributes2Payload, type TrvScheduleConfig, toZigbee, trv} from "../src/lib/lumi";
import * as globalStore from "../src/lib/store";
import type {Definition, Fz, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("lib/lumi", () => {
    describe("PS-S04D battery", () => {
        it("decodes battery percentage (tag 24) and voltage (tag 23) from the 0x00F7 struct", () => {
            const extend = lumiModernExtend.lumiBattery({voltageAttribute: 0x0017, percentageAttribute: 0x0018});
            // tag 23 (0x17), uint16 (0x21) = 2916 mV; tag 24 (0x18), uint8 (0x20) = 97 %
            const data = Buffer.from([0x17, 0x21, 0x64, 0x0b, 0x18, 0x20, 0x61]);
            const result = extend.fromZigbee[0].convert(
                {model: "PS-S04D"} as Definition,
                // @ts-expect-error mock
                {data: {247: data}},
                null,
                null,
                null,
            );
            expect(result).toStrictEqual({battery: 97, voltage: 2916});
        });

        it("records when the 0x00F7 struct was last received, keeping the battery poll dormant while fresh", () => {
            const extend = lumiModernExtend.fp300BatteryPoll();
            const device = mockDevice({modelID: "lumi.sensor_occupy.agl8", endpoints: [{ID: 1}]}, "EndDevice");
            expect(globalStore.getValue(device, "lumi_struct_last_received")).toBeUndefined();
            const before = Date.now();
            extend.fromZigbee[0].convert(
                {model: "PS-S04D"} as Definition,
                // @ts-expect-error mock
                {data: {247: Buffer.from([0x17, 0x21, 0x64, 0x0b])}, device},
                null,
                null,
                null,
            );
            expect(globalStore.getValue(device, "lumi_struct_last_received")).toBeGreaterThanOrEqual(before);
        });
    });

    describe("ZNYB01LM bathroom heater", () => {
        const definition = {model: "ZNYB01LM"} as Definition;
        const extend = lumiModernExtend.lumiBathroomHeaterT1();
        const manufacturerOptions = {manufacturerCode: 0x115f, disableDefaultResponse: true};

        const convertFromYuba = async (data: Record<string | number, unknown>) => {
            const converter = extend.fromZigbee?.find(({cluster}) => cluster === "manuSpecificLumi");
            expect(converter).toBeDefined();
            return await converter?.convert(definition, {data} as never, vi.fn(), {}, {} as Fz.Meta);
        };

        const getToZigbee = (key: string) => {
            const converter = extend.toZigbee?.find(({key: keys}) => keys.includes(key));
            if (!converter) throw new Error(`Missing toZigbee converter for ${key}`);
            return converter;
        };

        const createContext = (readResponse: Record<string | number, unknown> = {}, state: Record<string, unknown> = {}) => {
            const read = vi.fn(async () => readResponse);
            const device = mockDevice({modelID: "lumi.bhf_light.acn001", endpoints: [{ID: 1, read}]});
            const meta: Tz.Meta = {
                state,
                device,
                message: {},
                mapped: definition,
                options: {},
                publish: vi.fn(),
                endpoint_name: null,
            };
            return {device, endpoint: device.endpoints[0], meta, read};
        };

        it.each([
            {
                packed: "0x0a280c35100cfffd",
                expected: {
                    current_heating_setpoint: 26,
                    local_temperature: 31.25,
                    heater_power: true,
                    operating_mode: "warm",
                    system_mode: "heat",
                    running_state: "heat",
                    fan_mode: "low",
                    swing_mode: "on",
                },
            },
            {
                packed: "0xffffffff131dfffe",
                expected: {
                    heater_power: true,
                    operating_mode: "dry",
                    system_mode: "dry",
                    running_state: "fan_only",
                    fan_mode: "medium",
                    swing_mode: "off",
                },
            },
            {
                packed: "0xffffffff142cffff",
                expected: {
                    heater_power: true,
                    operating_mode: "fan_only",
                    system_mode: "fan_only",
                    running_state: "fan_only",
                    fan_mode: "high",
                    swing_mode: "on",
                },
            },
            {
                packed: "0xffffffff150dfffd",
                expected: {
                    heater_power: true,
                    operating_mode: "exhaust",
                    system_mode: "fan_only",
                    running_state: "fan_only",
                    fan_mode: "low",
                    swing_mode: "off",
                },
            },
            {
                packed: "0xffffffff0ffffffc",
                expected: {heater_power: false, operating_mode: "off", system_mode: "off", running_state: "idle", swing_mode: "off"},
            },
        ])("decodes packed state $packed", async ({packed, expected}) => {
            expect(await convertFromYuba({591: packed})).toStrictEqual(expected);
        });

        it("decodes packed state from the Lumi heartbeat", async () => {
            const packed = 0x0a280c35100cfffdn;
            const bytes = Buffer.alloc(10);
            bytes[0] = 0x78;
            bytes[1] = 0x27;
            bytes.writeBigUInt64LE(packed, 2);

            expect(await convertFromYuba({247: bytes})).toMatchObject({
                current_heating_setpoint: 26,
                local_temperature: 31.25,
                operating_mode: "warm",
                fan_mode: "low",
                swing_mode: "on",
            });
        });

        it("decodes private configuration attributes", async () => {
            const schedule = (435 << 16) | 1290;
            expect(
                await convertFromYuba({
                    598: 0,
                    599: schedule,
                    702: 1,
                    1304: 0x21c4ec,
                }),
            ).toStrictEqual({
                mute_prompt_tone: "OFF",
                mute_prompt_start_time: "21:30",
                mute_prompt_end_time: "07:15",
                constant_temperature_mode: "ON",
                night_light_mode: "ON",
            });
        });

        it("writes target temperature using the Aqara packed command", async () => {
            const {endpoint, meta} = createContext();
            const result = await getToZigbee("current_heating_setpoint").convertSet?.(endpoint, "current_heating_setpoint", 26, meta);

            expect(endpoint.write).toHaveBeenCalledWith("manuSpecificLumi", {591: {value: 0x0a28ffffffffffffn, type: 0x27}}, manufacturerOptions);
            expect(result).toStrictEqual({state: {current_heating_setpoint: 26}});
        });

        it.each([
            ["warm", 0xffffffff10ffffffn],
            ["dry", 0xffffffff13ffffffn],
            ["fan_only", 0xffffffff14ffffffn],
            ["exhaust", 0xffffffff15ffffffn],
            ["off", 0xffffffff0ffffffcn],
        ])("writes operating mode %s", async (mode, packed) => {
            const {endpoint, meta} = createContext();
            await getToZigbee("operating_mode").convertSet?.(endpoint, "operating_mode", mode, meta);
            expect(endpoint.write).toHaveBeenCalledWith("manuSpecificLumi", {591: {value: packed, type: 0x27}}, manufacturerOptions);
        });

        it("preserves swing mode when changing fan speed", async () => {
            const {endpoint, meta} = createContext({591: "0xffffffffff0cfffd"});
            await getToZigbee("fan_mode").convertSet?.(endpoint, "fan_mode", "high", meta);

            expect(endpoint.read).toHaveBeenCalledWith("manuSpecificLumi", [591], {manufacturerCode: 0x115f});
            expect(endpoint.write).toHaveBeenCalledWith("manuSpecificLumi", {591: {value: 0xffffffffff2cffffn, type: 0x27}}, manufacturerOptions);
        });

        it("preserves fan speed when changing swing mode", async () => {
            const {endpoint, meta} = createContext({591: "0xffffffffff1dfffe"});
            await getToZigbee("swing_mode").convertSet?.(endpoint, "swing_mode", "on", meta);

            expect(endpoint.write).toHaveBeenCalledWith("manuSpecificLumi", {591: {value: 0xffffffffff1cfffen, type: 0x27}}, manufacturerOptions);
        });

        it("preserves the night-light schedule when toggling it", async () => {
            const {endpoint, meta} = createContext({1304: 0x21c4ed});
            await getToZigbee("night_light_mode").convertSet?.(endpoint, "night_light_mode", "ON", meta);

            expect(endpoint.write).toHaveBeenCalledWith("manuSpecificLumi", {1304: {value: 0x21c4ec, type: 0x23}}, manufacturerOptions);
        });

        it("preserves mute end time when changing mute start time", async () => {
            const currentSchedule = (435 << 16) | 1260;
            const {endpoint, meta} = createContext({599: currentSchedule});
            await getToZigbee("mute_prompt_start_time").convertSet?.(endpoint, "mute_prompt_start_time", "22:05", meta);

            expect(endpoint.write).toHaveBeenCalledWith("manuSpecificLumi", {599: {value: (435 << 16) | 1325, type: 0x23}}, manufacturerOptions);
        });

        it.each([15, 46])("rejects target temperature %d", async (temperature) => {
            const {endpoint, meta} = createContext();
            await expect(
                getToZigbee("current_heating_setpoint").convertSet?.(endpoint, "current_heating_setpoint", temperature, meta),
            ).rejects.toThrow("between 16 and 45");
        });

        it("rejects invalid mute time", async () => {
            const {endpoint, meta} = createContext({599: 0});
            await expect(getToZigbee("mute_prompt_start_time").convertSet?.(endpoint, "mute_prompt_start_time", "24:00", meta)).rejects.toThrow(
                "HH:MM",
            );
        });

        it("reads current temperature from the packed state", async () => {
            const {endpoint, meta} = createContext();
            await getToZigbee("local_temperature").convertGet?.(endpoint, "local_temperature", meta);

            expect(endpoint.read).toHaveBeenCalledWith("manuSpecificLumi", [591], {manufacturerCode: 0x115f});
        });

        it("reads private state during configuration", async () => {
            const {device, endpoint} = createContext();
            await extend.configure?.[0](device, endpoint, definition);

            expect(endpoint.read).toHaveBeenCalledTimes(1);
            expect(endpoint.read).toHaveBeenCalledWith("manuSpecificLumi", [591, 598, 599, 702, 1304], {manufacturerCode: 0x115f});
        });
    });

    describe("RTCZCGQ11LM configured regions", () => {
        const createPresenceMeta = (state = {}): {device: ReturnType<typeof mockDevice>; meta: Tz.Meta} => {
            const device = mockDevice({modelID: "lumi.motion.ac01", endpoints: [{ID: 1}]});
            const definition = {model: "RTCZCGQ11LM"} as Definition;

            return {
                device,
                meta: {
                    state,
                    device,
                    message: null,
                    mapped: definition,
                    options: null,
                    publish: null,
                    endpoint_name: null,
                },
            };
        };

        it("returns configured_regions after a region upsert", async () => {
            const {device, meta} = createPresenceMeta({
                configured_regions: JSON.stringify([{region_id: 5, zones: [{x: 4, y: 7}]}]),
            });

            const result = await toZigbee.lumi_presence_region_upsert.convertSet(
                device.endpoints[0],
                "region_upsert",
                {
                    region_id: 1,
                    zones: [
                        {x: 2, y: 1},
                        {x: 1, y: 1},
                        {x: 4, y: 3},
                    ],
                },
                meta,
            );

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "manuSpecificLumi",
                {
                    336: {
                        value: new Uint8Array([1, 1, 3, 8, 0, 0, 0xff]),
                        type: 0x41,
                    },
                },
                {manufacturerCode: 0x115f},
            );
            expect(result).toStrictEqual({
                state: {
                    configured_regions: "1: y1=x1-2; y3=x4 (3 zones) | 5: y7=x4 (1 zones)",
                },
            });
        });

        it("returns configured_regions after a region delete", async () => {
            const {device, meta} = createPresenceMeta({
                configured_regions: "1: y1=x1 (1 zones) | 5: y7=x4 (1 zones)",
            });

            const result = await toZigbee.lumi_presence_region_delete.convertSet(device.endpoints[0], "region_delete", {region_id: 5}, meta);

            expect(device.endpoints[0].write).toHaveBeenCalledWith(
                "manuSpecificLumi",
                {
                    336: {
                        value: new Uint8Array([3, 5, 0, 0, 0, 0, 0]),
                        type: 0x41,
                    },
                },
                {manufacturerCode: 0x115f},
            );
            expect(result).toStrictEqual({
                state: {
                    configured_regions: "1: y1=x1 (1 zones)",
                },
            });
        });
    });

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
            {invert_cover: false, terminalReadbackPosition: 100, adjacentReadbackPosition: 99, expectedPayload: {position: 100, state: "OPEN"}},
            {invert_cover: false, terminalReadbackPosition: 100, adjacentReadbackPosition: 98, expectedPayload: {position: 100, state: "OPEN"}},
            {invert_cover: false, terminalReadbackPosition: 0, adjacentReadbackPosition: 1, expectedPayload: {position: 0, state: "CLOSE"}},
            {invert_cover: false, terminalReadbackPosition: 0, adjacentReadbackPosition: 2, expectedPayload: {position: 0, state: "CLOSE"}},
            {invert_cover: true, terminalReadbackPosition: 0, adjacentReadbackPosition: 1, expectedPayload: {position: 100, state: "CLOSE"}},
            {invert_cover: true, terminalReadbackPosition: 0, adjacentReadbackPosition: 2, expectedPayload: {position: 100, state: "CLOSE"}},
            {invert_cover: true, terminalReadbackPosition: 100, adjacentReadbackPosition: 99, expectedPayload: {position: 0, state: "OPEN"}},
            {invert_cover: true, terminalReadbackPosition: 100, adjacentReadbackPosition: 98, expectedPayload: {position: 0, state: "OPEN"}},
        ])("normalizes adjacent terminal readback while stopped when invert_cover=$invert_cover", async ({
            invert_cover,
            terminalReadbackPosition,
            adjacentReadbackPosition,
            expectedPayload,
        }) => {
            const {device, msg} = createCurtainMessage();

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1057: 2});

            fromZigbee.lumi_curtain_position_tilt.convert(
                znclbl01lmDefinition,
                {
                    data: {currentPositionLiftPercentage: terminalReadbackPosition},
                    endpoint: device.endpoints[0],
                } as Fz.Message<"closuresWindowCovering", undefined, "readResponse">,
                null,
                {invert_cover},
                {} as Fz.Meta,
            );

            const adjacentReadbackPayload = fromZigbee.lumi_curtain_position_tilt.convert(
                znclbl01lmDefinition,
                {
                    data: {currentPositionLiftPercentage: adjacentReadbackPosition},
                    endpoint: device.endpoints[0],
                } as Fz.Message<"closuresWindowCovering", undefined, "readResponse">,
                null,
                {invert_cover},
                {} as Fz.Meta,
            );

            expect(adjacentReadbackPayload).toStrictEqual(expectedPayload);
        });

        it.each([
            {invert_cover: false, adjacentReadbackPosition: 99, expectedPayload: {position: 99, state: "OPEN"}},
            {invert_cover: false, adjacentReadbackPosition: 98, expectedPayload: {position: 98, state: "OPEN"}},
            {invert_cover: false, adjacentReadbackPosition: 1, expectedPayload: {position: 1, state: "OPEN"}},
            {invert_cover: false, adjacentReadbackPosition: 2, expectedPayload: {position: 2, state: "OPEN"}},
            {invert_cover: true, adjacentReadbackPosition: 1, expectedPayload: {position: 99, state: "CLOSE"}},
            {invert_cover: true, adjacentReadbackPosition: 2, expectedPayload: {position: 98, state: "CLOSE"}},
            {invert_cover: true, adjacentReadbackPosition: 99, expectedPayload: {position: 1, state: "CLOSE"}},
            {invert_cover: true, adjacentReadbackPosition: 98, expectedPayload: {position: 2, state: "CLOSE"}},
        ])("keeps adjacent readback unchanged without a previous terminal endpoint when invert_cover=$invert_cover", async ({
            invert_cover,
            adjacentReadbackPosition,
            expectedPayload,
        }) => {
            const {device, msg} = createCurtainMessage();

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1057: 2});

            const adjacentReadbackPayload = fromZigbee.lumi_curtain_position_tilt.convert(
                znclbl01lmDefinition,
                {
                    data: {currentPositionLiftPercentage: adjacentReadbackPosition},
                    endpoint: device.endpoints[0],
                } as Fz.Message<"closuresWindowCovering", undefined, "readResponse">,
                null,
                {invert_cover},
                {} as Fz.Meta,
            );

            expect(adjacentReadbackPayload).toStrictEqual(expectedPayload);
        });

        it.each([
            {invert_cover: false, terminalTargetPosition: 100, adjacentTargetPosition: 99, expectedTargetPosition: 100},
            {invert_cover: false, terminalTargetPosition: 100, adjacentTargetPosition: 98, expectedTargetPosition: 100},
            {invert_cover: false, terminalTargetPosition: 0, adjacentTargetPosition: 1, expectedTargetPosition: 0},
            {invert_cover: false, terminalTargetPosition: 0, adjacentTargetPosition: 2, expectedTargetPosition: 0},
            {invert_cover: true, terminalTargetPosition: 0, adjacentTargetPosition: 1, expectedTargetPosition: 100},
            {invert_cover: true, terminalTargetPosition: 0, adjacentTargetPosition: 2, expectedTargetPosition: 100},
            {invert_cover: true, terminalTargetPosition: 100, adjacentTargetPosition: 99, expectedTargetPosition: 0},
            {invert_cover: true, terminalTargetPosition: 100, adjacentTargetPosition: 98, expectedTargetPosition: 0},
        ])("normalizes adjacent target_position while stopped when invert_cover=$invert_cover", async ({
            invert_cover,
            terminalTargetPosition,
            adjacentTargetPosition,
            expectedTargetPosition,
        }) => {
            const {msg} = createCurtainMessage();

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1057: 2});

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1055: terminalTargetPosition});

            const adjacentTargetPayload = await numericAttributes2Payload(
                msg,
                {} as Fz.Meta,
                znclbl01lmDefinition,
                {invert_cover},
                {1055: adjacentTargetPosition},
            );

            expect(adjacentTargetPayload).toStrictEqual({target_position: expectedTargetPosition});
        });

        it.each([
            {
                invert_cover: false,
                terminalTargetPosition: 100,
                runningStateValue: 1,
                adjacentPosition: 98,
                expectedPayload: {position: 100, state: "OPEN"},
            },
            {
                invert_cover: false,
                terminalTargetPosition: 0,
                runningStateValue: 0,
                adjacentPosition: 2,
                expectedPayload: {position: 0, state: "CLOSE"},
            },
            {
                invert_cover: true,
                terminalTargetPosition: 0,
                runningStateValue: 0,
                adjacentPosition: 2,
                expectedPayload: {position: 100, state: "CLOSE"},
            },
            {
                invert_cover: true,
                terminalTargetPosition: 100,
                runningStateValue: 1,
                adjacentPosition: 98,
                expectedPayload: {position: 0, state: "OPEN"},
            },
        ])("keeps terminal target through movement for stopped readback when invert_cover=$invert_cover", async ({
            invert_cover,
            terminalTargetPosition,
            runningStateValue,
            adjacentPosition,
            expectedPayload,
        }) => {
            const {device, msg} = createCurtainMessage();

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1055: terminalTargetPosition});
            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1057: runningStateValue});
            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1057: 2});

            const adjacentReadbackPayload = fromZigbee.lumi_curtain_position_tilt.convert(
                znclbl01lmDefinition,
                {
                    data: {currentPositionLiftPercentage: adjacentPosition},
                    endpoint: device.endpoints[0],
                } as Fz.Message<"closuresWindowCovering", undefined, "readResponse">,
                null,
                {invert_cover},
                {} as Fz.Meta,
            );

            expect(adjacentReadbackPayload).toStrictEqual(expectedPayload);
        });

        it.each([
            {invert_cover: false, terminalReadbackPosition: 0, requestedPosition: 1, reportedPosition: 1, expectedState: "OPEN"},
            {invert_cover: false, terminalReadbackPosition: 0, requestedPosition: 2, reportedPosition: 2, expectedState: "OPEN"},
            {invert_cover: false, terminalReadbackPosition: 100, requestedPosition: 98, reportedPosition: 98, expectedState: "OPEN"},
            {invert_cover: false, terminalReadbackPosition: 100, requestedPosition: 99, reportedPosition: 99, expectedState: "OPEN"},
            {invert_cover: false, terminalReadbackPosition: 100, requestedPosition: 1, reportedPosition: 1, expectedState: "OPEN"},
            {invert_cover: false, terminalReadbackPosition: 100, requestedPosition: 2, reportedPosition: 2, expectedState: "OPEN"},
            {invert_cover: true, terminalReadbackPosition: 100, requestedPosition: 1, reportedPosition: 99, expectedState: "CLOSE"},
            {invert_cover: true, terminalReadbackPosition: 100, requestedPosition: 2, reportedPosition: 98, expectedState: "CLOSE"},
            {invert_cover: true, terminalReadbackPosition: 0, requestedPosition: 98, reportedPosition: 2, expectedState: "CLOSE"},
            {invert_cover: true, terminalReadbackPosition: 0, requestedPosition: 99, reportedPosition: 1, expectedState: "CLOSE"},
            {invert_cover: true, terminalReadbackPosition: 0, requestedPosition: 1, reportedPosition: 99, expectedState: "CLOSE"},
            {invert_cover: true, terminalReadbackPosition: 0, requestedPosition: 2, reportedPosition: 98, expectedState: "CLOSE"},
        ])("keeps explicit non-terminal near-end target $requestedPosition when invert_cover=$invert_cover", async ({
            invert_cover,
            terminalReadbackPosition,
            requestedPosition,
            reportedPosition,
            expectedState,
        }) => {
            const {device, msg} = createCurtainMessage();
            const meta = {
                device,
                mapped: znclbl01lmDefinition,
                options: {invert_cover},
            } as Tz.Meta;

            await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1057: 2});

            fromZigbee.lumi_curtain_position_tilt.convert(
                znclbl01lmDefinition,
                {
                    data: {currentPositionLiftPercentage: terminalReadbackPosition},
                    endpoint: device.endpoints[0],
                } as Fz.Message<"closuresWindowCovering", undefined, "readResponse">,
                null,
                {invert_cover},
                {} as Fz.Meta,
            );

            await toZigbee.lumi_curtain_position_state.convertSet(device.endpoints[0], "position", requestedPosition, meta);

            const targetPayload = await numericAttributes2Payload(msg, {} as Fz.Meta, znclbl01lmDefinition, {invert_cover}, {1055: reportedPosition});

            const readbackPayload = fromZigbee.lumi_curtain_position_tilt.convert(
                znclbl01lmDefinition,
                {
                    data: {currentPositionLiftPercentage: reportedPosition},
                    endpoint: device.endpoints[0],
                } as Fz.Message<"closuresWindowCovering", undefined, "readResponse">,
                null,
                {invert_cover},
                {} as Fz.Meta,
            );

            expect(targetPayload).toStrictEqual({target_position: requestedPosition});
            expect(readbackPayload).toStrictEqual({position: requestedPosition, state: expectedState});
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
