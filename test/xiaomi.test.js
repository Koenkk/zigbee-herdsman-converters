const {trv} = require('../lib/xiaomi');

describe('lib/xiaomi', () => {
    describe('trv', () => {
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
            // Samples copied from the debug logs, e.g., Received Zigbee message from 'Thermostat1', type 'attributeReport', cluster 'aqaraOpple', data '{"247":{"data":[3,40,28,...
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
    });
});
