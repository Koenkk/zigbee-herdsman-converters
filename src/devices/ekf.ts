import {Definition} from '../lib/types';
import {
    battery, forcePowerSource, humidity, iasWarning, iasZoneAlarm,
    identify, ignoreClusterReport, illuminance, temperature,
} from '../lib/modernExtend';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
const e = exposes.presets;
const ea = exposes.access;
import * as tuya from '../lib/tuya';
import {modernExtend as tuyaModernExtend} from '../lib/tuya';
const {
    tuyaMagicPacket, dpGas, dpSmoke, dpEnumLookup, dpBinary, dpBatteryState,
    dpBattery, dpSelfTestResult, dpFaultAlarm,
} = tuyaModernExtend;

// const tzLocal = {
//     TS0219: {
//         key: ['light', 'alarm_duration'],
//         convertSet: async (entity, key, value, meta) => {
//             if (key === 'light') {
//                 await entity.command('genOnOff', value.toLowerCase() === 'on' ? 'on' : 'off', {}, utils.getOptions(meta.mapped, entity));
//             } else if (key === 'duration') {
//                 await entity.write('ssIasWd', {'maxDuration': value}, utils.getOptions(meta.mapped, entity));
//             } else if (key === 'volume') {
//                 const lookup = {'mute': 0, 'low': 10, 'medium': 30, 'high': 50};
//                 value = value.toLowerCase();
//                 utils.validateValue(value, Object.keys(lookup));
//                 await entity.write('ssIasWd', {0x0002: {value: lookup[value], type: 0x0a}}, utils.getOptions(meta.mapped, entity));
//             }
//             return {state: {[key]: value}};
//         },
//     } satisfies Tz.Converter,
// };

// const alarmConverter = {
//     alarm: {
//         key: ['alarm'],
//         convertSet: async (entity, key, value, meta) => {
//             const mode = {'stop': 0, 'burglar': 1, 'fire': 2, 'emergency': 3, 'police_panic': 4, 'fire_panic': 5, 'emergency_panic': 6};
//             const level = {'low': 0, 'medium': 1, 'high': 2, 'very_high': 3};
//             const strobeLevel = {'low': 0, 'medium': 1, 'high': 2, 'very_high': 3};

//             const values = {
//                 mode: value.toLowerCase() === 'on' ? 'emergency' : 'stop',
//                 level: 'medium',
//                 strobe: true,
//                 duration: 3600,
//                 strobeDutyCycle: 10,
//                 strobeLevel: 3,
//             };

//             let info;
//             // https://github.com/Koenkk/zigbee2mqtt/issues/8310 some devices require the info to be reversed.
//             if (['SIRZB-110', 'SRAC-23B-ZBSR', 'AV2010/29A', 'AV2010/24A'].includes(meta.mapped.model)) {
//                 info = (mode[values.mode]) + ((values.strobe ? 1 : 0) << 4) + (level[values.level] << 6);
//             } else {
//                 info = (mode[values.mode] << 4) + ((values.strobe ? 1 : 0) << 2) + (level[values.level]);
//             }

