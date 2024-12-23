import {getTransition as _getTransition, batteryVoltageToPercentage, mapNumberRange} from '../src/lib/utils';
import {mockDevice as _mockDevice, mockEndpoint as _mockEndpoint} from './utils';

const mockDevice = _mockDevice;

const getTransition = _getTransition;

describe('lib/utils.js', () => {
    describe('mapNumberRange', () => {
        it('should map value (0..100)->(0..200)', () => {
            expect(mapNumberRange(50, 0, 100, 0, 200)).toEqual(100);
        });
        it('should map value (100..200)->(300..400)', () => {
            expect(mapNumberRange(150, 100, 200, 300, 400)).toEqual(350);
        });
        it('should map value (0..100)->(0..200) outside range', () => {
            expect(mapNumberRange(200, 0, 100, 0, 200)).toEqual(400);
        });
        it('should map value (0..100)->(100..0)', () => {
            expect(mapNumberRange(20, 0, 100, 100, 0)).toEqual(80);
        });
        it('should map value (100..200)->(200..100)', () => {
            expect(mapNumberRange(120, 100, 200, 200, 100)).toEqual(180);
        });
        it('should round to specified precision', () => {
            expect(mapNumberRange(3.14, 0, 10, 0, 100, 1)).toEqual(31.4);
        });
    });

    describe('getTransition', () => {
        let entity;
        let key;
        let meta;

        beforeEach(() => {
            entity = mockDevice({manufacturerID: 4476, endpoints: [{}]});

            key = 'brightness';

            meta = {
                options: {},
                message: {},
            };
        });

        it('should return {time: 0, specified: false} if manufacturerID is 4476 and key is brightness and message has color or color_temp', () => {
            meta.message = {
                color: 'red',
            };

            const result = getTransition(entity, key, meta);

            expect(result).toEqual({time: 0, specified: false});
        });

        it('should return {time: 0, specified: false} if manufacturerID is 4476 and key is brightness and message has color_temp', () => {
            meta.message = {
                color_temp: 3000,
            };

            const result = getTransition(entity, key, meta);

            expect(result).toEqual({time: 0, specified: false});
        });

        it('should return {time: 0, specified: false} if options.transition is an empty string', () => {
            meta.options = {
                transition: '',
            };

            const result = getTransition(entity, key, meta);

            expect(result).toEqual({time: 0, specified: false});
        });

        it('should return {time: 0, specified: false} if options.transition is not specified', () => {
            const result = getTransition(entity, key, meta);

            expect(result).toEqual({time: 0, specified: false});
        });

        it('should return {time: 100, specified: true} if message.transition is specified', () => {
            meta.message = {
                transition: 10,
            };

            const result = getTransition(entity, key, meta);

            expect(result).toEqual({time: 100, specified: true});
        });

        it('should return {time: 200, specified: true} if options.transition is specified', () => {
            meta.options = {
                transition: 20,
            };

            const result = getTransition(entity, key, meta);

            expect(result).toEqual({time: 200, specified: true});
        });

        it('should return {time: 0, specified: false} if neither message.transition nor options.transition is specified', () => {
            const result = getTransition(entity, key, meta);

            expect(result).toEqual({time: 0, specified: false});
        });
    });

    describe('batteryVoltageToPercentage', () => {
        it('gets linear', () => {
            expect(batteryVoltageToPercentage(2760, {min: 2500, max: 3000})).toStrictEqual(52);
            expect(batteryVoltageToPercentage(3100, {min: 2500, max: 3000})).toStrictEqual(100);
            expect(batteryVoltageToPercentage(2400, {min: 2500, max: 3000})).toStrictEqual(0);
        });

        it('gets linear with offset', () => {
            expect(batteryVoltageToPercentage(3045, {min: 2900, max: 4100, vOffset: 1000})).toStrictEqual(95);
            expect(batteryVoltageToPercentage(3145, {min: 2900, max: 4100, vOffset: 1000})).toStrictEqual(100);
            expect(batteryVoltageToPercentage(1800, {min: 2900, max: 4100, vOffset: 1000})).toStrictEqual(0);
        });

        it('gets non-linear', () => {
            expect(batteryVoltageToPercentage(2300, '3V_2100')).toStrictEqual(4);
            expect(batteryVoltageToPercentage(3000, '3V_2100')).toStrictEqual(100);
            expect(batteryVoltageToPercentage(2000, '3V_2100')).toStrictEqual(0);

            expect(batteryVoltageToPercentage(2300, '3V_1500_2800')).toStrictEqual(74);
            expect(batteryVoltageToPercentage(3000, '3V_1500_2800')).toStrictEqual(100);
            expect(batteryVoltageToPercentage(1400, '3V_1500_2800')).toStrictEqual(0);
        });
    });
});
