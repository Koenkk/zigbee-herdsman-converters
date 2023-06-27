const legacy = require('../src/lib/legacy');

jest.mock('fs');
const fs = require('fs');

describe('converters/fromZigbee', () => {
    describe('tuya', () => {
        const meta = {logger: {warn: jest.fn(), info: jest.fn(), debug: jest.fn()}, device: {ieeeAddr: "0x123456789abcdef"}};
        describe('wls100z_water_leak', () => {
            it.each([
                [
                    'water_leak',
                    [legacy.dpValueFromEnum(legacy.dataPoints.wlsWaterLeak, 0)],
                    {water_leak: true},
                ],
                [
                    'no water_leak',
                    [legacy.dpValueFromEnum(legacy.dataPoints.wlsWaterLeak, 1)],
                    {water_leak: false},
                ],
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
                    [
                        legacy.dpValueFromBool(255, false),
                        legacy.dpValueFromIntValue(legacy.dataPoints.wlsBatteryPercentage, 75),
                    ],
                    {battery: 75},
                ],
            ])
            ("Receives '%s' indication", (_name, dpValues, result) => {
                expect(legacy.fromZigbee.wls100z_water_leak.convert(null, {data: {dpValues}}, null, null, meta)).toEqual(result);
            });
        });
        describe('tuya_smart_vibration_sensor', () => {
            it.each([
                [
                    'no contact',
                    [legacy.dpValueFromBool(legacy.dataPoints.state, false)],
                    {contact: true},
                ],
                [
                    'no vibration',
                    [legacy.dpValueFromEnum(legacy.dataPoints.tuyaVibration, 0)],
                    {vibration: false},
                ],
                [
                    'contact & vibration & battery',
                    [
                        legacy.dpValueFromBool(legacy.dataPoints.state, true),
                        legacy.dpValueFromEnum(legacy.dataPoints.tuyaVibration, 1),
                        legacy.dpValueFromIntValue(legacy.dataPoints.thitBatteryPercentage, 97),
                    ],
                    {contact: false, battery: 97, vibration: true},
                ],
            ])
            ("Receives '%s' indication", (_name, dpValues, result) => {
                expect(legacy.fromZigbee.tuya_smart_vibration_sensor.convert(null, {data: {dpValues}}, null, null, meta)).toEqual(result);
            });
        });
    });
});
