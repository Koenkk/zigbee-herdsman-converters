import {beforeEach, describe, expect, test, vi} from "vitest";
import * as zhc from "../src";
import type {KeyValue, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("toZigbee converters", () => {
    describe("light_colortemp_move", () => {
        let device: ReturnType<typeof mockDevice>;
        let mockMeta: Tz.Meta;

        beforeEach(async () => {
            vi.clearAllMocks();

            device = mockDevice({
                modelID: "test_device",
                manufacturerName: "test_manufacturer",
                endpoints: [{ID: 1}],
            });

            const definition = await zhc.findByDevice(device);

            mockMeta = {
                state: {},
                device,
                message: null,
                mapped: definition,
                options: null,
                publish: null,
                endpoint_name: null,
            };
        });

        test("should handle simple positive number input", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(device.endpoints[0], "color_temp_move", 30, mockMeta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 1, rate: 30, minimum: 0, maximum: 600, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle simple negative number input", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(device.endpoints[0], "color_temp_move", -40, mockMeta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 3, rate: 40, minimum: 0, maximum: 600, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle zero to stop movement", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(device.endpoints[0], "color_temp_move", 0, mockMeta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 0, rate: 1, minimum: 0, maximum: 600, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle string stop command", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(device.endpoints[0], "color_temp_move", "stop", mockMeta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 0, rate: 1, minimum: 153, maximum: 370, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle string release command", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(device.endpoints[0], "color_temp_move", "release", mockMeta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 0, rate: 1, minimum: 153, maximum: 370, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle string zero command", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(device.endpoints[0], "color_temp_move", "0", mockMeta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 0, rate: 1, minimum: 153, maximum: 370, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle string up command", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(device.endpoints[0], "color_temp_move", "up", mockMeta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 1, rate: 55, minimum: 153, maximum: 370, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle string one command", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(device.endpoints[0], "color_temp_move", "1", mockMeta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 1, rate: 55, minimum: 153, maximum: 370, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle string down command", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(device.endpoints[0], "color_temp_move", "down", mockMeta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 3, rate: 55, minimum: 153, maximum: 370, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle string up command with custom rate from meta.message", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            const metaWithRate = {...mockMeta, message: {rate: 75}};
            await converter.convertSet(device.endpoints[0], "color_temp_move", "up", metaWithRate);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 1, rate: 75, minimum: 153, maximum: 370, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle string down command with custom rate from meta.message", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            const metaWithRate = {...mockMeta, message: {rate: 100}};
            await converter.convertSet(device.endpoints[0], "color_temp_move", "down", metaWithRate);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 3, rate: 100, minimum: 153, maximum: 370, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should throw error for invalid string command", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;

            await expect(converter.convertSet(device.endpoints[0], "color_temp_move", "invalid", mockMeta)).rejects.toThrow(
                'color_temp_move: invalid string value "invalid". Expected "stop", "release", "0", "up", "1", or "down"',
            );
        });

        test("should handle object with positive rate and constraints", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(
                device.endpoints[0],
                "color_temp_move",
                {
                    rate: 30,
                    minimum: 150,
                    maximum: 500,
                },
                mockMeta,
            );

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 1, rate: 30, minimum: 150, maximum: 500, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle object with negative rate and constraints", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(
                device.endpoints[0],
                "color_temp_move",
                {
                    rate: -25,
                    minimum: 250,
                    maximum: 454,
                },
                mockMeta,
            );

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 3, rate: 25, minimum: 250, maximum: 454, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle object with zero rate (stop)", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(
                device.endpoints[0],
                "color_temp_move",
                {
                    rate: 0,
                    minimum: 200,
                    maximum: 400,
                },
                mockMeta,
            );

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 0, rate: 1, minimum: 200, maximum: 400, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle object with only rate (no constraints)", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(
                device.endpoints[0],
                "color_temp_move",
                {
                    rate: 15,
                },
                mockMeta,
            );

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 1, rate: 15, minimum: 0, maximum: 600, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle object with only minimum constraint", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(
                device.endpoints[0],
                "color_temp_move",
                {
                    rate: 20,
                    minimum: 100,
                },
                mockMeta,
            );

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 1, rate: 20, minimum: 100, maximum: 600, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should handle object with only maximum constraint", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(
                device.endpoints[0],
                "color_temp_move",
                {
                    rate: 35,
                    maximum: 450,
                },
                mockMeta,
            );

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 1, rate: 35, minimum: 0, maximum: 450, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });

        test("should throw error if object missing rate property", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;

            await expect(
                converter.convertSet(
                    device.endpoints[0],
                    "color_temp_move",
                    {
                        minimum: 150,
                        maximum: 500,
                    },
                    mockMeta,
                ),
            ).rejects.toThrow("color_temp_move: object must contain 'rate' property");
        });

        test("should throw error if minimum >= maximum", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;

            await expect(
                converter.convertSet(
                    device.endpoints[0],
                    "color_temp_move",
                    {
                        rate: 30,
                        minimum: 500,
                        maximum: 400,
                    },
                    mockMeta,
                ),
            ).rejects.toThrow("color_temp_move: minimum (500) must be less than maximum (400)");
        });

        test("should throw error if minimum equals maximum", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;

            await expect(
                converter.convertSet(
                    device.endpoints[0],
                    "color_temp_move",
                    {
                        rate: 30,
                        minimum: 300,
                        maximum: 300,
                    },
                    mockMeta,
                ),
            ).rejects.toThrow("color_temp_move: minimum (300) must be less than maximum (300)");
        });

        test("should throw error for invalid input type", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;

            await expect(converter.convertSet(device.endpoints[0], "color_temp_move", true, mockMeta)).rejects.toThrow(
                "color_temp_move: invalid value type. Expected number, string, or object with rate property",
            );
        });

        test("should handle colortemp_move key", async () => {
            const converter = zhc.toZigbee.light_colortemp_move;
            await converter.convertSet(device.endpoints[0], "colortemp_move", 25, mockMeta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveColorTemp",
                {movemode: 1, rate: 25, minimum: 0, maximum: 600, optionsMask: 0, optionsOverride: 0},
                {},
            );
        });
    });

    describe("cover_state", () => {
        let device: ReturnType<typeof mockDevice>;

        beforeEach(() => {
            device = mockDevice({modelID: "test_cover", endpoints: [{ID: 1}]});
        });

        const makeMeta = (options: KeyValue = {}): Tz.Meta => ({
            state: {},
            device,
            message: null,
            // @ts-expect-error mock
            mapped: {meta: {}},
            options,
            publish: null,
            endpoint_name: null,
        });

        test("sends upOpen for open and downClose for close by default", async () => {
            const converter = zhc.toZigbee.cover_state;
            await converter.convertSet(device.endpoints[0], "state", "open", makeMeta());
            expect(device.endpoints[0].command).toHaveBeenCalledWith("closuresWindowCovering", "upOpen", {}, {});

            await converter.convertSet(device.endpoints[0], "state", "close", makeMeta());
            expect(device.endpoints[0].command).toHaveBeenCalledWith("closuresWindowCovering", "downClose", {}, {});
        });

        test("invert_cover_state swaps open and close commands", async () => {
            const converter = zhc.toZigbee.cover_state;
            await converter.convertSet(device.endpoints[0], "state", "open", makeMeta({invert_cover_state: true}));
            expect(device.endpoints[0].command).toHaveBeenCalledWith("closuresWindowCovering", "downClose", {}, {});

            await converter.convertSet(device.endpoints[0], "state", "close", makeMeta({invert_cover_state: true}));
            expect(device.endpoints[0].command).toHaveBeenCalledWith("closuresWindowCovering", "upOpen", {}, {});
        });

        test("stop is unaffected by invert_cover_state", async () => {
            const converter = zhc.toZigbee.cover_state;
            await converter.convertSet(device.endpoints[0], "state", "stop", makeMeta({invert_cover_state: true}));
            expect(device.endpoints[0].command).toHaveBeenCalledWith("closuresWindowCovering", "stop", {}, {});
        });
    });

    describe("cover_position_tilt", () => {
        let device: ReturnType<typeof mockDevice>;

        beforeEach(() => {
            device = mockDevice({modelID: "test_cover", endpoints: [{ID: 1}]});
        });

        const makeMeta = (options: KeyValue = {}, mappedMeta: KeyValue = {}): Tz.Meta => ({
            state: {},
            device,
            message: null,
            // @ts-expect-error mock
            mapped: {meta: mappedMeta},
            options,
            publish: null,
            endpoint_name: null,
        });

        test("sends the inverted percentage by default (position 100 -> device value 0)", async () => {
            const converter = zhc.toZigbee.cover_position_tilt;
            const result = await converter.convertSet(device.endpoints[0], "position", 100, makeMeta());
            expect(device.endpoints[0].command).toHaveBeenCalledWith("closuresWindowCovering", "goToLiftPercentage", {percentageliftvalue: 0}, {});
            expect(result).toStrictEqual({state: {position: 100}});
        });

        test("invert_cover sends the value through unchanged", async () => {
            const converter = zhc.toZigbee.cover_position_tilt;
            await converter.convertSet(device.endpoints[0], "position", 100, makeMeta({invert_cover: true}));
            expect(device.endpoints[0].command).toHaveBeenCalledWith("closuresWindowCovering", "goToLiftPercentage", {percentageliftvalue: 100}, {});
        });

        test("device-level coverInverted meta combines with invert_cover", async () => {
            const converter = zhc.toZigbee.cover_position_tilt;
            await converter.convertSet(device.endpoints[0], "position", 100, makeMeta({}, {coverInverted: true}));
            expect(device.endpoints[0].command).toHaveBeenCalledWith("closuresWindowCovering", "goToLiftPercentage", {percentageliftvalue: 100}, {});
        });

        test("tilt uses goToTiltPercentage", async () => {
            const converter = zhc.toZigbee.cover_position_tilt;
            await converter.convertSet(device.endpoints[0], "tilt", 30, makeMeta());
            expect(device.endpoints[0].command).toHaveBeenCalledWith("closuresWindowCovering", "goToTiltPercentage", {percentagetiltvalue: 70}, {});
        });

        test("cover_position_tilt_disable_report suppresses the optimistic state", async () => {
            const converter = zhc.toZigbee.cover_position_tilt;
            const result = await converter.convertSet(device.endpoints[0], "position", 100, makeMeta({cover_position_tilt_disable_report: true}));
            expect(result).toBeUndefined();
        });
    });

    describe("light_onoff_brightness", () => {
        test("Flow with device having moveToLevelWithOnOffDisable=true and noOffTransitionWhenOff=true", async () => {
            const device = mockDevice({modelID: "CK-BL702-AL-01(7009_Z102LG03-1)", endpoints: [{ID: 1, meta: {onLevelSupported: false}}]});
            const mapped = await zhc.findByDevice(device);
            let meta: Tz.Meta = {state: {}, device, message: {}, mapped, options: {}, endpoint_name: null, publish: null};

            meta = {...meta, message: {state: "ON", transition: 1.0}, state: {state: "OFF"}};
            await zhc.toZigbee.light_onoff_brightness.convertSet(device.endpoints[0], "state", "off", meta);
            expect(device.endpoints[0].command).toHaveBeenCalledTimes(2);
            expect(device.endpoints[0].command).toHaveBeenNthCalledWith(
                1,
                "genLevelCtrl",
                "moveToLevel",
                {level: 254, optionsMask: 0, optionsOverride: 0, transtime: 10},
                {},
            );
            expect(device.endpoints[0].command).toHaveBeenNthCalledWith(2, "genOnOff", "on", {}, {});

            meta = {...meta, message: {state: "OFF", transition: 1.0}, state: {state: "ON"}};
            await zhc.toZigbee.light_onoff_brightness.convertSet(device.endpoints[0], "state", "off", meta);
            expect(device.endpoints[0].command).toHaveBeenCalledTimes(3);
            expect(device.endpoints[0].command).toHaveBeenNthCalledWith(3, "genOnOff", "off", {}, {});

            meta = {...meta, message: {state: "OFF", transition: 1.0}, state: {state: "OFF"}};
            await zhc.toZigbee.light_onoff_brightness.convertSet(device.endpoints[0], "state", "off", meta);
            expect(device.endpoints[0].command).toHaveBeenCalledTimes(4);
            expect(device.endpoints[0].command).toHaveBeenNthCalledWith(4, "genOnOff", "off", {}, {});
        });
    });

    describe("light_color", () => {
        test("xy color only device (given by color mode explicitly) should be able to receive hsv color by converting color before", async () => {
            const device = mockDevice({
                modelID: "xy_only_light",
                manufacturerName: "ACME-inc",
                endpoints: [
                    {
                        ID: 1,
                        inputClusters: ["genOnOff", "genLevelCtrl", "lightingColorCtrl"],
                        meta: {
                            color: {mode: ["xy"]},
                        },
                    },
                ],
            });

            const definition = await zhc.findByDevice(device);

            const meta: Tz.Meta = {
                state: {},
                device,
                message: {
                    color: {h: 200, s: 50, v: 100}, // Input HSV color (blue with some saturation)
                    transition: 1.0,
                },
                mapped: definition,
                options: {hue_correction: []},
                publish: null,
                endpoint_name: null,
            };

            const converter = zhc.toZigbee.light_color;
            await converter.convertSet(device.endpoints[0], "color", meta.message.color, meta);

            const expectedX = 16895;
            const expectedY = 20257;

            // assert that the command was called with the correct cluster, command, and payload
            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveToColor",
                expect.objectContaining({
                    colorx: expectedX,
                    colory: expectedY,
                    transtime: 10,
                    optionsMask: 0,
                    optionsOverride: 0,
                }),
                {},
            );

            // ensure that other color commands like moveToHueAndSaturation or moveToColorTemp were NOT called
            expect(device.endpoints[0].command).not.toHaveBeenCalledWith("lightingColorCtrl", "moveToHueAndSaturation", {}, {});
            expect(device.endpoints[0].command).not.toHaveBeenCalledWith("lightingColorCtrl", "moveToColorTemp", {}, {});
        });

        test("xy color only device (generic color device) should be able to receive hsv color by converting color before", async () => {
            const device = mockDevice({
                modelID: "xy_only_light",
                manufacturerName: "ACME-inc",
                endpoints: [
                    {
                        ID: 1,
                        inputClusters: ["genOnOff", "genLevelCtrl", "lightingColorCtrl"],
                        meta: {
                            color: true,
                        },
                    },
                ],
            });

            const definition = await zhc.findByDevice(device);

            const meta: Tz.Meta = {
                state: {},
                device,
                message: {
                    color: {h: 200, s: 50, v: 100}, // Input HSV color (blue with some saturation)
                    transition: 1.0,
                },
                mapped: definition,
                options: {hue_correction: []},
                publish: null,
                endpoint_name: null,
            };

            const converter = zhc.toZigbee.light_color;
            await converter.convertSet(device.endpoints[0], "color", meta.message.color, meta);

            const expectedX = 16895;
            const expectedY = 20257;

            // assert that the command was called with the correct cluster, command, and payload
            expect(device.endpoints[0].command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveToColor",
                expect.objectContaining({
                    colorx: expectedX,
                    colory: expectedY,
                    transtime: 10,
                    optionsMask: 0,
                    optionsOverride: 0,
                }),
                {},
            );

            // ensure that other color commands like moveToHueAndSaturation or moveToColorTemp were NOT called
            expect(device.endpoints[0].command).not.toHaveBeenCalledWith("lightingColorCtrl", "moveToHueAndSaturation", {}, {});
            expect(device.endpoints[0].command).not.toHaveBeenCalledWith("lightingColorCtrl", "moveToColorTemp", {}, {});
        });
    });
});
