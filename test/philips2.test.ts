import {describe, expect, test} from "vitest";
import {ColorXY} from "../src/lib/color";
import {DecodeManuSpecificPhilips2, EncodeManuSpecificPhilips2, HueEffectType, HueGradientStyle, type Philips2Data} from "../src/lib/philips";

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToBuffer(hex: string): Buffer {
    return Buffer.from(hex, "hex");
}

function bufferToHex(buf: ArrayBuffer): string {
    return Buffer.from(buf).toString("hex");
}

/** Round to N decimal places for comparison */
function r(n: number, dp = 4): number {
    const f = 10 ** dp;
    return Math.round(n * f) / f;
}

// ─── Constants ──────────────────────────────────────────────────────────────
// Per Bifrost spec: gradient XY scaled to Wide Gamut bounds
const MAX_X = 0.7347;
const MAX_Y = 0.8264;

// ─── Bifrost spec examples ─────────────────────────────────────────────────
// https://github.com/chrivers/bifrost/blob/master/doc/hue-zigbee-format.md
const BIFROST_EXAMPLES = {
    // 5 gradient colors, Linear style, fadeSpeed=0, scale=7.0, offset=11.0
    gradient_5_linear: "50010000135000fffff3620c400f5bf4120d400f5b0cf4f43858",
    // on, brightness=46, colorXY, effectType=Cosmos, effectSpeed≈0.498
    cosmos_effect: "ab00012e6f2f40100f7f",
    // on, fadeSpeed=4, 3 gradient colors Mirrored, scale=3.0
    gradient_3_mirrored: "51010104000d30040000fa441eb7cb49bff65f1800",
    // on, colorXY, fadeSpeed=4
    simple_color: "19000132518f530400",
    // off, fadeSpeed=8
    turn_off: "1100000800",
    // on, brightness=254, colorXY, fadeSpeed=4, effectType=Sparkle, effectSpeed≈0.502
    sparkle_effect: "bb0001feb575156904000a80",
    // on, fadeSpeed=4, 5 gradient colors Scattered, scale=5.0
    gradient_5_scattered: "51010104001350020000fa441e590834b7cb49ff8857bff65f2800",
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("DecodeManuSpecificPhilips2", () => {
    describe("Bifrost spec examples decode correctly", () => {
        test("Example 1: 5-color Linear gradient with fadeSpeed and params", () => {
            const d = DecodeManuSpecificPhilips2(hexToBuffer(BIFROST_EXAMPLES.gradient_5_linear));
            expect(d.onOff).toBeUndefined();
            expect(d.brightness).toBeUndefined();
            expect(d.fadeSpeed).toBe(0);
            expect(d.gradientColors).toBeDefined();
            expect(d.gradientColors?.style).toBe(HueGradientStyle.Linear);
            expect(d.gradientColors?.colors).toHaveLength(5);
            expect(d.gradientParams).toBeDefined();
            expect(d.gradientParams?.scale).toBe(7.0);
            expect(d.gradientParams?.offset).toBe(11.0);
        });

        test("Example 2: Cosmos effect with color and brightness", () => {
            const d = DecodeManuSpecificPhilips2(hexToBuffer(BIFROST_EXAMPLES.cosmos_effect));
            expect(d.onOff).toBe(true);
            expect(d.brightness).toBe(46);
            expect(d.colorXY).toBeDefined();
            expect(r(d.colorXY?.x)).toBeCloseTo(0.1853, 3);
            expect(r(d.colorXY?.y)).toBeCloseTo(0.0635, 3);
            expect(d.effectType).toBe(HueEffectType.Cosmos);
            expect(d.effectSpeed).toBeCloseTo(0.498, 2);
        });

        test("Example 3: 3-color Mirrored gradient", () => {
            const d = DecodeManuSpecificPhilips2(hexToBuffer(BIFROST_EXAMPLES.gradient_3_mirrored));
            expect(d.onOff).toBe(true);
            expect(d.fadeSpeed).toBe(4);
            expect(d.gradientColors?.style).toBe(HueGradientStyle.Mirrored);
            expect(d.gradientColors?.colors).toHaveLength(3);
            expect(d.gradientParams?.scale).toBe(3.0);
            expect(d.gradientParams?.offset).toBe(0.0);
        });

        test("Example 4: simple colorXY with fadeSpeed", () => {
            const d = DecodeManuSpecificPhilips2(hexToBuffer(BIFROST_EXAMPLES.simple_color));
            expect(d.onOff).toBe(true);
            expect(r(d.colorXY?.x)).toBeCloseTo(0.3172, 3);
            expect(r(d.colorXY?.y)).toBeCloseTo(0.3264, 3);
            expect(d.fadeSpeed).toBe(4);
            // No brightness, no effect, no gradient
            expect(d.brightness).toBeUndefined();
            expect(d.effectType).toBeUndefined();
            expect(d.gradientColors).toBeUndefined();
        });

        test("Example 5: turn off with fadeSpeed", () => {
            const d = DecodeManuSpecificPhilips2(hexToBuffer(BIFROST_EXAMPLES.turn_off));
            expect(d.onOff).toBe(false);
            expect(d.fadeSpeed).toBe(8);
            // Nothing else set
            expect(d.brightness).toBeUndefined();
            expect(d.colorXY).toBeUndefined();
            expect(d.effectType).toBeUndefined();
            expect(d.gradientColors).toBeUndefined();
        });

        test("Example 6: Sparkle effect with all scalar fields", () => {
            const d = DecodeManuSpecificPhilips2(hexToBuffer(BIFROST_EXAMPLES.sparkle_effect));
            expect(d.onOff).toBe(true);
            expect(d.brightness).toBe(254);
            expect(d.colorXY).toBeDefined();
            expect(r(d.colorXY?.x)).toBeCloseTo(0.4598, 3);
            expect(r(d.colorXY?.y)).toBeCloseTo(0.4105, 3);
            expect(d.fadeSpeed).toBe(4);
            expect(d.effectType).toBe(HueEffectType.Sparkle);
            expect(d.effectSpeed).toBeCloseTo(0.502, 2);
        });

        test("Example 7: 5-color Scattered gradient", () => {
            const d = DecodeManuSpecificPhilips2(hexToBuffer(BIFROST_EXAMPLES.gradient_5_scattered));
            expect(d.onOff).toBe(true);
            expect(d.fadeSpeed).toBe(4);
            expect(d.gradientColors?.style).toBe(HueGradientStyle.Scattered);
            expect(d.gradientColors?.colors).toHaveLength(5);
            expect(d.gradientParams?.scale).toBe(5.0);
            expect(d.gradientParams?.offset).toBe(0.0);
        });

        test("Examples 3 and 7 share colors at indices 0, 2/1, 4/2", () => {
            // Both were captured from the same session — colors 0 and 2 of example 7
            // should match colors 0 and 1 of example 3
            const d3 = DecodeManuSpecificPhilips2(hexToBuffer(BIFROST_EXAMPLES.gradient_3_mirrored));
            const d7 = DecodeManuSpecificPhilips2(hexToBuffer(BIFROST_EXAMPLES.gradient_5_scattered));
            // Color 0 in both
            expect(r(d7.gradientColors?.colors[0].x)).toBe(r(d3.gradientColors?.colors[0].x));
            expect(r(d7.gradientColors?.colors[0].y)).toBe(r(d3.gradientColors?.colors[0].y));
            // Color 2 in ex7 = color 1 in ex3
            expect(r(d7.gradientColors?.colors[2].x)).toBe(r(d3.gradientColors?.colors[1].x));
            expect(r(d7.gradientColors?.colors[2].y)).toBe(r(d3.gradientColors?.colors[1].y));
            // Color 4 in ex7 = color 2 in ex3
            expect(r(d7.gradientColors?.colors[4].x)).toBe(r(d3.gradientColors?.colors[2].x));
            expect(r(d7.gradientColors?.colors[4].y)).toBe(r(d3.gradientColors?.colors[2].y));
        });
    });

    describe("consumes all bytes (no leftover)", () => {
        test.each(Object.entries(BIFROST_EXAMPLES))("%s", (_name, hex) => {
            // Encode what we decoded, verify output length matches input
            const d = DecodeManuSpecificPhilips2(hexToBuffer(hex));
            const reencoded = EncodeManuSpecificPhilips2(d);
            expect(reencoded.byteLength).toBe(hex.length / 2);
        });
    });

    describe("individual field decoding", () => {
        test("ON_OFF only (off)", () => {
            // flags=0x0001, onOff=0x00
            const d = DecodeManuSpecificPhilips2(hexToBuffer("010000"));
            expect(d.onOff).toBe(false);
        });

        test("ON_OFF only (on)", () => {
            const d = DecodeManuSpecificPhilips2(hexToBuffer("010001"));
            expect(d.onOff).toBe(true);
        });

        test("BRIGHTNESS only", () => {
            // flags=0x0002, brightness=0x80
            const d = DecodeManuSpecificPhilips2(hexToBuffer("020080"));
            expect(d.brightness).toBe(128);
        });

        test("COLOR_MIREK only", () => {
            // flags=0x0004, mirek=0x019A (410) LE
            const d = DecodeManuSpecificPhilips2(hexToBuffer("04009a01"));
            expect(d.colorMirek).toBe(410);
        });

        test("EFFECT_TYPE: all known effects", () => {
            const effects: [number, HueEffectType][] = [
                [0x00, HueEffectType.NoEffect],
                [0x01, HueEffectType.Candle],
                [0x02, HueEffectType.Fireplace],
                [0x03, HueEffectType.Prism],
                [0x09, HueEffectType.Sunrise],
                [0x0a, HueEffectType.Sparkle],
                [0x0b, HueEffectType.Opal],
                [0x0c, HueEffectType.Glisten],
                [0x0d, HueEffectType.Sunset],
                [0x0e, HueEffectType.Underwater],
                [0x0f, HueEffectType.Cosmos],
                [0x10, HueEffectType.Sunbeam],
                [0x11, HueEffectType.Enchant],
            ];
            for (const [byte, expected] of effects) {
                // flags=0x0020 (EFFECT_TYPE), then the byte
                const hex = `2000${byte.toString(16).padStart(2, "0")}`;
                const d = DecodeManuSpecificPhilips2(hexToBuffer(hex));
                expect(d.effectType).toBe(expected);
            }
        });
    });
});

describe("EncodeManuSpecificPhilips2", () => {
    describe("individual fields", () => {
        test("ON_OFF true", () => {
            const hex = bufferToHex(EncodeManuSpecificPhilips2({onOff: true}));
            expect(hex).toBe("010001");
        });

        test("ON_OFF false", () => {
            const hex = bufferToHex(EncodeManuSpecificPhilips2({onOff: false}));
            expect(hex).toBe("010000");
        });

        test("brightness", () => {
            const hex = bufferToHex(EncodeManuSpecificPhilips2({brightness: 128}));
            expect(hex).toBe("020080");
        });

        test("brightness clamps to 1..254", () => {
            const low = bufferToHex(EncodeManuSpecificPhilips2({brightness: 0}));
            const high = bufferToHex(EncodeManuSpecificPhilips2({brightness: 255}));
            expect(low).toBe("020001"); // clamped to 1
            expect(high).toBe("0200fe"); // clamped to 254
        });

        test("colorMirek", () => {
            const hex = bufferToHex(EncodeManuSpecificPhilips2({colorMirek: 410}));
            expect(hex).toBe("04009a01"); // 410 = 0x019A LE
        });

        test("fadeSpeed", () => {
            const hex = bufferToHex(EncodeManuSpecificPhilips2({fadeSpeed: 4}));
            expect(hex).toBe("10000400"); // 4 LE
        });

        test("effectType", () => {
            const hex = bufferToHex(EncodeManuSpecificPhilips2({effectType: HueEffectType.Sunset}));
            expect(hex).toBe("20000d");
        });

        test("gradientParams scale=7.0 offset=0.0", () => {
            const hex = bufferToHex(
                EncodeManuSpecificPhilips2({
                    gradientParams: {scale: 7.0, offset: 0.0},
                }),
            );
            // flags=0x0040, scale=56 (7*8), offset=0
            expect(hex).toBe("40003800");
        });

        test("gradientParams fractional: scale=1.125 offset=2.5", () => {
            const hex = bufferToHex(
                EncodeManuSpecificPhilips2({
                    gradientParams: {scale: 1.125, offset: 2.5},
                }),
            );
            // scale=1.125*8=9, offset=2.5*8=20
            expect(hex).toBe("40000914");
        });
    });

    describe("flag ordering matches wire format", () => {
        test("ON_OFF + BRIGHTNESS flag bits", () => {
            const hex = bufferToHex(
                EncodeManuSpecificPhilips2({
                    onOff: true,
                    brightness: 100,
                }),
            );
            // flags=0x0003 LE, then onOff=1, brightness=100
            expect(hex).toBe("03000164");
        });

        test("ON_OFF + FADE_SPEED", () => {
            const hex = bufferToHex(
                EncodeManuSpecificPhilips2({
                    onOff: false,
                    fadeSpeed: 8,
                }),
            );
            // flags=0x0011 LE = "1100", then onOff=0, fadeSpeed=8 LE
            expect(hex).toBe("1100000800");
        });

        test("matches Bifrost Example 5: turn off with fadeSpeed=8", () => {
            const hex = bufferToHex(
                EncodeManuSpecificPhilips2({
                    onOff: false,
                    fadeSpeed: 8,
                }),
            );
            expect(hex).toBe(BIFROST_EXAMPLES.turn_off);
        });
    });

    describe("gradient colors encoding", () => {
        test("single color, Linear style", () => {
            const hex = bufferToHex(
                EncodeManuSpecificPhilips2({
                    gradientColors: {
                        style: HueGradientStyle.Linear,
                        colors: [ColorXY.fromObject({x: 0, y: 0})],
                    },
                }),
            );
            // flags=0x0100 LE = "0001", size=7, count=0x10, style=0x00,
            // reserved=0000, color=[00,00,00] → 10 bytes
            expect(hex).toBe("00010710000000000000");
        });

        test("gradient style byte: Linear=0x00, Scattered=0x02, Mirrored=0x04", () => {
            const makeGrad = (style: HueGradientStyle) =>
                EncodeManuSpecificPhilips2({
                    gradientColors: {
                        style,
                        colors: [ColorXY.fromObject({x: 0, y: 0})],
                    },
                });
            const linear = Buffer.from(makeGrad(HueGradientStyle.Linear));
            const scattered = Buffer.from(makeGrad(HueGradientStyle.Scattered));
            const mirrored = Buffer.from(makeGrad(HueGradientStyle.Mirrored));
            // Style byte is at offset 4 (2 flags + 1 size + 1 count)
            expect(linear[4]).toBe(0x00);
            expect(scattered[4]).toBe(0x02);
            expect(mirrored[4]).toBe(0x04);
        });

        test("color count byte stores count in high nibble", () => {
            const make = (n: number) => {
                const colors = Array.from({length: n}, () => ColorXY.fromObject({x: 0.3, y: 0.3}));
                return Buffer.from(
                    EncodeManuSpecificPhilips2({
                        gradientColors: {style: HueGradientStyle.Linear, colors},
                    }),
                );
            };
            // Count byte at offset 3 (2 flags + 1 size), count in high nibble
            expect(make(1)[3]).toBe(1 << 4);
            expect(make(5)[3]).toBe(5 << 4);
            expect(make(9)[3]).toBe(9 << 4);
        });

        test("size byte = 4 + 3*color_count", () => {
            const make = (n: number) => {
                const colors = Array.from({length: n}, () => ColorXY.fromObject({x: 0.3, y: 0.3}));
                return Buffer.from(
                    EncodeManuSpecificPhilips2({
                        gradientColors: {style: HueGradientStyle.Linear, colors},
                    }),
                );
            };
            // Size byte at offset 2 (after 2 flag bytes)
            expect(make(1)[2]).toBe(4 + 3);
            expect(make(3)[2]).toBe(4 + 9);
            expect(make(5)[2]).toBe(4 + 15);
            expect(make(9)[2]).toBe(4 + 27);
        });
    });
});

describe("round-trip: Encode → Decode", () => {
    test("ON_OFF round-trips", () => {
        for (const val of [true, false]) {
            const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2({onOff: val})));
            expect(d.onOff).toBe(val);
        }
    });

    test("brightness round-trips for all valid values 1..254", () => {
        for (const val of [1, 2, 64, 127, 128, 200, 253, 254]) {
            const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2({brightness: val})));
            expect(d.brightness).toBe(val);
        }
    });

    test("colorMirek round-trips", () => {
        for (const val of [153, 250, 370, 500]) {
            const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2({colorMirek: val})));
            expect(d.colorMirek).toBe(val);
        }
    });

    test("colorXY round-trips within 16-bit precision", () => {
        const cases = [
            {x: 0.0, y: 0.0},
            {x: 0.3127, y: 0.329}, // D65 white point
            {x: 0.6915, y: 0.3083}, // Hue gamut red
            {x: 0.17, y: 0.7}, // Hue gamut green
            {x: 0.1532, y: 0.0475}, // Hue gamut blue
            {x: 1.0, y: 1.0}, // max
        ];
        for (const {x, y} of cases) {
            const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2({colorXY: ColorXY.fromObject({x, y})})));
            expect(d.colorXY?.x).toBeCloseTo(x, 4);
            expect(d.colorXY?.y).toBeCloseTo(y, 4);
        }
    });

    test("fadeSpeed round-trips", () => {
        for (const val of [0, 1, 4, 8, 256, 65535]) {
            const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2({fadeSpeed: val})));
            expect(d.fadeSpeed).toBe(val);
        }
    });

    test("effectType round-trips for all known effects", () => {
        for (const et of Object.values(HueEffectType).filter((v) => typeof v === "number")) {
            const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2({effectType: et as HueEffectType})));
            expect(d.effectType).toBe(et);
        }
    });

    test("effectSpeed round-trips within 8-bit precision", () => {
        for (const val of [0.0, 0.25, 0.5, 0.502, 1.0]) {
            const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2({effectSpeed: val})));
            expect(d.effectSpeed).toBeCloseTo(val, 2);
        }
    });

    test("gradientParams round-trips at 0.125 resolution", () => {
        const cases = [
            {scale: 0.0, offset: 0.0},
            {scale: 1.0, offset: 0.0},
            {scale: 7.0, offset: 0.0},
            {scale: 7.125, offset: 3.5},
            {scale: 0.125, offset: 0.125},
        ];
        for (const gp of cases) {
            const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2({gradientParams: gp})));
            expect(d.gradientParams?.scale).toBe(gp.scale);
            expect(d.gradientParams?.offset).toBe(gp.offset);
        }
    });

    test("gradient colors round-trip within 12-bit precision", () => {
        const colors = [
            {x: 0.6915, y: 0.3083}, // red-ish
            {x: 0.17, y: 0.7}, // green-ish
            {x: 0.1532, y: 0.0475}, // blue-ish
        ].map((c) => ColorXY.fromObject(c));
        const data: Philips2Data = {
            gradientColors: {style: HueGradientStyle.Mirrored, colors},
        };
        const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2(data)));
        expect(d.gradientColors?.style).toBe(HueGradientStyle.Mirrored);
        expect(d.gradientColors?.colors).toHaveLength(3);
        for (let i = 0; i < colors.length; i++) {
            expect(d.gradientColors?.colors[i].x).toBeCloseTo(colors[i].x, 3);
            expect(d.gradientColors?.colors[i].y).toBeCloseTo(colors[i].y, 3);
        }
    });

    test("gradient with 9 colors round-trips", () => {
        const colors = Array.from({length: 9}, (_, i) =>
            ColorXY.fromObject({
                x: (i / 8) * MAX_X,
                y: (1 - i / 8) * MAX_Y,
            }),
        );
        const data: Philips2Data = {
            gradientColors: {style: HueGradientStyle.Scattered, colors},
        };
        const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2(data)));
        expect(d.gradientColors?.colors).toHaveLength(9);
        expect(d.gradientColors?.style).toBe(HueGradientStyle.Scattered);
        for (let i = 0; i < 9; i++) {
            expect(d.gradientColors?.colors[i].x).toBeCloseTo(colors[i].x, 3);
            expect(d.gradientColors?.colors[i].y).toBeCloseTo(colors[i].y, 3);
        }
    });

    test("all fields simultaneously round-trip", () => {
        const data: Philips2Data = {
            onOff: true,
            brightness: 180,
            colorXY: ColorXY.fromObject({x: 0.4, y: 0.35}),
            fadeSpeed: 4,
            effectType: HueEffectType.Fireplace,
            effectSpeed: 0.75,
            gradientColors: {
                style: HueGradientStyle.Mirrored,
                colors: [ColorXY.fromObject({x: 0.6, y: 0.3}), ColorXY.fromObject({x: 0.2, y: 0.5})],
            },
            gradientParams: {scale: 3.0, offset: 1.5},
        };
        const d = DecodeManuSpecificPhilips2(Buffer.from(EncodeManuSpecificPhilips2(data)));
        expect(d.onOff).toBe(true);
        expect(d.brightness).toBe(180);
        expect(d.colorXY?.x).toBeCloseTo(0.4, 4);
        expect(d.colorXY?.y).toBeCloseTo(0.35, 4);
        expect(d.fadeSpeed).toBe(4);
        expect(d.effectType).toBe(HueEffectType.Fireplace);
        expect(d.effectSpeed).toBeCloseTo(0.75, 2);
        expect(d.gradientColors?.style).toBe(HueGradientStyle.Mirrored);
        expect(d.gradientColors?.colors).toHaveLength(2);
        expect(d.gradientColors?.colors[0].x).toBeCloseTo(0.6, 3);
        expect(d.gradientColors?.colors[0].y).toBeCloseTo(0.3, 3);
        expect(d.gradientColors?.colors[1].x).toBeCloseTo(0.2, 3);
        expect(d.gradientColors?.colors[1].y).toBeCloseTo(0.5, 3);
        expect(d.gradientParams?.scale).toBe(3.0);
        expect(d.gradientParams?.offset).toBe(1.5);
    });
});

