const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const legacy = require('zigbee-herdsman-converters/lib/legacy');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
//const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');


const definitions = [
    {
        zigbeeModel: ['TS0601'],
        model: 'ZBTHR20WT',
        vendor: '_TZE200_ne4pikwm',
        description: '(TESTING) Thermostat radiator valve',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        extend: [],
        exposes: [
            e.battery_low(),
            e.child_lock(),
            e.open_window(),
            //e.open_window_temperature().withValueMin(5).withValueMax(30),
            e.climate()
                .withLocalTemperatureCalibration(-5, 5, 0.1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET),
            tuya.exposes.frostProtection('When Anti-Freezing function is activated, the temperature in the house is kept ' +
                'at 8 °C, the device display "AF".press the pair button to cancel.'),
            // what about anti scale?
            e.binary('online', ea.STATE_SET, 'ON', 'OFF').withDescription('The current data request from the device.'),
            e.binary('schedule_mode', ea.STATE_SET, 'ON', 'OFF').withDescription('Should the device be on the heating schedule'),
            tuya.exposes.errorStatus(),
        ],
        meta: {
            tuyaDatapoints: [
                [2, 'preset', tuya.valueConverter.tv02Preset()],
                //Datapoint 3 not defined for '_TZE200_ne4pikwm' with value 1
                [8, 'open_window', tuya.valueConverter.onOff],
                [10, 'frost_protection', tuya.valueConverter.TV02FrostProtection],
                //[24, 'local_temperature', tuya.valueConverter.divideBy10],
                [27, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration1],
                //[35, 'battery_low', tuya.valueConverter.trueFalse0],
                [40, 'child_lock', tuya.valueConverter.lockUnlock],
                //[45, 'error_status', tuya.valueConverter.raw],
                [101, 'schedule_mode', tuya.valueConverter.onOff],
                [102, 'local_temperature', tuya.valueConverter.divideBy10],
                [103, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [107, 'system_mode', tuya.valueConverter.TV02SystemMode],
                [107, 'heating_stop', tuya.valueConverter.TV02SystemMode],
                [108, 'schedule_mode', tuya.valueConverter.onOff],//
                //Datapoint 110 not defined for '_TZE200_ne4pikwm' with value 
                //"dpValues":[{"data":{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,21,15,0,0,0,0,0],"type":"Buffer"},"datatype":0,"dp":110}],"seq":3328}
                [115, 'online', tuya.valueConverter.onOffNotStrict],
                //Datapoint 119 not defined for '_TZE200_ne4pikwm' with value
                //{"dpValues":[{"data":{"data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,2,0,0,0,0,0],"type":"Buffer"},"datatype":0,"dp":119}],"seq":4352}

                // Datapoint 132 not defined for _ with value 8 {"dpValues":[{"data":{"data":[1,24,2,3,18,56,0,6],"type":"Buffer"},"datatype":0,"dp":132}],"seq":7680}
            ],
        },
    }
]

export default definitions;
module.exports = definitions;
