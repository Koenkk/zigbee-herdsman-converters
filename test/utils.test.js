const utils = require('../src/lib/utils');
const testUtils = require('./utils');
const mockDevice = testUtils.mockDevice;
const mockEndpoint = testUtils.mockEndpoint;

const getTransition = utils.getTransition;

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

    describe('getTransition', () => {
        let entity;
        let key;
        let meta

        beforeEach(() => {
            entity = mockDevice({ manufacturerID: 4476, endpoints:  [{}] });

            key = 'brightness';

            meta = {
                options: {},
                message: {}
            };
        });

        it('should return {time: 0, specified: false} if manufacturerID is 4476 and key is brightness and message has color or color_temp', () => {
            meta.message = {
                color: 'red'
            };

            const result = getTransition(entity, key, meta);

            expect(result).toEqual({ time: 0, specified: false });
        });

        it('should return {time: 0, specified: false} if manufacturerID is 4476 and key is brightness and message has color_temp', () => {
            meta.message = {
                color_temp: 3000
            };

            const result = getTransition(entity, key, meta);

            expect(result).toEqual({ time: 0, specified: false });
        });

        it('should return {time: 0, specified: false} if options.transition is an empty string', () => {
            meta.options = {
                transition: ''
            };

            const result = getTransition(entity, key, meta);

            expect(result).toEqual({ time: 0, specified: false });
        });

        it('should return {time: 0, specified: false} if options.transition is not specified', () => {
            const result = getTransition(entity, key, meta);

            expect(result).toEqual({ time: 0, specified: false });
        });

        it('should return {time: 100, specified: true} if message.transition is specified', () => {
            meta.message = {
                transition: 10
            };

            const result = getTransition(entity, key, meta);

            expect(result).toEqual({ time: 100, specified: true });
        });

        it('should return {time: 200, specified: true} if options.transition is specified', () => {
            meta.options = {
                transition: 20
            };

            const result = getTransition(entity, key, meta);

            expect(result).toEqual({ time: 200, specified: true });
        });

        it('should return {time: 0, specified: false} if neither message.transition nor options.transition is specified', () => {
            const result = getTransition(entity, key, meta);

            expect(result).toEqual({ time: 0, specified: false });
        });
    });
});