describe("round-trip: Decode → Encode → Decode", () => {
    test.each(Object.entries(BIFROST_EXAMPLES))("Bifrost example %s", (_name, hex) => {
        const d1 = DecodeManuSpecificPhilips2(hexToBuffer(hex));
        const reencoded = EncodeManuSpecificPhilips2(d1);
        const d2 = DecodeManuSpecificPhilips2(Buffer.from(reencoded));

        // Scalar fields should be identical
        expect(d2.onOff).toBe(d1.onOff);
        expect(d2.brightness).toBe(d1.brightness);
        expect(d2.colorMirek).toBe(d1.colorMirek);
        expect(d2.fadeSpeed).toBe(d1.fadeSpeed);
        expect(d2.effectType).toBe(d1.effectType);

        // Float fields within quantization precision
        if (d1.colorXY) {
            expect(d2.colorXY?.x).toBeCloseTo(d1.colorXY.x, 4);
            expect(d2.colorXY?.y).toBeCloseTo(d1.colorXY.y, 4);
        }
        if (d1.effectSpeed !== undefined) {
            expect(d2.effectSpeed).toBeCloseTo(d1.effectSpeed, 2);
        }
        if (d1.gradientParams) {
            expect(d2.gradientParams?.scale).toBe(d1.gradientParams.scale);
            expect(d2.gradientParams?.offset).toBe(d1.gradientParams.offset);
        }
        if (d1.gradientColors) {
            expect(d2.gradientColors?.style).toBe(d1.gradientColors.style);
            expect(d2.gradientColors?.colors).toHaveLength(d1.gradientColors.colors.length);
            for (let i = 0; i < d1.gradientColors.colors.length; i++) {
                expect(d2.gradientColors?.colors[i].x).toBeCloseTo(d1.gradientColors.colors[i].x, 3);
                expect(d2.gradientColors?.colors[i].y).toBeCloseTo(d1.gradientColors.colors[i].y, 3);
            }
        }
    });
});

