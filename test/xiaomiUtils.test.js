const xiaomiUtils = require('../lib/xiaomiUtils');

const factoryDefaultScheduleData = "043e01e0000009600438000006a405640000089881e000000898";
const factoryDefaultSchedule = {
    repeat: ["mon", "tue", "wed", "thu", "fri"],
    events: [
        {time: 480, temperature: 24},
        {time: 1080, temperature: 17},
        {time: 1380, temperature: 22},
        {time: 480, temperature: 22},
    ],
}

describe('lib/xiaomiUtils.js', () => {
    describe(xiaomiUtils.readSchedule, () => {
        it('reads schedule object from buffer', () => {
            const data = Buffer.from(factoryDefaultScheduleData, "hex");

            const schedule = xiaomiUtils.readSchedule(data);

            expect(schedule).toEqual(factoryDefaultSchedule);
        });

        it('foo', () => {
        });
    });

    describe(xiaomiUtils.validateSchedule, () => {
        it('fails if schedule is not an object', () => {
            expect(() => xiaomiUtils.validateSchedule(123)).toThrowError(/value must be a schedule object/);
        });

        it('fails on missing repeat days', () => {
            expect(() => xiaomiUtils.validateSchedule({})).toThrowError(/must contain an array of days/);
        });

        it('fails on invalid repeat days type', () => {
            expect(() => xiaomiUtils.validateSchedule({repeat: 123})).toThrowError(/must contain an array of days/);
        });

        it('fails on empty repeat days', () => {
            expect(() => xiaomiUtils.validateSchedule({repeat: []})).toThrowError(/at least one entry/);
        });

        it('fails on invalid repeat day', () => {
            expect(() => xiaomiUtils.validateSchedule({repeat: ['foo']})).toThrowError(/invalid value/);
        });

        it('fails on missing events', () => {
            expect(() => xiaomiUtils.validateSchedule({repeat: ['mon']})).toThrowError(/must contains an array of 4/);
        });

        it('fails on invalid events type', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: 123,
            })).toThrowError(/must contains an array of 4/);
        });

        it('fails on empty events', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [],
            })).toThrowError(/must contains an array of 4/);
        });

        it('fails on insufficient number of events', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [{}],
            })).toThrowError(/must contains an array of 4/);
        });

        it('fails on invalid event type', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [123, {}, {}, {}],
            })).toThrowError(/must be an object/);
        });

        it('fails on missing event time', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [{}, {}, {}, {}],
            })).toThrowError(/Time must be a positive integer number/);
        });

        it('fails on invalid event time type', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [{time: 'foo'}, {}, {}, {}],
            })).toThrowError(/Time must be a positive integer number/);
        });

        it('fails on missing event temperature', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [{time: 0}, {}, {}, {}],
            })).toThrowError(/must contain a numeric temperature/);
        });

        it('fails on invalid event temperature type', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [{time: 0, temperature: 'foo'}, {}, {}, {}],
            })).toThrowError(/must contain a numeric temperature/);
        });

        it('fails on invalid event temperature value', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [{time: 0, temperature: 4}, {}, {}, {}],
            })).toThrowError(/temperature must be between/);
        });

        it('fails on invalid event temperature value', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [{time: 0, temperature: 30.1}, {}, {}, {}],
            })).toThrowError(/temperature must be between/);
        });

        it('fails if minimum total duration is less than 4 hours', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [
                    {time: 0, temperature: 5},
                    {time: 0, temperature: 5},
                    {time: 0, temperature: 5},
                    {time: 0, temperature: 5},
                ],
            })).toThrowError(/at least 4 hours apart/);
        });

        it('fails if minimum total duration is more than 24 hours', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [
                    {time: 0, temperature: 5},
                    {time: 0, temperature: 5},
                    {time: 0, temperature: 5},
                    {time: 24 * 60 + 1, temperature: 5},
                ],
            })).toThrowError(/at most 24 hours apart/);
        });

        it('fails if any individual duration is less than 1 hour', () => {
            expect(() => xiaomiUtils.validateSchedule({
                repeat: ['mon'],
                events: [
                    {time: 0, temperature: 5},
                    {time: 59, temperature: 5},
                    {time: 5 * 60, temperature: 5},
                    {time: 24 * 60, temperature: 5},
                ],
            })).toThrowError(/at least 1 hour apart/);
        });
    });

    describe(xiaomiUtils.writeSchedule, () => {
        it('converts schedule object to buffer', () => {
            const buffer = xiaomiUtils.writeSchedule(factoryDefaultSchedule);

            expect(buffer).toEqual(Buffer.from(factoryDefaultScheduleData, "hex"));
        });
    });

    describe(xiaomiUtils.stringifySchedule, () => {
        it('converts schedule object to human-readable string pattern', () => {
            const schedule = xiaomiUtils.stringifySchedule(factoryDefaultSchedule);

            expect(schedule).toEqual('mon,tue,wed,thu,fri|8:00,24.0|18:00,17.0|23:00,22.0|8:00,22.0');
        });
    });

    describe(xiaomiUtils.parseSchedule, () => {
        it('converts human-readable string pattern to schedule object', () => {
            const schedule = xiaomiUtils.parseSchedule('mon,tue,wed,thu,fri|8:00,24.0|18:00,17.0|23:00,22.0|8:00,22.0');

            expect(schedule).toEqual(factoryDefaultSchedule);
        });
    });
});
