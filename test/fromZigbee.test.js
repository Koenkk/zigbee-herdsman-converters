const fz = require('../converters/fromZigbee');
const tuya = require('../lib/tuya');

describe('converters/fromZigbee', () => {
    describe('tuya', () => {
        const meta = { logger: { warn: jest.fn()}}
        describe('wls100z_water_leak', () => {
            it.each([
                [
                    'water_leak',
                    [tuya.dpValueFromEnum(tuya.dataPoints.wlsWaterLeak, 0)],
                    {water_leak: true},
                ],
                [
                    'no water_leak',
                    [tuya.dpValueFromEnum(tuya.dataPoints.wlsWaterLeak, 1)],
                    {water_leak: false},
                ],
                [
                    'water leak & battery',
                    [
                        tuya.dpValueFromEnum(tuya.dataPoints.wlsWaterLeak, 0),
                        tuya.dpValueFromIntValue(tuya.dataPoints.wlsBatteryPercentage, 75),
                    ],
                    {water_leak: true, battery: 75},
                ],
                [
                    'battery & unknown DP',
                    [
                        tuya.dpValueFromBool(255, false),
                        tuya.dpValueFromIntValue(tuya.dataPoints.wlsBatteryPercentage, 75),
                    ],
                    {battery: 75},
                ],
            ])
            ("Receives '%s' indication", (_name, dpValues, result) => {
                expect(fz.wls100z_water_leak.convert(null, { data: {dpValues}}, null, null, meta)).toEqual(result);
            });
        });
        describe('tuya_smart_vibration_sensor', () => {
            it.each([
                [
                    'no contact',
                    [tuya.dpValueFromBool(tuya.dataPoints.state, false)],
                    {contact: false},
                ],
                [
                    'no vibration',
                    [tuya.dpValueFromEnum(tuya.dataPoints.tuyaVibration, 0)],
                    {vibration: false},
                ],
                [
                    'contact & vibration & battery',
                    [
                        tuya.dpValueFromBool(tuya.dataPoints.state, true),
                        tuya.dpValueFromEnum(tuya.dataPoints.tuyaVibration, 1),
                        tuya.dpValueFromIntValue(tuya.dataPoints.thitBatteryPercentage, 97),
                    ],
                    {contact: true, battery: 97, vibration: true},
                ],
            ])
            ("Receives '%s' indication", (_name, dpValues, result) => {
                expect(fz.tuya_smart_vibration_sensor.convert(null, { data: {dpValues}}, null, null, meta)).toEqual(result);
            });
        });
    });
});
