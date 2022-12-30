const philips = require('../lib/philips');

describe('lib/philips.js', () => {
    describe('decodeGradientColors', () => {
        test.each([
            ["4b0101b2875a25411350000000b3474def153e2ad42e98232c7483292800", true, ["#0c32ff", "#1137ff", "#2538ff", "#7951ff", "#ff77f8"]],
            ["4b0101b2875a25411350000000b3474def153e2ad42e98232c7483292800", false, ["#ff77f8",  "#7951ff", "#2538ff","#1137ff", "#0c32ff"]],
            ["4b010164fb74346b1350000000f3297fda7d55da7d55f3297fda7d552800", true, ["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"]],
            ["4b010127a0526f5410400000000727640e9f5d0727640e9f5d2000", true, ["#ff0500", "#ffffff", "#ff0500", "#ffffff"]],
        ])("colors(%s) should be %s", (input, opts_reverse, expected) => {
            const ret = philips.decodeGradientColors(input, { reverse: opts_reverse });
            expect(ret.colors).toStrictEqual(expected);
        })

        // XY Color
        test.each([
            ["0b00015c05b1ec4e", [0.6915, 0.3083]], // Red (#ff0500)
            ["0b00015c842b32b3", [0.1700, 0.7000]], // Green (#00ff0e)
            ["0b00011d37272c0c", [0.1532, 0.0475]], // Blue (#0a00ff)
        ])(`xy(%s) should be %s`, (input, expected) => {
            const ret = philips.decodeGradientColors(input);
            expect([ret.x, ret.y]).toStrictEqual(expected);
        })

        test.each([
            ["4b010110ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", 16], 
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", 100],
            ["0f0001044d01ab6f7067", 4], 
            ["0f00011a4d01ab6f7067", 26],
            ["0f0000b2ff004c628461", 178],
            ["0b00015c842b32b3", 92],
            ["0b00011d842b32b3", 29],
        ])("brightness(%s) should be %s", (input, expected) => {
            const ret = philips.decodeGradientColors(input);
            expect(ret.brightness).toBe(expected);
        })

        test.each([
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", true], 
            ["4b010026ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", false],
            ["0f0000044d01ab6f7067", false], 
            ["0f0001044d01ab6f7067", true],
            ["0b00015c842b32b3", true], 
            ["0b00001d842b32b3", false],
            ,
        ])("power(%s) should be %s", (input, expected) => {
            const ret = philips.decodeGradientColors(input);
            expect(ret.on).toBe(expected);
        })

        test.each([
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", 0],
            ["4b01012701b1ea4e13500000000e9f5d0727640e9f5d0727640e9f5d2810", 2],
        ])("offset(%s) should be %s", (input, expected) => {
            const ret = philips.decodeGradientColors(input);
            expect(ret.offset).toBe(expected);
        })

        test.each([
            ["0f00011dfa0094611b61", 250],
            ["0f00011d7201ab751969", 370],
            ["0f00015cf401d486ce69", 500],
        ])(`colorTemperature(%s) should be %s`, (input, expected) => {
            const ret = philips.decodeGradientColors(input);
            expect(ret.color_temp).toBe(expected);
        })

        test.each([
            ["0f00011dfa0094611b61", "color_temp"],
            ["0b00015c842b32b3", "xy"],
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", "gradient"],
        ])(`color_mode(%s) should be %s`, (input, expected) => {
            const ret = philips.decodeGradientColors(input);
            expect(ret.color_mode).toBe(expected);
        });
    });

    describe('encodeGradientColors', () => {
        test.each([
            [["#0c32ff", "#1137ff", "#2538ff", "#7951ff", "#ff77f8"], { reverse: true }, "500104001350000000b2474df0353e29e42e98332c7043292800"],
            [["#0c32ff", "#1137ff", "#2538ff", "#7951ff", "#ff77f8"], { reverse: false }, "50010400135000000070432998332c29e42ef0353eb2474d2800"],
            [["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"], { reverse: true }, "500104001350000000f3297fd56d55d56d55f3297fd56d552800"],
            [["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"], { reverse: true, offset: 2 }, "500104001350000000f3297fd56d55d56d55f3297fd56d552810"],
            [["#ffffff"], { reverse: true }, "5001040007100000000727640800"],
            [["#ffffff"], { reverse: false }, "5001040007100000000727640800"],
        ])("colors(%s) opts(%s) should be %s", (colors, opts, expected) => {
            const ret = philips.encodeGradientColors(colors, opts);
            expect(ret).toStrictEqual(expected);
        });
    });
});
