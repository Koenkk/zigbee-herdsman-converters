import {describe, expect, it} from "vitest";
import {decodeGradientColors, encodeGradientColors} from "../src/lib/philips";

describe("lib/philips", () => {
    describe("decodeGradientColors", () => {
        it.each([
            [
                Buffer.from("4b0101b2875a25411350000000b3474def153e2ad42e98232c7483292800", "hex"),
                true,
                ["#0c32ff", "#1137ff", "#2538ff", "#7951ff", "#ff77f8"],
            ],
            [
                Buffer.from("4b0101b2875a25411350000000b3474def153e2ad42e98232c7483292800", "hex"),
                false,
                ["#ff77f8", "#7951ff", "#2538ff", "#1137ff", "#0c32ff"],
            ],
            [
                Buffer.from("4b010164fb74346b1350000000f3297fda7d55da7d55f3297fda7d552800", "hex"),
                true,
                ["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"],
            ],
            [Buffer.from("4b010127a0526f5410400000000727640e9f5d0727640e9f5d2000", "hex"), true, ["#ff0500", "#ffffff", "#ff0500", "#ffffff"]],
        ])("gradients", (input, optsReverse, expected) => {
            const ret = decodeGradientColors(input, {reverse: optsReverse});
            expect(ret.colors).toStrictEqual(expected);
        });

        // XY Color
        it.each([
            [Buffer.from("0b00015c05b1ec4e", "hex"), [0.6915, 0.3083]], // Red (#ff0500)
            [Buffer.from("0b00015c842b32b3", "hex"), [0.17, 0.7]], // Green (#00ff0e)
            [Buffer.from("0b00011d37272c0c", "hex"), [0.1532, 0.0475]], // Blue (#0a00ff)
        ])("xy", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect([ret.x, ret.y]).toStrictEqual(expected);
        });

        it.each([
            [Buffer.from("4b010110ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", "hex"), 16],
            [Buffer.from("4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", "hex"), 100],
            [Buffer.from("0f0001044d01ab6f7067", "hex"), 4],
            [Buffer.from("0f00011a4d01ab6f7067", "hex"), 26],
            [Buffer.from("0f0000b2ff004c628461", "hex"), 178],
            [Buffer.from("0b00015c842b32b3", "hex"), 92],
            [Buffer.from("0b00011d842b32b3", "hex"), 29],
            [Buffer.from("ab000153df7e446a0180", "hex"), 83],
            [Buffer.from("030001b2", "hex"), 178],
            [Buffer.from("03000164", "hex"), 100],
            [Buffer.from("030001fe", "hex"), 254],
        ])("brightness", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.brightness).toBe(expected);
        });

        it.each([
            [Buffer.from("4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", "hex"), true],
            [Buffer.from("4b010026ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", "hex"), false],
            [Buffer.from("0f0000044d01ab6f7067", "hex"), false],
            [Buffer.from("0f0001044d01ab6f7067", "hex"), true],
            [Buffer.from("0b00015c842b32b3", "hex"), true],
            [Buffer.from("0b00001d842b32b3", "hex"), false],
            [Buffer.from("ab000153df7e446a0180", "hex"), true],
            [Buffer.from("ab000053df7e446a0180", "hex"), false],
            [Buffer.from("03000164", "hex"), true],
            [Buffer.from("0300004f", "hex"), false],
        ])("power", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.on).toBe(expected);
        });

        it.each([
            [Buffer.from("4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", "hex"), 0],
            [Buffer.from("4b01012701b1ea4e13500000000e9f5d0727640e9f5d0727640e9f5d2810", "hex"), 2],
        ])("offset", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.offset).toBe(expected);
        });

        it.each([
            [Buffer.from("0f00011dfa0094611b61", "hex"), 250],
            [Buffer.from("0f00011d7201ab751969", "hex"), 370],
            [Buffer.from("0f00015cf401d486ce69", "hex"), 500],
        ])("colorTemperature", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.color_temp).toBe(expected);
        });

        it.each([
            [Buffer.from("0f00011dfa0094611b61", "hex"), "color_temp"],
            [Buffer.from("0b00015c842b32b3", "hex"), "xy"],
            [Buffer.from("4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", "hex"), "gradient"],
            [Buffer.from("ab000153df7e446a0180", "hex"), "xy"],
        ])("color_mode", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.color_mode).toBe(expected);
        });

        it.each([
            [Buffer.from("ab000153df7e446a0180", "hex"), "candle"],
            [Buffer.from("ab0001febd9238660280", "hex"), "fireplace"],
            [Buffer.from("ab0001febe92ab650380", "hex"), "colorloop"],
            [Buffer.from("ab0001febe92ab659999", "hex"), "unknown_9999"],
        ])("effect", (input, expected) => {
            const ret = decodeGradientColors(input, {});
            expect(ret.name).toBe(expected);
        });
    });

    describe("encodeGradientColors", () => {
        it.each([
            [["#0c32ff", "#1137ff", "#2538ff", "#7951ff", "#ff77f8"], {reverse: true}, "500104001350000000b2474df0353e29e42e98332c7043292800"],
            [["#0c32ff", "#1137ff", "#2538ff", "#7951ff", "#ff77f8"], {reverse: false}, "50010400135000000070432998332c29e42ef0353eb2474d2800"],
            [["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"], {reverse: true}, "500104001350000000f3297fd56d55d56d55f3297fd56d552800"],
            [
                ["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"],
                {reverse: true, offset: 2},
                "500104001350000000f3297fd56d55d56d55f3297fd56d552810",
            ],
            [["#ffffff"], {reverse: true}, "5001040007100000000727640800"],
            [["#ffffff"], {reverse: false}, "5001040007100000000727640800"],
        ])("gradients", (colors, opts, expected) => {
            const ret = encodeGradientColors(colors, opts);
            expect(ret).toStrictEqual(Buffer.from(expected, "hex"));
        });
    });
});
