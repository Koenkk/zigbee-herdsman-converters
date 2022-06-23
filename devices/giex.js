const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [
			{modelID: 'TS0601', manufacturerName: '_TZE200_sh1btabb'}
		],
		model: 'TS0601',
		vendor: 'GiEX',
		description: 'Water Irrigation Valve',
		onEvent: tuya.onEventSetLocalTime,
		fromZigbee: [
			fz.giex_water_valve,
		],
		toZigbee: [
			tz.GIEX_water_valve,
		],
		exposes: [
			e.battery(),
			exposes.binary('state', ea.STATE_SET, 'ON', 'OFF').withDescription('State'),
			exposes.enum('mode', ea.STATE_SET, ['Duration', 'Capacity']).withDescription('Irrigation Mode'),
			exposes.numeric('irrigation_target', exposes.access.STATE_SET).withValueMin(0).withValueMax(1440).withUnit('min or L')
				.withDescription('Irrigation Target. Duration in minutes - or Capacity in Liters (depending on mode)'),
			exposes.numeric('cycle_irrigation_num_times', exposes.access.STATE_SET).withValueMin(0).withValueMax(100).withUnit('# of times')
				.withDescription('Cycle Irrigation Times.  Set to 0 for single cycle'),
			exposes.numeric('cycle_irrigation_interval', exposes.access.STATE_SET).withValueMin(0).withValueMax(1440).withUnit('min')
				.withDescription('Cycle Irrigation Interval'),
			exposes.numeric('irrigation_start_time', ea.STATE).withUnit('GMT+8').withDescription('Irrigation Start Time'),
			exposes.numeric('irrigation_end_time', ea.STATE).withUnit('GMT+8').withDescription('Irrigation End Time'),
			exposes.numeric('last_irrigation_duration', exposes.access.STATE).withUnit('min')
				.withDescription('Last Irrigation Duration'),
			exposes.numeric('water_consumed', exposes.access.STATE).withUnit('L')
				.withDescription('Water Consumed (L)'),
		],
    },
];
