const fz = require('../converters/fromZigbee');
const tuya = require('../lib/tuya');

jest.mock('fs');
const fs = require('fs');

describe('converters/fromZigbee', () => {
    describe('tuya', () => {
        const meta = {logger: {warn: jest.fn(), info: jest.fn()}, device: {ieeeAddr: "0x123456789abcdef"}};
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
                expect(fz.wls100z_water_leak.convert(null, {data: {dpValues}}, null, null, meta)).toEqual(result);
            });
        });
        describe('tuya_smart_vibration_sensor', () => {
            it.each([
                [
                    'no contact',
                    [tuya.dpValueFromBool(tuya.dataPoints.state, false)],
                    {contact: true},
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
                    {contact: false, battery: 97, vibration: true},
                ],
            ])
            ("Receives '%s' indication", (_name, dpValues, result) => {
                expect(fz.tuya_smart_vibration_sensor.convert(null, {data: {dpValues}}, null, null, meta)).toEqual(result);
            });
        });
        describe('tuya_data_point_dump', () => {
            beforeEach(() => {
                meta.logger.info.mockClear();
            });
            it('Logs all received DPs', () => {
                const msg = {
                    type: 'commandDataResponse',
                    data: {
                        seq: 1,
                        dpValues: [
                            tuya.dpValueFromRaw(tuya.dataPoints.state, [0, 1]),
                            tuya.dpValueFromBool(tuya.dataPoints.heatingSetpoint, true),
                            tuya.dpValueFromIntValue(tuya.dataPoints.occupancy, 97),
                            tuya.dpValueFromStringBuffer(tuya.dataPoints.mode, [102, 111, 111]),
                            tuya.dpValueFromEnum(tuya.dataPoints.config, 1),
                            tuya.dpValueFromBitmap(tuya.dataPoints.childLock, [1, 2]),
                        ],
                    },
                };
                expect(fz.tuya_data_point_dump.convert(null, msg, null, null, meta)).toEqual(undefined);
                expect(meta.logger.info).nthCalledWith(1, expect.stringMatching(/Received Tuya DataPoint #1 from 0x123456789abcdef with raw data '\{"dp":1,"datatype":0,"data":\[0,1\]\}': type='commandDataResponse', datatype='raw', value='0,1', known DP# usage: \[.*"state"/));
                expect(meta.logger.info).nthCalledWith(2, expect.stringMatching(/Received Tuya DataPoint #2 from 0x123456789abcdef with raw data '\{"dp":2,"datatype":1,"data":\[1\]\}': type='commandDataResponse', datatype='bool', value='true', known DP# usage: \[.*"heatingSetpoint"/));
                expect(meta.logger.info).nthCalledWith(3, expect.stringMatching(/Received Tuya DataPoint #3 from 0x123456789abcdef with raw data '\{"dp":3,"datatype":2,"data":\[0,0,0,97\]\}': type='commandDataResponse', datatype='value', value='97', known DP# usage: \[.*"occupancy"/));
                expect(meta.logger.info).nthCalledWith(4, expect.stringMatching(/Received Tuya DataPoint #4 from 0x123456789abcdef with raw data '\{"dp":4,"datatype":3,"data":\[102,111,111\]\}': type='commandDataResponse', datatype='string', value='foo', known DP# usage: \[.*"mode"/));
                expect(meta.logger.info).nthCalledWith(5, expect.stringMatching(/Received Tuya DataPoint #5 from 0x123456789abcdef with raw data '\{"dp":5,"datatype":4,"data":\[1\]\}': type='commandDataResponse', datatype='enum', value='1', known DP# usage: \[.*"config"/));
                expect(meta.logger.info).nthCalledWith(6, expect.stringMatching(/Received Tuya DataPoint #7 from 0x123456789abcdef with raw data '\{"dp":7,"datatype":5,"data":\[1,2\]\}': type='commandDataResponse', datatype='bitmap', value='258', known DP# usage: \[.*"childLock"/));
            });
        });
    });
});
