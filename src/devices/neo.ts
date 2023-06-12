import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
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
            e.temperature(), e.humidity(), e.binary('humidity_alarm', ea.STATE_SET, true, false), e.battery_low(),
            e.binary('temperature_alarm', ea.STATE_SET, true, false),
            e.binary('alarm', ea.STATE_SET, true, false),
            e.enum('melody', ea.STATE_SET, Array.from(Array(18).keys()).map((x)=>(x+1).toString())),
            e.numeric('duration', ea.STATE_SET).withUnit('s').withValueMin(0).withValueMax(1800),
            e.numeric('temperature_min', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            e.numeric('temperature_max', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            e.numeric('humidity_min', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            e.numeric('humidity_max', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            e.enum('volume', ea.STATE_SET, ['low', 'medium', 'high']),
            e.enum('power_type', ea.STATE, ['battery_full', 'battery_high', 'battery_medium', 'battery_low', 'usb']),
        ],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.command('manuSpecificTuya', 'dataQuery', {});
            await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {'seq': 0x0002});
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_t1blo2bj', '_TZE204_t1blo2bj', '_TZE200_nlrfgpny']),
        zigbeeModel: ['1blo2bj', 'lrfgpny'],
        model: 'NAS-AB02B2',
        vendor: 'Neo',
        description: 'Alarm',
        fromZigbee: [legacy.fz.neo_alarm, fz.ignore_basic_report],
        toZigbee: [legacy.tz.neo_alarm],
        exposes: [
            e.battery_low(),
            e.binary('alarm', ea.STATE_SET, true, false),
            e.enum('melody', ea.STATE_SET, Array.from(Array(18).keys()).map((x)=>(x+1).toString())),
            e.numeric('duration', ea.STATE_SET).withUnit('s').withValueMin(0).withValueMax(1800),
            e.enum('volume', ea.STATE_SET, ['low', 'medium', 'high']),
            e.numeric('battpercentage', ea.STATE).withUnit('%'),
        ],
        whiteLabel: [tuya.whitelabel('Neo', 'NAS-AB06B2', 'Outdoor solar alarm', ['_TZE200_nlrfgpny'])],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.command('manuSpecificTuya', 'dataQuery', {});
            await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {'seq': 0x0002});
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
        exposes: [e.occupancy(), e.humidity(), e.temperature(), e.tamper(), e.battery_low(),
            e.enum('power_type', ea.STATE, ['battery_full', 'battery_high', 'battery_medium', 'battery_low', 'usb']),
            e.enum('alarm', ea.STATE, ['over_temperature', 'over_humidity', 'below_min_temperature', 'below_min_humdity', 'off'])
                .withDescription('Temperature/humidity alarm status'),
            e.numeric('temperature_min', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            e.numeric('temperature_max', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            e.binary('temperature_scale', ea.STATE_SET, '°C', '°F').withDescription('Temperature scale (°F/°C)'),
            e.numeric('humidity_min', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            e.numeric('humidity_max', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            // e.binary('unknown_111', ea.STATE_SET, 'ON', 'OFF').withDescription('Unknown datapoint 111 (default: ON)'),
            // e.binary('unknown_112', ea.STATE_SET, 'ON', 'OFF').withDescription('Unknown datapoint 112 (default: ON)')
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {'seq': 0x0002});
        },
    },
];

module.exports = definitions;