describe("gradient color byte packing", () => {
    test("Bifrost spec example: x=0x123, y=0x456 packs to [0x23, 0x61, 0x45]", () => {
        // Encode a color whose quantized values are x=0x123, y=0x456
        // x_float = (0x123 / 4095) * MAX_X
        // y_float = (0x456 / 4095) * MAX_Y
        const x_float = (0x123 / 4095) * MAX_X;
        const y_float = (0x456 / 4095) * MAX_Y;
        const data: Philips2Data = {
            gradientColors: {
                style: HueGradientStyle.Linear,
                colors: [ColorXY.fromObject({x: x_float, y: y_float})],
            },
        };
        const buf = Buffer.from(EncodeManuSpecificPhilips2(data));
        // Color bytes start at offset 7 (2 flags + 1 size + 1 count + 1 style + 2 reserved)
        expect(buf[7]).toBe(0x23);
        expect(buf[8]).toBe(0x61);
        expect(buf[9]).toBe(0x45);
    });

    test("edge case: x=0x000, y=0x000 packs to [0x00, 0x00, 0x00]", () => {
        const data: Philips2Data = {
            gradientColors: {
                style: HueGradientStyle.Linear,
                colors: [ColorXY.fromObject({x: 0, y: 0})],
            },
        };
        const buf = Buffer.from(EncodeManuSpecificPhilips2(data));
        expect(buf[7]).toBe(0x00);
        expect(buf[8]).toBe(0x00);
        expect(buf[9]).toBe(0x00);
    });

    test("edge case: x=0xFFF, y=0xFFF packs to [0xFF, 0xFF, 0xFF]", () => {
        // x = (0xFFF/4095)*MAX_X = MAX_X, y = (0xFFF/4095)*MAX_Y = MAX_Y
        const data: Philips2Data = {
            gradientColors: {
                style: HueGradientStyle.Linear,
                colors: [ColorXY.fromObject({x: MAX_X, y: MAX_Y})],
            },
        };
        const buf = Buffer.from(EncodeManuSpecificPhilips2(data));
        expect(buf[7]).toBe(0xff);
        expect(buf[8]).toBe(0xff);
        expect(buf[9]).toBe(0xff);
    });

    test("edge case: x=0xFFF, y=0x000 packs to [0xFF, 0x0F, 0x00]", () => {
        const data: Philips2Data = {
            gradientColors: {
                style: HueGradientStyle.Linear,
                colors: [ColorXY.fromObject({x: MAX_X, y: 0})],
            },
        };
        const buf = Buffer.from(EncodeManuSpecificPhilips2(data));
        expect(buf[7]).toBe(0xff);
        expect(buf[8]).toBe(0x0f);
        expect(buf[9]).toBe(0x00);
    });

    test("edge case: x=0x000, y=0xFFF packs to [0x00, 0xF0, 0xFF]", () => {
        const data: Philips2Data = {
            gradientColors: {
                style: HueGradientStyle.Linear,
                colors: [ColorXY.fromObject({x: 0, y: MAX_Y})],
            },
        };
        const buf = Buffer.from(EncodeManuSpecificPhilips2(data));
        expect(buf[7]).toBe(0x00);
        expect(buf[8]).toBe(0xf0);
        expect(buf[9]).toBe(0xff);
    });
});