//             await entity.command(
//                 'ssIasWd',
//                 'startWarning',
//                 {startwarninginfo: info, warningduration: values.duration,
//                     strobedutycycle: values.strobeDutyCycle, strobelevel: values.strobeLevel},
//                 utils.getOptions(meta.mapped, entity));
//         },
//     } satisfies Tz.Converter,
// };

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3210_0aqbrnts', '_TZ3210_oekbi7o4']),
        model: 'is-thpl-zb',
        vendor: 'EKF',
        description: 'Smart sensor 4 in 1',
        fromZigbee: [legacy.fz.ZB003X, fz.ZB003X_attr, fz.ZB003X_occupancy],
        toZigbee: [legacy.tz.ZB003X],
        exposes: [e.tamper(),
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
                .withDescription('PIR keep time in seconds'),
        ],
        extend: [
            ignoreClusterReport({cluster: 'genBasic'}),
            tuyaMagicPacket(),
            temperature(),
            humidity(),
            iasZoneAlarm({zoneType: 'occupancy', zoneAttributes: ['alarm_1']}), // tamper is on bit 4 instead of bit 3
            illuminance(),
            battery({voltage: true, percentageReporting: false}), // First of 2 batteries
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nus5kk3n7']),
        model: 'is-ga-zb',
        vendor: 'EKF',
        description: 'Smart gas sensor',
        // fromZigbee: [tuya.fz.datapoints],
        // toZigbee: [tuya.tz.datapoints],
        // exposes: [tuya.exposes.selfTest(), tuya.exposes.selfTestResult(), tuya.exposes.faultAlarm(), tuya.exposes.silence()],
        // meta: {
        //     tuyaDatapoints: [
        //         [1, 'gas', tuya.valueConverter.trueFalse0],
        //         [9, 'self_test_result', tuya.valueConverter.selfTestResult],
        //         [11, 'fault_alarm', tuya.valueConverter.trueFalse1],
        //     ],
        // },
        extend: [
            tuyaMagicPacket(),
            dpGas({dp: 1}),
            dpSelfTestResult({dp: 9}),
            dpFaultAlarm({dp: 11}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0219', ['_TYZB01_fbo1dpof']),
        model: 'is-sr-sb',
        vendor: 'EKF',
        description: 'Smart siren',
        // toZigbee: [tz.warning, tzLocal.TS0219, alarmConverter.alarm],
        // exposes: [e.warning(),
        //     e.binary('light', ea.ALL, 'ON', 'OFF').withDescription('Turn the light ON/OFF'),
        //     e.binary('alarm', ea.ALL, 'ON', 'OFF').withDescription('Turn the alarm ON/OFF'),
        //     e.numeric('duration', ea.STATE_SET).withValueMin(60).withValueMax(3600).withValueStep(1).withUnit('s')
        //         .withDescription('Duration of the alarm'),
        //     e.enum('volume', ea.STATE_SET, ['mute', 'low', 'medium', 'high'])
        //         .withDescription('Volume of the alarm'),
        // ],
        extend: [
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            iasWarning(),
            iasZoneAlarm({zoneType: 'generic', zoneAttributes: []}),
            battery({voltage: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_apv9jsa2']),
        model: 'is-sm-zb',
        vendor: 'EKF',
        description: 'Smart smoke detector',
        // fromZigbee: [tuya.fz.datapoints],
        // toZigbee: [tuya.tz.datapoints],
        // exposes: [
        //     e.smoke(), e.battery(), tuya.exposes.batteryState(),
        //     e.binary('silence', ea.STATE_SET, 'ON', 'OFF'),
        //     e.enum('self_test', ea.STATE, ['checking', 'check_success', 'check_failure']),
        // ],
        // meta: {
        //     tuyaDatapoints: [
        //         [1, 'smoke', tuya.valueConverter.trueFalse0],
        //         [9, 'self_test', tuya.valueConverterBasic.lookup({'checking': 0, 'check_success': 1, 'check_failure': 2})],
        //         [14, 'battery_state', tuya.valueConverter.batteryState],
        //         [15, 'battery', tuya.valueConverter.raw],
        //         [16, 'silence', tuya.valueConverter.onOff],
        //     ],
        // },
        extend: [
            tuyaMagicPacket(),
            dpSmoke({dp: 1}),
            dpEnumLookup({dp: 9, name: 'self_test', lookup: {'checking': 0, 'check_success': 1, 'check_failure': 2}}),
            dpBatteryState({dp: 14}),
            dpBattery({dp: 15}),
            dpBinary({dp: 16, name: 'silence', valueOn: [true, true], valueOff: [false, false]}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0201', ['_TZ3000_acklt5lf']),
        model: 'is-th-nd-zb',
        vendor: 'EKF',
        description: 'Smart temperature and humidity sensor',
        extend: [
            tuyaMagicPacket(),
            temperature(),
            humidity(),
            identify({isSleepy: true}),
            battery({voltage: true, voltageReporting: true}),
        ],
    },
];

export default definitions;
module.exports = definitions;
