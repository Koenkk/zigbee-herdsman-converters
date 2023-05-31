const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const definition = {
    fingerprint: [
        {
            modelID: 'TS0601',
            manufacturerName: '_TZE200_e2bedvo9'
        },
        {
            modelID: 'TS0601',
            manufacturerName: '_TZE200_dnz6yvl2'
        },
    ],
    model: 'ZSS-QY-SSD-A-EN',
    vendor: 'TuYa',
    description: 'Smart smoke alarm',
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    onEvent: tuya.onEventSetTime, // Add this if you are getting no converter for 'commandMcuSyncTime'
    configure: tuya.configureMagicPacket,
    exposes: [
        e.smoke(),
        exposes.numeric('smoke_concentration', ea.STATE).withUnit('ppm').withDescription('Parts per million of smoke detected'), 
        tuya.exposes.faultAlarm(), 
        tuya.exposes.batteryState(), 
        e.battery(),
        tuya.exposes.silence(),
        //exposes.binary('alarm', ea.STATE).withDescription('Indicates whether the alarm is normal state'),
        tuya.exposes.selfTest(),
    ],
    meta: {
        // All datapoints go in here
        tuyaDatapoints: [
        	[1, 'smoke', tuya.valueConverter.trueFalse0],
        	[2, 'smoke_concentration', tuya.valueConverter.divideBy10],
            [11, 'fault_alarm', tuya.valueConverter.trueFalse1],
            [14, 'battery_state', tuya.valueConverter.batteryState],
            [15, 'battery', tuya.valueConverter.raw],
            [16, 'silence', tuya.valueConverter.raw],
            [17, 'self_test', tuya.valueConverter.raw],
        ],
    }
};

module.exports = definition;
