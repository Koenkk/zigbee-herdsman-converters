import assert from "node:assert";
import {beforeEach, describe, expect, it} from "vitest";
import {light_color} from "../src/converters/toZigbee";
import {findByDevice, type Tz} from "../src/index";
import {Color, ColorHSV, ColorRGB, ColorXY, SUPPORTED_GAMUTS} from "../src/lib/color";
import {getOptions} from "../src/lib/utils";
import {type MockEndpointArgs, mockDevice} from "./utils";

describe("lib/color", () => {
    describe("ColorRGB", () => {
        it.each([[{red: 0.5, green: 0.5, blue: 0.5}]])(".{from,to}Object() - %j", (color) => {
            expect(ColorRGB.fromObject(color).toObject()).toEqual(color);
        });

        it.each([
            ["red", {red: 1.0, green: 0, blue: 0}, {hue: 0, saturation: 100, value: 100}],
            ["green", {red: 0, green: 1.0, blue: 0}, {hue: 120, saturation: 100, value: 100}],
            ["blue", {red: 0, green: 0, blue: 1.0}, {hue: 240, saturation: 100, value: 100}],
            ["white", {red: 1.0, green: 1.0, blue: 1.0}, {hue: 0, saturation: 0, value: 100}],
            ["black", {red: 0, green: 0, blue: 0}, {hue: 0, saturation: 0, value: 0}],
        ])(".toHSV() - %s", (_name, rgb, hsv) => {
            expect(ColorRGB.fromObject(rgb).toHSV().toObject(true)).toStrictEqual(hsv);
        });

        it.each([
            ["red" as const, {red: 1.0, green: 0, blue: 0}],
            ["green" as const, {red: 0, green: 1.0, blue: 0}],
            ["blue" as const, {red: 0, green: 0, blue: 1.0}],
        ])(".toXY() - %s", (name, rgb) => {
            for (const gamut in SUPPORTED_GAMUTS) {
                expect(
                    ColorRGB.fromObject(rgb)
                        .toXY(SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS])
                        .rounded(4)
                        .toObject(),
                    gamut,
                ).toStrictEqual({
                    x: SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS][name][0],
                    y: SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS][name][1],
                });
            }
        });

        it(".toXY() - white", () => {
            for (const gamut in SUPPORTED_GAMUTS) {
                const color = ColorRGB.fromObject({red: 1.0, green: 1.0, blue: 1.0})
                    .toXY(SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS])
                    .rounded(4)
                    .toObject();
                expect(color.x, gamut).toBeCloseTo(SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS].white[0], 3);
                expect(color.y, gamut).toBeCloseTo(SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS].white[1], 3);
            }
        });

        expect(ColorRGB.fromHex("#663399").toHex()).toBe("#663399");
        expect(ColorRGB.fromHex("#020202").toHex()).toBe("#020202");
    });

    describe("ColorHSV", () => {
        it.each([
            [{hue: 0, saturation: 100, value: 100}, null],
            [{hue: 0, saturation: 100}, null],
            [{hue: 0}, null],
            [{saturation: 100}, null],
        ])(".{from,to}Object() - %j", (input, output) => {
            expect(ColorHSV.fromObject(input).toObject(true)).toStrictEqual(output || input);
        });

        it.each([
            [{hue: 0, saturation: 100, value: 100}, null],
            [{hue: 0, saturation: 100}, null],
            [{hue: 0}, null],
            [{saturation: 100}, null],
            [
                {hue: 359.31231, saturation: 99.969123, value: 99.983131},
                {hue: 359.3, saturation: 100, value: 100},
            ],
        ])(".{from,to}Object(), rounded - %j", (input, output) => {
            expect(ColorHSV.fromObject(input).rounded(1).toObject(true)).toStrictEqual(output || input);
        });

        it.each([
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

        it.each([
            ["red", {hue: 0, saturation: 100, value: 100}, "red" as const],
            ["red (only hue)", {hue: 0}, "red" as const],
            ["green", {hue: 120, saturation: 100, value: 100}, "green" as const],
            ["blue", {hue: 240, saturation: 100, value: 100}, "blue" as const],
        ])(".toXY() - %s", (_name, hsv, gamutKey) => {
            for (const gamut in SUPPORTED_GAMUTS) {
                expect(
                    ColorHSV.fromObject(hsv)
                        .toXY(SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS])
                        .rounded(4)
                        .toObject(),
                    gamut,
                ).toStrictEqual({
                    x: SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS][gamutKey][0],
                    y: SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS][gamutKey][1],
                });
            }
        });

        it.each([
            ["red hue", {hue: 0, saturation: 0, value: 100}],
            ["blue hue", {hue: 120, saturation: 0, value: 100}],
            ["green hue", {hue: 240, saturation: 0, value: 100}],
            ["only saturation", {saturation: 0}],
        ])(".toXY() - white - %s", (_name, hsv) => {
            for (const gamut in SUPPORTED_GAMUTS) {
                const color = ColorHSV.fromObject(hsv)
                    .toXY(SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS])
                    .rounded(4)
                    .toObject();
                expect(color.x, gamut).toBeCloseTo(SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS].white[0], 3);
                expect(color.y, gamut).toBeCloseTo(SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS].white[1], 3);
            }
        });
    });

    describe("ColorXY", () => {
        it.each([[{x: 5, y: 0.5}]])(".{from,to}Object() - %j", (color) => {
            expect(ColorXY.fromObject(color).toObject()).toStrictEqual(color);
        });

        it.each([
            ["red" as const, {red: 1.0, green: 0, blue: 0}],
            ["green" as const, {red: 0, green: 1.0, blue: 0}],
            ["blue" as const, {red: 0, green: 0, blue: 1.0}],
        ])(".toRGB() - %s", (name, rgb) => {
            for (const gamut in SUPPORTED_GAMUTS) {
                expect(
                    ColorXY.fromObject({
                        x: SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS][name][0],
                        y: SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS][name][1],
                    })
                        .toRGB(SUPPORTED_GAMUTS[gamut as keyof typeof SUPPORTED_GAMUTS])
                        .rounded(4)
                        .toObject(),
                    gamut,
                ).toStrictEqual(rgb);
            }
        });

        it.each([[500], [370], [150]])(".{to,from}Mireds() - %j", (mireds) => {
            const asXY = ColorXY.fromMireds(mireds);
            const backConv = asXY.toMireds();
            const error = Math.abs(backConv - mireds);
            // better precision would require better lookup table or continuous conversion function
            expect(error).toBeLessThan(2.3);
        });
    });

    describe("Color", () => {
        it.each([
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
                expect(extracted.hsv.toObject(true)).toStrictEqual(expected.hsv);
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

        it.each([[{}], [{v: 100}], [{unknown_property: 42}]])(".fromConverterArg() invalid - %j", (value) => {
            expect(() => Color.fromConverterArg(value)).toThrow();
        });
    });

    describe("tz.light_color with CIE 1931", () => {
        const MAX_X = SUPPORTED_GAMUTS.cie1931.red[0];
        const MAX_Y = SUPPORTED_GAMUTS.cie1931.green[1];
        const MIN_X = SUPPORTED_GAMUTS.cie1931.blue[0];
        const MIN_Y = SUPPORTED_GAMUTS.cie1931.blue[1];

        const defaultMeta = async (device: Tz.Meta["device"], message: Tz.Meta["message"], state: Tz.Meta["state"]): Promise<Tz.Meta> => {
            assert(device);
            const definition = await findByDevice(device);
            assert(definition);

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
            assert(endpoint);
            const message = {color: inColor};
            const meta = await defaultMeta(device, message, {});

            await expect(light_color.convertSet?.(endpoint, "color", message.color, meta)).resolves.toStrictEqual({
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
            ["white", {r: 255, g: 255, b: 255}, {x: 1 / 3, y: 1 / 3}, {colorx: 21843, colory: 21843}],
            ["red", {r: 255, g: 0, b: 0}, {x: 0.7347, y: 0.2653}, {colorx: 48149, colory: 17386}],
            ["green", {r: 0, g: 255, b: 0}, {x: 0.2738, y: 0.7174}, {colorx: 17943, colory: 47015}],
            ["blue", {r: 0, g: 0, b: 255}, {x: 0.1666, y: 0.0089}, {colorx: 10918, colory: 583}],
            ["random", {r: 60, g: 138, b: 164}, {x: 0.267, y: 0.3165}, {colorx: 17498, colory: 20748}],
        ])("processes RGB payload for %s", async (_name, inColor, outColor, outCmdColor) => {
            const device = mockDevice(
                {
                    modelID: "TS0505A",
                    endpoints: [{...DEFAULT_LIGHT_ENDPOINT}],
                },
                "Router",
            );
            const endpoint = device.getEndpoint(1);
            assert(endpoint);
            const message = {color: inColor};
            const meta = await defaultMeta(device, message, {});
            const stateColor = (await light_color.convertSet?.(endpoint, "color", message.color, meta)) as {
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
            assert(endpoint);
            const message = {color: inColor};
            const meta = await defaultMeta(device, message, {});

            await expect(light_color.convertSet?.(endpoint, "color", message.color, meta)).resolves.toStrictEqual({
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

    it.each([
        ["#0c32ff", 12, 50, 255, 0.158, 0.042],
        ["#1137ff", 17, 55, 255, 0.158, 0.047],
        ["#2538ff", 37, 56, 255, 0.166, 0.051],
        ["#7951ff", 121, 81, 255, 0.244, 0.105],
        ["#ff77f8", 255, 119, 248, 0.433, 0.202],
        ["#ff0517", 255, 5, 23, 0.729, 0.264],
        ["#ffa52c", 255, 165, 44, 0.571, 0.4],
    ])("Wide gamut from/to hex %s", (val, r, g, b, x, y) => {
        const rgb = ColorRGB.fromHex(val);
        const hexFromRgb = rgb.toHex();
        const xy = rgb.toXY(SUPPORTED_GAMUTS.wide);
        const rgbFromXY = xy.toRGB(SUPPORTED_GAMUTS.wide);
        const hexFromXY = rgbFromXY.toHex();

        expect(rgb.red).toBeCloseTo(r / 255, 0);
        expect(rgb.green).toBeCloseTo(g / 255, 0);
        expect(rgb.blue).toBeCloseTo(b / 255, 0);

        expect(rgbFromXY.red).toBeCloseTo(r / 255, 1);
        expect(rgbFromXY.green).toBeCloseTo(g / 255, 1);
        expect(rgbFromXY.blue).toBeCloseTo(b / 255, 1);

        expect(xy.x).toBeCloseTo(x, 3);
        expect(xy.y).toBeCloseTo(y, 3);

        expect(val).toStrictEqual(hexFromRgb);
        expect(val).toStrictEqual(hexFromXY);
    });
});
