const philips = require('../lib/philips');

describe('lib/philips.js', () => {
    describe('decodeGradientColors', () => {
        test.each([
            ["4b0101b2875a25411350000000b3474def153e2ad42e98232c7483292800", ["#0c32ff", "#1137ff", "#2538ff", "#7951ff", "#ff77f8"]],
            ["4b010164fb74346b1350000000f3297fda7d55da7d55f3297fda7d552800", ["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"]],
            ["4b010127a0526f5410400000000727640e9f5d0727640e9f5d2000", ["#ff0500", "#ffffff", "#ff0500", "#ffffff"]],
        ])("colors(%s) should be %s", (input, expected) => {
            const ret = philips.decodeGradientColors(input, { reverse: true });
            expect(ret.colors).toStrictEqual(expected);
        })

        test.each([
            ["4b010110ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", 16],
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", 100],
        ])("brightness(%s) should be %s", (input, expected) => {
            const ret = philips.decodeGradientColors(input, { reverse: true });
            expect(ret.gradient_extras.brightness).toBe(expected);
        })

        test.each([
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", true],
            ["4b010026ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", false],
        ])("power(%s) should be %s", (input, expected) => {
            const ret = philips.decodeGradientColors(input, { reverse: true });
            expect(ret.gradient_extras.on).toBe(expected);
        })

        test.each([
            ["4b010164ee2df18f1350000000e8b3aac7589f2dba903f4a7720ba602800", 0],
            ["4b01012701b1ea4e13500000000e9f5d0727640e9f5d0727640e9f5d2810", 2],
        ])("offset(%s) should be %s", (input, expected) => {
            const ret = philips.decodeGradientColors(input, { reverse: true });
            expect(ret.gradient_extras.offset).toBe(expected);
        })
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
