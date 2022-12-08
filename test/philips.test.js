const { formToJSON } = require('axios');
const philips = require('../lib/philips');

describe('lib/philips.js', () => {
    describe('decodeGradientColors', () => {
        it('scene 1', () => {
            const ret = philips.decodeGradientColors("4b0101b2875a25411350000000b3474def153e2ad42e98232c7483292800", { reverse: true });
            expect(ret).toStrictEqual(["#0c32ff","#1137ff","#2538ff","#7951ff", "#ff77f8"])
        })
        it('scene 2', () => {
            const ret = philips.decodeGradientColors("4b010164fb74346b1350000000f3297fda7d55da7d55f3297fda7d552800", { reverse: true });
            expect(ret).toStrictEqual(["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"])
        })
    });

    describe('encodeGradientColors', () => {
        it('scene 1', () => {
            const ret = philips.encodeGradientColors(["#0c32ff","#1137ff","#2538ff","#7951ff", "#ff77f8"], { reverse: true });
            expect(ret).toStrictEqual("500104001350000000b2474df0353e29e42e98332c7043292800")
        })
        it('scene 1', () => {
            const ret = philips.encodeGradientColors(["#ff0517", "#ffa52c", "#ff0517", "#ff0517", "#ffa52c"], { reverse: true });
            expect(ret).toStrictEqual("500104001350000000f3297fd56d55d56d55f3297fd56d552800")
        })
        it('single', () => {
            const ret = philips.encodeGradientColors(["#ffffff"], { reverse: true });
            expect(ret).toStrictEqual("50010400710000000072764800")
        })
    });
});
