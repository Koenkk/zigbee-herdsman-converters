import {beforeEach, describe, expect, it, test} from "vitest";
import {light_color} from "../src/converters/toZigbee";
import {findByDevice, type Tz} from "../src/index";
import {Color, ColorHSV, ColorRGB, ColorXY} from "../src/lib/color";
import {getOptions} from "../src/lib/utils";
import {type MockEndpointArgs, mockDevice} from "./utils";

describe("lib/color", () => {
    describe("ColorRGB", () => {
        test.each([[{red: 0.5, green: 0.5, blue: 0.5}]])(".{from,to}Object() - %j", (color) => {
            expect(ColorRGB.fromObject(color).toObject()).toEqual(color);
        });

        test.each([
            ["red", {red: 1.0, green: 0, blue: 0}, {hue: 0, saturation: 100, value: 100}],
            ["green", {red: 0, green: 1.0, blue: 0}, {hue: 120, saturation: 100, value: 100}],
            ["blue", {red: 0, green: 0, blue: 1.0}, {hue: 240, saturation: 100, value: 100}],
            ["white", {red: 1.0, green: 1.0, blue: 1.0}, {hue: 0, saturation: 0, value: 100}],
            ["black", {red: 0, green: 0, blue: 0}, {hue: 0, saturation: 0, value: 0}],
        ])(".toHSV() - %s", (_name, rgb, hsv) => {
            expect(ColorRGB.fromObject(rgb).toHSV().toObject()).toStrictEqual(hsv);
        });

        test.each([
            ["red", {red: 1.0, green: 0, blue: 0}, {x: 0.7006, y: 0.2993}],
            ["green", {red: 0, green: 1.0, blue: 0}, {x: 0.1724, y: 0.7468}],
            ["blue", {red: 0, green: 0, blue: 1.0}, {x: 0.1355, y: 0.0399}],
            ["white", {red: 1.0, green: 1.0, blue: 1.0}, {x: 0.3227, y: 0.329}],
            ["black", {red: 0, green: 0, blue: 0}, {x: 0, y: 0}],
        ])(".toXY() - %s", (_name, rgb, xy) => {
            expect(ColorRGB.fromObject(rgb).toXY().rounded(4).toObject()).toStrictEqual(xy);
        });

        test.each([
            [
                {red: 1.0, green: 1.0, blue: 1.0},
                {red: 1.0, green: 1.0, blue: 1.0},
            ],
            [
                {red: 0.5, green: 0.5, blue: 0.5},
                {red: 0.214, green: 0.214, blue: 0.214},
            ],
            [
                {red: 0.0, green: 0.0, blue: 0.0},
                {red: 0.0, green: 0.0, blue: 0.0},
            ],
        ])(".gammaCorrected - %j", (input, output) => {
            expect(ColorRGB.fromObject(input).gammaCorrected().rounded(4).toObject()).toStrictEqual(output);
        });

        expect(ColorRGB.fromHex("#663399").toHEX()).toBe("#663399");
        expect(ColorRGB.fromHex("#020202").toHEX()).toBe("#020202");
    });

    describe("ColorHSV", () => {
        const cases = [
            [{hue: 0, saturation: 100, value: 100}, null],
            [{hue: 0, saturation: 100}, null],
            [{hue: 0}, null],
            [{saturation: 100}, null],
        ];

        test.each(cases)(".{from,to}Object() - %j", (input, output) => {
            expect(ColorHSV.fromObject(input).toObject()).toStrictEqual(output || input);
        });

        test.each([
            ...cases,
            [
                {hue: 359.31231, saturation: 99.969123, value: 99.983131},
                {hue: 359.3, saturation: 100, value: 100},
            ],
        ])(".{from,to}Object(), rounded - %j", (input, output) => {
            expect(ColorHSV.fromObject(input).rounded(1).toObject()).toStrictEqual(output || input);
        });

        test.each([
            [
                {hue: 0, saturation: 100, value: 100},
                {h: 0, s: 100, v: 100},
            ],
            [
                {hue: 0, saturation: 100},
                {h: 0, s: 100},
            ],
            [{hue: 0}, {h: 0}],
            [{saturation: 100}, {s: 100}],
        ])(".toObject() short - %j", (input, output) => {
            expect(ColorHSV.fromObject(input).toObject(true)).toStrictEqual(output);
        });

        test.each([
            ["red", {hue: 0, saturation: 100, value: 100}, {red: 1.0, green: 0, blue: 0}],
            ["red (only hue)", {hue: 0}, {red: 1.0, green: 0.0, blue: 0.0}],
            ["green", {hue: 120, saturation: 100, value: 100}, {red: 0, green: 1.0, blue: 0}],
            ["blue", {hue: 240, saturation: 100, value: 100}, {red: 0, green: 0, blue: 1.0}],
            ["white (red hue)", {hue: 0, saturation: 0, value: 100}, {red: 1.0, green: 1.0, blue: 1.0}],
            ["white (blue hue)", {hue: 120, saturation: 0, value: 100}, {red: 1.0, green: 1.0, blue: 1.0}],
            ["white (green hue)", {hue: 240, saturation: 0, value: 100}, {red: 1.0, green: 1.0, blue: 1.0}],
            ["white (only saturation)", {saturation: 0}, {red: 1.0, green: 1.0, blue: 1.0}],
            ["black", {hue: 0, saturation: 0, value: 0}, {red: 0, green: 0, blue: 0}],
        ])(".toRGB() - %s", (_name, hsv, rgb) => {
            expect(ColorHSV.fromObject(hsv).toRGB().toObject()).toStrictEqual(rgb);
        });

        test.each([
            ["red", {hue: 0, saturation: 100, value: 100}, {x: 0.7006, y: 0.2993}],
            ["red (only hue)", {hue: 0}, {x: 0.7006, y: 0.2993}],
            ["green", {hue: 120, saturation: 100, value: 100}, {x: 0.1724, y: 0.7468}],
            ["blue", {hue: 240, saturation: 100, value: 100}, {x: 0.1355, y: 0.0399}],
            ["white (red hue)", {hue: 0, saturation: 0, value: 100}, {x: 0.3227, y: 0.329}],
            ["white (blue hue)", {hue: 120, saturation: 0, value: 100}, {x: 0.3227, y: 0.329}],
            ["white (green hue)", {hue: 240, saturation: 0, value: 100}, {x: 0.3227, y: 0.329}],
            ["white (only saturation)", {saturation: 0}, {x: 0.3227, y: 0.329}],
            ["black", {hue: 0, saturation: 0, value: 0}, {x: 0, y: 0}],
        ])(".toXY() - %s", (_name, hsv, xy) => {
            expect(ColorHSV.fromObject(hsv).toXY().rounded(4).toObject()).toStrictEqual(xy);
        });
    });

    describe("ColorXY", () => {
        test.each([[{x: 5, y: 0.5}]])(".{from,to}Object() - %j", (color) => {
            expect(ColorXY.fromObject(color).toObject()).toStrictEqual(color);
        });

        test.each([
            ["red", {x: 0.7006, y: 0.2993}, {red: 1.0, green: 0, blue: 0}],
            ["green", {x: 0.1724, y: 0.7468}, {red: 0, green: 1.0, blue: 0}],
            ["blue", {x: 0.1355, y: 0.0399}, {red: 0, green: 0, blue: 1.0}],
        ])(".toRGB() - %s", (_name, xy, rgb) => {
            expect(ColorXY.fromObject(xy).toRGB().rounded(4).toObject()).toStrictEqual(rgb, 4);
        });

        test.each([[500], [370], [150]])(".{to,from}Mireds() - %j", (mireds) => {
            const asXY = ColorXY.fromMireds(mireds);
            const backConv = asXY.toMireds();
            const error = Math.abs(backConv - mireds);
            // better precision would require better lookup table or continuous conversion function
            expect(error).toBeLessThan(2.3);
        });
    });

    describe("Color", () => {
        test.each([
            [{x: 0.4969, y: 0.4719}, {xy: {x: 0.4969, y: 0.4719}}],
            [{r: 255, g: 213, b: 0}, {rgb: {red: 1.0, green: 0.8353, blue: 0}}],
            [{rgb: "255,213,0"}, {rgb: {red: 1.0, green: 0.8353, blue: 0}}],
            [{hex: "FFD500"}, {rgb: {red: 1.0, green: 0.8353, blue: 0}}],
            ["#FFD500", {rgb: {red: 1.0, green: 0.8353, blue: 0}}],
            [{h: 50, s: 100, l: 50}, {hsv: {hue: 50, saturation: 100, value: 100}}],
            [{hsl: "50,100,50"}, {hsv: {hue: 50, saturation: 100, value: 100}}],
            [{h: 50, s: 100, b: 100}, {hsv: {hue: 50, saturation: 100, value: 100}}],
            [{hsb: "180,50,50"}, {hsv: {hue: 180, saturation: 50, value: 50}}],
            [{h: 50, s: 100, v: 100}, {hsv: {hue: 50, saturation: 100, value: 100}}],
            [{hsv: "50,100,100"}, {hsv: {hue: 50, saturation: 100, value: 100}}],
            [{h: 50, s: 100}, {hsv: {hue: 50, saturation: 100}}],
            [{h: 50}, {hsv: {hue: 50}}],
            [{s: 100}, {hsv: {saturation: 100}}],
            [{hue: 50, saturation: 100}, {hsv: {hue: 50, saturation: 100}}],
            [{hue: 50}, {hsv: {hue: 50}}],
            [{saturation: 100}, {hsv: {saturation: 100}}],
        ])(".fromConverterArg() - %j", (value, expected) => {
            // conversions reference: https://colordesigner.io/convert/hsltohsv
            const extracted = Color.fromConverterArg(value);

            if (expected.hsv === undefined) {
                expect(extracted.isHSV()).toBe(false);
            } else {
                expect(extracted.isHSV()).toBe(true);
                expect(extracted.hsv.toObject()).toStrictEqual(expected.hsv);
            }

            if (expected.rgb === undefined) {
                expect(extracted.isRGB()).toBe(false);
            } else {
                expect(extracted.isRGB()).toBe(true);
                expect(extracted.rgb.rounded(4).toObject()).toStrictEqual(expected.rgb);
            }

            if (expected.xy === undefined) {
                expect(extracted.isXY()).toBe(false);
            } else {
                expect(extracted.isXY()).toBe(true);
                expect(extracted.xy.rounded(4).toObject()).toStrictEqual(expected.xy);
            }
        });

        test.each([[{}], [{v: 100}], [{unknown_property: 42}]])(".fromConverterArg() invalid - %j", (value) => {
            expect(() => Color.fromConverterArg(value)).toThrow();
        });
    });

    describe("tz.light_color", () => {
        const defaultMeta = async (device: Tz.Meta["device"], message: Tz.Meta["message"], state: Tz.Meta["state"]): Promise<Tz.Meta> => {
            const definition = await findByDevice(device);

            return {
                endpoint_name: "default",
                options: {transition: undefined, hue_correction: undefined},
                message: {...message},
                device,
                state,
                membersState: undefined,
                mapped: definition,
                publish: () => {},
            };
        };
        const DEFAULT_LIGHT_ENDPOINT: MockEndpointArgs = {
            ID: 1,
            profileID: 0x104,
            deviceID: 0x65,
            inputClusters: ["genBasic", "genIdentify", "genGroups", "genScenes", "genOnOff", "genLevelCtrl", "lightingColorCtrl", "touchlink"],
            outputClusters: ["genOta"],
            attributes: {lightingColorCtrl: {colorTempPhysicalMin: 100, colorTempPhysicalMax: 500}},
        };
        const MAX_X = 0.7347;
        const MAX_Y = 0.7174;
        const MIN_X = 0.1666;
        const MIN_Y = 0.0089;

        beforeEach(() => {});

        it.each([
            ["white", {x: 1 / 3, y: 1 / 3}, {x: 1 / 3, y: 1 / 3}, {colorx: 21845, colory: 21845}],
            ["red", {x: 0.7347, y: 0.2653}, {x: 0.7347, y: 0.2653}, {colorx: 48149, colory: 17386}],
            ["green", {x: 0.2738, y: 0.7174}, {x: 0.2738, y: 0.7174}, {colorx: 17943, colory: 47015}],
            ["blue", {x: 0.1666, y: 0.0089}, {x: 0.1666, y: 0.0089}, {colorx: 10918, colory: 583}],
            ["max x/y", {x: MAX_X, y: MAX_Y}, {x: MAX_X, y: MAX_Y}, {colorx: 48149, colory: 47015}],
            ["min x/y", {x: MIN_X, y: MIN_Y}, {x: MIN_X, y: MIN_Y}, {colorx: 10918, colory: 583}],
            ["max x / min y", {x: MAX_X, y: MIN_Y}, {x: MAX_X, y: MIN_Y}, {colorx: 48149, colory: 583}],
            ["min x / max y", {x: MIN_X, y: MAX_Y}, {x: MIN_X, y: MAX_Y}, {colorx: 10918, colory: 47015}],
            ["random", {x: 0.234, y: 0.543}, {x: 0.234, y: 0.543}, {colorx: 15335, colory: 35586}],
            ["random 2", {x: 0.7, y: 0.298}, {x: 0.7, y: 0.298}, {colorx: 45875, colory: 19529}],
        ])("processes XY payload for %s", async (_name, inColor, outColor, outCmdColor) => {
            const device = mockDevice(
                {
                    modelID: "TS0505A",
                    endpoints: [{...DEFAULT_LIGHT_ENDPOINT}],
                },
                "Router",
            );
            const endpoint = device.getEndpoint(1);
            const message = {color: inColor};
            const meta = await defaultMeta(device, message, {});

            await expect(light_color.convertSet(endpoint, "color", message.color, meta)).resolves.toStrictEqual({
                state: {color_mode: "xy", color: outColor},
            });
            expect(endpoint.command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveToColor",
                {transtime: 0, optionsMask: 0, optionsOverride: 0, ...outCmdColor},
                getOptions(meta.mapped, endpoint),
            );
        });

        it.each([
            ["white", {r: 255, g: 255, b: 255}, {x: 1 / 3, y: 1 / 3}, {colorx: 21066, colory: 21477}],
            ["red", {r: 255, g: 0, b: 0}, {x: 0.7347, y: 0.2653}, {colorx: 45734, colory: 19538}],
            ["green", {r: 0, g: 255, b: 0}, {x: 0.2738, y: 0.7174}, {colorx: 11254, colory: 48750}],
            ["blue", {r: 0, g: 0, b: 255}, {x: 0.1666, y: 0.0089}, {colorx: 8845, colory: 2605}],
            ["random", {r: 60, g: 138, b: 164}, {x: 0.267, y: 0.3165}, {colorx: 15184, colory: 20334}],
        ])("processes RGB payload for %s", async (_name, inColor, outColor, outCmdColor) => {
            const device = mockDevice(
                {
                    modelID: "TS0505A",
                    endpoints: [{...DEFAULT_LIGHT_ENDPOINT}],
                },
                "Router",
            );
            const endpoint = device.getEndpoint(1);
            const message = {color: inColor};
            const meta = await defaultMeta(device, message, {});
            const stateColor = (await light_color.convertSet(endpoint, "color", message.color, meta)) as {
                // biome-ignore lint/style/useNamingConvention: API
                state: {color_mode: string; color: {x: number; y: number}};
            };

            expect(stateColor).toStrictEqual({
                state: {color_mode: "xy", color: {x: expect.any(Number), y: expect.any(Number)}},
            });
            expect(stateColor.state.color.x).toBeCloseTo(outColor.x, 3);
            expect(stateColor.state.color.y).toBeCloseTo(outColor.y, 3);
            expect(endpoint.command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveToColor",
                {transtime: 0, optionsMask: 0, optionsOverride: 0, ...outCmdColor},
                getOptions(meta.mapped, endpoint),
            );
        });

        it.each([
            ["white", {hue: 0.0, saturation: 0.0}, {hue: 0.0, saturation: 0.0}, {hue: 0, saturation: 0}],
            ["white", {hue: 360.0, saturation: 100.0}, {hue: 360.0, saturation: 100.0}, {hue: 254, saturation: 254}],
            ["red", {hue: 0.0, saturation: 100.0}, {hue: 0.0, saturation: 100.0}, {hue: 0, saturation: 254}],
            ["green", {hue: 120.0, saturation: 100.0}, {hue: 120.0, saturation: 100.0}, {hue: 85, saturation: 254}],
            ["blue", {hue: 240.0, saturation: 100.0}, {hue: 240.0, saturation: 100.0}, {hue: 169, saturation: 254}],
            ["random", {hue: 234.0, saturation: 54.3}, {hue: 234.0, saturation: 54.3}, {hue: 165, saturation: 138}],
        ])("processes HS payload for %s", async (_name, inColor, outColor, outCmdColor) => {
            const device = mockDevice(
                {
                    modelID: "TS0505A",
                    endpoints: [{...DEFAULT_LIGHT_ENDPOINT}],
                },
                "Router",
            );
            const endpoint = device.getEndpoint(1);
            const message = {color: inColor};
            const meta = await defaultMeta(device, message, {});

            await expect(light_color.convertSet(endpoint, "color", message.color, meta)).resolves.toStrictEqual({
                state: {color_mode: "hs", color: outColor},
            });
            expect(endpoint.command).toHaveBeenCalledWith(
                "lightingColorCtrl",
                "moveToHueAndSaturation",
                {transtime: 0, optionsMask: 0, optionsOverride: 0, ...outCmdColor},
                getOptions(meta.mapped, endpoint),
            );
        });
    });
});