describe("wire order: GRADIENT_COLORS before EFFECT_SPEED before GRADIENT_PARAMS", () => {
    test("non-monotonic field order per Bifrost spec", () => {
        // This is the critical wire-order test. The flag bits are:
        //   GRADIENT_PARAMS = 0x0040 (bit 6)
        //   EFFECT_SPEED    = 0x0080 (bit 7)
        //   GRADIENT_COLORS = 0x0100 (bit 8)
        // But wire order is GRADIENT_COLORS → EFFECT_SPEED → GRADIENT_PARAMS
        // (reversed relative to flag bits)
        const data: Philips2Data = {
            gradientColors: {
                style: HueGradientStyle.Linear,
                colors: [ColorXY.fromObject({x: 0.3, y: 0.3})],
            },
            effectSpeed: 0.5,
            gradientParams: {scale: 2.0, offset: 0.0},
        };
        const buf = Buffer.from(EncodeManuSpecificPhilips2(data));
        // Flags at [0:1]: should be 0x01C0 LE = "c001"
        expect(buf.readUInt16LE(0)).toBe(0x01c0);
        // After flags (2 bytes), wire order:
        // 1. GRADIENT_COLORS: size=7, count=0x10, style=0, reserved=0000, 3 color bytes
        const gradientStart = 2;
        const gradientSize = buf[gradientStart]; // 7
        expect(gradientSize).toBe(7); // 4 header + 3*1 color
        const afterGradient = gradientStart + gradientSize + 1; // 2 + 7 + 1 = 10
        // 2. EFFECT_SPEED: 1 byte
        // scaleFloatToIntPow2(0.5, 8) = 0.5 * 255 = 127.5, truncated by setUint8 to 127
        const effectSpeedByte = buf[afterGradient];
        expect(effectSpeedByte).toBe(127);
        // 3. GRADIENT_PARAMS: 2 bytes
        const scaleEncoded = buf[afterGradient + 1];
        const offsetEncoded = buf[afterGradient + 2];
        expect(scaleEncoded).toBe(16); // 2.0 * 8
        expect(offsetEncoded).toBe(0); // 0.0 * 8
    });
});

describe("empty encoding", () => {
    test("empty Philips2Data encodes to 2-byte zero header", () => {
        const buf = EncodeManuSpecificPhilips2({});
        expect(buf.byteLength).toBe(2);
        expect(Buffer.from(buf).readUInt16LE(0)).toBe(0);
    });
});
