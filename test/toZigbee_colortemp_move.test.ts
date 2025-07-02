import {beforeEach, describe, expect, test, vi} from "vitest";

import * as zhc from "../src";
import type {Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("light_colortemp_move converter", () => {
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
            {movemode: 1, rate: 30, minimum: 0, maximum: 600},
            {},
        );
    });

    test("should handle simple negative number input", async () => {
        const converter = zhc.toZigbee.light_colortemp_move;
        await converter.convertSet(device.endpoints[0], "color_temp_move", -40, mockMeta);

        expect(device.endpoints[0].command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "moveColorTemp",
            {movemode: 3, rate: 40, minimum: 0, maximum: 600},
            {},
        );
    });

    test("should handle zero to stop movement", async () => {
        const converter = zhc.toZigbee.light_colortemp_move;
        await converter.convertSet(device.endpoints[0], "color_temp_move", 0, mockMeta);

        expect(device.endpoints[0].command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "moveColorTemp",
            {movemode: 0, rate: 1, minimum: 0, maximum: 600},
            {},
        );
    });

    test("should handle string stop command", async () => {
        const converter = zhc.toZigbee.light_colortemp_move;
        await converter.convertSet(device.endpoints[0], "color_temp_move", "stop", mockMeta);

        expect(device.endpoints[0].command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "moveColorTemp",
            {movemode: 0, rate: 1, minimum: 153, maximum: 370},
            {},
        );
    });

    test("should handle string release command", async () => {
        const converter = zhc.toZigbee.light_colortemp_move;
        await converter.convertSet(device.endpoints[0], "color_temp_move", "release", mockMeta);

        expect(device.endpoints[0].command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "moveColorTemp",
            {movemode: 0, rate: 1, minimum: 153, maximum: 370},
            {},
        );
    });

    test("should handle string zero command", async () => {
        const converter = zhc.toZigbee.light_colortemp_move;
        await converter.convertSet(device.endpoints[0], "color_temp_move", "0", mockMeta);

        expect(device.endpoints[0].command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "moveColorTemp",
            {movemode: 0, rate: 1, minimum: 153, maximum: 370},
            {},
        );
    });

    test("should handle string up command", async () => {
        const converter = zhc.toZigbee.light_colortemp_move;
        await converter.convertSet(device.endpoints[0], "color_temp_move", "up", mockMeta);

        expect(device.endpoints[0].command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "moveColorTemp",
            {movemode: 1, rate: 55, minimum: 153, maximum: 370},
            {},
        );
    });

    test("should handle string one command", async () => {
        const converter = zhc.toZigbee.light_colortemp_move;
        await converter.convertSet(device.endpoints[0], "color_temp_move", "1", mockMeta);

        expect(device.endpoints[0].command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "moveColorTemp",
            {movemode: 1, rate: 55, minimum: 153, maximum: 370},
            {},
        );
    });

    test("should handle string down command", async () => {
        const converter = zhc.toZigbee.light_colortemp_move;
        await converter.convertSet(device.endpoints[0], "color_temp_move", "down", mockMeta);

        expect(device.endpoints[0].command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "moveColorTemp",
            {movemode: 3, rate: 55, minimum: 153, maximum: 370},
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
            {movemode: 1, rate: 75, minimum: 153, maximum: 370},
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
            {movemode: 3, rate: 100, minimum: 153, maximum: 370},
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
            {movemode: 1, rate: 30, minimum: 150, maximum: 500},
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
            {movemode: 3, rate: 25, minimum: 250, maximum: 454},
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
            {movemode: 0, rate: 1, minimum: 200, maximum: 400},
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
            {movemode: 1, rate: 15, minimum: 0, maximum: 600},
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
            {movemode: 1, rate: 20, minimum: 100, maximum: 600},
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
            {movemode: 1, rate: 35, minimum: 0, maximum: 450},
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
            {movemode: 1, rate: 25, minimum: 0, maximum: 600},
            {},
        );
    });
});
