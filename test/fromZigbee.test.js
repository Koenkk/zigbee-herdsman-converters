const legacy = require('../src/lib/legacy');

jest.mock('fs');
const {fromZigbee} = require('../src/index');

describe('converters/fromZigbee', () => {
    describe('tuya', () => {
        const meta = {device: {ieeeAddr: '0x123456789abcdef'}};
        describe('wls100z_water_leak', () => {
            it.each([
                ['water_leak', [legacy.dpValueFromEnum(legacy.dataPoints.wlsWaterLeak, 0)], {water_leak: true}],
                ['no water_leak', [legacy.dpValueFromEnum(legacy.dataPoints.wlsWaterLeak, 1)], {water_leak: false}],
                [
                    'water leak & battery',
                    [
                        legacy.dpValueFromEnum(legacy.dataPoints.wlsWaterLeak, 0),
                        legacy.dpValueFromIntValue(legacy.dataPoints.wlsBatteryPercentage, 75),
                    ],
                    {water_leak: true, battery: 75},
                ],
                [
                    'battery & unknown DP',
                    [legacy.dpValueFromBool(255, false), legacy.dpValueFromIntValue(legacy.dataPoints.wlsBatteryPercentage, 75)],
                    {battery: 75},
                ],
            ])("Receives '%s' indication", (_name, dpValues, result) => {
                expect(legacy.fromZigbee.wls100z_water_leak.convert(null, {data: {dpValues}}, null, null, meta)).toEqual(result);
            });
        });
        describe('tuya_smart_vibration_sensor', () => {
            it.each([
                ['no contact', [legacy.dpValueFromBool(legacy.dataPoints.state, false)], {contact: true}],
                ['no vibration', [legacy.dpValueFromEnum(legacy.dataPoints.tuyaVibration, 0)], {vibration: false}],
                [
                    'contact & vibration & battery',
                    [
                        legacy.dpValueFromBool(legacy.dataPoints.state, true),
                        legacy.dpValueFromEnum(legacy.dataPoints.tuyaVibration, 1),
                        legacy.dpValueFromIntValue(legacy.dataPoints.thitBatteryPercentage, 97),
                    ],
                    {contact: false, battery: 97, vibration: true},
                ],
            ])("Receives '%s' indication", (_name, dpValues, result) => {
                expect(legacy.fromZigbee.tuya_smart_vibration_sensor.convert(null, {data: {dpValues}}, null, null, meta)).toEqual(result);
            });
        });
    });

    it('Message with no properties does not error converting battery percentages', () => {
        const payload = fromZigbee.battery.convert(
            {
                meta: {},
            },
            {data: {}, endpoint: null, device: null, meta: null, groupID: null, type: 'attributeReport', cluster: 'genPowerCfg', linkquality: 0},
            null,
            {},
            {
                meta: {},
            }.meta,
        );
        expect(payload).toStrictEqual({});
    });

    it('Device specifying voltageToPercentage ignores reported percentage', () => {
        const payload = fromZigbee.battery.convert(
            {
                meta: {
                    battery: {
                        voltageToPercentage: '3V_1500_2800',
                    },
                },
            },
            {
                data: {
                    batteryVoltage: 27,
                    batteryPercentageRemaining: 2,
                },
                endpoint: null,
                device: null,
                meta: null,
                groupID: null,
                type: 'attributeReport',
                cluster: 'genPowerCfg',
                linkquality: 0,
            },
            null,
            {},
            {
                meta: {},
            }.meta,
        );
        expect(payload).toStrictEqual({
            battery: 98,
            voltage: 2700,
        });
    });

    it('Device uses reported percentage', () => {
        const payload = fromZigbee.battery.convert(
            {
                meta: {},
            },
            {
                data: {
                    batteryVoltage: 27,
                    batteryPercentageRemaining: 2,
                },
                endpoint: null,
                device: null,
                meta: null,
                groupID: null,
                type: 'attributeReport',
                cluster: 'genPowerCfg',
                linkquality: 0,
            },
            null,
            {},
            {
                meta: {},
            }.meta,
        );
        expect(payload).toStrictEqual({
            battery: 1,
            voltage: 2700,
        });
    });
});
