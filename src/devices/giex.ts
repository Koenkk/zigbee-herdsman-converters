const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const definition = {
    // Since a lot of TuYa devices use the same modelID, but use different datapoints
    // it's necessary to provide a fingerprint instead of a zigbeeModel
    fingerprint: [
        {
            // The model ID from: Device with modelID 'TS0601' is not supported
            // You may need to add \u0000 at the end of the name in some cases
            modelID: 'TS0601',
            // The manufacturer name from: Device with modelID 'TS0601' is not supported.
            manufacturerName: '_TZE204_a7sghmms',
        },
    ],
    model: 'QT06 NEW',
    vendor: 'GiEX NEW',
    description: 'Water irrigation valve NEW',
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    onEvent: tuya.onEventSetTime, // Add this if you are getting no converter for 'commandMcuSyncTime'
    configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
		    e.battery(),
            exposes.binary('state', ea.STATE_SET, 'ON', 'OFF').withDescription('State'),
            exposes.enum('mode', ea.STATE_SET, ['duration', 'capacity']).withDescription('Irrigation mode'),
            exposes.numeric('irrigation_target', exposes.access.STATE_SET).withValueMin(0).withValueMax(240).withUnit('seconds or Litres')
                .withDescription('Irrigation Target, duration in minutes or capacity in Liters (depending on mode)'),
            exposes.numeric('cycle_irrigation_num_times', exposes.access.STATE_SET).withValueMin(0).withValueMax(100).withUnit('#')
                .withDescription('Number of cycle irrigation times, set to 0 for single cycle'),
            exposes.numeric('cycle_irrigation_interval', exposes.access.STATE_SET).withValueMin(0).withValueMax(1440).withUnit('min')
                .withDescription('Cycle irrigation interval'),
            exposes.numeric('irrigation_start_time', ea.STATE).withUnit('GMT+8').withDescription('Irrigation start time'),
            exposes.numeric('irrigation_end_time', ea.STATE).withUnit('GMT+8').withDescription('Irrigation end time'),
            exposes.numeric('last_irrigation_duration', exposes.access.STATE).withUnit('min')
                .withDescription('Last irrigation duration'),
            exposes.numeric('water_consumed', exposes.access.STATE).withUnit('L')
                .withDescription('Water consumed (Litres)'),
        ],
        meta: {
            tuyaDatapoints: [
			

				[108,'battery',tuya.valueConverter.raw],
				[2, 'state', tuya.valueConverter.trueFalse1],
				[1, 'mode', tuya.valueConverter.trueFalse1],
				[104,'irrigation_target',tuya.valueConverter.raw],
				[111,'water_consumed',tuya.valueConverter.raw],
				[101,'irrigation_start_time',tuya.valueConverter.raw],
				[102,'irrigation_end_time',tuya.valueConverter.raw],
				[114,'last_irrigation_duration',tuya.valueConverter.raw],
				[103,'cycle_irrigation_num_times',tuya.valueConverter.raw],
				[105,'cycle_irrigation_interval',tuya.valueConverter.raw],
				[106,'Temperature',tuya.valueConverter.raw],

            ],
    },
};

module.exports = definition;
