import {describe, expect, test} from "vitest";
import {decodeGradientColors, encodeGradientColors} from "../src/lib/philips";

describe("lib/philips", () => {
    describe("decodeGradientColors", () => {
        test.each([
            ["4b0101b2875a25411350000000b3474def153e2ad42e98232c7483292800", true, ["#0d31ff", "#1135ff", "#2536ff", "#784dff", "#ff72fb"]],
            ["4b0101b2875a25411350000000b3474def153e2ad42e98232c7483292800", false, ["#ff72fb", "#784dff", "#2536ff", "#1135ff", "#0d31ff"]],
            ["4b010164fb74346b1350000000f3297fda7d55da7d55f3297fda7d552800", true, ["#ff0318", "#ff9f30", "#ff0318", "#ff0318", "#ff9f30"]],
            ["4b010127a0526f5410400000000727640e9f5d0727640e9f5d2000", true, ["#ff0301", "#fbf3ff", "#ff0301", "#fbf3ff"]],
        ])("colors(%s) should be %s", (input, optsReverse, expected) => {
            const ret = decodeGradientColors(input, {reverse: optsReverse});
            expect(ret.colors).toStrictEqual(expected);
        });

        // XY Color
        test.each([
            ["0b00015c05b1ec4e", [0.6915, 0.3083]], // Red (#ff0500)
            ["0b00015c842b32b3", [0.17, 0.7]], // Green (#00ff0e)
            ["0b00011d37272c0c", [0.1532, 0.0475]], // Blue (#0a00ff)
        ])("xy(%s) should be %s", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect([ret.x, ret.y]).toStrictEqual(expected);
        });

        test.each([
            ["4b010110ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", 16],
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", 100],
            ["0f0001044d01ab6f7067", 4],
            ["0f00011a4d01ab6f7067", 26],
            ["0f0000b2ff004c628461", 178],
            ["0b00015c842b32b3", 92],
            ["0b00011d842b32b3", 29],
            ["ab000153df7e446a0180", 83],
            ["030001b2", 178],
            ["03000164", 100],
            ["030001fe", 254],
        ])("brightness(%s) should be %s", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.brightness).toBe(expected);
        });

        test.each([
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", true],
            ["4b010026ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", false],
            ["0f0000044d01ab6f7067", false],
            ["0f0001044d01ab6f7067", true],
            ["0b00015c842b32b3", true],
            ["0b00001d842b32b3", false],
            ["ab000153df7e446a0180", true],
            ["ab000053df7e446a0180", false],
            ["03000164", true],
            ["0300004f", false],
        ])("power(%s) should be %s", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.on).toBe(expected);
        });

        test.each([
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", 0],
            ["4b01012701b1ea4e13500000000e9f5d0727640e9f5d0727640e9f5d2810", 2],
        ])("offset(%s) should be %s", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.offset).toBe(expected);
        });

        test.each([
            ["0f00011dfa0094611b61", 250],
            ["0f00011d7201ab751969", 370],
            ["0f00015cf401d486ce69", 500],
        ])("colorTemperature(%s) should be %s", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.color_temp).toBe(expected);
        });

        test.each([
            ["0f00011dfa0094611b61", "color_temp"],
            ["0b00015c842b32b3", "xy"],
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", "gradient"],
            ["ab000153df7e446a0180", "xy"],
        ])("color_mode(%s) should be %s", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.color_mode).toBe(expected);
        });

        test.each([
            ["ab000153df7e446a0180", "candle"],
            ["ab0001febd9238660280", "fireplace"],
            ["ab0001febe92ab650380", "colorloop"],
            ["ab0001febe92ab659999", "unknown_9999"],
        ])("effect(%s) should be %s", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.name).toBe(expected);
        });
    });

    describe("encodeGradientColors", () => {
        test.each([
            [["#0c32ff", "#1137ff", "#2538ff", "#7951ff", "#ff77f8"], {reverse: true}, "500104001350000000b2a74ef0553f29b42f98f32c70032a2800"],
            [["#0c32ff", "#1137ff", "#2538ff", "#7951ff", "#ff77f8"], {reverse: false}, "50010400135000000070032a98f32c29b42ff0553fb2a74e2800"],
            [["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"], {reverse: true}, "500104001350000000f37981d5ed56d5ed56f37981d5ed562800"],
            [
                ["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"],
                {reverse: true, offset: 2},
                "500104001350000000f37981d5ed56d5ed56f37981d5ed562810",
            ],
            [["#ffffff"], {reverse: true}, "50010400071000000007e7650800"],
            [["#ffffff"], {reverse: false}, "50010400071000000007e7650800"],
        ])("colors(%s) opts(%s) should be %s", (colors, opts, expected) => {
            const ret = encodeGradientColors(colors, opts);
            expect(ret).toStrictEqual(expected);
        });
    });
});
