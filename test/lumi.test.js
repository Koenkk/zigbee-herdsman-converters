const {trv, fromZigbee} = require('../src/lib/lumi');

describe('lib/lumi', () => {
    describe('trv', () => {
        const factoryDefaultScheduleData = '043e01e0000009600438000006a405640000089881e000000898';
        const factoryDefaultSchedule = {
            days: ['mon', 'tue', 'wed', 'thu', 'fri'],
            events: [
                {time: 480, temperature: 24},
                {time: 1080, temperature: 17},
                {time: 1380, temperature: 22},
                {time: 480, temperature: 22},
            ],
        };

        describe(trv.decodePreset, () => {
            it('decodes setup mode', () => {
                const preset = trv.decodePreset(3);

                expect(preset).toEqual({
                    setup: true,
                    preset: undefined,
                });
            });

            it('decodes user preset', () => {
                const preset = trv.decodePreset(0);

                expect(preset).toEqual({
                    setup: false,
                    preset: 'manual',
                });
            });
        });

        describe(trv.decodeHeartbeat, () => {
            // Samples copied from the debug logs, e.g., Received Zigbee message from 'Thermostat1', type 'attributeReport', cluster 'manuSpecificLumi', data '{"247":{"data":[3,40,28,...
            const heartbeatSetup = Buffer.from([3, 40, 28, 5, 33, 3, 0, 10, 33, 18, 126, 13, 35, 25, 9, 0, 0, 17, 35, 1, 0, 0, 0, 101, 32, 3, 102, 41, 156, 9, 103, 41, 96, 9, 104, 35, 0, 0, 0, 0, 105, 32, 100, 106, 32, 0]);
            const heartbeatNormalOperation = Buffer.from([3, 40, 23, 5, 33, 4, 0, 10, 33, 7, 15, 13, 35, 25, 8, 0, 0, 17, 35, 1, 0, 0, 0, 101, 32, 0, 102, 41, 118, 7, 103, 41, 108, 7, 104, 35, 0, 0, 0, 0, 105, 32, 99, 106, 32, 0]);
            const heartbeatValveAlarm = Buffer.from([3, 40, 22, 5, 33, 4, 0, 10, 33, 7, 15, 13, 35, 25, 8, 0, 0, 17, 35, 1, 0, 0, 0, 101, 32, 0, 102, 41, 98, 7, 103, 41, 244, 1, 104, 35, 1, 0, 0, 0, 105, 32, 96, 106, 32, 0]);

            it('decodes heartbeat in setup mode', () => {
                const heartbeat = trv.decodeHeartbeat({}, {}, heartbeatSetup);

                expect(heartbeat).toEqual({
                    device_temperature: 28,
                    power_outage_count: 2,
                    firmware_version: '0.0.0_0925',
                    setup: true,
                    preset: undefined,
                    local_temperature: 24.6,
                    internal_heating_setpoint: 24,
                    valve_alarm: false,
                    battery: 100,
                });
            });

            it('decodes heartbeat in normal operation', () => {
                const heartbeat = trv.decodeHeartbeat({}, {}, heartbeatNormalOperation);

                expect(heartbeat).toEqual({
                    device_temperature: 23,
                    power_outage_count: 3,
                    firmware_version: '0.0.0_0825',
                    setup: false,
                    preset: 'manual',
                    local_temperature: 19.1,
                    internal_heating_setpoint: 19,
                    valve_alarm: false,
                    battery: 99,
                });
            });

            it('decodes valve alarm', () => {
                const heartbeat = trv.decodeHeartbeat({}, {}, heartbeatValveAlarm);

                expect(heartbeat).toEqual(expect.objectContaining({
                    valve_alarm: true,
                }));
            });
        });

        describe(trv.decodeSchedule, () => {
            it('reads schedule object from buffer', () => {
                const data = Buffer.from(factoryDefaultScheduleData, 'hex');

                const schedule = trv.decodeSchedule(data);

                expect(schedule).toEqual(factoryDefaultSchedule);
            });
        });

        describe(trv.validateSchedule, () => {
            it('fails if schedule is not an object', () => {
                expect(() => trv.validateSchedule(123)).toThrowError(/value must be a schedule object/);
            });

            it('fails on missing days', () => {
                expect(() => trv.validateSchedule({})).toThrowError(/must contain an array of days/);
            });

            it('fails on invalid days type', () => {
                expect(() => trv.validateSchedule({days: 123})).toThrowError(/must contain an array of days/);
            });

            it('fails on empty days', () => {
                expect(() => trv.validateSchedule({days: []})).toThrowError(/at least one entry/);
            });

            it('fails on invalid day', () => {
                expect(() => trv.validateSchedule({days: ['foo']})).toThrowError(/not a valid day/);
            });

            it('fails on missing events', () => {
                expect(() => trv.validateSchedule({days: ['mon']})).toThrowError(/must contain an array of 4/);
            });

            it('fails on invalid events type', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: 123,
                })).toThrowError(/must contain an array of 4/);
            });

            it('fails on empty events', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [],
                })).toThrowError(/must contain an array of 4/);
            });

            it('fails on insufficient number of events', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [{}],
                })).toThrowError(/must contain an array of 4/);
            });

            it('fails on invalid event type', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [123, {}, {}, {}],
                })).toThrowError(/must be an object/);
            });

            it('fails on missing event time', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [{}, {}, {}, {}],
                })).toThrowError(/Time must be a positive integer number/);
            });

            it('fails on invalid event time type', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [{time: 'foo'}, {}, {}, {}],
                })).toThrowError(/Time must be a positive integer number/);
            });

            it('fails on missing event temperature', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [{time: 0}, {}, {}, {}],
                })).toThrowError(/must contain a numeric temperature/);
            });

            it('fails on invalid event temperature type', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [{time: 0, temperature: 'foo'}, {}, {}, {}],
                })).toThrowError(/must contain a numeric temperature/);
            });

            it('fails on invalid event temperature value', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [{time: 0, temperature: 4}, {}, {}, {}],
                })).toThrowError(/temperature must be between/);
            });

            it('fails on invalid event temperature value', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [{time: 0, temperature: 30.1}, {}, {}, {}],
                })).toThrowError(/temperature must be between/);
            });

            it('fails if any individual duration is less than 1 hour', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [
                        {time: 0, temperature: 5},
                        {time: 59, temperature: 5},
                        {time: 5 * 60, temperature: 5},
                        {time: 23 * 60, temperature: 5},
                    ],
                })).toThrowError(/at least 1 hour apart/);
            });

            it('fails if minimum total duration is more than 24 hours', () => {
                expect(() => trv.validateSchedule({
                    days: ['mon'],
                    events: [
                        {time: 8, temperature: 5},
                        {time: 10 * 60, temperature: 5},
                        {time: 23 * 60, temperature: 5},
                        {time: 9 * 60, temperature: 5},
                    ],
                })).toThrowError(/at most 24 hours apart/);
            });
        });

        describe(trv.encodeSchedule, () => {
            it('converts schedule object to buffer', () => {
                const buffer = trv.encodeSchedule(factoryDefaultSchedule);

                expect(buffer).toEqual(Buffer.from(factoryDefaultScheduleData, 'hex'));
            });
        });

        describe(trv.stringifySchedule, () => {
            it('converts schedule object to human-readable string pattern', () => {
                const schedule = trv.stringifySchedule(factoryDefaultSchedule);

                expect(schedule).toEqual('mon,tue,wed,thu,fri|8:00,24.0|18:00,17.0|23:00,22.0|8:00,22.0');
            });
        });

        describe(trv.parseSchedule, () => {
            it('converts human-readable string pattern to schedule object', () => {
                const schedule = trv.parseSchedule('mon,tue,wed,thu,fri|8:00,24.0|18:00,17.0|23:00,22.0|8:00,22.0');

                expect(schedule).toEqual(factoryDefaultSchedule);
            });

            it('converts undefined value to empty schedule object', () => {
                const schedule = trv.parseSchedule(undefined);

                expect(schedule).toEqual({days: [], events: []});
            });

            it('converts empty string to empty schedule object', () => {
                const schedule = trv.parseSchedule('');

                expect(schedule).toEqual({days: [], events: []});
            });
        });

        describe('Feeder schedule', () => {
            it('Schedule 0 days', () => {
                const data = Buffer.from([0,5,43,8,0,8,200,2,47,47]);
                const result = fromZigbee.lumi_feeder.convert(null, {data: {'65521': data}}, null, null);
                expect(result).toStrictEqual({ schedule: [] });
            });

            it('Schedule 1 day', () => {
                const data = Buffer.from([0,5,9,8,0,8,200,10,55,70,48,49,48,49,48,49,48,48]);
                const result = fromZigbee.lumi_feeder.convert(null, {data: {'65521': data}}, null, null);
                expect(result).toStrictEqual({ schedule: [ { days: 'everyday', hour: 1, minute: 1, size: 1 } ] });
            });
            it.only('Too small frame', () => {
                const data = Buffer.from([128,2,2,48]);
                const result = fromZigbee.lumi_feeder.convert(null, {data: {'65521': data}}, null, null);
                expect(result).toStrictEqual({});
            });
        });
    });
});
