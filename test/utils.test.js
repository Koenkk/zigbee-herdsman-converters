const utils = require('../src/lib/utils');

describe('lib/utils.js', () => {
    describe('mapNumberRange', () => {
        it('should map value (0..100)->(0..200)', () => {
            expect(utils.mapNumberRange(50, 0, 100, 0, 200)).toEqual(100);
        });
        it('should map value (100..200)->(300..400)', () => {
            expect(utils.mapNumberRange(150, 100, 200, 300, 400)).toEqual(350);
        });
        it('should map value (0..100)->(0..200) outside range', () => {
            expect(utils.mapNumberRange(200, 0, 100, 0, 200)).toEqual(400);
        });
        it('should map value (0..100)->(100..0)', () => {
            expect(utils.mapNumberRange(20, 0, 100, 100, 0)).toEqual(80);
        });
        it('should map value (100..200)->(200..100)', () => {
            expect(utils.mapNumberRange(120, 100, 200, 200, 100)).toEqual(180);
        });
        it('should round to specified precision', () => {
            expect(utils.mapNumberRange(3.14, 0, 10, 0, 100, 1)).toEqual(31.4);
        });
    });
});
