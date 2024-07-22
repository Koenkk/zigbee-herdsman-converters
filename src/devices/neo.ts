import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
const e = exposes.presets;
const ea = exposes.access;
import * as tuya from '../lib/tuya';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_d0yu2xgi'}],
        zigbeeModel: ['0yu2xgi'],
        model: 'NAS-AB02B0',
        vendor: 'Neo',
        description: 'Temperature & humidity sensor and alarm',
        fromZigbee: [legacy.fz.neo_t_h_alarm, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.neo_t_h_alarm],
        exposes: [
            e.temperature(),
            e.humidity(),
            e.binary('humidity_alarm', ea.STATE_SET, true, false),
            e.battery_low(),
            e.binary('temperature_alarm', ea.STATE_SET, true, false),
            e.binary('alarm', ea.STATE_SET, true, false),
            e.enum(
                'melody',
                ea.STATE_SET,
                Array.from(Array(18).keys()).map((x) => (x + 1).toString()),
            ),
            e.numeric('duration', ea.STATE_SET).withUnit('s').withValueMin(0).withValueMax(1800),
            e.numeric('temperature_min', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            e.numeric('temperature_max', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            e.numeric('humidity_min', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            e.numeric('humidity_max', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            e.enum('volume', ea.STATE_SET, ['low', 'medium', 'high']),
            e.enum('power_type', ea.STATE, ['battery_full', 'battery_high', 'battery_medium', 'battery_low', 'usb']),
        ],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.command('manuSpecificTuya', 'dataQuery', {});
            await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {seq: 0x0002});
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_t1blo2bj', '_TZE204_t1blo2bj', '_TZE204_q76rtoa9']),
        zigbeeModel: ['1blo2bj', 'lrfgpny', 'q76rtoa9'],
        model: 'NAS-AB02B2',
        vendor: 'Neo',
        description: 'Alarm',
        fromZigbee: [legacy.fz.neo_alarm, fz.ignore_basic_report],
        toZigbee: [legacy.tz.neo_alarm],
        exposes: [
            e.battery_low(),
            e.binary('alarm', ea.STATE_SET, true, false),
            e.enum(
                'melody',
                ea.STATE_SET,
                Array.from(Array(18).keys()).map((x) => (x + 1).toString()),
            ),
            e.numeric('duration', ea.STATE_SET).withUnit('s').withValueMin(0).withValueMax(1800),
            e.enum('volume', ea.STATE_SET, ['low', 'medium', 'high']),
            e.numeric('battpercentage', ea.STATE).withUnit('%'),
        ],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.command('manuSpecificTuya', 'dataQuery', {});
            await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {seq: 0x0002});
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_7hfcudw5'}],
        model: 'NAS-PD07',
        vendor: 'Neo',
        description: 'Motion, temperature & humidity sensor',
        fromZigbee: [legacy.fz.neo_nas_pd07, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.neo_nas_pd07],
        onEvent: tuya.onEventSetTime,
        exposes: [
            e.occupancy(),
            e.humidity(),
            e.temperature(),
            e.tamper(),
            e.battery_low(),
            e.enum('power_type', ea.STATE, ['battery_full', 'battery_high', 'battery_medium', 'battery_low', 'usb']),
            e
                .enum('alarm', ea.STATE, ['over_temperature', 'over_humidity', 'below_min_temperature', 'below_min_humdity', 'off'])
                .withDescription('Temperature/humidity alarm status'),
            e.numeric('temperature_min', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            e.numeric('temperature_max', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            e.binary('temperature_scale', ea.STATE_SET, '°C', '°F').withDescription('Temperature scale (°F/°C)'),
            e.numeric('humidity_min', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            e.numeric('humidity_max', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            // e.binary('unknown_111', ea.STATE_SET, 'ON', 'OFF').withDescription('Unknown datapoint 111 (default: ON)'),
            // e.binary('unknown_112', ea.STATE_SET, 'ON', 'OFF').withDescription('Unknown datapoint 112 (default: ON)')
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {seq: 0x0002});
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_nlrfgpny', '_TZE204_nlrfgpny']),
        model: 'NAS-AB06B2',
        vendor: 'Neo',
        description: 'Outdoor solar alarm',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.enum('alarm_state', ea.STATE, ['alarm_sound', 'alarm_light', 'alarm_sound_light', 'normal']).withDescription('Alarm status'),
            e.binary('alarm_switch', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable alarm'),
            e.binary('tamper_alarm_switch', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable tamper alarm'),
            e.binary('tamper_alarm', ea.STATE, 'ON', 'OFF').withDescription('Indicates whether the device is tampered'),
            e.enum('alarm_melody', ea.STATE_SET, ['melody_1', 'melody_2', 'melody_3']).withDescription('Alarm sound effect'),
            e.enum('alarm_mode', ea.STATE_SET, ['alarm_sound', 'alarm_light', 'alarm_sound_light']).withDescription('Alarm mode'),
            e
                .numeric('alarm_time', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(60)
                .withValueStep(1)
                .withUnit('min')
                .withDescription('Alarm duration in minutes'),
            e.binary('charging', ea.STATE, true, false).withDescription('Charging status'),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    'alarm_state',
                    tuya.valueConverterBasic.lookup({
                        alarm_sound: tuya.enum(0),
                        alarm_light: tuya.enum(1),
                        alarm_sound_light: tuya.enum(2),
                        no_alarm: tuya.enum(3),
                    }),
                ],
                [13, 'alarm_switch', tuya.valueConverter.onOff],
                [101, 'tamper_alarm_switch', tuya.valueConverter.onOff],
                [20, 'tamper_alarm', tuya.valueConverter.onOff],
                [21, 'alarm_melody', tuya.valueConverterBasic.lookup({melody_1: tuya.enum(0), melody_2: tuya.enum(1), melody_3: tuya.enum(2)})],
                [
                    102,
                    'alarm_mode',
                    tuya.valueConverterBasic.lookup({alarm_sound: tuya.enum(0), alarm_light: tuya.enum(1), alarm_sound_light: tuya.enum(2)}),
                ],
                [7, 'alarm_time', tuya.valueConverter.raw],
                [6, 'charging', tuya.valueConverter.raw],
                [15, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_rzrrjkz2', '_TZE204_uab532m0']),
        zigbeeModel: ['NAS-WV03B'],
        model: 'NAS-WV03B',
        vendor: 'Neo',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        description: 'Smart sprinkler timer',
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.switch(),
            e.enum('status', ea.STATE, ['off', 'auto', 'disabled']).withDescription('Status'),
            e.numeric('countdown', ea.STATE_SET).withUnit('min').withValueMin(1).withValueMax(240).withDescription('Countdown'),
            e.numeric('countdown_left', ea.STATE).withUnit('min').withValueMin(1).withValueMax(240).withDescription('Countdown left'),
            e
                .numeric('water_current', ea.STATE)
                .withUnit('L/min')
                .withValueMin(0)
                .withValueMax(3785.41)
                .withValueStep(0.001)
                .withDescription('Current water flow (L/min)'),
            e.numeric('battery_percentage', ea.STATE).withUnit('%').withValueMin(0).withValueMax(100).withDescription('Battery percentage'),
            e
                .numeric('water_total', ea.STATE)
                .withUnit('L')
                .withValueMin(0)
                .withValueMax(378541.0)
                .withValueStep(0.001)
                .withDescription('Total water flow (L)'),
            e.binary('fault', ea.STATE, 'DETECTED', 'NOT_DETECTED').withDescription('Fault status'),
            e.enum('weather_delay', ea.STATE_SET, ['24h', '48h', '72h', 'cancel']).withDescription('Weather delay'),
            e.text('normal_timer', ea.STATE_SET).withDescription('Normal timer'),
            e.binary('switch_enabled', ea.STATE_SET, 'ON', 'OFF').withDescription('Switch enabled'),
            e.numeric('smart_irrigation', ea.STATE).withDescription('Smart irrigation'),
            e.binary('total_flow_reset_switch', ea.STATE_SET, 'ON', 'OFF').withDescription('Total flow reset switch'),
            e
                .numeric('quantitative_watering', ea.STATE_SET)
                .withUnit('L')
                .withValueMin(0)
                .withValueMax(10000)
                .withDescription('Quantitative watering'),
            e.binary('flow_switch', ea.STATE_SET, 'ON', 'OFF').withDescription('Flow switch'),
            e.binary('child_lock', ea.STATE_SET, 'ON', 'OFF').withDescription('Child lock'),
            e.numeric('surplus_flow', ea.STATE).withDescription('Surplus flow'),
            e.numeric('single_watering_duration', ea.STATE).withDescription('Single watering duration'),
            e.numeric('single_watering_amount', ea.STATE).withDescription('Single watering amount'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [3, 'status', tuya.valueConverter.onOff],
                [5, 'countdown', tuya.valueConverter.raw],
                [6, 'countdown_left', tuya.valueConverter.raw],
                [9, 'water_current', tuya.valueConverter.raw],
                [11, 'battery_percentage', tuya.valueConverter.batteryState],
                [15, 'water_total', tuya.valueConverter.raw],
                [19, 'fault', tuya.valueConverter.raw],
                [37, 'weather_delay', tuya.valueConverter.raw],
                [38, 'normal_timer', tuya.valueConverter.raw],
                [42, 'switch_enabled', tuya.valueConverter.onOff],
                [47, 'smart_irrigation', tuya.valueConverter.raw],
                [101, 'total_flow_reset_switch', tuya.valueConverter.onOff],
                [102, 'quantitative_watering', tuya.valueConverter.raw],
                [103, 'flow_switch', tuya.valueConverter.onOff],
                [104, 'child_lock', tuya.valueConverter.onOff],
                [105, 'surplus_flow', tuya.valueConverter.raw],
                [106, 'single_watering_duration', tuya.valueConverter.raw],
                [108, 'single_watering_amount', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_a9ojznj8', '_TZE284_a9ojznj8']),
        model: 'NAS-WV03B2',
        vendor: 'NEO',
        description: 'Smart Sprinkler Timer',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime, // Add this if you are getting no converter for 'commandMcuSyncTime'
        configure: tuya.configureMagicPacket,
        exposes: [
            // Here you should put all functionality that your device exposes
            e.enum('status', ea.STATE, ['Off', 'Auto', 'Disabled', 'APP manual', 'Key control']).withDescription('Status'),
            e.numeric('countdown', ea.STATE_SET).withUnit('min').withValueMin(1).withValueMax(60).withDescription('Count down'),
            e.numeric('countdown_left', ea.STATE).withUnit('min').withValueMin(1).withValueMax(60).withDescription('Countdown left time'),
            e.binary('child_lock', ea.STATE_SET, 'ON', 'OFF').withDescription('Child lock'),
            e.numeric('battery_percentage', ea.STATE).withUnit('%').withValueMin(0).withValueMax(100).withDescription('Battery percentage'),
        ],
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [
                    3,
                    'status',
                    tuya.valueConverterBasic.lookup({
                        Off: tuya.enum(0),
                        Auto: tuya.enum(1),
                        Disabled: tuya.enum(2),
                        'APP manual': tuya.enum(3),
                        'Key control': tuya.enum(4),
                    }),
                ],
                [101, 'countdown', tuya.valueConverter.raw],
                [6, 'countdown_left', tuya.valueConverter.raw],
                [104, 'child_lock', tuya.valueConverter.onOff],
                [11, 'battery_percentage', tuya.valueConverter.raw],
            ],
        },
    },
];

export default definitions;
module.exports = definitions;
