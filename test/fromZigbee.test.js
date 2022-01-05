const fz = require('../converters/fromZigbee');
const tuya = require('../lib/tuya');

describe('converters/fromZigbee', () => {
    describe('tuya', () => {
        describe('wls100z_water_leak', () => {
            const cut = fz.wls100z_water_leak;
            const meta = { logger: { warn: jest.fn()}}

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
                expect(cut.convert(null, { data: {dpValues}}, null, null, meta)).toEqual(result);
            });
        });
    });
});
