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
        fromZigbee: [fz.neo_t_h_alarm, fz.ignore_basic_report],
        toZigbee: [tz.neo_t_h_alarm],
        exposes: [
            e.temperature(), e.humidity(), exposes.binary('humidity_alarm', ea.STATE_SET, true, false), e.battery_low(),
            exposes.binary('temperature_alarm', ea.STATE_SET, true, false),
            exposes.binary('alarm', ea.STATE_SET, true, false),
            exposes.enum('melody', ea.STATE_SET, Array.from(Array(18).keys()).map((x)=>(x+1).toString())),
            exposes.numeric('duration', ea.STATE_SET).withUnit('second'),
            exposes.numeric('temperature_min', ea.STATE_SET).withUnit('°C'),
            exposes.numeric('temperature_max', ea.STATE_SET).withUnit('°C'),
            exposes.numeric('humidity_min', ea.STATE_SET).withUnit('%'),
            exposes.numeric('humidity_max', ea.STATE_SET).withUnit('%'),
            exposes.enum('volume', ea.STATE_SET, ['low', 'medium', 'high']),
            exposes.enum('power_type', ea.STATE, ['battery_full', 'battery_high', 'battery_medium', 'battery_low', 'usb']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_7hfcudw5'}],
        model: 'NAS-PD07',
        vendor: 'Neo',
        description: 'Motion, temperature & humidity sensor',
        fromZigbee: [fz.neo_nas_pd07],
        toZigbee: [],
        onEvent: tuya.setTime,
        exposes: [e.occupancy(), e.humidity(), e.temperature(), e.tamper(), e.battery_low(),
            exposes.enum('power_type', ea.STATE, ['battery_full', 'battery_high', 'battery_medium', 'battery_low', 'usb'])],
    },
];
