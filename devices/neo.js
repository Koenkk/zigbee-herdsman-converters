const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('../lib/tuya');

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_d0yu2xgi'}],
        zigbeeModel: ['0yu2xgi'],
        model: 'NAS-AB02B0',
        vendor: 'Neo',
        description: 'Temperature & humidity sensor and alarm',
        fromZigbee: [fz.neo_t_h_alarm, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.neo_t_h_alarm],
        exposes: [
            e.temperature(), e.humidity(), exposes.binary('humidity_alarm', ea.STATE_SET, true, false), e.battery_low(),
            exposes.binary('temperature_alarm', ea.STATE_SET, true, false),
            exposes.binary('alarm', ea.STATE_SET, true, false),
            exposes.enum('melody', ea.STATE_SET, Array.from(Array(18).keys()).map((x)=>(x+1).toString())),
            exposes.numeric('duration', ea.STATE_SET).withUnit('second').withValueMin(0).withValueMax(1800),
            exposes.numeric('temperature_min', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            exposes.numeric('temperature_max', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            exposes.numeric('humidity_min', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            exposes.numeric('humidity_max', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            exposes.enum('volume', ea.STATE_SET, ['low', 'medium', 'high']),
            exposes.enum('power_type', ea.STATE, ['battery_full', 'battery_high', 'battery_medium', 'battery_low', 'usb']),
        ],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.command('manuSpecificTuya', 'dataQuery', {});
            await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {'seq': 0x0002});
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_t1blo2bj'}, {modelID: 'TS0202', manufacturerName: '_TZ3000_kmh5qpmb'}],
        zigbeeModel: ['1blo2bj'],
        model: 'NAS-AB02B2',
        vendor: 'Neo',
        description: 'Alarm',
        fromZigbee: [fz.neo_alarm, fz.ignore_basic_report],
        toZigbee: [tz.neo_alarm],
        exposes: [
            e.battery_low(),
            exposes.binary('alarm', ea.STATE_SET, true, false),
            exposes.enum('melody', ea.STATE_SET, Array.from(Array(18).keys()).map((x)=>(x+1).toString())),
            exposes.numeric('duration', ea.STATE_SET).withUnit('second').withValueMin(0).withValueMax(1800),
            exposes.enum('volume', ea.STATE_SET, ['low', 'medium', 'high']),
            exposes.numeric('battpercentage', ea.STATE).withUnit('%'),
        ],
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
        fromZigbee: [fz.neo_nas_pd07, fz.ignore_tuya_set_time],
        toZigbee: [tz.neo_nas_pd07],
        onEvent: tuya.onEventSetTime,
        exposes: [e.occupancy(), e.humidity(), e.temperature(), e.tamper(), e.battery_low(),
            exposes.enum('power_type', ea.STATE, ['battery_full', 'battery_high', 'battery_medium', 'battery_low', 'usb']),
            exposes.enum('alarm', ea.STATE, ['over_temperature', 'over_humidity', 'below_min_temperature', 'below_min_humdity', 'off'])
                .withDescription('Temperature/humidity alarm status'),
            exposes.numeric('temperature_min', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            exposes.numeric('temperature_max', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(80),
            exposes.binary('temperature_scale', ea.STATE_SET, '°C', '°F').withDescription('Temperature scale (°F/°C)'),
            exposes.numeric('humidity_min', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            exposes.numeric('humidity_max', ea.STATE_SET).withUnit('%').withValueMin(1).withValueMax(100),
            // exposes.binary('unknown_111', ea.STATE_SET, 'ON', 'OFF').withDescription('Unknown datapoint 111 (default: ON)'),
            // exposes.binary('unknown_112', ea.STATE_SET, 'ON', 'OFF').withDescription('Unknown datapoint 112 (default: ON)')
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {'seq': 0x0002});
        },
    },
];
