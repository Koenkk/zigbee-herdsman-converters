import {Definition} from '../lib/types';
import {} from '../lib/modernExtend';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
const e = exposes.presets;
const ea = exposes.access;
import * as tuya from '../lib/tuya';

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3210_0aqbrnts']),
        model: 'is-thpl-zb',
        vendor: 'EKF',
        description: 'Smart sensor 4 in 1',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.illuminance, legacy.fz.ZB003X, fz.ZB003X_attr, fz.ZB003X_occupancy],
        toZigbee: [legacy.tz.ZB003X],
        exposes: [e.occupancy(), e.tamper(), e.illuminance_lux(), e.illuminance(), e.temperature(), e.humidity(),
            e.battery(), e.battery_voltage(),
            e.numeric('battery2', ea.STATE).withUnit('%').withDescription('Remaining battery 2 in %'),
            e.numeric('illuminance_calibration', ea.STATE_SET).withDescription('Illuminance calibration in lux')
                .withValueMin(-20).withValueMax(20),
            e.numeric('temperature_calibration', ea.STATE_SET).withDescription('Temperature calibration (-2.0...2.0)')
                .withValueMin(-2).withValueMax(2).withValueStep(0.1),
            e.numeric('humidity_calibration', ea.STATE_SET).withDescription('Humidity calibration')
                .withValueMin(-15).withValueMax(15),
            e.binary('reporting_enable', ea.STATE_SET, true, false).withDescription('Enable reporting'),
            e.numeric('reporting_time', ea.STATE_SET).withDescription('Reporting interval in minutes')
                .withValueMin(0).withValueMax(1440).withValueStep(5),
            e.binary('led_enable', ea.STATE_SET, true, false).withDescription('Enable LED'),
            e.binary('pir_enable', ea.STATE_SET, true, false).withDescription('Enable PIR sensor'),
            e.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            // eslint-disable-next-line
            e.enum('keep_time', ea.STATE_SET, ['0', '30', '60', '120', '240', '480'])
                .withDescription('PIR keep time in seconds')],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nus5kk3n7']),
        model: 'is-ga-zb',
        vendor: 'EKF',
        description: 'Smart gas sensor',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.gas(), tuya.exposes.selfTest(), tuya.exposes.selfTestResult(), tuya.exposes.faultAlarm(), tuya.exposes.silence()],
        meta: {
            tuyaDatapoints: [
                [1, 'gas', tuya.valueConverter.trueFalse0],
                [9, 'self_test_result', tuya.valueConverter.selfTestResult],
                [11, 'fault_alarm', tuya.valueConverter.trueFalse1],
            ],
        },
    },
];

export default definitions;
module.exports = definitions;
