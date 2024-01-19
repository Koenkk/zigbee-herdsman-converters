import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_akjefhj5'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2wg5qrjy'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_81isopgh'},
        ],
        model: 'ZVG1',
        vendor: 'RTX',
        description: 'Zigbee smart water valve',
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [legacy.fz.ZVG1, fz.ignore_basic_report],
        toZigbee: [legacy.tz.tuya_switch_state, legacy.tz.ZVG1_weather_delay, legacy.tz.ZVG1_timer, legacy.tz.ZVG1_cycle_timer,
            legacy.tz.ZVG1_normal_schedule_timer],
        exposes: [e.switch().setAccess('state', ea.STATE_SET), e.battery(),
            e.enum('weather_delay', ea.STATE_SET, ['disabled', '24h', '48h', '72h']),
            e.enum('timer_state', ea.STATE, ['disabled', 'active', 'enabled']),
            e.numeric('timer', ea.STATE_SET).withValueMin(0).withValueMax(60).withUnit('min')
                .withDescription('Auto off after specific time'),
            e.numeric('timer_time_left', ea.STATE).withUnit('min')
                .withDescription('Auto off timer time left'),
            e.numeric('last_valve_open_duration', ea.STATE).withUnit('min')
                .withDescription('Time the valve was open when state on'),
            e.numeric('water_consumed', ea.STATE).withUnit('L')
                .withDescription('Liters of water consumed'),
            e.text('cycle_timer_1', ea.STATE_SET).withDescription('Format 08:00 / 20:00 / 15 / 60 / MoTuWeThFrSaSu / 1 (' +
                '08:00 = start time ' +
                '20:00 = end time ' +
                '15 = irrigation duration in minutes ' +
                '60 = pause duration in minutes ' +
                'MoTu..= active weekdays ' +
                '1 = deactivate timer with 0)'),
            e.text('cycle_timer_2', ea.STATE_SET).withDescription('Format 08:00 / 20:00 / 15 / 60 / MoTuWeThFrSaSu / 1 (' +
                '08:00 = start time ' +
                '20:00 = end time ' +
                '15 = irrigation duration in minutes ' +
                '60 = pause duration in minutes ' +
                'MoTu..= active weekdays ' +
                '1 = deactivate timer with 0)'),
            e.text('cycle_timer_3', ea.STATE_SET).withDescription('Format 08:00 / 20:00 / 15 / 60 / MoTuWeThFrSaSu / 1 (' +
                '08:00 = start time ' +
                '20:00 = end time ' +
                '15 = irrigation duration in minutes ' +
                '60 = pause duration in minutes ' +
                'MoTu..= active weekdays ' +
                '1 = deactivate timer with 0)'),
            e.text('cycle_timer_4', ea.STATE_SET).withDescription('Format 08:00 / 20:00 / 15 / 60 / MoTuWeThFrSaSu / 1 (' +
                '08:00 = start time ' +
                '20:00 = end time ' +
                '15 = irrigation duration in minutes ' +
                '60 = pause duration in minutes ' +
                'MoTu..= active weekdays ' +
                '1 = deactivate timer with 0)'),
            e.text('normal_schedule_timer_1', ea.STATE_SET).withDescription('Format 08:00 / 15 / MoTuWeThFrSaSu / 1 (' +
                '08:00 = start time ' +
                '15 = duration in minutes ' +
                'MoTu..= active weekdays ' +
                '1 = deactivate timer with 0)'),
            e.text('normal_schedule_timer_2', ea.STATE_SET).withDescription('Format 08:00 / 15 / MoTuWeThFrSaSu / 1 (' +
                '08:00 = start time ' +
                '15 = duration in minutes ' +
                'MoTu..= active weekdays ' +
                '1 = deactivate timer with 0)'),
            e.text('normal_schedule_timer_3', ea.STATE_SET).withDescription('Format 08:00 / 15 / MoTuWeThFrSaSu / 1 (' +
                '08:00 = start time ' +
                '15 = duration in minutes ' +
                'MoTu..= active weekdays ' +
                '1 = deactivate timer with 0)'),
            e.text('normal_schedule_timer_4', ea.STATE_SET).withDescription('Format 08:00 / 15 / MoTuWeThFrSaSu / 1 (' +
                '08:00 = start time ' +
                '15 = duration in minutes ' +
                'MoTu..= active weekdays ' +
                '1 = deactivate timer with 0)')],
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TZ3000_mwd3c2at'}],
        model: 'ZMS4',
        vendor: 'RTX',
        description: 'Zigbee PIR sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.battery_low(), e.occupancy()],
    },
];

export default definitions;
module.exports = definitions;
